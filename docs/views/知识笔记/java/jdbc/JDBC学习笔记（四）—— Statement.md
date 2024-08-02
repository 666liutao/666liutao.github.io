---
title: JDBC学习笔记（四）—— Statement
date: 2020-03-26
tags:
 - JDBC
categories:
 - 知识笔记
sidebar: 'auto'
---


## 概述

- JDBC 使用 Statement 作为 SQL 语句的执行器。
- Statement 通过 Connection.createStatement() 方法创建，一共支持以下6种方式执行 SQL 语句：
  - execute()
  - executeUpdate()
  - executeQuery() 
  - executeLargeUpdate() 
  - executeBatch()
  - executeLargeBatch()

## 1. execute()
```
boolean execute(String sql) throws SQLException;
```
- execute() 方法，提供了一个通用的接口去执行 SQL 语句，它能够接受任何 SQL 语句，返回的布尔值是判断是否有 ResultSet 返回。
- Statement 提供了一下两个接口去获得 execute() 真正的执行结果（分别针对 executeUpdate() 和 executeQuery() 的情况）：
```
ResultSet getResultSet() throws SQLException;
 
int getUpdateCount() throws SQLException;
```

## 2. executeUpdate()

```
int executeUpdate(String sql) throws SQLException;
```
- executeUpdate() 方法，是用来执行 DML 语句中的 INSERT, DELETE, UPDATE，返回受这个 DML 语句影响的行数。
- 但是，这个方法，在执行 SELECT 语句，或者是 DDL、DCL 语句也不会出错，并且能够正确执行，返回结果是0。

## 3. executeQuery()

```
ResultSet executeQuery(String sql) throws SQLException;
```
- executeQuery() 方法，是用来执行 DML 语句中的 SELECT，返回 ResultSet 结果集。
- 这个方法在执行非 SELECT 的 SQL 语句时，会抛出异常，执行的内容不会影响数据库。
```
java.sql.SQLException: query does not return ResultSet
    at org.sqlite.jdbc3.JDBC3Statement.executeQuery(JDBC3Statement.java:85)
    at com.gerrard.demo.StatementDemo.main(StatementDemo.java:20)
```
## 4. executeLargeUpdate()

- 在 Java8 中，还新增了 executeLargeUpdate() 方法，针对更新行数超过 Integer.MAX_VALUE 的情况：
```
default long executeLargeUpdate(String sql) throws SQLException {
     throw new UnsupportedOperationException("executeLargeUpdate not implemented");
}
```
- executeLargeUpdate() 方法适用的范围很小，返回结果是 long 型，接受的 SQL 语句与 executeUpdate() 完全相同。
- 很多数据库厂商都没有开放对 executeLargeUpdate() 的支持。

## 5. executeBatch()
- Statement 还提供了 executeBatch() 方法来支持 SQL 语句的批处理：
```
int[] executeBatch() throws SQLException;
```
- 使用 executeBatch() 方法，首先需要通过 addBatch() 方法注入 SQL 语句：
```
void addBatch( String sql ) throws SQLException;
```
- 这里需要注意的是，executeBatch() 不支持 SELECT 语句。

## 6. executeLargeBatch()
   
- 与 executeUpdate() 类似，Java8 提供了 executeLargeBatch() 方法增强批量更新。
- 批处理的时候，任意一条 SQL 语句返回值大于 Integer.MAX_VALUE，就要使用这个方法：
```
default long[] executeLargeBatch() throws SQLException {
       throw new UnsupportedOperationException("executeLargeBatch not implemented");
}
```

## 代码示例

```
package com.liutao.demo;
 
import com.liutao.util.Connector;
import com.liutao.util.DriverLoader;
 
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
 
public final class StatementDemo {
 
    public static void main(String[] args) {
 
        String querySql = "SELECT * from STUDENT";
        String updateSql1 = "UPDATE STUDENT SET STUDENT_PASSWORD = '123456' WHERE STUDENT_PASSWORD = '123456'";
        String updateSql2 = "UPDATE STUDENT SET STUDENT_PASSWORD = '223456' WHERE STUDENT_PASSWORD = '223456'";
 
        DriverLoader.loadSqliteDriver();
        try (Connection conn = Connector.getSqlConnection();
             Statement stmt = conn.createStatement()) {
 
            // execute
            boolean hasResult = stmt.execute(updateSql1);
            if (hasResult) {
                System.out.println("Execute query success");
            } else {
                System.out.println("Execute update success, affect" + stmt.getUpdateCount() + " rows");
            }
 
            // executeUpdate
            int rowCount1 = stmt.executeUpdate(updateSql1);
            System.out.println("Affected " + rowCount1 + " rows");
 
            // executeQuery
            try (ResultSet rs = stmt.executeQuery(querySql)) {
                int counter = 0;
                while (rs.next()) {
                    counter++;
                }
                System.out.println(counter + " students in all");
            }
 
            // executeBatch
            stmt.addBatch(updateSql1);
            stmt.addBatch(updateSql2);
            stmt.addBatch(updateSql1);
            int[] results = stmt.executeBatch();
            for (int result : results) {
                System.out.println("Affected " + result + " rows");
            }
 
            // executeLargeUpdate
            stmt.executeLargeUpdate(updateSql1);
 
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
```

