---
title: JDBC学习笔记（三）—— 常用接口、类以及使用步骤
date: 2020-03-25
tags:
 - JDBC
categories:
 - 知识笔记
sidebar: 'auto'
---


## 1. JDBC 常用接口和类

### 1.1 DriverManager

- 负责管理 JDBC 驱动的服务类，程序中主要的功能是获取连接数据库的 Connection 对象。

### 1.2 Connection

- 代表一个数据库连接对象，要访问数据库，首先需要获得数据库连接。
- 同时，Connection 接口提供了获取执行 SQL 语句的 Statement 和 PreparedStatement 对象，以及控制事物（Transaction）的方法。

### 1.3 Statement
- 用于执行 SQL 语句的接口，同时支持执行 DDL（Data Definition Language），DCL（Data Control Language），DML（Data Manipulation Language）语句。
- 我们常用的 CRUD 操作是 DML 语句。

 
### 1.4 PreparedStatement
- Statement 的子接口，代表一个预编译的 Statement 对象。
- 所谓预编译，就是事先将 SQL 传入到 PreparedStatement 对象中，不必每一次在执行的时候加载 SQL 语句，所以在性能上会有所提高。
- 常用来执行带参数的 SQL 语句。

### 1.5 ResultSet
- SQL 语句执行后的结果集对象。
- 当 Statement 或者其子接口，执行的是一个查询的 DML 语句，其返回就会是一个 ResultSet 对象。
- ResultSet 中包含访问查询结果的方法。

## 2. JDBC编程步骤
- 加载数据库驱动。
- 通过 DriverManager 获取数据库连接 Connection。
- 通过 Connection 对象创建 Statement 对象（Statement，PreparedStatement，CallableStatement）。
- 外部传入 SQL 语句，使用 Statement 执行 SQL。
- 如果 SQL 是一个查询语句，操作结果集 ResultSet。
- 回收数据库资源（实现 Closeable/AutoCloseable 的 Connection，Statement 和 ResultSet）。

### 2.1 加载数据库驱动
        
- 通常来说，JDBC 使用 Class 类的 forName() 静态方法来加载驱动，需要输入数据库驱动代表的字符串。
- 例如：
```
加载 MySQL 驱动：
        Class.forName("com.mysql.jdbc.Driver");

加载 Oracle 驱动：
        Class.forName("oracle.jdbc.driver.OracleDriver");

加载 SQLite 驱动：
        Class.forName("org.sqlite.JDBC");
```
- 这些数据库驱动的字符串，可以在数据库厂商提供的驱动（jar 包）找到，例如我使用的 SQLite：
```
<dependency>
   <groupId>org.xerial</groupId>
   <artifactId>sqlite-jdbc</artifactId>
   <version>3.8.11.2</version>
</dependency>
```
- 在下面这个文件内，就存放着该驱动的字符串：
```
org\xerial\sqlite-jdbc\3.8.11.2\sqlite-jdbc-3.8.11.2.jar!\META-INF\services\java.sql.Driver
```

### 2.2 获取数据库连接

- DriverManagement 提供了一系列的方法，来获取 Connection，每一个 Connection 代表一个对数据库的物理连接：

```
public static Connection getConnection(String url, java.util.Properties info) throws SQLException
public static Connection getConnection(String url, String user, String password) throws SQLException
public static Connection getConnection(String url) throws SQLException
```

- 对于大多数的数据而言，获取 Connection 需要数据库 URL，登陆数据库的用户和密码。
- 数据库 URL 遵循如下写法：
```
jdbc:subprotocol:other stuff
```
- 上面的写法中，jdbc 是固定的，subprotocol 指特定的数据库驱动协议，而后面的 other 和 stuff 则不固定，不同的数据库写法也存在差异。
- 特定的数据库 URL 写法，在 JDBC 驱动文档中会提供。