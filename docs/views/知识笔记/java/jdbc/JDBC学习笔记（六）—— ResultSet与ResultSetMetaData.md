---
title: JDBC学习笔记（六）—— ResultSet与ResultSetMetaData
date: 2020-03-28
tags:
 - JDBC
categories:
 - 知识笔记
sidebar: 'auto'
---


## 1. ResultSet
- JDBC 使用 ResultSet 来封装 SQL 的查询结果，可以将 ResultSet 类比为数据库表的查询结果。
- 它拥有如下两个性质：
  - 可滚动。
  - 可更新。
- 这两个性质，是在创建 Statement 的时候决定的。
- 一般来说，我们使用以下 Connection 的方法创建 Statement：
```
      Statement createStatement() throws SQLException;
```
- 但实际上，Connection 还提供以下方法：
```
      Statement createStatement(int resultSetType, int resultSetConcurrency) throws SQLException;
```

### 1.1 可滚动
- ResultSet 通过移动指针来取出结果集的内容。
- 以下方法的第一个参数，用来控制 ResultSet 的指针移动策略。
```
Statement createStatement(int resultSetType, int resultSetConcurrency) throws SQLException;
```
- ResultSet 内部设置了3个常量值，来控制指针移动的策略：
```
int TYPE_FORWARD_ONLY = 1003;

int TYPE_SCROLL_INSENSITIVE = 1004;
 
int TYPE_SCROLL_SENSITIVE = 1005;

```
- TYPE_FORWARD_ONLY
  - 顾名思义，ResultSet 的指针只允许向后滚动，即只支持 next() 方法（SQLite 只支持这种模式）。
- TYPE_SCROLL_INSENSITIVE 和 TYPE_SCROLL_SENSITIVE
  - 这两个方法都能够实现任意的前后滚动，使用各种移动的 ResultSet 指针的方法，区别在于两者对于修改数据的敏感性。
  - TYPE_SCROLL_SENSITIVE 仅针对已经取出来的记录的更改（update、delete）敏感，对新增（insert）的数据不敏感，部分数据库驱动，这两个常量没有太大区别
- ResultSet 提供了以下8个接口，来支持它可滚动的特性：
```
// 向后滚动
boolean next() throws SQLException;
 
// 向前滚动
boolean previous() throws SQLException;
 
// 移动到相对当前行的第几行
boolean relative( int rows ) throws SQLException;
 
// 移动到整个 ResultSet 中的第几行
boolean absolute( int row ) throws SQLException;
 
// 移动到第一行
boolean first() throws SQLException;
 
// 移动到最后一行
boolean last() throws SQLException;
 
// 移动到第一行的前一行（没有数据）
void beforeFirst() throws SQLException;
 
// 移动到最后一行的后一行（没有数据）
void afterLast() throws SQLException;
```

### 1.2 可更新
- 以下方法的第二个参数，用来控制 ResultSet 的并发类型：
```
Statement createStatement(int resultSetType, int resultSetConcurrency) throws SQLException;
```
- 这个参数可以接收以下2个值：
```
  int CONCUR_READ_ONLY = 1007;
   
  int CONCUR_UPDATABLE = 1008;
```
- CONCUR_READ_ONLY 表示 ResultSet 是只读的并发模式（默认）。
- CONCUR_UPDATABLE 表示 ResultSet 是可更新的并发模式。
- 一旦将并发模式设置成 CONCUR_UPDATABLE，那么 JDBC API 就提供了一系列的 updateXxx(int columnIndex, Xxx value) 方法去更新 ResultSet 的数据。
- **这些数据的 UPDATE，会直接反应到数据库中**

### 1.3 DEMO
```
package com.liutao.demo;
 
import com.liutao.entity.Student;
import com.liutao.util.Connector;
import com.liutao.util.DriverLoader;
 
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
 
public final class ResultSetDemo {
 
    public static void main(String[] args) {
        String sql = "SELECT * from STUDENT";
 
        DriverLoader.loadSqliteDriver();
        try (Connection conn = Connector.getSqlConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
 
            dealResultSet(rs);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
 
    private static void dealResultSet(ResultSet rs) throws SQLException {
        while (rs.next()) {
            int id = rs.getInt(1);
            String name = rs.getString(2);
            String password = rs.getString(3);
            Student student = new Student(id, name, password);
            System.out.println(student);
        }
    }
}
```

## 2. ResultSetMetaData
- ResultSet 提供了一个 getMetaData() 方法，用来获取 ResultSet 对应的 ResultSetMetaData 对象：
```
ResultSetMetaData getMetaData() throws SQLException;
```
- MetaData 即元数据，就是描述其他数据的数据。
- ResultSetMetaData 封装了描述 ResultSet 对象的数据，内部提供了大量的方法来分析 ResultSet 的返回信息，其中最常用的有以下三个方法：
  - getColumnCount: 返回该 ResultSet 的列数量。
  - getColumnName: 返回指定索引的列名。
  - getColumnType: 返回指定索引的列类型。
- 虽然 ResultSetMetaData 对于分析查询结果有很大的便宜，但是它会消耗一定的系统开销，所以如果使用 ResultSet 就足以完成对查询结果的处理，就没有必要使用 ResultSetMetaData。
- 最后一点需要注意的是，无论是 ResultSet 还是 ResultSetMetaData，都是需要释放资源的。
- 换言之，对于查询结果的分析一定要在释放资源之前完成，所以以下代码的写法是错误的：
```
package com.liutao.demo;
 
import com.liutao.constants.ErrorCode;
import com.liutao.exception.JdbcSampleException;
import com.liutao.util.Connector;
import com.liutao.util.DriverLoader;
 
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
 
public final class TypicalWrongCase {
 
    public static void main(String[] args) {
        String sql = "SELECT * from STUDENT";
        ResultSet resultSet = executeQuery(sql);
        dealResultSet(resultSet);
    }
 
    public static ResultSet executeQuery(String sql) {
        DriverLoader.loadSqliteDriver();
        try (Connection conn = Connector.getSqlConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {
            return rs;
        } catch (SQLException e) {
            String msg = "Fail to execute QUERY using prepared statement.";
            throw new JdbcSampleException(ErrorCode.EXECUTE_QUERY_FAILURE, msg);
        }
    }
 
    private static void dealResultSet(ResultSet rs) {
        // do something with ResultSet
    }
}
```