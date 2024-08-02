---
title: JDBC学习笔记（七）—— 搭建简易ORM框架
date: 2020-03-28
tags:
 - JDBC
categories:
 - 知识笔记
sidebar: 'auto'
---


## 1. 什么是ORM框架
- 当我们获取到 ResultSet 之后，显然这个不是我们想要的数据结构。
- 数据库中的每一个表，在 Java 代码中，一定会有一个类与之对应，此时我们就需要ORM框架。
- ORM（对象关系映射，Object-Relational Mapping）框架是一种将面向对象编程语言中的对象与关系型数据库中的表进行映射的技术。
- 工作原理
  - 对象映射：ORM将编程语言中的类（Class）映射到数据库中的表，将类的实例（对象）映射到表中的行，将类的属性映射到表中的列。
  - 查询映射：ORM将对象的方法调用转换为数据库查询语句。例如，你可以通过对象的方法来创建、读取、更新和删除数据库中的数据。
- 优势
  - 提高开发效率：开发者可以通过操作对象来进行数据库操作，而无需关注底层的SQL语句。
  - 数据库独立性：ORM使得应用程序可以在不同的数据库之间切换而不需要修改大量代码。
  - 维护性和可读性：代码更具可读性和维护性，因为开发者操作的是编程语言的对象而不是复杂的

### 1.1 常见的ORM框架
- Hibernate
  - Hibernate 框架是一个全表映射的框架。通常开发者只要定义好持久化对象到数据库表的映射关系，就可以通过 Hibernate 框架提供的方法完成持久层操作
  - 开发者并不需要熟练地掌握 SQL 语句的编写，Hibernate 框架会根据编制的存储逻辑，自动生成对应的 SQL，并调用 JDBC 接口来执行，所以其开发效率会高于 MyBatis 框架。
- MyBatis 
  - 是一个半自动映射的框架。这里所谓的“半自动”是相对于 Hibernate 框架全表映射而言的，MyBatis 框架需要手动匹配提供 POJO、SQL 和映射关系，而 Hibernate 框架只需提供 POJO 和映射关系即可
- JPA
  - Java Persistence API：用于对象持久化的 API。
  - Java EE 5.0 平台标准的 ORM 规范，使得应用程序以统一的方式访问持久层
  - JPA 是 hibernate 的一个抽象（就像JDBC和JDBC驱动的关系）
  - JPA 是规范：JPA 本质上就是一种 ORM 规范，不是ORM 框架 —— 因为 JPA 并未提供 ORM 实现，它只是制订了一些规范，提供了一些编程的 API 接口，但具体实现则由 ORM 厂商提供实现。
  - Hibernate 是实现：Hibernate 除了作为 ORM 框架之外，它也是一种 JPA 实现从功能上来说， JPA 是 Hibernate 功能的一个子集。

## 2. 反射+注解实现简易ORM
- 第一步，定义一个注解。
```
package com.liutao.annotation;
 
import java.lang.annotation.*;
 
@Documented
@Inherited
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface ColumnAnnotation {
 
    String column() default "";
}
```

- 第二步，将注解加到 JavaBean 中。
```
package com.liutao.entity;
 
import com.liutao.annotation.ColumnAnnotation;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
 
@Data
@NoArgsConstructor
@AllArgsConstructor
public final class Student {
 
    @ColumnAnnotation(column = "STUDENT_ID")
    private int id;
 
    @ColumnAnnotation(column = "STUDENT_NAME")
    private String name;
 
    @ColumnAnnotation(column = "STUDENT_PASSWORD")
    private String password;
}
```
- 第三步，在创建转换类的时候，完成数据库列名-JavaBean 属性的映射关系的初始化。
- 第四步，对 ResultSetMetaData 分析时，使用反射，将值注入到对应的 Field 中。
```
package com.liutao.orm;
 
import com.liutao.annotation.ColumnAnnotation;
import com.liutao.constants.ErrorCode;
import com.liutao.exception.JdbcSampleException;
 
import java.lang.reflect.Field;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.util.HashMap;
import java.util.Map;
 
public final class FlexibleResultSetAdapter<T> implements ResultSetAdapter<T> {
 
    private Map<String, Field> columnMap = new HashMap<>();
 
    private Class<T> clazz;
 
    public FlexibleResultSetAdapter(Class<T> clazz) {
        this.clazz = clazz;
        initColumnMap(clazz);
    }
 
    private void initColumnMap(Class<T> clazz) {
        for (Field field : clazz.getDeclaredFields()) {
            ColumnAnnotation annotation = field.getAnnotation(ColumnAnnotation.class);
            columnMap.put(annotation.column(), field);
        }
    }
 
    @Override
    public T transferEntity(ResultSet rs, ResultSetMetaData meta) {
        try {
            T t = clazz.newInstance();
            for (int i = 1; i <= meta.getColumnCount(); ++i) {
                String dbColumn = meta.getColumnName(i);
                Field field = columnMap.get(dbColumn);
                if (field == null) {
                    throw new JdbcSampleException(ErrorCode.MISSING_COLUMN_ERROR, "Fail to find column " + dbColumn + ".");
                }
                field.setAccessible(true);
                field.set(t, rs.getObject(i));
            }
            return t;
        } catch (Exception e) {
            String msg = "Fail to get ORM relation for class: " + clazz.getName();
            throw new JdbcSampleException(ErrorCode.MISSING_COLUMN_ERROR, msg);
        }
    }
}
```

- 最后，对 ORM 进行封装。
```
  package com.liutao.executor;
   
  import com.liutao.constants.ErrorCode;
  import com.liutao.exception.JdbcSampleException;
  import com.liutao.orm.ResultSetAdapter;
  import com.liutao.util.Connector;
  import com.liutao.util.DriverLoader;
  import lombok.AllArgsConstructor;
  import lombok.NoArgsConstructor;
   
  import java.sql.Connection;
  import java.sql.ResultSet;
  import java.sql.SQLException;
  import java.sql.Statement;
  import java.util.LinkedList;
  import java.util.List;
   
  @NoArgsConstructor
  @AllArgsConstructor
  public final class SqlExecutorStatement<T> implements SqlExecutor<T> {
   
      private ResultSetAdapter<T> adapter;
   
      @Override
      public int executeUpdate(String sql) {
          DriverLoader.loadSqliteDriver();
          try (Connection conn = Connector.getSqlConnection();
               Statement stmt = conn.createStatement()) {
              return stmt.executeUpdate(sql);
          } catch (SQLException e) {
              String msg = "Fail to execute query using statement.";
              throw new JdbcSampleException(ErrorCode.EXECUTE_UPDATE_FAILURE, msg);
          }
      }
   
      @Override
      public List<T> executeQuery(String sql) {
          DriverLoader.loadSqliteDriver();
          try (Connection conn = Connector.getSqlConnection();
               Statement stmt = conn.createStatement()) {
              List<T> list = new LinkedList<>();
              try (ResultSet rs = stmt.executeQuery(sql)) {
                  while (rs.next()) {
                      list.add(adapter.transferEntity(rs, rs.getMetaData()));
                  }
              }
              return list;
          } catch (SQLException e) {
              String msg = "Fail to execute query using statement.";
              throw new JdbcSampleException(ErrorCode.EXECUTE_QUERY_FAILURE, msg);
          }
      }
  }
```

 