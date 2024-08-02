---
title: 调用pstmt.addBatch()方法出现不允许的操作
date: 2024-06-27
tags:
 - JDBC
categories:
 - 问题记录
sidebar: 'auto'
---

## 1. 问题
- Oracle数据库下,使用jdbc批量执行sql操作，出现java.sql.SQLException: 不允许的操作: operation cannot be mixed with Oracle-style batching
- 代码如下:
```
try (PreparedStatement ps = conn.prepareStatement("INSERT INTO students (name, gender, grade, score) VALUES (?, ?, ?, ?)")) {
    // 对同一个PreparedStatement反复设置参数并调用addBatch():
    for (Student s : students) {
        ps.setString(1, s.name);
        ps.setBoolean(2, s.gender);
        ps.setInt(3, s.grade);
        ps.setInt(4, s.score);
        ps.addBatch(); // 添加到batch
    }
    // 执行batch:
    int[] ns = ps.executeBatch();
    for (int n : ns) {
        // batch中每个SQL执行的结果数量
        System.out.println(n + " inserted."); 
    }
}
```
- 如上，代码运行至addBatch方法时，便抛出异常

## 2. 原因
- 查看 OraclePreparedStatement.class 中 addBatch方法：
```
public void addBatch() throws SQLException {
        synchronized(this.connection) {
            this.setJdbcBatchStyle();
            this.processCompletedBindRow(this.currentRank + 2, this.currentRank > 0 && this.sqlKind.isPlsqlOrCall());
            ++this.currentRank;
        }
}

final void setJdbcBatchStyle() throws SQLException {
        if (this.m_batchStyle == 1) {
            SQLException var1 = DatabaseError.createSqlException(this.getConnectionDuringExceptionHandling(), 90, "operation cannot be mixed with Oracle-style batching");
            var1.fillInStackTrace();
            throw var1;
        } else {
            this.m_batchStyle = 2;
        }
}
```

- addBatch 和 executeBatch 会校验批处理模式，只有在 JDBC标准模式下 才能够使用
- 由于 m_batchStyle 在问题代码中不知何原因属性为 1，也就是批量操作模式为Oracle，所以导致了报错。

### 2.1 关于批量操作模式
- Oracle JDBC 支持两种不同的更新批处理模型：
  - 标准模型，实现 JDBC 2.0 规范，称为标准更新批处理
  - Oracle 特定模型，独立于 JDBC 2.0 规范，称为 Oracle 更新批处理
- 需要注意的是，您不能混合使用这些模型。在任何单个应用程序中，您只能使用其中一种模型，但不能同时使用这两种模型。如果混合使用这些模型，Oracle JDBC 驱动程序将引发异常。

## 4. 异常解决方案

- 默认情况下，批量模式一般为 JDBC，那么为何在上诉代码中，会变成了Oracle模式呢？ 可能由以下原因造成的：
  - 显示调用了 ((OracleConnection)conn).setDefaultExecuteBatch(..)方法，该方法会将模式设置为Oracle批处理模式
  - 在连接上使用了连接属性defaultBatchValue或数据源中的类似属性,这将禁止 JDBC 标准批处理，并使用特定于 Oracle 驱动程序的某种内部批处理机制
- 那么就有以下两种解决方案
  - 1. 使用与批处理模式一致的操作方法，即Oracle模式下，使用 sendBatch 方法
  - 2. 调整连接属性或去除显示或隐式设置了Orclae模式方法，使得批处理模式为 Jdbc标准模式


## 5. 扩展：两种批处理方法的区别

- sendBatch()是 Oracle 版本的批处理。Oracle 表示，使用该版本更适合 Oracle，并且性能更高。Oracle 批处理仅支持PreparedStatement。
- executeBatch()是 jdbc 标准版本。如果您的程序应该兼容 jdbc，请使用该方法进行批处理。它可能性能较差（根据 oracle 文档），但您的代码与其他 jdbc 驱动程序兼容。

### 5.1 sendBatch的使用示例

```
OracleDataSource ods = new OracleDataSource();
ods.setURL("jdbc:oracle:oci);
ods.setUser("scott");
ods.setPassword("tiger");

Connection conn = ods.getConnection();
conn.setAutoCommit(false);

PreparedStatement ps = 
  conn.prepareStatement("insert into dept values (?, ?, ?)"); 
     
//将此语句的批处理大小更改为 3 
((OraclePreparedStatement)ps).setExecuteBatch (3);
 
ps.setInt(1, 23); 
ps.setString(2, "Sales"); 
ps.setString(3, "USA"); 
//JDBC 将此排队以供稍后执行
ps.executeUpdate(); 
 
ps.setInt(1, 24); 
ps.setString(2, "Blue Sky"); 
ps.setString(3, "Montana"); 
//JDBC 将此排队以供稍后执行
ps.executeUpdate(); 
 
ps.setInt(1, 25); 
ps.setString(2, "Applications"); 
ps.setString(3, "India"); 
/队列大小等于批处理值 3， JDBC 将请求发送到数据库
ps.executeUpdate();

ps.setInt(1, 26); 
ps.setString(2, "HR"); 
ps.setString(3, "Mongolia"); 
// JDBC 将此请求排队以供稍后执行
ps.executeUpdate();
 
// JDBC 发送排队的请求
((OraclePreparedStatement)ps).sendBatch();
conn.commit();

ps.close();
```



## 6. 参考文档

- 关于Oracle批处理的参考文档: https://docs.oracle.com/cd/B28359_01/java.111/b31224/oraperf.htm