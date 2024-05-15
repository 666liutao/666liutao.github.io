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
  vssueConfig: {
      platform: 'github',
      owner: 'liutao1996',
      repo: 'liutao1996.github.io',
      clientId: 'Ov23liG11NcHSiAZOq5R',
      clientSecret: 'ed881aa2a8815b33b47a29d1db17cfac8fa6cb00',
  }
})