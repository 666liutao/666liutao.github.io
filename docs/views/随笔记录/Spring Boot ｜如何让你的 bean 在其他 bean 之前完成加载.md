---
title: Spring Boot ｜如何让你的 bean 在其他 bean 之前完成加载
date: 2023-12-07
tags:
 - spring
categories:
 - 随笔记录
sidebar: 'auto'
---

## 场景描述
- 项目开发过程中遇到了需要优先加载某个bean的需求，如下:
```

/**
 * 系统属性服务
**/
@Service
public class SystemConfigService {

    // 访问 db 的 mapper
    private final SystemConfigMapper systemConfigMapper;

    // 存放一些系统配置的缓存 map
    private static Map<String, String>> SYS_CONF_CACHE = new HashMap<>()

    // 使用构造方法完成依赖注入
    public SystemConfigServiceImpl(SystemConfigMapper systemConfigMapper) {
        this.systemConfigMapper = systemConfigMapper;
    }

    // Bean 的初始化方法，捞取数据库中的数据，放入缓存的 map 中
    @PostConstruct
    public void init() {
        // systemConfigMapper 访问 DB，捞取数据放入缓存的 map 中
        // SYS_CONF_CACHE.put(key, value);
        // ...
    }

    // 对外提供获得系统配置的 static 工具方法
    public static String getSystemConfig(String key) {
        return SYS_CONF_CACHE.get(key);
    }

    // 省略了从 DB 更新缓存的代码
    // ...
}
```

- SystemConfigService 是一个提供了查询系统属性的服务，系统属性存放在 DB 中并且读多写少，在 Bean 创建的时候，通过 @PostConstruct 注解的 init() 方法完成了数据加载到缓存中
- 最关键的是，由于是系统属性，所以需要在很多地方都想使用，尤其需要在很多 bean 启动的时候使用，为了方便就提供了 static 方法来方便调用，这样其他的 bean 不需要依赖注入就可以直接调用.
- 但问题是系统属性是存在 db 里面的，这就导致了不能把 SystemConfigService做成一个纯「工具类」，它必须要被 Spring 托管起来，完成 mapper 的注入才能正常工作。
- 因此这样一来就比较麻烦，其他的类或者 Bean 如果想安全的使用 SystemConfigService#getSystemConfig 中的获取配置的静态方法，就必须等 SystemConfigService 先被 Spring 创建加载起来，完成 init() 方法后才可以。

## 方案

### 1.SpringBoot 官方文档推荐做法

Spring 对于依赖注入更推荐（is preferable）使用构造函数来注入必须的依赖，用 setter 方法来注入可选的依赖。

按照 Spring 的文档，我们应该直接去掉 getSystemConfig 的 static 修饰，让 getSystemConfig 变成一个实例方法，让每个需要依赖的 SystemConfigService 的 Bean 通过构造函数完成依赖注入，这样 Spring 会保证每个 Bean 在创建之前会先把它所有的依赖创建并初始化完成。

### 2.\@DependsOn 注解

```

@Service
@DependsOn({"systemConfigService"})
public class BizService {

    public BizService() {
        String xxValue = SystemConfigService.getSystemConfig("xxKey");
        // 可行
    }
}
```

操作起来也太麻烦了，需要让每个每个依赖 SystemConfigService的 Bean 都改代码加上注解

### 3.ApplicationContextInitializer

第一步：通过 spring.factories 扩展来注册一个 ApplicationContextInitializer：

```

# 注册 ApplicationContextInitializer
org.springframework.context.ApplicationContextInitializer=com.antbank.demo.bootstrap.MyApplicationContextInitializer
```

注册 ApplicationContextInitializer 的目的其实是为了接下来注册 BeanDefinitionRegistryPostProcessor 到 Spring 中

    public class MyApplicationContextInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
        
        @Override
        public void initialize(ConfigurableApplicationContext applicationContext) {
            // 注意，如果你同时还使用了 spring cloud，这里需要做个判断，要不要在 spring cloud applicationContext 中做这个事
            // 通常 spring cloud 中的 bean 都和业务没关系，是需要跳过的
            applicationContext.addBeanFactoryPostProcessor(new MyBeanDefinitionRegistryPostProcessor());
        }
    }

第二步：实现 BeanDefinitionRegistryPostProcessor，注册目标 bean：

用 MyBeanDefinitionRegistryPostProcessor 在 ConfigurationClassPostProcessor 扫描前注册你需要的目标 bean 的 BeanDefinition 即可。

    public class MyBeanDefinitionRegistryPostProcessor implements BeanDefinitionRegistryPostProcessor {
        
        @Override
        public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) throws BeansException {
            // 手动注册一个 BeanDefinition
            registry.registerBeanDefinition("systemConfigService", new RootBeanDefinition(SystemConfigService.class));
        }
        
        @Override
        public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {}
    }

## 问题

### 1. @Order 注解或者实现 org.springframework.core.Ordered 可以实现吗

- 注解@Order或者接口Ordered的作用是定义Spring IOC容器中Bean的执行顺序的优先级，而不是定义Bean的加载顺序，比如 ApplicationListener，RegistrationBean 等
- Bean的加载顺序不受@Order或Ordered接口的影响

### 2. @AutoConfigureOrder/@AutoConfigureAfter/@AutoConfigureBefore 注解

测试下来这些注解也是不可行，它们和 Ordered 一样都是针对 Spring 自身组件 Bean 的执行顺序。
