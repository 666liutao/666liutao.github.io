---
title: sqlite3的编译、安装和使用
date: 2023-04-07
tags:
 - sqlite3
categories:
 - 随笔记录
sidebar: 'auto'
---


## 背景

- 一些国产机器平台下，没有相应的sqlite安装包
- 故需要手动完成编译


## 1. sqlite3 源码下载

- 官网: https://www.sqlite.org/download.html
- github地址: https://github.com/sqlite/sqlite
- 编译参考文档: https://www.sqlite.org/howtocompile.html

## 2. sqlite3 在linux下的编译

- 将sqlite-amalgamation-xxx.zip解压，包含：shell.c、sqlite3.c、sqlite3.h、sqlite3ext.h几个文件

### 2.1 编译命令行管理工具
```
gcc shell.c sqlite3.c -lpthread -ldl -o sqlite3　　//将生成sqlit3命令行管理工具
```
- 编译完成后生成可执行文件sqlite3，通过此工具可以使用命令行创建、打开、查看数据库文件，具体使用方法参考
  - https://blog.csdn.net/zqixiao_09/article/details/50528181
  - https://blog.csdn.net/hhhhhyyyyy8/article/details/100587597
- 为方便使用，可在/bin目录下创建sqlite3的软链接，后续可以直接在命令行中输入sqlite3启用
```
ln -s /xxx/xxx/sqlite3 sqlite3
```

### 2.2 编译libsqlite3.so共享库
- 该共享库的用处: 应用程序可通过链接生成的libsqlite3.so来实现对数据库的管理(创建数据库、创建表格、插入数据、查询、数据、删除数据等)
- 比如有个C程序，想使用sqlite数据库，那么这个共享库是必不可少的，使用示例: https://blog.csdn.net/zouleideboke/article/details/73649886
```
gcc -g -shared -fPIC -c sqlite3.c
gcc -g -shared -fPIC -o libsqlite3.so sqlite3.o
```

### 2.3 编译libsqlitejdbc.so共享库
- 用途: 用于java程序对sqlite数据库进行操作
- 一般情况下，是无需编译的，因为sqlite的jar包中默认包含了大部分操作系统对应架构的so库
- 源码下载: https://github.com/xerial/sqlite-jdbc
- 编译步骤: https://github.com/xerial/sqlite-jdbc/blob/master/CONTRIBUTING.md
```
make native SQLITE_OBJ=/usr/local/lib/libsqlite3.so SQLITE_HEADER=/usr/local/include/sqlite3.h

// libsqlite3.sosqlite3.h 可以在sqlite3源码目录中获取
```
- 问题
  - java中使用库出现异常时，比如加载驱动时出现报错, 报错根源代码:System.load(libsqlitejdbc.so)
  - 执行 ldd libsqlitejdbc.so 命令，查看so库的正确性
  - 如果执行结果是 不是动态可执行文件，那么很有可能是由于so库权限的问题(部分国产涉密机需要通过安装软件的形式安装，so库才能有执行权限)