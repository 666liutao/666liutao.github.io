---
title: aspectj在工程上的使用
date: 2023-04-07
tags:
 - aspectj
categories:
 - 随笔记录
sidebar: 'auto'
---


# 1. 概述

- 本文描述如何在项目工程中引用aspectj

# 2. 场景1

目前有A组件，B组件，A组件为提供注解切入的组件，B组件为实际功能的使用组件。
比如 A组件为 日志组件  B组件为 controller层，具体使用方式

A组件 的build.gradle
```
plugins {
    id 'java'
    id 'maven-publish'
    id 'java-library'
    id "de.undercouch.download" version "5.3.0"
    id "io.freefair.aspectj" version "5.1.1"
}

dependencies {
 api "org.aspectj:aspectjrt:${aspectjVersion}"
 
}
```


B组件 的 build.gradle

```
plugins {
    id 'java'
    id 'java-library'
    id 'maven-publish'
    id 'application'
    id "de.undercouch.download" version "5.3.0"
    id "io.freefair.aspectj.post-compile-weaving" version "5.1.1"
    id "org.owasp.dependencycheck" version "8.2.1"
}

dependencies {
  aspect "A组件:${version}"
}

```



# 3.场景2

单独一个项目中使用
```
plugins {
    id 'java'
    id 'maven-publish'
    id 'java-library'
    id "de.undercouch.download" version "5.3.0"
    id "io.freefair.aspectj.post-compile-weaving" version "5.1.1"
}

dependencies {
    api "org.aspectj:aspectjrt:${aspectjVersion}"
}
```

