(window.webpackJsonp=window.webpackJsonp||[]).push([[22],{527:function(t,a,e){"use strict";e.r(a);var i=e(6),s=Object(i.a)({},(function(){var t=this,a=t.$createElement,e=t._self._c||a;return e("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[e("h1",{attrs:{id:"_1-背景"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_1-背景"}},[t._v("#")]),t._v(" 1.背景")]),t._v(" "),e("ul",[e("li",[t._v('服务器上使用脚本启动java项目时，出现提示“设备空间不足"')])]),t._v(" "),e("h1",{attrs:{id:"_2-问题定位"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_2-问题定位"}},[t._v("#")]),t._v(" 2.问题定位")]),t._v(" "),e("ul",[e("li",[e("p",[t._v('根据命令行中的报错提示，发现是在创建日志文件时，出现了"设备空间不足"的错误提示')])]),t._v(" "),e("li",[e("p",[t._v("此时，使用  "),e("code",[t._v("df -h")]),t._v(" 命令，查看磁盘剩余空间")])]),t._v(" "),e("li",[e("p",[e("img",{attrs:{src:"https://raw.githubusercontent.com/liutao1996/images/main/picgo/image-20241017114339628.png",alt:"image-20241017114339628"}})])]),t._v(" "),e("li",[e("p",[t._v("发现磁盘剩余空间还是很足够的")])]),t._v(" "),e("li",[e("p",[t._v("此时想起来，创建文件是需要满足两个条件的:")]),t._v(" "),e("ul",[e("li",[t._v("磁盘上还有空间")]),t._v(" "),e("li",[t._v("inode号还有剩余")])])]),t._v(" "),e("li",[e("p",[t._v("所以这里就怀疑 inode空间不足了，执行 "),e("code",[t._v("df -ih")]),t._v("命令查看")]),t._v(" "),e("p",[e("img",{attrs:{src:"https://raw.githubusercontent.com/liutao1996/images/main/picgo/image-20241017115501300.png",alt:"image-20241017115501300"}})])])]),t._v(" "),e("blockquote",[e("p",[t._v("上图是已经清理过的，原本/dev/mapper/centos--vg-root 使用率是100%")])]),t._v(" "),e("h1",{attrs:{id:"_3-什么是inode"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_3-什么是inode"}},[t._v("#")]),t._v(" 3.什么是inode")]),t._v(" "),e("ul",[e("li",[t._v('操作系统读取硬盘的时候，不会一个个扇区地读取，这样效率太低，而是一次性连续读取多个扇区，即一次性读取一个"块"（block）。')]),t._v(" "),e("li",[t._v('这种由多个扇区组成的"块"，是文件存取的最小单位。"块"的大小，最常见的是4KB，即连续八个 sector组成一个 block。')]),t._v(" "),e("li",[t._v('文件数据都储存在"块"中，那么很显然，我们还必须找到一个地方储存文件的元信息，比如文件的创建者、文件的创建日期、文件的大小等等。')]),t._v(" "),e("li",[t._v('这种储存文件元信息的区域就叫做inode，中文译名为"'),e("strong",[t._v("索引节点")]),t._v('"。')]),t._v(" "),e("li",[t._v("每一个文件都有对应的inode，里面包含了与该文件有关的一些信息")]),t._v(" "),e("li",[t._v("可以使用stat命令查看inode的信息：stat example.txt")]),t._v(" "),e("li",[t._v("另外，单个目录下子目录的数量也是有限制的")])]),t._v(" "),e("h1",{attrs:{id:"_4-inode清理"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_4-inode清理"}},[t._v("#")]),t._v(" 4.inode清理")]),t._v(" "),e("ul",[e("li",[t._v("想要清理inode，那么得先找出哪些文件占用的最多")])]),t._v(" "),e("h2",{attrs:{id:"_4-1-统计指定文件夹下文件数量"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_4-1-统计指定文件夹下文件数量"}},[t._v("#")]),t._v(" 4.1 统计指定文件夹下文件数量")]),t._v(" "),e("ul",[e("li",[t._v("使用find命令查找文件数量较多的目录")])]),t._v(" "),e("div",{staticClass:"language- line-numbers-mode"},[e("pre",{pre:!0,attrs:{class:"language-text"}},[e("code",[t._v('for i in /*; do echo $i; find $i |wc -l; done\n\n或者\n\nfind */ -exec stat -c "%n %i" {} \\;|awk -F "[/ ]" \'{if(! a[$1-$NF]++) l[$1]++}END{for (i in l) print i,l[i]}\'\n\n')])]),t._v(" "),e("div",{staticClass:"line-numbers-wrapper"},[e("span",{staticClass:"line-number"},[t._v("1")]),e("br"),e("span",{staticClass:"line-number"},[t._v("2")]),e("br"),e("span",{staticClass:"line-number"},[t._v("3")]),e("br"),e("span",{staticClass:"line-number"},[t._v("4")]),e("br"),e("span",{staticClass:"line-number"},[t._v("5")]),e("br"),e("span",{staticClass:"line-number"},[t._v("6")]),e("br")])]),e("ul",[e("li",[e("p",[t._v("找到占用数量较多的文件夹，进行删除，或者将小文件归并为一个大文件")]),t._v(" "),e("div",{staticClass:"language- line-numbers-mode"},[e("pre",{pre:!0,attrs:{class:"language-text"}},[e("code",[t._v("tar -cvf /path/to/archive.tar /path/to/directory\n")])]),t._v(" "),e("div",{staticClass:"line-numbers-wrapper"},[e("span",{staticClass:"line-number"},[t._v("1")]),e("br")])])])]),t._v(" "),e("h2",{attrs:{id:"_4-2-调整inode分配大小"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_4-2-调整inode分配大小"}},[t._v("#")]),t._v(" 4.2 调整Inode分配大小")]),t._v(" "),e("p",[t._v("可通过调整文件系统的inode分配大小来提高inode的使用效率，但这可能需要重新格式化文件系统，谨慎操作。")])])}),[],!1,null,null,null);a.default=s.exports}}]);