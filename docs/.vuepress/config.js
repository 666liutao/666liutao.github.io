const themeConfig = require('./config/theme/')

module.exports = {
    base: '/',
    title: "liutao",
    description: '种一棵树，最好的时机是十年前，其次是现在',
    dest: 'docs/.vuepress/dist',
    head: [
        ['link', {rel: 'icon', href: '/logo.png'}],
        ['meta', {name: 'viewport', content: 'width=device-width,initial-scale=1,user-scalable=no'}]
    ],
    theme: 'reco',
    themeConfig,
    codeTheme: 'coy',
    markdown: {
        lineNumbers: true
    },
    plugins: [
        '@vuepress/medium-zoom',
        'flowchart',
        '@vuepress-reco/vuepress-plugin-loading-page',
        //看板娘
        // [
        //   "@vuepress-reco/vuepress-plugin-kan-ban-niang",
        //   {
        //     theme: ["z16"],
        //     clean: true,
        //     modelStyle: {
        //       position: "fixed",
        //       right: "0px",
        //       bottom: "0px",
        //       opacity: "0.9",
        //       zIndex: 99999
        //     }
        //   }
        // ],
        [
            '@vssue/vuepress-plugin-vssue',
            {
                // 设置 `platform` 而不是 `api`
                platform: 'github-v4',// v3的platform是github，v4的是github-v4
                // 其他的 Vssue 配置
                owner: 'liutao1996',    // 仓库的拥有者名称
                repo: 'liutao1996.github.io', // 存储评论的仓库名称
                clientId: 'Ov23liG11NcHSiAZOq5R', // 刚保存下来的 Client ID
                clientSecret: 'ed881aa2a8815b33b47a29d1db17cfac8fa6cb00', // 刚才保存下来的 Client secrets
                autoCreateIssue: true // 自动创建 Issue
            }
        ],

        //鼠标点击特效
        [
            "cursor-effects",
            {
                size: 2,                    // size of the particle, default: 2
                shape: ['circle'],  // shape of the particle, default: 'star'， 可选'circle'
                zIndex: 999999999           // z-index property of the canvas, default: 999999999
            }
        ],

        // // 动态标题
        [
            "dynamic-title",
            {
                showIcon: "/favicon.ico",
                showText: "(/≧▽≦/)老板好！",
                hideIcon: "/failure.ico",
                hideText: "(●—●)快快回来！",
                recoverTime: 2000
            }
        ],
        // ['@vuepress-reco/comments', {
        //   solution: 'valine',
        //   options: {
        //     appId: 'vcfdlxv9vEKeHDQT1bEaLVaG-gzGzoHsz',// your appId
        //     appKey: 'E0Ae8xnQUmiCUesRH42CA48H', // your appKey
        //   }
        // }],
        // ['@vuepress-reco/vuepress-plugin-bulletin-popover', {
        //   // width: '300px', // 默认 260px
        //   title: '个人微信:18697737169',
        //   body: [
        //     // {
        //     //   type: 'title',
        //     //   content: '',
        //     //   style: 'text-aligin: center;'
        //     // },
        //     {
        //       type: 'image',
        //       src: '/wechat.jpeg'
        //     }
        //   ],
        //   // footer: [
        //   //   {
        //   //     type: 'button',
        //   //     text: '微信',
        //   //     link: '/wechat.jpeg'
        //   //   },
        //   //   {
        //   //     type: 'button',
        //   //     text: '支付宝',
        //   //     link: '/alipay.jpeg'
        //   //   }
        //   // ]
        // }]
    ]
}  