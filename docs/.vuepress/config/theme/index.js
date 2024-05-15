const themeReco = require('./themeReco.js')
const nav = require('../nav/')
const sidebar = require('../sidebar/')

module.exports = Object.assign({}, themeReco, {
    nav,
    sidebar,
    // logo: '/avatar.jpg',
    // 搜索设置
    search: true,
    searchMaxSuggestions: 10,
    // 自动形成侧边导航
    sidebar: 'auto',
    plugins: [
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
            }
        ]
    ]
})