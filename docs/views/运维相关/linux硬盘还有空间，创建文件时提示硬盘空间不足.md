---
title: linux硬盘还有空间，创建文件时提示硬盘空间不足
date: 2024-10-17
tags:
 - linux
 - inode
categories:
 - 运维相关
sidebar: 'auto'
---


## 1.背景

- 服务器上使用脚本启动java项目时，出现提示“设备空间不足"

## 2.问题定位

- 根据命令行中的报错提示，发现是在创建日志文件时，出现了"设备空间不足"的错误提示
- 此时，使用  ``` df -h``` 命令，查看磁盘剩余空间
- ![image-20241017114339628](https://raw.githubusercontent.com/liutao1996/images/main/picgo/image-20241017114339628.png)

- 发现磁盘剩余空间还是很足够的

- 此时想起来，创建文件是需要满足两个条件的:

  - 磁盘上还有空间
  - inode号还有剩余

- 所以这里就怀疑 inode空间不足了，执行 ```df -ih ```命令查看

  ![image-20241017115501300](https://raw.githubusercontent.com/liutao1996/images/main/picgo/image-20241017115501300.png)

  

> 上图是已经清理过的，原本/dev/mapper/centos--vg-root 使用率是100%



## 3.什么是inode

- 操作系统读取硬盘的时候，不会一个个扇区地读取，这样效率太低，而是一次性连续读取多个扇区，即一次性读取一个"块"（block）。
- 这种由多个扇区组成的"块"，是文件存取的最小单位。"块"的大小，最常见的是4KB，即连续八个 sector组成一个 block。
- 文件数据都储存在"块"中，那么很显然，我们还必须找到一个地方储存文件的元信息，比如文件的创建者、文件的创建日期、文件的大小等等。
- 这种储存文件元信息的区域就叫做inode，中文译名为"**索引节点**"。
- 每一个文件都有对应的inode，里面包含了与该文件有关的一些信息
- 可以使用stat命令查看inode的信息：stat example.txt
- 另外，单个目录下子目录的数量也是有限制的



## 4.inode清理

- 想要清理inode，那么得先找出哪些文件占用的最多

### 4.1 统计指定文件夹下文件数量

- 使用find命令查找文件数量较多的目录

```
for i in /*; do echo $i; find $i |wc -l; done

或者

find */ -exec stat -c "%n %i" {} \;|awk -F "[/ ]" '{if(! a[$1-$NF]++) l[$1]++}END{for (i in l) print i,l[i]}'

```

- 找到占用数量较多的文件夹，进行删除，或者将小文件归并为一个大文件

  ```
  tar -cvf /path/to/archive.tar /path/to/directory
  ```

  

### 4.2 调整Inode分配大小

可通过调整文件系统的inode分配大小来提高inode的使用效率，但这可能需要重新格式化文件系统，谨慎操作。