---
title: JDBC学习笔记（九）—— DataSource
date: 2020-04-01
tags:
 - JDBC
categories:
 - 知识笔记
sidebar: 'auto'
---


## 1. DataSource

- 在 JDBC 的实现过程中，最消耗资源的从来不是执行 SQL 之类的过程，而是获取-释放 数据库连接 Connection 的过程。
- 之前通过 DriverManager 获得的数据库连接对象，每一个 Connection 对应一个物理连接。
- 每一次操作都会打开一个物理连接，操作结束释放连接，这回造成极大的性能问题。
- 为了解决这个问题，JDBC 引入了数据源（数据库连接池+连接池管理）的概念，也就是 DataSource 接口。
- DataSource 在系统启动时，建立了足够多的 Connection，这些 Connection 组成了一个连接池。
- 每一次程序请求数据库连接，就从连接池中取出已有的连接，使用完毕之后不关闭 Connection，而是将 Connection 归还给连接池。
- DataSource 的本质就是一个工厂，用来管理 Connection。
- DataSource 的常用参数有：
  - 数据库初始连接数
  - 连接池最大连接数
  - 连接池最小连接数
  - 连接池每次增加容量
- DataSource 只是一个接口，具体的实现由数据库厂商和一些开源组织开发，比较著名的有：
  - DBCP 数据源（Tomcat）
  - Druid 数据源 （alibaba）
  - C3P0 数据源（Hibernate）
 