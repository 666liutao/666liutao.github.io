---
title: Java 压缩解压文件相关工具类(可加密)
date: 2023-04-07
tags:
 - 代码片段
categories:
 - 随笔记录
sidebar: 'auto'
---



---

## 1. ZIP文件的压缩与解压

- 除2.3外其余都需要引入以下依赖:
```
compile group: 'org.apache.commons', name: 'commons-compress', version: '1.21'
compile "org.apache.commons:commons-lang3:3.12.0"
```

### 1.1 不带密码的压缩与解压

```
package zip;

import org.apache.commons.codec.binary.Base64;
import org.apache.commons.compress.archivers.ArchiveEntry;
import org.apache.commons.compress.archivers.ArchiveInputStream;
import org.apache.commons.compress.archivers.ArchiveOutputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveInputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;
import org.apache.commons.compress.utils.IOUtils;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Objects;

public class ZipUtilWithOutPwd {

    public static void main(String[] args) {
        String rootpath = "G:\\liutao";
        String sourceFile = rootpath + "\\koal\\testzip";
        String targetFile = rootpath + "\\koal\\testzip.zip";

        //压缩文件
        compress(sourceFile, targetFile);
        //解压文件
        uncompress(targetFile, rootpath + "\\koal\\testUnzip");

        //压缩目录
        //compress(rootpath , rootpath + ".zip");
        //解压目录
        //uncompress(rootpath + ".zip" , rootpath + "2");
    }

    /**
     * 将文件压缩成zip
     *
     * @param sourceFile 源文件或目录，如：archive.tar
     * @param targetFile 目标文件，如：archive.tar.zip
     */
    public static void compress(String sourceFile, String targetFile) {
        long d1 = System.currentTimeMillis();
        try (OutputStream fos = new FileOutputStream(targetFile);
             OutputStream bos = new BufferedOutputStream(fos);
             ArchiveOutputStream aos = new ZipArchiveOutputStream(bos);) {
            Path dirPath = Paths.get(sourceFile);
            Files.walkFileTree(dirPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                    if(StringUtils.isNotBlank(dirPath.relativize(dir).toString())) {
                        ArchiveEntry entry = new ZipArchiveEntry(dir.toFile(), dirPath.relativize(dir).toString());
                        aos.putArchiveEntry(entry);
                        aos.closeArchiveEntry();
                    }
                    return super.preVisitDirectory(dir, attrs);
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    ArchiveEntry entry = new ZipArchiveEntry(
                        file.toFile(), dirPath.relativize(file).toString());
                    aos.putArchiveEntry(entry);
                    IOUtils.copy(new FileInputStream(file.toFile()), aos);
                    aos.closeArchiveEntry();
                    return super.visitFile(file, attrs);
                }
            });
        } catch (IOException e) {
            System.out.println("压缩失败，原因：" + e.getMessage());
        }
        System.out.println("压缩完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }


    /**
     * 将zip文件解压到指定目录
     *
     * @param zipPath 源文件，如：archive.zip
     * @param descDir 解压目录
     */
    public static void uncompress(String zipPath, String descDir) {
        long d1 = System.currentTimeMillis();
        try (InputStream fis = Files.newInputStream(Paths.get(zipPath));
             InputStream bis = new BufferedInputStream(fis);
             ArchiveInputStream ais = new ZipArchiveInputStream(bis);
        ) {
            ArchiveEntry entry;
            // TODO 如果出现EOF报错 可以加上 ais.available() > 0 条件
            // 一般是不用加的，如果报EOF，大概率是生成的zip文件有点问题
            // while (ais.available() > 0  && Objects.nonNull(entry = ais.getNextEntry()))
            while (Objects.nonNull(entry = ais.getNextEntry())) {
                if (!ais.canReadEntryData(entry)) {
                    continue;
                }
                String name = descDir + File.separator + entry.getName();
                File f = new File(name);
                if (entry.isDirectory()) {
                    if (!f.isDirectory() && !f.mkdirs()) {
                        f.mkdirs();
                    }
                } else {
                    File parent = f.getParentFile();
                    if (!parent.isDirectory() && !parent.mkdirs()) {
                        throw new IOException("failed to create directory " + parent);
                    }
                    try (OutputStream o = Files.newOutputStream(f.toPath())) {
                        IOUtils.copy(ais, o);
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
            System.out.println("解压失败，原因：" + e.getMessage());
        }
        System.out.println("解压完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }
}

```

### 1.2 带密码的压缩与解压

- 原理: 就是将上述不带密码的zip文件，通过CipherOutputStream流加密
- 缺点: 加密后输出的zip文件，无法打开（也不能输入密码进行打开）

```
package zip;

import org.apache.commons.compress.archivers.ArchiveEntry;
import org.apache.commons.compress.archivers.ArchiveInputStream;
import org.apache.commons.compress.archivers.ArchiveOutputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveInputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;
import org.apache.commons.compress.utils.IOUtils;

import javax.crypto.Cipher;
import javax.crypto.CipherInputStream;
import javax.crypto.CipherOutputStream;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.PBEParameterSpec;
import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.Key;
import java.util.Objects;

public class ZipUtil {
    public static final String ALGORITHM = "PBEWITHMD5andDES";
    public static final int ITERATION_COUNT = 100;
    public static final byte[] SALT = "woffwork".getBytes();

    public static void main(String[] args) {
        String rootpath = "G:\\liutao";
        String sourceFile = rootpath + "\\koal\\testzip";
        String targetFile = rootpath + "\\koal\\testzip.zip";

        //压缩文件
        compress(sourceFile, targetFile);
        //解压文件
        uncompress(targetFile, rootpath + "\\koal\\testUnzip");

        //压缩目录
        //compress(rootpath , rootpath + ".zip");
        //解压目录
        //uncompress(rootpath + ".zip" , rootpath + "2");
    }

    /**
     * 将文件压缩成zip
     *
     * @param sourceFile 源文件或目录，如：archive.tar
     * @param targetFile 目标文件，如：archive.tar.zip
     */
    public static void compress(String sourceFile, String targetFile) {
        long d1 = System.currentTimeMillis();
        try (OutputStream fos = new FileOutputStream(targetFile);
             ByteArrayOutputStream bos = new ByteArrayOutputStream();
             ArchiveOutputStream aos = new ZipArchiveOutputStream(bos)) {
            Path dirPath = Paths.get(sourceFile);
            Files.walkFileTree(dirPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                    ArchiveEntry entry = new ZipArchiveEntry(dir.toFile(), dirPath.relativize(dir).toString());
                    aos.putArchiveEntry(entry);
                    aos.closeArchiveEntry();
                    return super.preVisitDirectory(dir, attrs);
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    ArchiveEntry entry = new ZipArchiveEntry(
                        file.toFile(), dirPath.relativize(file).toString());
                    aos.putArchiveEntry(entry);
                    IOUtils.copy(new FileInputStream(file.toFile()), aos);
                    aos.closeArchiveEntry();
                    return super.visitFile(file, attrs);
                }
            });
            aos.close();
            // 加密
            Cipher cipher = getCipher(Cipher.ENCRYPT_MODE, "123456");
            CipherOutputStream cos = new CipherOutputStream(fos, cipher);

            InputStream is = new ByteArrayInputStream(bos.toByteArray());
            byte[] buffer = new byte[1024];
            int r;
            while ((r = is.read(buffer)) >= 0) {
                cos.write(buffer, 0, r);
            }

            cos.flush();
            cos.close();
            is.close();

        } catch (Exception e) {
            System.out.println("压缩失败，原因：" + e.getMessage());
        }
        System.out.println("压缩完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }


    /**
     * 将zip文件解压到指定目录
     *
     * @param zipPath 源文件，如：archive.zip
     * @param descDir 解压目录
     */
    public static void uncompress(String zipPath, String descDir) {
        long d1 = System.currentTimeMillis();
        try (InputStream fis = Files.newInputStream(Paths.get(zipPath))) {
            // 解密
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            Cipher cipher = getCipher(Cipher.DECRYPT_MODE, "123456");
            CipherInputStream cis = new CipherInputStream(fis, cipher);
            byte[] buffer = new byte[1024];
            int r;
            while ((r = cis.read(buffer)) >= 0) {
                bos.write(buffer, 0, r);
            }
            cis.close();
            fis.close();

            ZipArchiveInputStream zis = new ZipArchiveInputStream(new ByteArrayInputStream(bos.toByteArray()));

            ArchiveEntry entry;
            while (Objects.nonNull(entry = zis.getNextEntry())) {
                if (!zis.canReadEntryData(entry)) {
                    continue;
                }
                String name = descDir + File.separator + entry.getName();
                File f = new File(name);
                if (entry.isDirectory()) {
                    if (!f.isDirectory() && !f.mkdirs()) {
                        f.mkdirs();
                    }
                } else {
                    File parent = f.getParentFile();
                    if (!parent.isDirectory() && !parent.mkdirs()) {
                        throw new IOException("failed to create directory " + parent);
                    }
                    try (OutputStream o = Files.newOutputStream(f.toPath())) {
                        IOUtils.copy(zis, o);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("解压失败，原因：" + e.getMessage());
        }
        System.out.println("解压完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }


    private static Key toKey(String password) throws Exception {
        // 密钥材料
        PBEKeySpec keySpec = new PBEKeySpec(password.toCharArray());
        // 实例化
        SecretKeyFactory keyFactory = SecretKeyFactory.getInstance(ALGORITHM);
        // 生成密钥
        return keyFactory.generateSecret(keySpec);
    }

    private static Cipher getCipher(int opmode, String password) throws Exception {
        // 转换密钥
        Key key = toKey(password);
        // 实例化PBE参数材料
        PBEParameterSpec paramSpec = new PBEParameterSpec(SALT, ITERATION_COUNT);
        // 实例化
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        // 初始化
        cipher.init(opmode, key, paramSpec);
        return cipher;
    }
}

```

#### 扩展版（根据需要，可以生成加密的zip  或 不加密的zip）

```
package zip;

import org.apache.commons.compress.archivers.ArchiveEntry;
import org.apache.commons.compress.archivers.ArchiveInputStream;
import org.apache.commons.compress.archivers.ArchiveOutputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveInputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;
import org.apache.commons.compress.utils.IOUtils;
import org.apache.commons.lang3.StringUtils;

import javax.crypto.Cipher;
import javax.crypto.CipherInputStream;
import javax.crypto.CipherOutputStream;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.PBEParameterSpec;
import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.Key;
import java.util.Objects;

public class ZipUtil2 {
    public static final String ALGORITHM = "PBEWITHMD5andDES";
    public static final int ITERATION_COUNT = 100;
    public static final byte[] SALT = "woffwork".getBytes();

    public static void main(String[] args) {
        String rootpath = "G:\\liutao";
        String sourceFile = rootpath + "\\koal\\testzip";
        String targetFile = rootpath + "\\koal\\testzip.zip";

        //压缩文件
        compress(sourceFile, targetFile, null);
        //解压文件
        uncompress(targetFile, rootpath + "\\koal\\testUnzip", null);

        //压缩目录
        //compress(rootpath , rootpath + ".zip");
        //解压目录
        //uncompress(rootpath + ".zip" , rootpath + "2");
    }

    /**
     * 将文件压缩成zip
     *
     * @param sourceFile 源文件或目录，如：archive.tar
     * @param targetFile 目标文件，如：archive.tar.zip
     */
    public static void compress(String sourceFile, String targetFile, String password) {
        long d1 = System.currentTimeMillis();
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
             ArchiveOutputStream aos = new ZipArchiveOutputStream(bos)) {
            Path dirPath = Paths.get(sourceFile);
            Files.walkFileTree(dirPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                    if(StringUtils.isNotBlank(dirPath.relativize(dir).toString())){
                        ArchiveEntry entry = new ZipArchiveEntry(dir.toFile(), dirPath.relativize(dir).toString());
                        System.out.println("preVisitDirectory===>"+dirPath.relativize(dir).toString());
                        aos.putArchiveEntry(entry);
                        aos.closeArchiveEntry();
                    }
                    return super.preVisitDirectory(dir, attrs);
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    ArchiveEntry entry = new ZipArchiveEntry(file.toFile(), dirPath.relativize(file).toString());
                    System.out.println("visitFile===>"+dirPath.relativize(file).toString());
                    aos.putArchiveEntry(entry);
                    IOUtils.copy(new FileInputStream(file.toFile()), aos);
                    aos.closeArchiveEntry();
                    return super.visitFile(file, attrs);
                }
            });

            // aos一定要在此处关闭，否则会导致部分缓存数据没写入到bos中，导致后续加密或写入文件的内容不完整
            aos.close();

            // 创建文件输出流，最终压缩文件写入此流中
            OutputStream fos = new FileOutputStream(targetFile);
            InputStream is = new ByteArrayInputStream(bos.toByteArray());
            byte[] buffer = new byte[1024];

            if (StringUtils.isNotBlank(password)) {
                // 加密
                Cipher cipher = getCipher(Cipher.ENCRYPT_MODE, password);
                CipherOutputStream cos = new CipherOutputStream(fos, cipher);
                int r;
                while ((r = is.read(buffer)) >= 0) {
                    cos.write(buffer, 0, r);
                }
                // 确保数据完全写入到cos中
                cos.close();
                is.close();
                fos.close();
            } else {
                int r;
                while ((r = is.read(buffer)) >= 0) {
                    fos.write(buffer, 0, r);
                }
                fos.close();
            }
        } catch (Exception e) {
            System.out.println("压缩失败，原因：" + e.getMessage());
        }
        System.out.println("压缩完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }


    /**
     * 将zip文件解压到指定目录
     *
     * @param zipPath 源文件，如：archive.zip
     * @param descDir 解压目录
     */
    public static void uncompress(String zipPath, String descDir, String password) {
        long d1 = System.currentTimeMillis();
        try (InputStream fis = Files.newInputStream(Paths.get(zipPath))) {

            // 解密
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int r;
            if (StringUtils.isEmpty(password)) {
                while ((r = fis.read(buffer)) >= 0) {
                    bos.write(buffer, 0, r);
                }
            } else {
                Cipher cipher = getCipher(Cipher.DECRYPT_MODE, password);
                CipherInputStream cis = new CipherInputStream(fis, cipher);
                while ((r = cis.read(buffer)) >= 0) {
                    bos.write(buffer, 0, r);
                }
                cis.close();
            }

            ArchiveInputStream zis = new ZipArchiveInputStream(new ByteArrayInputStream(bos.toByteArray()));

            ArchiveEntry entry;
            while (Objects.nonNull(entry = zis.getNextEntry())) {
                System.out.println("unzip ===>"+entry.getName());
                if (!zis.canReadEntryData(entry)) {
                    continue;
                }
                String name = descDir + File.separator + entry.getName();
                File f = new File(name);
                if (entry.isDirectory()) {
                    if (!f.isDirectory() && !f.mkdirs()) {
                        f.mkdirs();
                    }
                } else {
                    File parent = f.getParentFile();
                    if (!parent.isDirectory() && !parent.mkdirs()) {
                        throw new IOException("failed to create directory " + parent);
                    }
                    try (OutputStream o = Files.newOutputStream(f.toPath())) {
                        IOUtils.copy(zis, o);
                    }
                }
            }


        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("解压失败，原因：" + e.getMessage());
        }
        System.out.println("解压完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }


    private static Key toKey(String password) throws Exception {
        // 密钥材料
        PBEKeySpec keySpec = new PBEKeySpec(password.toCharArray());
        // 实例化
        SecretKeyFactory keyFactory = SecretKeyFactory.getInstance(ALGORITHM);
        // 生成密钥
        return keyFactory.generateSecret(keySpec);
    }

    private static Cipher getCipher(int opmode, String password) throws Exception {
        // 转换密钥
        Key key = toKey(password);
        // 实例化PBE参数材料
        PBEParameterSpec paramSpec = new PBEParameterSpec(SALT, ITERATION_COUNT);
        // 实例化
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        // 初始化
        cipher.init(opmode, key, paramSpec);
        return cipher;
    }
}

```

#### 增强版 (可以传入集合)
```
package zip;

import org.apache.commons.compress.archivers.ArchiveEntry;
import org.apache.commons.compress.archivers.ArchiveInputStream;
import org.apache.commons.compress.archivers.ArchiveOutputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveInputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;
import org.apache.commons.compress.utils.IOUtils;
import org.apache.commons.lang3.StringUtils;

import javax.crypto.Cipher;
import javax.crypto.CipherInputStream;
import javax.crypto.CipherOutputStream;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.PBEParameterSpec;
import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.Key;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class ZipUtilExt {
    public static final String ALGORITHM = "PBEWithHmacSHA512AndAES_256";
    public static final int ITERATION_COUNT = 100;
    public static final byte[] SALT = "woffwork".getBytes();

    public static void main(String[] args) {
        String targetFile = "G:\\liutao\\koal\\testzip.zip";

        List<String> tobezipFiles = new ArrayList<>();
        tobezipFiles.add("G:\\liutao\\koal\\testzip");
        tobezipFiles.add("G:\\liutao\\koal\\liutaotestzip");
        tobezipFiles.add("G:\\liutao\\koal\\ASNTool.exe");

        //压缩文件
        compress(tobezipFiles, targetFile, null, true);
        //解压文件
        uncompress(targetFile,"G:\\liutao\\koal\\testUnzip", null);
    }

    /**
     * 将文件压缩成zip
     * @param sourceFiles 待压缩的文件列表 (集合中的元素可以是文件夹，也可以是文件)
     * @param targetFile  输出的压缩文件路径
     * @param password    压缩密码，为空时不进行加密压缩
     * @param isNeedFolder 是否需要打入目录，如果原文件是文件夹，
     *                     为true时代表将该文件夹也压缩进结果文件，如果为false，代表只将该文件夹下的文件或目录压缩进结果文件
     */
    public static void compress(List<String> sourceFiles, String targetFile, String password, boolean isNeedFolder) {
        long d1 = System.currentTimeMillis();
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
             ArchiveOutputStream aos = new ZipArchiveOutputStream(bos)) {

            for(String sourceFile : sourceFiles){
                addEntry(sourceFile, aos, isNeedFolder);
            }
            // aos一定要在此处关闭，否则会导致部分缓存数据没写入到bos中，导致后续加密或写入文件的内容不完整
            aos.close();

            // 创建文件输出流，最终压缩文件写入此流中
            OutputStream fos = new FileOutputStream(targetFile);
            InputStream is = new ByteArrayInputStream(bos.toByteArray());
            byte[] buffer = new byte[1024];

            if (StringUtils.isNotBlank(password)) {
                // 加密
                Cipher cipher = getCipher(Cipher.ENCRYPT_MODE, password);
                CipherOutputStream cos = new CipherOutputStream(fos, cipher);
                int r;
                while ((r = is.read(buffer)) >= 0) {
                    cos.write(buffer, 0, r);
                }
                // 确保数据完全写入到cos中
                cos.close();
                is.close();
                fos.close();
            } else {
                int r;
                while ((r = is.read(buffer)) >= 0) {
                    fos.write(buffer, 0, r);
                }
                fos.close();
            }
        } catch (Exception e) {
            System.out.println("压缩失败，原因：" + e.getMessage());
        }
        System.out.println("压缩完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }

    private static void addEntry(String sourceFile, ArchiveOutputStream aos, boolean isNeedFolder) throws IOException {
        Path dirPath = Paths.get(sourceFile);
        Files.walkFileTree(dirPath, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                // 计算压缩文件放在zip文件中的路径
                String relativePath = dirPath.relativize(dir).toString();
                if(!isNeedFolder && StringUtils.isNotBlank(relativePath)){
                    System.out.println("正在创建压缩目录节点:=====>"+ relativePath);
                    ArchiveEntry entry = new ZipArchiveEntry(dir.toFile(), relativePath);
                    aos.putArchiveEntry(entry);
                    aos.closeArchiveEntry();
                }
                return super.preVisitDirectory(dir, attrs);
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                // 计算压缩文件放在zip文件中的路径
                String relativePath =  dirPath.relativize(file).toString();
                if(StringUtils.isBlank(relativePath)){
                    // 为空代表 dirPath 为一个文件
                    relativePath = dirPath.getFileName().toString();
                }else if(isNeedFolder){
                    String dirPathFileName = dirPath.getFileName().toString();
                    relativePath =dirPathFileName + File.separator + relativePath;
                }
                System.out.println("正在压缩文件:=====>"+ relativePath);
                ArchiveEntry entry = new ZipArchiveEntry(file.toFile(), relativePath);
                aos.putArchiveEntry(entry);
                IOUtils.copy(new FileInputStream(file.toFile()), aos);
                aos.closeArchiveEntry();
                return super.visitFile(file, attrs);
            }
        });
    }

    /**
     * 将zip文件解压到指定目录
     *
     * @param zipPath 源文件，如：archive.zip
     * @param descDir 解压目录
     */
    public static void uncompress(String zipPath, String descDir, String password) {
        long d1 = System.currentTimeMillis();
        try (InputStream fis = Files.newInputStream(Paths.get(zipPath))) {

            // 解密
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int r;
            if (StringUtils.isEmpty(password)) {
                while ((r = fis.read(buffer)) >= 0) {
                    bos.write(buffer, 0, r);
                }
            } else {
                Cipher cipher = getCipher(Cipher.DECRYPT_MODE, password);
                CipherInputStream cis = new CipherInputStream(fis, cipher);
                while ((r = cis.read(buffer)) >= 0) {
                    bos.write(buffer, 0, r);
                }
                cis.close();
            }

            ArchiveInputStream zis = new ZipArchiveInputStream(new ByteArrayInputStream(bos.toByteArray()));

            ArchiveEntry entry;
            while (Objects.nonNull(entry = zis.getNextEntry())) {
                System.out.println("unzip ===>"+entry.getName());
                if (!zis.canReadEntryData(entry)) {
                    continue;
                }
                String name = descDir + File.separator + entry.getName();
                File f = new File(name);
                if (entry.isDirectory()) {
                    if (!f.isDirectory() && !f.mkdirs()) {
                        f.mkdirs();
                    }
                } else {
                    File parent = f.getParentFile();
                    if (!parent.isDirectory() && !parent.mkdirs()) {
                        throw new IOException("failed to create directory " + parent);
                    }
                    try (OutputStream o = Files.newOutputStream(f.toPath())) {
                        IOUtils.copy(zis, o);
                    }
                }
            }


        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("解压失败，原因：" + e.getMessage());
        }
        System.out.println("解压完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }


    private static Key toKey(String password) throws Exception {
        // 密钥材料
        PBEKeySpec keySpec = new PBEKeySpec(password.toCharArray());
        // 实例化
        SecretKeyFactory keyFactory = SecretKeyFactory.getInstance(ALGORITHM);
        // 生成密钥
        return keyFactory.generateSecret(keySpec);
    }

    private static Cipher getCipher(int opmode, String password) throws Exception {
        // 转换密钥
        Key key = toKey(password);
        // iv
        IvParameterSpec iv = new IvParameterSpec("0000000000000000".getBytes());
        // 实例化PBE参数材料
        PBEParameterSpec paramSpec = new PBEParameterSpec(SALT, ITERATION_COUNT, iv);
        // 实例化
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        // 初始化
        cipher.init(opmode, key, paramSpec);
        return cipher;
    }
}

```


### 1.3 带密码的压缩与解压-zip4j

- 引入以下依赖
```
    api "net.lingala.zip4j:zip4j:2.11.5"
```
- 这样生成的压缩文件可以在windows输入密码解压开

```
package kl.npki.base.core.utils;

import net.lingala.zip4j.ZipFile;
import net.lingala.zip4j.exception.ZipException;
import net.lingala.zip4j.model.ZipParameters;
import net.lingala.zip4j.model.enums.EncryptionMethod;

import java.io.File;
import java.io.IOException;
import java.util.List;

/**
 * 压缩文件工具类
 *
 * @author liutao
 */
public class ZipUtil {

    /**
     * 加密压缩文件
     *
     * @param tobeZipFiles 待压缩的文件列表（集合中的file，可以是目录，也可以是文件）
     * @param password     压缩密码
     * @return
     */
    public static File encryptZip(List<File> tobeZipFiles, String password) throws ZipException {
        // 2. 创建一个 ZipFile 对象并设置密码
        ZipFile zipFile = new ZipFile("back.zip");
        zipFile.setPassword(password.toCharArray());

        // 3. 创建一个 ZipParameters 对象并设置加密方法
        ZipParameters paramsForFolder = new ZipParameters();
        paramsForFolder.setEncryptFiles(true);
        paramsForFolder.setEncryptionMethod(EncryptionMethod.ZIP_STANDARD);
        ZipParameters paramsForFile = new ZipParameters();
        paramsForFile.setEncryptFiles(true);
        paramsForFile.setEncryptionMethod(EncryptionMethod.ZIP_STANDARD);
        // 4. 循环遍历源文件列表，将每个文件添加到 ZIP 文件中，同时应用加密参数
        for (File file : tobeZipFiles) {
            if (file.isDirectory()) {
                zipFile.addFolder(file, paramsForFolder);
            } else {
                paramsForFile.setFileNameInZip(file.getName());
                zipFile.addFile(file, paramsForFile);
            }
        }

        return zipFile.getFile();
    }


    /**
     * 解压文件
     *
     * @param toUnZipFile
     * @param destDir
     * @param password
     * @throws ZipException
     */
    public static void encryptUnZip(File toUnZipFile, String destDir, String password) throws IOException {
        ZipFile zipFile = new ZipFile(toUnZipFile, password.toCharArray());
        // 验证.zip文件是否合法，包括文件是否存在、是否为zip文件、是否被损坏等
        if (!zipFile.isValidZipFile()) {
            throw new ZipException("压缩文件不合法,可能被损坏.");
        }
        zipFile.extractAll(destDir);
        zipFile.close();
    }
}

```

## 2. 整合大部分类型的压缩
- 需要引入commons-compress
```
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-compress</artifactId>
    <version>1.21</version>
</dependency>
```
- CompressUtil把各压缩算法集中起来
```
/**
 * 公用压缩工具类，支持Gzip、Zip、Tar、LZ4、Snappy压缩算法
 */
public class CompressUtil {

    public static class Gzip {
        public static void compress(String sourceFile , String targetFile){
            GzipUtil.compress(sourceFile , targetFile);
        }
        public static void uncompress(String sourceFile , String targetFile){
            GzipUtil.uncompress(sourceFile , targetFile);
        }
    }

    public static class LZ4 {
        public static void compress(String sourceFile , String targetFile){
            LZ4Util.compress(sourceFile , targetFile);
        }
        public static void uncompress(String sourceFile , String targetFile){
            LZ4Util.uncompress(sourceFile , targetFile);
        }
    }

    public static class Snappy {
        public static void compress(String sourceFile , String targetFile){
            SnappyUtil.compress(sourceFile , targetFile);
        }
        public static void uncompress(String sourceFile , String targetFile){
            SnappyUtil.uncompress(sourceFile , targetFile);
        }
    }

    public static class Zip {
        public static void compress(String sourceFile, String targetFile){
            ZipUtil.compress(sourceFile , targetFile);
        }
        public static void uncompress(String zipPath, String descDir) {
            ZipUtil.uncompress(zipPath , descDir);
        }
    }

    public static class Tar {
        public static void compress(String sourceFile, String targetFile) {
            TarUtil.compress(sourceFile , targetFile);
        }
        public static void uncompress(String tarPath, String descDir) {
            TarUtil.uncompress(tarPath , descDir);
        }
    }
}
```
- GzipUtil
```
import org.apache.commons.compress.compressors.gzip.GzipCompressorInputStream;
import org.apache.commons.compress.compressors.gzip.GzipCompressorOutputStream;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Paths;

public class GzipUtil {

    /**
     * 将文件压缩成gzip
     * @param sourceFile 源文件，如：archive.tar
     * @param targetFile 目标文件，如：archive.tar.gz
     */
    public static void compress(String sourceFile , String targetFile) {
        long d1 = System.currentTimeMillis();
        try (InputStream in = Files.newInputStream(Paths.get(sourceFile));
             OutputStream fout = Files.newOutputStream(Paths.get(targetFile));
             BufferedOutputStream out = new BufferedOutputStream(fout);
             GzipCompressorOutputStream gzOut = new GzipCompressorOutputStream(out);){
            int buffersize = 10240;
            final byte[] buffer = new byte[buffersize];
            int n = 0;
            while (-1 != (n = in.read(buffer))) {
                gzOut.write(buffer, 0, n);
            }
        } catch (IOException e) {
            System.out.println("压缩失败，原因：" + e.getMessage());
        }
        System.out.println("压缩完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }

    /**
     * 将gzip文件解压
     * @param sourceFile 源文件，如：archive.tar.gz
     * @param targetFile 目标文件，如：archive.tar
     */
    public static void uncompress(String sourceFile , String targetFile) {
        long d1 = System.currentTimeMillis();
        try (InputStream fin = Files.newInputStream(Paths.get(sourceFile));
             BufferedInputStream in = new BufferedInputStream(fin);
             OutputStream out = Files.newOutputStream(Paths.get(targetFile));
             GzipCompressorInputStream gzIn = new GzipCompressorInputStream(in);){
            int buffersize = 10240;
            final byte[] buffer = new byte[buffersize];
            int n = 0;
            while (-1 != (n = gzIn.read(buffer))) {
                out.write(buffer, 0, n);
            }
        } catch (IOException e) {
            System.out.println("解压失败，原因：" + e.getMessage());
        }
        System.out.println("解压完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }
}
```
- LZ4Util
```
import org.apache.commons.compress.compressors.lz4.FramedLZ4CompressorInputStream;
import org.apache.commons.compress.compressors.lz4.FramedLZ4CompressorOutputStream;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Paths;

public class LZ4Util {

    /**
     * 将文件压缩成LZ4文件
     *
     * @param sourceFile 源文件，如：archive.tar
     * @param targetFile 目标文件，如：archive.tar.lz4
     */
    public static void compress(String sourceFile, String targetFile) {
        long d1 = System.currentTimeMillis();
        try (InputStream in = Files.newInputStream(Paths.get(sourceFile));
             OutputStream fout = Files.newOutputStream(Paths.get(targetFile));
             BufferedOutputStream out = new BufferedOutputStream(fout);
             FramedLZ4CompressorOutputStream lzOut = new FramedLZ4CompressorOutputStream(out);){
            int buffersize = 10240;
            final byte[] buffer = new byte[buffersize];
            int n = 0;
            while (-1 != (n = in.read(buffer))) {
                lzOut.write(buffer, 0, n);
            }
        } catch (IOException e) {
            System.out.println("压缩失败，原因：" + e.getMessage());
        }
        System.out.println("压缩完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }

    /**
     * 将LZ4文件进行解压
     * @param sourceFile 源文件，如：archive.tar.lz4
     * @param targetFile 目标文件，如：archive.tar
     */
    public static void uncompress(String sourceFile, String targetFile) {
        long d1 = System.currentTimeMillis();
        try (InputStream fin = Files.newInputStream(Paths.get(sourceFile));
             BufferedInputStream in = new BufferedInputStream(fin);
             OutputStream out = Files.newOutputStream(Paths.get(targetFile));
             FramedLZ4CompressorInputStream zIn = new FramedLZ4CompressorInputStream(in);){
            int buffersize = 10240;
            final byte[] buffer = new byte[buffersize];
            int n = 0;
            while (-1 != (n = zIn.read(buffer))) {
                out.write(buffer, 0, n);
            }
        } catch (IOException e) {
            System.out.println("解压失败，原因：" + e.getMessage());
        }
        System.out.println("解压完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }
}

```

- SnappyUtil
```
import org.apache.commons.compress.compressors.snappy.FramedSnappyCompressorInputStream;
import org.apache.commons.compress.compressors.snappy.FramedSnappyCompressorOutputStream;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Paths;

public class SnappyUtil {

    /**
     * 将文件压缩成gzip
     * @param sourceFile 源文件，如：archive.tar
     * @param targetFile 目标文件，如：archive.tar.sz
     */
    public static void compress(String sourceFile , String targetFile) {
        long d1 = System.currentTimeMillis();
        try (InputStream in = Files.newInputStream(Paths.get(sourceFile));
             OutputStream fout = Files.newOutputStream(Paths.get(targetFile));
             BufferedOutputStream out = new BufferedOutputStream(fout);
             FramedSnappyCompressorOutputStream snOut = new FramedSnappyCompressorOutputStream(out);){
            int buffersize = 10240;
            final byte[] buffer = new byte[buffersize];
            int n = 0;
            while (-1 != (n = in.read(buffer))) {
                snOut.write(buffer, 0, n);
            }
        } catch (IOException e) {
            System.out.println("压缩失败，原因：" + e.getMessage());
        }
        System.out.println("压缩完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }

    /**
     * 将gzip文件解压
     * @param sourceFile 源文件，如：archive.tar.sz
     * @param targetFile 目标文件，如：archive.tar
     */
    public static void uncompress(String sourceFile , String targetFile) {
        long d1 = System.currentTimeMillis();
        try (InputStream fin = Files.newInputStream(Paths.get(sourceFile));
             BufferedInputStream in = new BufferedInputStream(fin);
             OutputStream out = Files.newOutputStream(Paths.get(targetFile));
             FramedSnappyCompressorInputStream zIn = new FramedSnappyCompressorInputStream(in);){
            int buffersize = 10240;
            final byte[] buffer = new byte[buffersize];
            int n = 0;
            while (-1 != (n = zIn.read(buffer))) {
                out.write(buffer, 0, n);
            }
        } catch (IOException e) {
            System.out.println("解压失败，原因：" + e.getMessage());
        }
        System.out.println("解压完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }
}
```
- zipUtil
```
import org.apache.commons.compress.archivers.ArchiveEntry;
import org.apache.commons.compress.archivers.ArchiveInputStream;
import org.apache.commons.compress.archivers.ArchiveOutputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveInputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;
import org.apache.commons.compress.utils.IOUtils;

import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Objects;

public class ZipUtil {

    public static void main(String[] args) {
        String rootpath = "C:\\Temp\\chdlTemp\\testcompress";
        String sourceFile = rootpath + "\\springboot项目jar瘦身.docx";
        String targetFile = rootpath + "\\springboot项目jar瘦身.docx.zip";

        //压缩文件
        compress(sourceFile , targetFile);
        //解压文件
        uncompress(targetFile, rootpath + "\\springboot项目jar瘦身2.docx");

        //压缩目录
        //compress(rootpath , rootpath + ".zip");
        //解压目录
        //uncompress(rootpath + ".zip" , rootpath + "2");
    }

    /**
     * 将文件压缩成zip
     *
     * @param sourceFile 源文件或目录，如：archive.tar
     * @param targetFile 目标文件，如：archive.tar.zip
     */
    public static void compress(String sourceFile, String targetFile) {
        long d1 = System.currentTimeMillis();
        try (OutputStream fos = new FileOutputStream(targetFile);
             OutputStream bos = new BufferedOutputStream(fos);
             ArchiveOutputStream aos = new ZipArchiveOutputStream(bos);){
            Path dirPath = Paths.get(sourceFile);
            Files.walkFileTree(dirPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                    ArchiveEntry entry = new ZipArchiveEntry(dir.toFile(), dirPath.relativize(dir).toString());
                    aos.putArchiveEntry(entry);
                    aos.closeArchiveEntry();
                    return super.preVisitDirectory(dir, attrs);
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    ArchiveEntry entry = new ZipArchiveEntry(
                            file.toFile(), dirPath.relativize(file).toString());
                    aos.putArchiveEntry(entry);
                    IOUtils.copy(new FileInputStream(file.toFile()), aos);
                    aos.closeArchiveEntry();
                    return super.visitFile(file, attrs);
                }
            });
        } catch (IOException e) {
            System.out.println("压缩失败，原因：" + e.getMessage());
        }
        System.out.println("压缩完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }


    /**
     * 将zip文件解压到指定目录
     *
     * @param zipPath 源文件，如：archive.zip
     * @param descDir 解压目录
     */
    public static void uncompress(String zipPath, String descDir) {
        long d1 = System.currentTimeMillis();
        try (InputStream fis = Files.newInputStream(Paths.get(zipPath));
             InputStream bis = new BufferedInputStream(fis);
             ArchiveInputStream ais = new ZipArchiveInputStream(bis);
             ){
            ArchiveEntry entry;
            while (Objects.nonNull(entry = ais.getNextEntry())) {
                if (!ais.canReadEntryData(entry)) {
                    continue;
                }
                String name = descDir + File.separator + entry.getName();
                File f = new File(name);
                if (entry.isDirectory()) {
                    if (!f.isDirectory() && !f.mkdirs()) {
                        f.mkdirs();
                    }
                } else {
                    File parent = f.getParentFile();
                    if (!parent.isDirectory() && !parent.mkdirs()) {
                        throw new IOException("failed to create directory " + parent);
                    }
                    try (OutputStream o = Files.newOutputStream(f.toPath())) {
                        IOUtils.copy(ais, o);
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
            System.out.println("解压失败，原因：" + e.getMessage());
        }
        System.out.println("解压完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }
}

```
- tarUtil
```
import org.apache.commons.compress.archivers.ArchiveEntry;
import org.apache.commons.compress.archivers.ArchiveInputStream;
import org.apache.commons.compress.archivers.ArchiveOutputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveOutputStream;
import org.apache.commons.compress.utils.IOUtils;

import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Objects;

public class TarUtil {

    public static void main(String[] args) {
        String rootpath = "C:\\Temp\\chdlTemp\\testcompress";
        String sourceFile = rootpath + "\\springboot项目jar瘦身.docx";
        String targetFile = rootpath + "\\springboot项目jar瘦身.docx.tar";

        //压缩文件
        compress(sourceFile , targetFile);
        //解压文件
        uncompress(targetFile, rootpath + "\\springboot项目jar瘦身2.docx");
    }

    /**
     * 将文件压缩成tar
     *
     * @param sourceFile 源文件或目录，如：archive
     * @param targetFile 目标文件，如：archive.tar
     */
    public static void compress(String sourceFile, String targetFile) {
        long d1 = System.currentTimeMillis();
        try (OutputStream fos = new FileOutputStream(targetFile);
             OutputStream bos = new BufferedOutputStream(fos);
             ArchiveOutputStream aos = new TarArchiveOutputStream(bos);){
            Path dirPath = Paths.get(sourceFile);
            Files.walkFileTree(dirPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                    ArchiveEntry entry = new TarArchiveEntry(dir.toFile(), dirPath.relativize(dir).toString());
                    aos.putArchiveEntry(entry);
                    aos.closeArchiveEntry();
                    return super.preVisitDirectory(dir, attrs);
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    ArchiveEntry entry = new TarArchiveEntry(
                            file.toFile(), dirPath.relativize(file).toString());
                    aos.putArchiveEntry(entry);
                    IOUtils.copy(new FileInputStream(file.toFile()), aos);
                    aos.closeArchiveEntry();
                    return super.visitFile(file, attrs);
                }
            });
        } catch (IOException e) {
            System.out.println("压缩失败，原因：" + e.getMessage());
        }
        System.out.println("压缩完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }


    /**
     * 将tar文件解压到指定目录
     *
     * @param tarPath 源文件，如：archive.tar
     * @param descDir 解压目录
     */
    public static void uncompress(String tarPath, String descDir) {
        long d1 = System.currentTimeMillis();
        try (InputStream fis = Files.newInputStream(Paths.get(tarPath));
             InputStream bis = new BufferedInputStream(fis);
             ArchiveInputStream ais = new TarArchiveInputStream(bis);
        ){
            ArchiveEntry entry;
            while (Objects.nonNull(entry = ais.getNextEntry())) {
                if (!ais.canReadEntryData(entry)) {
                    continue;
                }
                String name = descDir + File.separator + entry.getName();
                File f = new File(name);
                if (entry.isDirectory()) {
                    if (!f.isDirectory() && !f.mkdirs()) {
                        f.mkdirs();
                    }
                } else {
                    File parent = f.getParentFile();
                    if (!parent.isDirectory() && !parent.mkdirs()) {
                        throw new IOException("failed to create directory " + parent);
                    }
                    try (OutputStream o = Files.newOutputStream(f.toPath())) {
                        IOUtils.copy(ais, o);
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
            System.out.println("解压失败，原因：" + e.getMessage());
        }
        System.out.println("解压完毕，耗时：" + (System.currentTimeMillis() - d1) + " ms");
    }
}
```