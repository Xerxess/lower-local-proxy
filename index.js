// const http = require('http')
const fs = require("fs")
// const url = require('url')
const querystring = require('querystring')


const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware');

const creatDir = function (req) {
    try {
        fs.mkdirSync(`cache/${req.hostname}`)
    } catch (error) {
    }
    return 'cache/' + req.hostname
}


const getfileName = function (req) {
    const myURL = new URL((req.originalUrl || req.url), 'https://example.org/');
    const query = querystring.parse(myURL.search.substring(1))
    let fileName = myURL.pathname.replace(/\//g, '_')
    if (query['_']) {
        delete query['_']
    }
    fileName += '__' + Object.keys(query).map(key => {
        return query[key]
    }).join('_') + '.json'
    return fileName.replace(/\//g, '_')
}

/**
 * 创建json文件
 * @param {*} content 
 * @param {*} req 
 */
const writeJson = function (resContent, req) {
    const dirPath = creatDir(req)
    const fileName = getfileName(req)
    fs.writeFile(`${dirPath}/${fileName}`, resContent, (err) => {
        console.log(err)
    })
}

const isExistJson = function (req) {
    const dirPath = creatDir(req)
    const fileName = getfileName(req)
    if (fs.existsSync(`${dirPath}`)) {
        if (fs.statSync(`${dirPath}/${fileName}`).isFile()) {
            return fs.readFileSync(`${dirPath}/${fileName}`, 'utf8')
        }
        return false
    }
    return false
}

const app = express()

app.use((req, res, next) => {
    try {
        const contentString = isExistJson(req)
        if (contentString) {
            res.json(JSON.parse(contentString))
            res.end()
        }
    } catch (error) {
        next()
    }
})

const target = 'http://192.168.8.236:9999'
/**
 * api 代理配置
 */
const baseUrls = {
    auth: '/auth', // 授权基础模块
    workbench: '/workbench', // 工作台模块
    admin: '/admin', // 用户基础模块
    platform: '/platform', // 管理台模块
    visitor: '/visitor', // 访客模块
    file: '/file', // 图片模块
    message: '/message', // 消息模块
    dormitory: '/dormitory', // 宿舍管理
    workflow: '/workflow', // 审批流
    attendance: '/attendance' // 考勤管理
}

const creatRouter = function (baseUrl, directAgent = false) {
    const router = express.Router()

    router.use(createProxyMiddleware({
        target: target,
        changeOrigin: true,
        async onProxyRes(proxyRes, req, res) {
            if (directAgent) {
                return
            }
            if (proxyRes.statusCode !== 200) {
                let resContent = ''
                proxyRes.on('data', (chunk) => {
                    resContent += chunk
                });
                proxyRes.on('end', () => {
                    writeJson(resContent.toString(), req)
                });
            }
        }
    }));

    app.use(baseUrl, router)
}

// auth 授权基础模块
creatRouter(baseUrls.auth)
creatRouter(baseUrls.workbench)
creatRouter(baseUrls.admin)
creatRouter(baseUrls.platform)
creatRouter(baseUrls.visitor)
creatRouter(baseUrls.file, true)
creatRouter(baseUrls.message)
creatRouter(baseUrls.dormitory)
creatRouter(baseUrls.workflow)
creatRouter(baseUrls.attendance)
app.listen(3000, (e) => console.log(e))