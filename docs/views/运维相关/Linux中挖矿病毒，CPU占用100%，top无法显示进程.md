---
title: Linux中挖矿病毒，CPU占用100%，top无法显示进程
date: 2023-11-30
tags:
 - linux
 - 防火墙
categories:
 - 运维相关
sidebar: 'auto'
---

## 背景

- 服务器上CPU使用率已跑满，且top执行无反应，无法找到CPU占用率高的进程

## 1.top命令失效原因

普通的top命令根本无法显示木马进程，看起来像是很正常的样子，因为top命令很可能已经被入侵者修改


运行 busybox top可以看到隐藏的占用CPU的进程，原始的top已经被修改，不能显示病毒的进程，必须在busybox中执行

下载腾讯云给的排查工具busybox：

```shell
[root@VM-8-8-centos ~]# wget https://tao-1257166515.cos.ap-chengdu.myqcloud.com/busybox
--2020-12-14 15:12:59--  https://tao-1257166515.cos.ap-chengdu.myqcloud.com/busybox
Resolving tao-1257166515.cos.ap-chengdu.myqcloud.com (tao-1257166515.cos.ap-chengdu.myqcloud.com)... 132.232.176.6, 132.232.176.7, 139.155.60.205, ...
Connecting to tao-1257166515.cos.ap-chengdu.myqcloud.com (tao-1257166515.cos.ap-chengdu.myqcloud.com)|132.232.176.6|:443... connected.
HTTP request sent, awaiting response... 200 OK
Length: 1001112 (978K) [application/octet-stream]
Saving to: ‘busybox.1’

100%[======================================>] 1,001,112   1.36MB/s   in 0.7s
[root@VM-8-8-centos ~]# cp busybox /usr/bin/
[root@VM-8-8-centos ~]# busybox top
-bash: /usr/bin/busybox: Permission denied
[root@VM-8-8-centos ~]# cd /usr/bin/
[root@VM-8-8-centos bin]# chmod 777 /usr/bin/busybox
[root@VM-8-8-centos ~]# busybox top
```

- 除了top命令外，可能系统很多关键命令都被篡改了，如:
  - kill掉某个存在pid显示 没有该进程，很有可能是kill命令也被修改了
  - ll ls 等命令看不到某些文件，也是被修改了
  - rm 命令也无法删除木马文件，可能也被修改了

## 2. 预加载型动态链接库后门

linux操作系统的动态链接库在加载过程中，动态链接器会先读取LD_PRELOAD环境变量和默认配置文件/etc/ld.so.preload，并将读取到的动态链接库文件进行预加载，即使程序不依赖这些动态链接库，LD_PRELOAD环境变量和/etc/ld.so.preload配置文件中指定的动态链接库依然会被装载,因为它们的优先级比LD_LIBRARY_PATH环境变量所定义的链接库查找路径的文件优先级要高，所以能够提前于用户调用的动态库载入。这就是为什么在watchdogs挖矿木马中使用top、ps等命令无法发现挖矿进程的原因，这种后门推荐使用静态编译的ls、ps等命令或者busybox进行查找。

### 利用LD_PRELOAD

检测:
```
echo $LD_PRELOAD
#默认无输出，如果有输出就需要去看下文件是否为异常文件了
```

清除:
```
unset LD_PRELOAD
#使用命令unset LD_PRELOAD即可卸载使用LD_PRELOAD环境变量安装的恶意动态链接库
```


### 利用/etc/ld.so.preload

检测
```
1、文件完整性检测
修改了默认的动态链接库后文件完整性发生变化，可以使用rpm等来校验
首先获取系统中的动态链接器的文件路径(interp段指定了动态链接器的位置)
readelf -a /bin/ps | grep interpreter
然后判断该动态链接器文件的完整性
busybox ls -al /usr/local/lib/libioset.so
rpm -Vf /usr/local/lib/libioset.so
2、使用strace
strace可以跟踪一个进程执行时所产生的系统调用，包括参数，返回值，执行消耗的时间和所接收的信号
strace -f -e trace=file /bin/ps
-f 表示同时跟踪fork和vfork出来的进程
-e trace=file 表示只跟踪有关文件操作的系统调用
```

清除

```
busybox rm -rf /etc/ld.so.preload
清除调用的对应恶意文件即可
```