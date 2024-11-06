---
title: JVM工具使用介绍
date: 2024-10-25
tags:
 - jvm工具
categories:
 - 性能优化
sidebar: 'auto'
---

jdk中自带一系列的监控工具，可以为我们的系统优化，问题排查提供很大的帮助。下面来介绍几个常用的工具。

## 1.  jmap (Java内存映像工具)

- jmap(Memory Map for Java),Java内存映像工具，用于生成堆转储快照,一般称为heapdump或dump文件。

- 同时它还可以查询finalize执行队列、Java堆和方法区的 详细信息，如空间使用率、当前用的是哪种收集器等。

- 说简单点就是它能用来查看堆内存信息，**诊断和解决内存相关问题，如内存泄露、溢出等问题**

### 1.1 命令语法
```
jmap [option] [pid]
```

- options选项:

  | options        | 功能描述                                                     |
  | -------------- | ------------------------------------------------------------ |
  | -dump          | 生成Java堆转储快照.格式为: -dump:[live,]format=b,file=<filename>,其中live子参数说明是否只dump出存活的对象 |
  | -finalizerinfo | 显示在 F-Queue 中等待 Finalizer 线程执行finalize 方法的对象。 |
  | -heap          | 显示Java堆详细信息，如使用哪种回收器、参数配置、分代状况等。 |
  | -histo         | 显示堆中对象统计信息，包括类、实例数量、合计容量。格式 -histo[:live], 其中live表示只统计展示存活的对象 |
  | -permstat      | 以 ClassLoader 为统计口径, 显示永久代（PermGen/Metaspace）的统计信息 |
  | -F             | 当虚拟机进程对-dump选项没有响应时，可使用这个选项强制生成dump快照。 |


### 1.2 什么是堆dump

- 堆Dump是反应Java堆使用情况的内存镜像

- 其中主要包括系统信息、虚拟机属性、完整的线程Dump、所有类和对象的状态等。 

- 一般，在内存不足、GC异常等情况下，我们就会怀疑有内存泄漏。这个时候我们就可以制作堆Dump来查看具体情况。分析原因。

- 常见内存错误

  ```
  outOfMemoryError 年老代内存不足。
  outOfMemoryError:PermGen Space 永久代内存不足。
  outOfMemoryError:GC overhead limit exceed 垃圾回收时间占用系统运行时间的98%或以上。
  ```

- 可以使用 jvisualvm, mat等工具分析dump文件



## 2. jstack (Java堆栈跟踪工具)

- jstack命令用于生成虚拟机当前时刻的线程快照。
- 线程快照是当前虚拟机内每一条线程正在执行的方法堆栈的集合
- 生成线程快照的主要目的是定位线程出现长时间停顿的原因， 如线程间死锁、死循环、请求外部资源导致的长时间等待等问题。

### 2.1 命令语法

```
jstack [options] pid
```

| options | 描述                                                         |
| ------- | ------------------------------------------------------------ |
| -l      | 除堆栈外，显示关于锁的附加信息，在发生死锁时可以用jstack -l pid来观察锁持有情况 |
| -m      | 打印java和native c/c++框架的所有栈信息。可以打印JVM的堆栈，以及Native的栈帧，一般应用排查不需要使用 |
| -F      | 当正常输出的请求不被响应时，强制输出线程堆栈                 |

### 2.2 死锁案例分析

- 使用 jstack -l pid 查看线程堆栈信息，信息末尾会有死锁信息打印(如果存在)

  ![image-20241105181737815](https://raw.githubusercontent.com/liutao1996/images/main/picgo/image-20241105181737815.png)

- 上图可以得出以下信息:
  - 线程mythread-tianluo, 正在等待0x000000076b686b80锁，这个锁由mythread-jay线程持有
  - 线程mythread-jay，正在等待0x000000076b686bb0锁，这个锁由mythread-tianluo线程持
- 再往上查看对应线程的信息，可以得出更为详细的情况，以及死锁发生的代码位置

![image-20241105182735968](https://raw.githubusercontent.com/liutao1996/images/main/picgo/image-20241105182735968.png)

- 其它字段的一些含义
  - Thread-1：线程名
  - prio：优先级
  - os_prio：操作系统级别的线程优先级
  - tid：线程id
  - nid：线程对应本地线程id
  - java.lang.Thread.State：线程状态



## 3. jstat (JVM统计信息监视工具)

- jstat（Java Virtual Machine Statistics Monitoring Tool）是JDK提供的一个可以监控Java虚拟机各种运行状态信息的命令行工具。
- 它可以显示Java虚拟机中的类加载、内存、垃圾收集、即时编译等运行状态的信息。

### 3.1 命令语法

```
jstat [generalOptions]
jstat [outputOptions] [-t] [-h<lines>] <vmid> [<interval> [<count>]]
```

#### 3.1.1 命令参数说明

- `generalOptions`：通用选项，如果指定一个通用选项，就不能指定任何其他选项或参数。它包括如下两个选项：
  - `-help`：显示帮助信息。
  - `-options`：显示`outputOptions`参数的列表。
- `outputOptions`： 输出选项，指定显示某一种Java虚拟机信息
- `-t`：把时间戳列显示为输出的第一列。这个时间戳是从Java虚拟机的开始运行到现在的秒数。
- `-h n`：每显示n行显示一次表头，其中n为正整数。默认值为 0，即仅在第一行数据显示一次表头。
- `vmid`：虚拟机唯一ID（LVMID，Local Virtual Machine Identifier），如果查看本机就是Java进程的进程ID。
- `interval`：显示信息的时间间隔，单位默认毫秒。也可以指定秒为单位，比如：1s。如果指定了该参数，jstat命令将每个这段时间显示一次统计信息。
- `count`：显示数据的次数，默认值是无穷大，这将导致jstat命令一直显示统计信息，直到目标JVM终止或jstat命令终止。

#### 3.1.2 输出选项

| outputOptions       | 描述                                                         |
| ------------------- | ------------------------------------------------------------ |
| `-class`            | 显示类加载、卸载数量、总空间和装载耗时的统计信息             |
| `-compiler`         | 显示即时编译的方法、耗时等信息                               |
| `-gc`               | 显示堆各个区域内存使用和垃圾回收的统计信息                   |
| `-gccapacity`       | 显示堆各个区域的容量及其对应的空间的统计信息                 |
| `-gcutil`           | 显示有关垃圾收集统计信息的摘要                               |
| `-gccause`          | 显示关于垃圾收集统计信息的摘要(与-gcutil相同)，以及最近和当前垃圾回收的原因 |
| `-gcnew`            | 显示新生代的垃圾回收统计信息                                 |
| `-gcnewcapacity`    | 显示新生代的大小及其对应的空间的统计信息                     |
| `-gcold`            | 显示老年代和元空间的垃圾回收统计信息                         |
| `-gcoldcapacity`    | 显示老年代的大小统计信息                                     |
| `-gcmetacapacity`   | 显示元空间的大小的统计信息                                   |
| `-printcompilation` | 显示即时编译方法的统计信息                                   |

###  3.2 如何解读Jstat生成的数据

#### -class

- 显示字段含义说明

  - Loaded：加载的类的数量。

  - Bytes：加载的类所占用的字节数。

  - Unloaded：卸载的类的数量。

  - Bytes：卸载的类所占用的字节数。

  - Time：执行类加载和卸载操作所花费的时间。

![image-20241106114921864](https://raw.githubusercontent.com/liutao1996/images/main/picgo/image-20241106114921864.png)

#### -compiler

- 显示字段含义说明

  - Compiled：执行的编译任务的数量。

  - Failed：执行编译任务失败的数量。

  - Invalid：执行编译任务失效的数量。

  - Time：执行编译任务所花费的时间。

  - FailedType：上次编译失败的编译类型。

  - FailedMethod：上次编译失败的类名和方法。

![image-20241106115134329](https://raw.githubusercontent.com/liutao1996/images/main/picgo/image-20241106115134329.png)


#### -gc

- 显示字段含义说明

  - S0C：年轻代中第一个Survivor区的容量，单位为KB。
  - S1C：年轻代中第二个Survivor区的容量，单位为KB。
  - S0U：年轻代中第一个Survivor区已使用大小，单位为KB。
  - S1U：年轻代中第二个Survivor区已使用大小，单位为KB。
  - EC：年轻代中Eden区的容量，单位为KB。
  - EU：年轻代中Eden区已使用大小，单位为KB。
  - OC：老年代的容量，单位为KB。
  - OU：老年代已使用大小，单位为KB。
  - MC：元空间的容量，单位为KB。
  - MU：元空间已使用大小，单位为KB。
  - CCSC：压缩类的容量，单位为KB。
  - CCSU：压缩类已使用大小，单位为KB。
  - YGC：Young GC的次数。
  - YGCT：Young GC所用的时间。
  - FGC：Full GC的次数。
  - FGCT：Full GC的所用的时间。
  - GCT：GC的所用的总时间。

  ![image-20241106115323538](https://raw.githubusercontent.com/liutao1996/images/main/picgo/image-20241106115323538.png)

#### -gccapacity
- 显示字段含义说明
  - NGCMN：年轻代最小的容量，单位为KB。
  - NGCMX：年轻代最大的容量，单位为KB。
  - NGC：当前年轻代的容量，单位为KB。
  - S0C：年轻代中第一个Survivor区的容量，单位为KB。
  - S1C：年轻代中第二个Survivor区的容量，单位为KB。
  - EC：年轻代中Eden区的容量，单位为KB。
  - OGCMN：老年代最小的容量，单位为KB。
  - OGCMX：老年代最大的容量，单位为KB。
  - OGC：当前老年代的容量，单位为KB。
  - OC：当前老年代的容量，单位为KB。
  - MCMN：元空间最小的容量，单位为KB。
  - MCMX：元空间最大的容量，单位为KB。
  - MC：当前元空间的容量，单位为KB。
  - CCSMN：压缩类最小的容量，单位为KB。
  - CCSMX：压缩类最大的容量，单位为KB。
  - CCSC：当前压缩类的容量，单位为KB。
  - YGC：Young GC的次数。
  - FGC：Full GC的次数。

![image-20241106115559505](https://raw.githubusercontent.com/liutao1996/images/main/picgo/image-20241106115559505.png)



#### -gcutil
- 显示内容字段含义
  - S0：年轻代中第一个Survivor区使用大小占当前容量的百分比。
  - S1：年轻代中第二个Survivor区使用大小占当前容量的百分比。
  - E：Eden区使用大小占当前容量的百分比。
  - O：老年代使用大小占当前容量的百分比。
  - M：元空间使用大小占当前容量的百分比。
  - CCS：压缩类使用大小占当前容量的百分比。
  - YGC：Young GC的次数。
  - YGCT：Young GC所用的时间。
  - FGC：Full GC的次数。
  - FGCT：Full GC的所用的时间。
  - GCT：GC的所用的总时间
#### -gccause
- 显示内容字段含义
  - S0：年轻代中第一个Survivor区使用大小占当前容量的百分比。
  - S1：年轻代中第二个Survivor区使用大小占当前容量的百分比。
  - E：Eden区使用大小占当前容量的百分比。
  - O：老年代使用大小占当前容量的百分比。
  - M：元空间使用大小占当前容量的百分比。
  - CCS：压缩类使用大小占当前容量的百分比。
  - YGC：Young GC的次数。
  - YGCT：Young GC所用的时间。
  - FGC：Full GC的次数。
  - FGCT：Full GC的所用的时间。
  - GCT：GC的所用的总时间。
  - LGCC：上次垃圾回收的原因。
  - GCC：当前垃圾回收的原因
#### -gcnew
- 显示内容字段含义
  - S0C：年轻代中第一个Survivor区的容量，单位为KB。
  - S1C：年轻代中第二个Survivor区的容量，单位为KB。
  - S0U：年轻代中第一个Survivor区已使用大小，单位为KB。
  - S1U：年轻代中第二个Survivor区已使用大小，单位为KB。
  - TT：对象在年轻代存活的次数。
  - MTT：对象在年轻代存活的最大次数
  - DSS：期望的Survivor区大小，单位为KB。
  - EC：年轻代中Eden区的容量，单位为KB。
  - EU：年轻代中Eden区已使用大小，单位为KB。
  - YGC：Young GC的次数。
  - YGCT：Young GC所用的时间。
#### -gcnewcapacity
- 显示内容字段含义
  - NGCMN：年轻代最小的容量，单位为KB。
  - NGCMX：年轻代最大的容量，单位为KB。
  - NGC：当前年轻代的容量，单位为KB。
  - S0CMX：年轻代中第一个Survivor区最大的容量，单位为KB。
  - S0C：年轻代中第一个Survivor区的容量，单位为KB。
  - S1CMX：年轻代中第二个Survivor区最大的容量，单位为KB。
  - S1C：年轻代中第二个Survivor区的容量，单位为KB。
  - ECMX：年轻代中Eden区最大的容量，单位为KB。
  - EC：年轻代中Eden区的容量，单位为KB。
  - YGC：Young GC的次数。
  - FGC：Full GC的次数
#### -gcold
- 显示内容字段含义
  - MC：元空间的容量，单位为KB。
  - MU：元空间已使用大小，单位为KB。
  - CCSC：压缩类的容量，单位为KB。
  - CCSU：压缩类已使用大小，单位为KB。
  - OC：老年代的容量，单位为KB。
  - OU：老年代已使用大小，单位为KB。
  - YGC：Young GC的次数。
  - FGC：Full GC的次数。
  - FGCT：Full GC的所用的时间。
  - GCT：GC的所用的总时间
#### -gcoldcapacity
- 显示内容字段含义
  - OGCMN：老年代最小的容量，单位为KB。
  - OGCMX：老年代最大的容量，单位为KB。
  - OGC：当前老年代的容量，单位为KB。
  - OC：当前老年代的容量，单位为KB。
  - YGC：Young GC的次数。
  - FGC：Full GC的次数。
  - FGCT：Full GC的所用的时间。
  - GCT：GC的所用的总时间
#### -gcmetacapacity
- 显示内容字段含义
  - MCMN：元空间最小的容量，单位为KB。
  - MCMX：元空间最大的容量，单位为KB。
  - MC：当前元空间的容量，单位为KB。
  - CCSMN：压缩类最小的容量，单位为KB。
  - CCSMX：压缩类最大的容量，单位为KB。
  - YGC：Young GC的次数。
  - FGC：Full GC的次数。
  - FGCT：Full GC的所用的时间。
  - GCT：GC的所用的总时间
#### -printcompilation
- 显示内容字段含义
  - Compiled：最近编译方法执行的编译任务的数量。 
  - Size：最近编译方法的字节码的字节数。 
  - Type：最近编译方法的编译类型。 
  - Method：最近编译方法的类名和方法名



### 3.3 分析jstat输出的工具

- 像上面那样分析jstat的输出很不方便，太慢了，很多地方需要自己去换算单位去计算
- 为了方便分析可以使用gc分析工具：[gceasy](https://gceasy.io/)
- 它可以对gc日志进行分析，也可以对jstat等jvm命令的输出进行分析，可选择上传文件也可以选择Raw，粘贴文本的方式进行分析，点击Analyze即可。



## 4. jinfo (Java配置信息工具)

- jinfo([Configuration](https://so.csdn.net/so/search?q=Configuration&spm=1001.2101.3001.7020) Info for Java)：查看虚拟机配置参数信息，也可用于调整虚拟机的配置参数

### 4.1 命令语法

```
jinfo [options] pid
```

| options          | 描述                                                         |
| ---------------- | ------------------------------------------------------------ |
| no option        | 输出全部的参数和系统属性                                     |
| -flag name       | 输出对应名称的参数                                           |
| -flag [+\|-]name | 开启或者关闭对应名称的参数, 只有被标记为 manageable 的参数才可以被动态修改 |
| -flag name=value | 设定对应名称的参数                                           |
| -flags           | 输出全部的参数                                               |
| -sysprops        | **输出系统属性(虚拟机进程的System.getProperties()的内容)**   |



## 5. jconsole

- jconsole提供了一个用户友好的界面，允许开发者和系统管理员实时查看 JVM 的性能和资源使用情况
- 包括内存使用、线程活动、类加载情况、VM日志等

## 6. jvisualvm

- jvisualvm相比jconsole提供了更丰富的功能

### 6.1 性能分析
- 性能测试时可以使用进行 CPU 采样分析，识别性能瓶颈，了解主要在哪一块方法业务中耗时较久，进行针对优化

![image-20241105184009092](https://raw.githubusercontent.com/liutao1996/images/main/picgo/image-20241105184009092.png)