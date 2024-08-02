---
title: JDBC学习笔记（八）—— 事务
date: 2020-04-01
tags:
 - JDBC
categories:
 - 知识笔记
sidebar: 'auto'
---


## 1. 事务

在关系型数据库中，有一个很重要的概念，叫做事务（Transaction）。它具有 ACID 四个特性：
- A（Atomicity）：原子性，一个事务是一个不可分割的工作单位，事务中包括的诸操作要么都做，要么都不做。
- C（Consistency）：一致性，事务必须是使数据库从一个一致性状态变到另一个一致性状态。
- I（Isolation）：隔离性，一个事务的执行不能被其他事务干扰。
- D（Durability）：持久性，，指一个事务一旦提交，它对数据库中数据的改变就应该是永久性的。

## 2. JDBC的事务支持

- JDBC 是使用 Connection 来控制事务的。
- Connection 默认使用自动提交策略，即关闭事务，这种情况下，每一条 SQL 语句一旦执行，就会立即提交到数据库，无法回滚。
- Connection 提供了以下三个事务相关的接口：
```
// 关闭自动提交，开启事务
void setAutoCommit(boolean autoCommit) throws SQLException;
 
// 提交事务
void commit() throws SQLException;
 
// 回滚事务
void rollback() throws SQLException;
```
- setAutoCommit(boolean autoCommit) 方法其实做了两件事情：
  - 更改提交策略
  - 开启事务
- commit() 方法负责将一个事务内部的所有 SQL 语句一次性提交（全部执行，或者全部不执行）。
- rollback() 方法负责回滚事务。
- 对于 rollback，有一点需要特别注意，如果系统遇到一个未处理的 SQLException，程序会自动回滚；反之，如果这个异常被捕获，则需要手动回滚。

## 3. Savepoint
- JDBC 另外提供了一个 Savepoint 接口，用来实现事务部分提交。
- 有时候，我们并不希望一个事务全部执行，或者全部不执行，可能会有这样的需求：
- 如果执行到某一步出错，回滚的时候返回之前开启事务之后的某一个点。
- 这时候就需要 Savepoint（这个和 Hiberbate 的隔离级别很类似）。
- 通过以下示例代码，在执行 sql3 的时候出错，但是由于在执行完 sql1 的时候使用了 Savepoint，所以第一条 SQL 语句的执行结果会保留到数据库中：
```
package com.liutao.demo;
 
import com.liutao.util.Connector;
import com.liutao.util.DriverLoader;
 
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Savepoint;
import java.sql.Statement;
 
public final class SavePointDemo {
 
    public static void main(String[] args) {
        String sql1 = "INSERT INTO STUDENT (STUDENT_NAME, STUDENT_PASSWORD) VALUES ('Ramsey', '999999')";
        String sql2 = "INSERT INTO STUDENT (STUDENT_NAME, STUDENT_PASSWORD) VALUES ('Wilshere', '888888')";
        // Invalidate SQL
        String sql3 = "INSERT INTO STUDENT VALUES(1, 'Ramsey', '999999')";
 
        DriverLoader.loadSqliteDriver();
        try (Connection conn = Connector.getSqlConnection()) {
            conn.setAutoCommit(false);
            Savepoint save1 = null;
            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate(sql1);
                save1 = conn.setSavepoint();
                stmt.executeUpdate(sql2);
                stmt.executeUpdate(sql3);
            } catch (SQLException e) {
                conn.rollback(save1);
            }
            conn.commit();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
```

