---
title: java byte[]转String再转回byte[]不一致问题
date: 2023-12-10
tags:
 - 字节转换
categories:
 - 问题记录
sidebar: 'auto'
---

## 背景

- 在使用公司框架时，数据库查询byte字段时，发现数据存在不一致的现象

# 现象

- 代码如下:
```
byte[] oriByte = new byte[] { 41, -31, -91, 41, -71, -11 };
byte[] destByte = new String(bytes).getBytes();
```
- 这里未指定编码格式，使用的为系统默认编码 Charset.defaultCharset()，本系统下为 UTF-8
- 问题现象： 构造byte转字符串的编码格式和字符串转byte的编码格式一致，但 oriByte 和 destByte 的值不一样

# 原因

- 由于原byte数组，并不是UTF-8格式
- 所以经过UTF-8编码后，String已经和原值不一致了
- 另外，由于UTF-8是多字节编码，需要用多个字节来表示一个字符的编码，所以也就出现了在转换之后byte[]数组长度、内容不一致的情况。
- 而ISO-8859-1编码是单字节编码，所以使用该编码就不会出现上面的问题

# 测试代码

```
import java.nio.charset.Charset;
import java.util.Arrays;

public class test {

    public static void main(String[] args) {
        byte[] bytes = new byte[] { 41, -31, -91, 41, -71, -11 };
        byte[] myBytes = new String(bytes).getBytes();
        System.out.println(Arrays.toString(bytes));
        System.out.println(Arrays.toString(myBytes));
        // 问题原因 :new String(byte[])和getBytes()默认使用的编码都是通过这条语句获取的编码
        // 获取默认编码
        System.out.println(Charset.defaultCharset().name());
        // 解决原理
        // 由于UTF-8是多字节编码，需要用多个字节来表示一个字符的编码，所以也就出现了在转换之后byte[]数组长度、内容不一致的情况。
        // 而ISO-8859-1编码是单字节编码，所以使用该编码就不会出现上面的问题
        byte[] bytes3 = new String(bytes, Charset.forName("ISO-8859-1")).getBytes(Charset.forName("ISO-8859-1"));
        System.out.println(Arrays.toString(bytes3));
    }

}
```
