---
title: VuePress + Github Action + Github Pages搭建个人博客
date: 2024-04-24
tags:
 - jackson
categories:
 - 随笔记录
sidebar: 'auto'
---

# 1. 背景
- 项目需要实现一些敏感字段过滤
- 项目使用的为 jackson
- 过滤场景分两种
  - 响应中的信息过滤
  - 日志打印中的信息过滤 （配合日志切面记录过滤后的操作日志）

# 2. 响应过滤实现

## 2.1 自定义以下注解

JsonFieldFilters.java
```
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * Json字段过滤器列表，用于组合多个字段过滤注解
 * @author liutao
 */
@Documented
@Retention(RUNTIME)
@Target({ FIELD, METHOD })
public @interface JsonFieldFilters {

    JsonFieldFilter[] value();

}
```

JsonFieldFilter.java
```
import java.lang.annotation.*;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * Json字段过滤器注解
 * @author liutao
 */
@Documented
@Retention(RUNTIME)
@Target(value = { ElementType.METHOD,FIELD})
@Repeatable(value= JsonFieldFilters.class)
public @interface JsonFieldFilter {

    Class<?> value();

    /**
     * include为对象需要包含的字段，默认使用include，如果include为空，则使用exclude字段
     *
     * @return String[]
     */
    String[] include() default {};

    /**
     * exclude 要排除的字段
     *
     * @return String[]
     */
    String[] exclude() default {};


    /**
     * 目前只支持 RESPONSE
     * @return
     */
    JacksonFilterType type() default  JacksonFilterType.RESPONSE;

    enum JacksonFilterType {
        REQUEST, RESPONSE;
    }

}
```

JsonFieldFilterBean.java
```
import com.fasterxml.jackson.annotation.JsonFilter;

/**
 * 系统默认使用include指定的字段，如果include为空，则使用exclude指定的字段
 * @author liutao
 */
public class JsonFieldFilterBean {

	/** 入参包含字段 */
	public static final String INCOME_PARAMETER_INCLUDE_FILTER = "income_include_filter";

	/** 入参排除字段  */
	public static final String INCOME_PARAMETER_EXCLUDE_FILTER = "income_exclude_filter";

	/** 出参包含字段 */
	public static final String OUTCOME_PARAMETER_INCLUDE_FILTER = "outcome_include_filter";

	/** 出参排除字段 */
	public static final String OUTCOME_PARAMETER_EXCLUDE_FILTER = "outcome_exclude_filter";
	

	@JsonFilter(INCOME_PARAMETER_INCLUDE_FILTER)
	public interface IncomeParameterIncludeFilter {

	}

	@JsonFilter(INCOME_PARAMETER_EXCLUDE_FILTER)
	public interface IncomeParameterExcludeFilter {

	}

	@JsonFilter(OUTCOME_PARAMETER_INCLUDE_FILTER)
	public interface OutcomeParameterIncludeFilter {

	}

	@JsonFilter(OUTCOME_PARAMETER_EXCLUDE_FILTER)
	public interface OutcomeParameterExcludeFilter {

	}

}
```


## 2.2 拦截器

### 2.2.1 注解拦截器

```
import com.fasterxml.jackson.databind.ObjectMapper;
import kl.nbase.log.annotation.JsonFieldFilter;
import kl.nbase.log.annotation.JsonFieldFilters;
import kl.nbase.log.utils.JacksonFiltersUtil;
import org.apache.commons.lang3.reflect.FieldUtils;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 使用Jackson实现的字段过滤器
 *
 * @author liutao
 */
@Component
@Aspect
public class JacksonFiltersComponent {

    @Pointcut("@annotation(kl.nbase.log.annotation.JsonFieldFilters) "
        + "|| @annotation(kl.nbase.log.annotation.JsonFieldFilter)")
    public void jacksonFiltersPointCut() {
    }

    @Around(value = "jacksonFiltersPointCut()")
    public Object jacksonFiltersAroundAdvice(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature methodSignature = (MethodSignature) joinPoint.getSignature();
        Method method = methodSignature.getMethod();
        Parameter[] parameters = method.getParameters();
        // 获取注解
        JsonFieldFilter jsonFieldFilterElem = method.getAnnotation(JsonFieldFilter.class);
        JsonFieldFilter[] jsonFieldFilterArray = null;
        JsonFieldFilters jsonFieldFilters;
        if (jsonFieldFilterElem != null) {
            jsonFieldFilterArray = new JsonFieldFilter[1];
            jsonFieldFilterArray[0] = jsonFieldFilterElem;
        } else if ((jsonFieldFilters = method.getAnnotation(JsonFieldFilters.class)) != null) {
            jsonFieldFilterArray = jsonFieldFilters.value();
        }

        List<JsonFieldFilter> responseFilters;
        if (jsonFieldFilterArray == null || jsonFieldFilterArray.length <= 0) {
            return joinPoint.proceed();
        }
        // 解析出response请求注解
        responseFilters = Arrays.stream(jsonFieldFilterArray)
            .filter(jsonFieldFilter -> jsonFieldFilter.type() == JsonFieldFilter.JacksonFilterType.RESPONSE)
            .collect(Collectors.toList());
        // 方法执行
        Object result = (parameters == null) ? joinPoint.proceed() : joinPoint.proceed(parameters);
        // 处理response通知
        return jacksonResponseFilterHandler(joinPoint, responseFilters, result);
    }


    /**
     * 过滤响应信息
     *
     * @param joinPoint
     * @param responseFilters
     * @param result
     * @return
     * @throws IOException
     */
    private Object jacksonResponseFilterHandler(ProceedingJoinPoint joinPoint, List<JsonFieldFilter> responseFilters,
                                                Object result) throws IOException {

        List<JacksonFilterParam> filterParamList = new ArrayList<>();
        for (JsonFieldFilter jsonFieldFilter : responseFilters) {
            final Class<?> clazz = jsonFieldFilter.value();
            JsonFieldFilter.JacksonFilterType type = jsonFieldFilter.type();

            if (!type.equals(JsonFieldFilter.JacksonFilterType.RESPONSE)) {
                return result;
            }
            // 判断要include filter和exclude filter过滤
            // 获取注解参数,不包含父类参数(对于集成暂时不考虑)
            Field[] fields = FieldUtils.getAllFields(clazz);
            final String[] includeFields = jsonFieldFilter.include();
            final String[] excludeFields = jsonFieldFilter.exclude();

            // 获取可以进行过滤的属性，优先使用include中屬性，如果include为空，使用exclude屬性,(如果都不为空使用include)
            Set<String> includeFilterFields = getFilterFields(fields, includeFields);
            Set<String> excludeFilterFields = getFilterFields(fields, excludeFields);
            if (includeFilterFields == null && excludeFilterFields == null) {
                continue;
            }

            JacksonFilterParam filterParam;
            if (includeFilterFields != null) {
                filterParam = JacksonFilterParam.buildIncludeFilterParam(clazz, includeFilterFields);
            } else {
                filterParam = JacksonFilterParam.buildExcludeFilterParam(clazz, excludeFilterFields);
            }
            filterParamList.add(filterParam);
        }

        ObjectMapper objectMapper = JacksonFiltersUtil.getMixObjectMapper(filterParamList);
        String argsJson = objectMapper.writeValueAsString(result);
        MethodSignature methodSignature = (MethodSignature) joinPoint.getSignature();
        return objectMapper.readValue(argsJson, methodSignature.getReturnType());
    }

    private Set<String> getFilterFields(Field[] fields, final String[] toBeFilterFields) {
        if (fields == null || fields.length <= 0 || toBeFilterFields == null || toBeFilterFields.length <= 0) {
            return null;
        }
        return Arrays.stream(fields)
            .filter(filed -> Arrays.asList(toBeFilterFields).contains(filed.getName()))
            .map(Field::getName).collect(Collectors.toSet());

    }
}
```

### 2.2.2 用于组装jackson过滤器的参数类

```
import kl.nbase.log.annotation.JsonFieldFilterBean;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * 用于组装jackson过滤器的参数类
 *
 * @author liutao
 */
public class JacksonFilterParam {
    /**
     * 目标类类型
     */
    private Class<?> toBeMixVo;
    /**
     * 过滤器类型
     *
     * @see JsonFieldFilterBean
     */
    private Class<?> toBeMixFilter;
    /**
     * 待过滤的字段名
     */
    private Set<String> toBeFilterFields;
    /**
     * 过滤器id
     *
     * @see JsonFieldFilterBean
     */
    private String filterId;
    /**
     * 是否为include模式
     */
    private boolean isInclude;

    public static JacksonFilterParam buildExcludeFilterParam(Class<?> clazz, String[] excludeFields) {
        Set<String> excludeFieldsSet = new HashSet<>();
        Collections.addAll(excludeFieldsSet, excludeFields);
        return buildExcludeFilterParam(clazz, excludeFieldsSet);
    }
    public static JacksonFilterParam buildExcludeFilterParam(Class<?> clazz, Set<String> excludeFields) {
        JacksonFilterParam filterParam = new JacksonFilterParam();
        filterParam.setInclude(false);
        filterParam.setFilterId(JsonFieldFilterBean.OUTCOME_PARAMETER_EXCLUDE_FILTER);
        filterParam.setToBeFilterFields(excludeFields);
        filterParam.setToBeMixFilter(JsonFieldFilterBean.OutcomeParameterExcludeFilter.class);
        filterParam.setToBeMixVo(clazz);

        return filterParam;
    }

    public static JacksonFilterParam buildIncludeFilterParam(Class<?> clazz, String[] includeFields) {
        Set<String> includeFieldsSet = new HashSet<>();
        Collections.addAll(includeFieldsSet, includeFields);
        return buildIncludeFilterParam(clazz, includeFieldsSet);
    }
    public static JacksonFilterParam buildIncludeFilterParam(Class<?> clazz, Set<String> includeFields) {
        JacksonFilterParam filterParam = new JacksonFilterParam();
        filterParam.setInclude(true);
        filterParam.setFilterId(JsonFieldFilterBean.OUTCOME_PARAMETER_INCLUDE_FILTER);
        filterParam.setToBeFilterFields(includeFields);
        filterParam.setToBeMixFilter(JsonFieldFilterBean.OutcomeParameterIncludeFilter.class);
        filterParam.setToBeMixVo(clazz);

        return filterParam;
    }


    public Class<?> getToBeMixVo() {
        return toBeMixVo;
    }

    public JacksonFilterParam setToBeMixVo(Class<?> toBeMixVo) {
        this.toBeMixVo = toBeMixVo;
        return this;
    }

    public Class<?> getToBeMixFilter() {
        return toBeMixFilter;
    }

    public JacksonFilterParam setToBeMixFilter(Class<?> toBeMixFilter) {
        this.toBeMixFilter = toBeMixFilter;
        return this;
    }

    public Set<String> getToBeFilterFields() {
        return toBeFilterFields;
    }

    public JacksonFilterParam setToBeFilterFields(Set<String> toBeFilterFields) {
        this.toBeFilterFields = toBeFilterFields;
        return this;
    }

    public String getFilterId() {
        return filterId;
    }

    public JacksonFilterParam setFilterId(String filterId) {
        this.filterId = filterId;
        return this;
    }

    public boolean isInclude() {
        return isInclude;
    }

    public JacksonFilterParam setInclude(boolean include) {
        isInclude = include;
        return this;
    }
}
```

### 2.2.3 工具类

```
package kl.nbase.log.utils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ser.impl.SimpleBeanPropertyFilter;
import com.fasterxml.jackson.databind.ser.impl.SimpleFilterProvider;
import kl.nbase.log.exception.LogInternalError;
import kl.nbase.log.filter.JacksonFilterParam;

import java.util.*;

/**
 * 基于jacson实现的字段过滤工具类
 * @author liutao
 */
public class JacksonFiltersUtil {

    private JacksonFiltersUtil(){}

    /**
     * 过滤类中的指定字段,并返回json字符串
     * @param tobeFilterObject 待过滤的类
     * @param filterStr 指定的屏蔽字段
     * @return
     */
    public static String transJsonFilter(Object tobeFilterObject, String[] filterStr) {
        JacksonFilterParam filterParam = JacksonFilterParam.buildExcludeFilterParam(tobeFilterObject.getClass(), filterStr);
        return transJsonFilter(tobeFilterObject, Collections.singletonList(filterParam));
    }
    
    
    /**
     * 过滤json中的指定字段,并返回过滤后的json字符串，支持嵌套过滤
     
     * @return
     */
    public static String jsonFilter(String json, String[] filterStr) {
        ObjectMapper objectMapper = new ObjectMapper();
        Object jsonObject = null;
        try {
            jsonObject = objectMapper.readValue(json, Object.class);
        } catch (JsonProcessingException e) {
            throw LogInternalError.JSON_PROCESS_FAILED.toException(e);
        }
        return JacksonFiltersUtil.transJsonFilter(jsonObject, filterStr);
    }

    /**
     * 复杂的json字段过滤方式
     * @param tobeFilterObject 待过滤的类
     * @param filterParamList 过滤所需的自定义参数
     * @return
     */
    public static String transJsonFilter(Object tobeFilterObject, List<JacksonFilterParam> filterParamList) {
        ObjectMapper objectMapper = getMixObjectMapper(filterParamList);
        try {
            return objectMapper.writeValueAsString(tobeFilterObject);
        } catch (JsonProcessingException e) {
            throw LogInternalError.JSON_PROCESS_FAILED.toException(e);
        }
    }

    /**
     * 获取带过滤器的ObjectMapper
     * @param filterParamList
     * @return
     */
    public static ObjectMapper getMixObjectMapper(List<JacksonFilterParam> filterParamList) {
        ObjectMapper objectMapper = new ObjectMapper();
        SimpleFilterProvider simpleFilterProvider = new SimpleFilterProvider();

        // 两个过滤字段集合，对应include和exclude两种模式
        Set<String> includeToBeFilterFields = new HashSet<>();
        Set<String> excludeToBeFilterFields = new HashSet<>();
        for (JacksonFilterParam filterParam : filterParamList) {
            if (filterParam.isInclude()) {
                includeToBeFilterFields.addAll(filterParam.getToBeFilterFields());
                simpleFilterProvider.addFilter(filterParam.getFilterId(), SimpleBeanPropertyFilter.filterOutAllExcept(includeToBeFilterFields));
            } else {
                excludeToBeFilterFields.addAll(filterParam.getToBeFilterFields());
                simpleFilterProvider.addFilter(filterParam.getFilterId(), SimpleBeanPropertyFilter.serializeAllExcept(excludeToBeFilterFields));
            }

            // 由于目标类上没有JsonFilter注解，用于指定过滤器id，故使用混合方式
            objectMapper.addMixIn(filterParam.getToBeMixVo(), filterParam.getToBeMixFilter());

        }
        objectMapper.setFilterProvider(simpleFilterProvider);
        return objectMapper;
    }

    /**
     * 判断是否是json格式
     * @param json
     * @return
     */
    public static boolean isJsonStr(String json) {
        ObjectMapper objectMapper = new ObjectMapper();
        try {
            objectMapper.readTree(json);
            return true;
        } catch (JsonProcessingException e) {
            return false;
        }
    }
}

```

## 2.3 使用方式

### 方式1: 注解方式

```
@RestController
@RequestMapping("/dbConfig")
@Tag(name = "数据库配置")
@LogCollector(resolver = OperationLogResolver.class)
public class DbConfigController {

    @Resource
    DbConfigService dbConfigService;
    @Resource
    private ValidateHelper validateUtil;

    @GetMapping("/info")
    @Operation(summary = "查询数据库配置")
    @JsonFieldFilters(value = {
        @JsonFieldFilter(exclude = {"password"}, value = DbConfigInfo.class, type = JsonFieldFilter.JacksonFilterType.RESPONSE)
    })
    public RestResponse<DbConfigResponse> queryDbConfig() {
        SlotDataSourceConfig slotDataSourceConfig = dbConfigService.queryDbConfig();

        if (Objects.isNull(slotDataSourceConfig)) {
            return RestResponse.success(null);
        }

        return RestResponse.success(DbPropertiesHelper.translate2DbConfigResponse(slotDataSourceConfig));
    }
}

```

### 方式2: 工具类

```
package kl.nbase.log.utils;

import com.fasterxml.jackson.core.JsonProcessingException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

public class JacksonFiltersUtilTest {

    @Test
    void testJacksonFilters() throws JsonProcessingException {
        User user = new User("小明", "123456", "xiaoming@test.com", "15014568962");

        String result = JacksonFiltersUtil.transJsonFilter(user, new String[]{"password","phone"});
        Assertions.assertEquals("{\"userName\":\"小明\",\"email\":\"xiaoming@test.com\"}", result);
    }

    static class User{
        private String userName;
        private String password;
        private String email;
        private String phone;

        public User(String userName, String password, String email, String phone) {
            this.userName = userName;
            this.password = password;
            this.email = email;
            this.phone = phone;
        }

        public String getUserName() {
            return userName;
        }

        public User setUserName(String userName) {
            this.userName = userName;
            return this;
        }

        public String getPassword() {
            return password;
        }

        public User setPassword(String password) {
            this.password = password;
            return this;
        }

        public String getEmail() {
            return email;
        }

        public User setEmail(String email) {
            this.email = email;
            return this;
        }

        public String getPhone() {
            return phone;
        }

        public User setPhone(String phone) {
            this.phone = phone;
            return this;
        }
    }
}

```

### 关于嵌套过滤的使用



#### 1. 类过滤
如果存在以下的类关系,想过滤 City中的state信息
```
public class User {
    private String name;
    private City city;
}

public class City {
    private String name;
    private String state;
    private String street;
}
```
解决方案如下:
```
JacksonFilterParam filterParam = JacksonFilterParam.buildExcludeFilterParam(City.class, new String[]{"state"});

User user = new User("job", new City("上海", "2","a街道"));

String result = JacksonFiltersUtil.transJsonFilter(liutao, Collections.singletonList(filterParam));

```
如果想过滤 所有类中的name字段，解决方案如下:
```
JacksonFilterParam filterParam = JacksonFilterParam.buildExcludeFilterParam(Object.class, new String[]{"name"});

User user = new User("job", new City("上海", "2","a街道"));

String result = JacksonFiltersUtil.transJsonFilter(liutao, Collections.singletonList(filterParam));

```


#### 2. json字符串过滤
- 如果想过滤json字符串中的字段，有以下方案
```
    public static void main(String[] args) throws JsonProcessingException {
        String json = "{\n" +
            "  \"user\": {\n" +
            "    \"id\": 123,\n" +
            "    \"name\": \"John Doe\",\n" +
            "    \"email\": \"john.doe@example.com\",\n" +
            "    \"address\": {\n" +
            "      \"street\": \"123 Main St\",\n" +
            "      \"city\": \"Anytown\",\n" +
            "      \"state\": \"CA\",\n" +
            "      \"postal_code\": \"12345\"\n" +
            "    },\n" +
            "    \"phone_numbers\": [\n" +
            "      \"123-456-7890\",\n" +
            "      \"098-765-4321\"\n" +
            "    ]\n" +
            "  }\n" +
            "}";

        ObjectMapper objectMapper = new ObjectMapper();
        Object o = objectMapper.readValue(json, Object.class);
        String result = JacksonFiltersUtil.transJsonFilter(o, new String[]{"city"});
```
- 这种过滤方案 会过滤所有的 名为"city"的字段

# 3. 扩展

- 调用objectMapper.readValue时，如果不确定json的类格式，那么可以指定为Object.class
```
Object o = objectMapper.readValue(json, Object.class);
```
- 这样解析后的对象实际为 LinkedHashMap。


