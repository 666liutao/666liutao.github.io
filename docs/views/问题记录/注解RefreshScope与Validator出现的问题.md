---
title: 注解RefreshScope与Validator出现的问题
date: 2021-04-16
tags:
 - Validator
categories:
 - 问题记录
sidebar: 'auto'
---

## 问题描述

- 加了RefreshScope注解后，该类会由CGLIB进行代理，属性值为空,只能通过get获取值
- 而 Validator 校验时是直接获取属性的值来校验的,并不是通过get方法获取
- 造成配置文件有值时,校验也无法通过

## 问题复现

配置文件
application.yml
```
com:
  liutao:
    config:
      name: test
```

配置类
AProperties.java
```
@Data
@NoArgsConstructor
@Component
@ConfigurationProperties(prefix = "com.liutao.config")
@RefreshScope
public class AProperties {

    @NotEmpty
    private String name;
    
}
```
健康检查
APropertiesHealthIndicator.java

```
import javax.validation.ConstraintViolation;
import javax.validation.Validator;

@Component
@Log4j2
public class APropertiesHealthIndicator extends AbstractHealthIndicator {

    @Autowired
    private Validator validate;

    @Override
    protected void doHealthCheck(Builder builder) {
      // 调试点
      Object aProperties = Spring.getBean("AProperties");
      Set<ConstraintViolation<Object>> violations = validate.validate(properties);
      if (isEmpty) {
            builder.up();    
            builder.withDetail("content", Status.UP.getCode());
            log.info("Properties content is Normal");
        } else {
            builder.down();
            log.error("Properties content is ERROR");
            builder.withDetails(getErrorMap(violations));
        }
    }
    
    private Map<String, Object> getErrorMap(Set<ConstraintViolation<Object>> violations) {
        Map<String, Object> contentMap = new HashMap<>(1);
        Map<String, String> map = new HashMap<>(16);
        map.put("status", Status.DOWN.getCode());

        for (ConstraintViolation<Object> violation : violations) {
            map.put(violation.getPropertyPath().toString(), violation.getMessage());
            log.warn( violation.getPropertyPath().toString() + "" + violation.getMessage());
        }

        contentMap.put("content", map);
        return contentMap;
    }

}
```

程序跑到调试点时:

![image](http://raw.githubusercontent.com/666liutao/images/main/note/health-check-bug.jpg)


可以看到该代理对象通过get方法可以获取值，但该代理对象的字段值为null,由于校验时是通过反射获取字段值的,所以这时校验会显示name为空。

## 解决方法

```
AProperties tempAProperties = new AProperties();
BeanUtils.copyProperties(Spring.getBean("AProperties"), tempAProperties);
Set<ConstraintViolation<Object>> violations = validate.validate(tempAProperties);

```