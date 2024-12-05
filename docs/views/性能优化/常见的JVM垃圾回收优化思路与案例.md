---
title: 常见的JVM垃圾回收优化思路与案例
date: 2024-11-07
tags:
 - jvm
categories:
 - 性能优化
sidebar: 'auto'
---

当需要针对垃圾回收进行优化时，可以考虑从以下几点思路出发。

## 1. 对象进入老年代的规则

- 根据 **【对象进入老年代的规则】**, 主要有以下思路

### 1.1 避免过早进入老年代
- 简单来说就是尽量让每次【Minor GC】后的存活对象小于Survivor区的50%
- 避免因为动态年龄判断机制而过早进入老年代，尽量都存活在年轻代中，尽量减少Full GC的频率，Full GC对JVM性能的影响很严重
- 这种情况容易出现在高并发的系统
  - 正常情况下每秒创建的对象都是很少的，但是某一时间段，并发量突然上升，导致新对象创建的过快
  - 此时很容易因为动态年龄判断机制过早的进入老年代
  - 所以这种情况下，要调整年轻代的大小，让这些对象都尽可能的留在年轻代，因为这些都是朝生夕死的对象

### 1.2 大对象尽早进入老年代
- 大对象，如: 【需要大量连续内存空间的对象 比如字符串、数组】
- 因为年轻代用的是标记-复制算法，大对象在复制的时候会消耗大量的性能，所以要尽早的进入老年代
```
使用-XX:PretenureSizeThreshold设置大小，超过这个大小的对象直接进入老年代，不会进入年轻代。
这个参数只在Serial和ParNew两个GC收集器下有用
```

## 2. 频繁发生【Full GC】

- 除了正常的因为老年代空间不足而发生Full GC，还有老年代空间担保机制的存在，
- 【老年代空间担保机制】
  - 年轻代在每次Minor GC之前，JVM都会计算下老年代剩余可用空间
  - 如果这个可用空间小于年轻代里现有的所有对象大小之和，就会看一个 -XX:-HandlePromotionFailure JDK1.8默认设置参数是否设置
  - 这个参数就是一个担保参数，担保一下
  - 如果老年代剩余空间小于历史每一次Minor GC后进入老年代的对象的平均值，就会先发生一次Full GC，再执行Minor GC，Minor GC后，老年代不够又会发生Full GC
  - 这样【一次完整的Minor GC】 = 【两次Full GC】 + 【一次Minor GC】
- 元空间不够会导致多余的Full GC，导致Full GC次数频繁
- 显示调用System.gc造成多余的Full GC
  - 这种一般线上尽量通过 -XX:+DisableExplicitGC参数禁用，
  - 加上这个参数，System.gc就没有任何效果

## 3. 案例
### 3.1 线上发生频繁的Full GC

#### 3.1.1 环境背景

- 使用以下JVM参数，用于**模拟真实场景下的JVM环境**

  ```java
  -Xms2048M -Xmx2048M -Xmn512M -Xss256K -XX:SurvivorRatio=6 -XX:MetaspaceSize=256M -XX:MaxMetaspaceSize=256M -XX:+UseParNewGC -XX:+UseConcMarkSweepGC -XX:CMSInitiatingOccupancyFraction=75 -XX:+UseCMSInitiatingOccupancyOnly
  ```

- 各项参数含义说明:

  - -Xms2048M：设置JVM初始堆内存为2048M。此值可以设置与-Xmx相同，以避免每次垃圾回收完成后JVM重新分配内存。

  - -Xmx2048M：设置JVM堆内存最大为2048M

  - -Xmn512M：设置年轻代大小为512M

  - -Xss256K：设置每个线程的线程栈大小为256K

  - -XX:SurvivorRatio=6：设置Eden区的比例。设置为6，则表示 Eden:S0:S1 = 6:2:2。【该参数默认为8】

  - -XX:MetaspaceSize=256M：设置元空间大小为256M

  - -XX:MaxMetaspaceSize=256M：设置最大元空间大小为256M

  - -XX:+UseParNewGC：设置年轻代垃圾回收器是ParNew

  - -XX:+UseConcMarkSweepGC：设置老年代垃圾回收器是CMS

  - -XX:CMSInitiatingOccupancyFraction=75：设置CMS在对老年代内存使用率达到75%的时候开始GC，**因为CMS会有浮动垃圾,所以一般都较早启动GC**

  - -XX:+UseCMSInitiatingOccupancyOnly：只用设置的回收阈值**上面指定的75%**,如果不指定,JVM**仅在第一次使用设定值**,后续则自动调整,一般和上一个命令组合使用

#### 3.1.2  情况1:  由于动态年龄判断机制导致的频繁Full GC

- 由于**动态年龄判断机制的原因**导致的频繁发生Full GC，应该怎么调优呢，我们先从以下几个方面来看
  - **动态年龄判断机制**的关键点在于年轻代的空间大小，所以首先就是要把年轻代的空间调大
  - 如果是并发量大的系统，我们可以调小**CMSInitiatingOccupancyFraction**设定的值，避免产生**Serial Old收集器的情况**
  - 但是如果是并发量小的系统，我们可以调大**CMSInitiatingOccupancyFraction**设定的值，充分利用堆空间

- 按照以下进行参数调整

  - 把年轻代的空间调大成1536M 这样老年代的空间就是512M
  -  把CMS老年代内存使用阈值调大成90% 充分利用老年代的空间，如果并发量大的系统， 有可能需要调低这个值 ，避免最后因为并发冲突导致使用Serial Old收集器

- 调整后的参数如下:

  ```
  -Xms2048M -Xmx2048M -Xmn1536M -Xss256K -XX:SurvivorRatio=6 -XX:MetaspaceSize=256M -XX:MaxMetaspaceSize=256M -XX:+UseParNewGC -XX:+UseConcMarkSweepGC -XX:CMSInitiatingOccupancyFraction=90 -XX:+UseCMSInitiatingOccupancyOnly
  ```

#### 3.1.3 情况2: 由于老年代空间担保机制导致的频繁FUll GC

- 如果按照上面设置，把老年代设置小的话，很容易会因为**老年代空间担保机制**，导致频繁的发生Full GC

- **老年代空间担保机制**的关键点在于每次Minor GC的时候进入老年代对象的平均大小，所以我们要控制**每次Minor GC后进入老年代的对象平均大小**

##### 判断内存中对象的分布情况
- 使用jmap -histo 进程号的命令，观察内存中对象的分布情况
- 观察有没有比较集中的对象，因为如果是并发量高的系统，接口方法很有可能是集中的，创建的对象也是集中的
- 也就是【热点方法】、【内存占用】比较多的对象这两个方面去分析
- 借助jvisualvm的抽样器寻找热点方法【**jdk8有 jdk11不支持**】

![image-20241205141129223](https://raw.githubusercontent.com/liutao1996/images/main/picgo/image-20241205141129223.png)

- 借助jmap -histo 进程号观察占用内存比较多的对象
- ![image-20241205141400370](https://raw.githubusercontent.com/liutao1996/images/main/picgo/image-20241205141400370.png)

##### 优化方向
- 如果是循环创建对象的话，尽量控制循环次数比如每次查询5000条记录【结合实际对象大小】
  - 这些记录如果加载到内存就是要创建不少的对象
  - 如果这批对象经过Minor GC，很容易由于老年代空间分配担保机制，发生Full GC
  - 所以要减少查询记录条数，从而减少创建的对象
- 最快也是最有效的办法，在预算允许的情况下，增加物理机器的配置，增大整个堆的内存