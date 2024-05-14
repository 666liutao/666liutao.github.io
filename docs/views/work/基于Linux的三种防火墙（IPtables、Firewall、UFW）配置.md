---
title: 服务自检功能
date: 2021-04-16
tags:
 - linux
 - 防火墙
categories:
 - 运维
sidebar: 'auto'
---

::: tip
* 源码阅读
* 思考过程
:::

# 1. iptables

# 2. firewall

## 2.1 常用运维命令示例

```
▪ 开启：sudo service firewalld start
▪ 关闭：sudo service firewalld stop
▪ firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="222.10.1.1/26" accept'
  ▪ 作用：允许222.10.1.1访问本机 26是子网掩码
▪ firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="222.10.1.55/26" port port ="5236" protocol=“tcp” reject'
  ▪ 作用：reject不允许222.10.1.55访问本机的5236端口
▪ firewall-cmd --zone=public --list-rich-rules
  ▪ 作用：列举规则
▪ firewall-cmd --reload
  ▪ 作用：重载 Permanent 配置到 Runtime
  
--permanent 表示永久存在,在改模式下进行的修改，只有执行重载或重启之后，修改项才会在本机生效。
--runtime：临时存在，立即生效。在Runtime模式下进行的修改，当执行重载（firewall-cmd --reload）或主机重启之后，修改将全部丢失

```

# 3. ufw

## 3.1 常用运维命令示例

```
▪ ufw status 查看防火墙状态
▪ ufw enable 开启防火墙
▪ ufw reload 重新加载防火墙配置
▪ ufw disable 关闭防火墙
▪ ufw allow 22 开启22端口访问权限
▪ ufw delete allow 22 删除22的端口访问权限
▪ ufw allow from 222.10.1.8 允许222.10.1.8访问本机所有端口
▪ ufw allow from 222.10.1.8 to any port 3306 允许222.10.1.8访问3306端口
▪ ufw deny from 222.10.1.8 to any port 5236 禁止222.10.1.8访问5236端口
```

# 4. 总结对比

## 4.1 关系说明
- netfilter、iptables、firewall、ufw之间的关系：
  - netfilter-->iptables-->[ firewall | ufw ]
  - netfilter处在最底层（内核），负责根据上层下达的规则对报文进行处理【实际干活的】；
  - iptables属于一个应用层临时命令工具，负责制定一系列的规则然后提交给netfilter【部门领导】；
  - firewall和ufw属于一个应用层常驻服务工具，负责用人性化的语言制定最齐全的规则并将其转换为iptables理解的规则，然后让iptables再提交给netfilter进行处理【公司领导】。

## 4.2 优缺点对比
- iptables属于一个应用层临时命令工具：
  - 规则制定之后iptables便不再参与什么活动，等系统重启之后之前配置的规则全部都丢失，只能再次通过iptables-restore来手动恢复之前通过iptables-save保存的规则。
  - （有些linux发行版中，iptables也属于一种常驻服务，可以通过服务管理工具统一对其进行管理。但是似乎不支持规则动态加载。）
- firewall和ufw属于一个应用层常驻服务工具：
  - 服务在启用之后便将自身此前存储的规则自动通过iptables进行加载，
  - 而后如果有新的规则变动，它们都可以支持规则的动态加载让其立即生效（ufw存疑）。

## 4.3 应用平台

- iptables是红帽系列6及以下的默认防火墙（如CentOS6.x）
- firewall 是红帽系列7及以上的默认防火墙（如CentOS7.x）
- UFW是Debian系列的默认防火墙。虽然都是在不同平台下的默认防火墙，但并非ufw就不能再红帽系列使用,不过firewall和ufw同时存在并启的情况下，规则会很混乱

```
兼容性。iptables是linux防火墙的基石，
所以存在firewall、ufw的地方就一定会看到iptables。
而在不启用firewall、ufw服务的情况下，也依旧可以通过iptables来使用防火墙
```