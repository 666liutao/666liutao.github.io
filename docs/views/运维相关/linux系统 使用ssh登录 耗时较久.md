---
title: linux系统 使用ssh登录 耗时较久
date: 2024-03-15
tags:
 - ssh
categories:
 - 运维相关
sidebar: 'auto'
---

## 问题现象

- 使用ssh登录公司linux服务器时， 发现耗时非常较久

## 排查过程

- 1.展示登录详情，用来确定具体卡在哪一块
```
ssh -v root@xx.xx.xx.xx
```

- 2.我这边是卡在debug1: pledge: network


## 原因

卡在debug1: pledge: network一般会有以下几方面的原因:

### /var/log/btmp文件过大
```
此问题是由大btmp文件（数百MB）引起的。该文件记录登录尝试。
当人们试图强行使用您的密码时，此文件可能很大并且会导致"pledge: network"阶段延迟。
```

### D-Bus and systemd 进程导致的问题
  - 检查/var/log/auth.log日志文件，确认是否有如下的报错：
  ```
  sshd[2721]: pam_systemd(sshd:session): Failed to create session: Connection timed out
  ```
  - 如果有，请重启systemd-logind服务：
  ```
  systemctl restart systemd-logind
  ```

### rsyslogd服务奔溃
 - 如果发现在/ var / log / syslog或/var/log/mail.log中不再有日志消息，则可能是rsyslog进程奔溃了，此时我们只需要重启该服务即可
```
systemctl restart  rsyslog
```

### 检查如下日志文件

/var/log/wtmp
/var/log/utmp

如果过大，则清掉。

### 无异常

如果在主机其他方面没有什么异常的情况下，突然从某天开始ssh登陆就很慢，最简单的办法，上来先看日志：

```
cd /var/log/

ls -l
```

就看哪个日志文件很大，一般上G了基本就有问题，备份后清理掉在试基本能解决问题。