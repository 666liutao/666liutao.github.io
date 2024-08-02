---
title: JDBC学习笔记（一）—— JDBC 基础
date: 2020-03-15
tags:
 - JDBC
categories:
 - 知识笔记
sidebar: 'auto'
---


## 1. 什么是 JDBC

- JDBC，Java Database Connectivity（Java 数据库连接），是一组执行 SQL 语句的 Java API。
- JDBC，是 Java SE（Java Platform, Standard Edition）标准的一部分。
- Java 程序可以通过 JDBC 连接到关系型数据库，并且使用 SQL（Structured Query Language，结构化查询语言）完成对数据库的操作。
- 我们开发时常用的 ORM 框架（Object Relational Mapping），例如 Hibernate，MyBatis，其本质就是对 JDBC 的一种封装。

## 2. JDBC 驱动和面向接口编程
- Java API，就是接口（interface），所以说 JDBC 只给出了接口，没有提供实现类。
- 由各个数据库的厂商提供 JDBC 的实现，这些实现类就是我们口中常说的：驱动程序。
- JDBC 的编程工作，是需要面向标准的 JDBC API，不需要关心使用的数据库到底是什么。
- 使用 Oracle，DB2，还是 MyBatis 对于 JDBC 的编程都没有影响，这就是面向接口编程。
- 理论上说，如果需要切换数据库，只需要换一个驱动程序就可以了，所以说，JDBC 具有跨数据库的特性。
- 当然实际操作上没有这么简单，因为 JDBC 跨数据库的特性是基于全部使用标准的 SQL 语句，而某些数据库会有一些只有自己才能用的特殊 SQL 语法。
  - 例如，Oracle 的 rowid、rownum，MySQL 的 limit。

## 3. JDBC 组成和功能

JDBC的总体结构有四个组件：应用程序、驱动程序管理器、驱动程序和数据源： 

![img](https://github.com/liutao1996/images/blob/main/note/jdbc/jdbc%E7%BB%84%E6%88%90.png?raw=true)

JDBC 主要有以下三个功能：
- 建立程序与数据库的连接。
- 执行 SQL 语句。
- 获得 SQL 语句的执行结果。

## 4. JDBC 和 ODBC

- ODBC，Open Database Connectivity（开放数据库连接），也是一组通过 API 访问数据库的技术。
- ODBC 先于 JDBC 的出现，JDBC 模仿了 ODBC 的设计。
- 与 JDBC 相同，ODBC 需要数据库厂商提供驱动，支持数据库之间的切换，而 ODBC 负责管理数据库驱动。
- 相比于 ODBC，JDBC 有以下优势：
  - JDBC 对于数据库的操作更加简单、直观。(ODBC使用前需要在系统中安装并配置ODBC驱动程序和数据源,比较复杂)
  - JDBC 具有更高的安全性。