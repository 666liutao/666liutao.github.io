// addMarkdown.js
const fs = require('fs')
const findComponents = require('./findComponents')
const rootDir = './docs'

findComponents(rootDir, writeComponents)

function writeComponents(dir) {
    if (!/README/.test(dir)) {
        fs.appendFile(dir, `\n \n <comment-comment/> \n `, (err) => {
            if (err) throw err
            console.log(`add components to ${dir}`)
        })
    }
}