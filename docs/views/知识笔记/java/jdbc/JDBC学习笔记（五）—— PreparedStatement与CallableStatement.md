---
title: JDBC学习笔记（五）—— PreparedStatement与CallableStatement
date: 2020-03-28
tags:
 - JDBC
categories:
 - 知识笔记
sidebar: 'auto'
---


## 1. PreparedStatement

- PreparedStatement 是 Statement 的子接口，它支持以下4种执行 SQL 的方式：
  - execute()
  - executeUpdate()
  - executeQuery() 
  - executeLargeUpdate() 
- 同时，PreparedStatement 提供了一系列的 setXxx(int index, Xxx value) 来支持对于 ？ 占位符的替换。Xxx 是占位符的数据类型。
- 如果不确定数据类型，可以通过 setObject() 方法来传入数据。
- PreparedStatement 通过 Connection.createPreparedStatement(String sql) 方法创建，主要用来反复执行一条结构相似的 SQL 语句。
```
INSERT INTO STUDENT (STUDENT_NAME, STUDENT_PASSWORD) VALUES (?, ?);
```

### PreparedStatement的优势
- 通过预编译 SQL 语句的方式（即创建 PreparedStatement 的时候，就将 SQL语句传递进去），大大降低了多次执行相似的 SQL 语句的效率。
- 需要传递参数的时候，无需拼接 SQL 语句，降低了编程的复杂度。
- 防止 SQL 注入。

## 2. CallableStatement
- 在大型关系型数据库中，有一组为了完成特定功能的 SQL 语句集被称为存储过程（Stored Procedure），它是数据库中的对象。
- JDBC 使用 CallableStatement 对象，完成对存储过程的操作。
- CallableStatement 通过 Connection.prepareCall(String sql)  方法创建。
- 与 PreparedStatement 相似，提供了一系列的 setXxx(int index, Xxx value) 来支持存储过程的入参传递。
- 同样的，不确定数据类型，可以通过 setObject() 方法来传入数据。
- 另外，存储过程是可以有输出的，通过 registerOutParameter(int parameterIndex, int sqlType) 方法来注册输出项。

### 示例

假设现在有如下存储过程定义：
```
create procedure add_pro(a int, b int, out sum int)
begin
set sum = a + b;
end
```

通过如下代码调用：
```
package com.liutao.executor;
 
import com.liutao.constants.ErrorCode;
import com.liutao.exception.JdbcSampleException;
import com.liutao.util.Connector;
import com.liutao.util.DriverLoader;
 
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Types;
 
public final class SqlExecutorCallableStatement {
 
 
    /*
       create procedure add_pro(a int, b int, out sum int)
       begin
       set sum = a + b;
       end
     */
    public static void callProcedure() {
        DriverLoader.loadSqliteDriver();
        try (Connection conn = Connector.getSqlConnection();
             CallableStatement cstmt = conn.prepareCall("{call add_pro(?, ?)}")) {
 
            cstmt.setObject(1, "1");
            cstmt.setObject(2, "2");
            cstmt.registerOutParameter(3, Types.INTEGER);
 
            cstmt.execute();
            System.out.println("Result:" + cstmt.getObject(3));
        } catch (SQLException e) {
            throw new JdbcSampleException(ErrorCode.CALL_PROCEDURE_FAILURE, e.getMessage());
        }
    }
 
    public static void main(String[] args) {
        callProcedure();
    }
}
```

