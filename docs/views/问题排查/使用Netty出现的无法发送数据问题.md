---
title: 使用Netty出现的无法发送数据问题
date: 2023-05-09
tags:
 - netty
categories:
 - 问题排查
sidebar: 'auto'
---

## 1. 问题代码如下：

```
public static void main(String[] args) {
        new NettyClient2().connect("127.0.0.1", 39991);
    }

    private void connect(String ip, int port) {
        // 配置客户端Nio线程组
        NioEventLoopGroup clientGroup = new NioEventLoopGroup();
        Bootstrap b = new Bootstrap();
        b.group(clientGroup).channel(NioSocketChannel.class)
            .option(ChannelOption.TCP_NODELAY, true)
            .handler(new ChannelInitializer<SocketChannel>() {
                @Override
                protected void initChannel(SocketChannel ch) throws Exception {
                    ch.pipeline()
                        .addLast(new Asn1DerMsgDecoder())
                        .addLast(new SimpleChannelInboundHandler<byte[]> (){
                        @Override
                        public void channelActive(ChannelHandlerContext ctx) {
                           // 发送数据
                            System.out.println("发送数据:"+ new String(msg));
                            ctx.writeAndFlush(msg);
                        }
                        @Override
                        public void channelRead0(ChannelHandlerContext ctx, byte[] msg) {
//                            ByteBuf byteBuf = (ByteBuf) msg;
//                            byte[] response = new byte[byteBuf.readableBytes()];
                            System.out.println("收到的响应:"+Base64.encodeBase64String(msg));
                            // 关闭链路
                            ctx.close();
                        }

                        });
                }
            });

        try {
            // 发起异步连接操作，调用同步方法等待连接成功
            ChannelFuture f = b.connect(ip, port).sync();
            // 等待客户端链路关闭
            f.channel().closeFuture().sync();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }finally {
            clientGroup.shutdownGracefully();
        }

    }
```

## 2. 问题解决

- 因为netty默认是将byte数组解码编码成ByteBuf
- 由于上述代码并未自定义编解码器，且传输的数据类型是 String，故导致数据无法发送
- 如果想传输不同类型的数据,需要在netty启动类里添加编码器。 或者用下面的方式：
```
@Override
public void channelActive(ChannelHandlerContext ctx) {
    byte[] req = "1".getBytes();
    ByteBuf buffer = Unpooled.buffer(req.length);
    buffer.writeBytes(req);
    // 发送数据
    ctx.writeAndFlush(buffer);
}
```