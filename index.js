const http = require('http')
const url = require('url')
const fs = require("fs")
const md5 = require('md5')
const qs = require('querystring')
const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const bodyParser = require('body-parser')
const { target, baseUrls } = require('./conf')

/**
 * 创建目录
 * @param {*} req
 */
const creatDir = function (req) {
    const myURL = new URL((req.originalUrl || req.url), target);
    const dir = `cache/${myURL.hostname}/${req.hostname}`
    try {
        fs.mkdirSync(`cache/${myURL.hostname}`)
        fs.mkdirSync(dir)
    } catch (error) {
        // console.log('mkdirSync error', error)
    }
    return dir
}

/**
 * 获取文件名
 * @param {*} req 
 */
const getfileName = function (req) {
    return new Promise((resolve, reject) => {
        const myURL = new URL((req.originalUrl || req.url), target);
        const query = qs.parse(myURL.search.substring(1))
        if (req.cacheFileName) {
            const cacheFileName = req.cacheFileName
            resolve(cacheFileName)
            return
        }
        const postMd5 = Object.keys(req.body).length ? md5(req.body) : ''
        let fileName = myURL.pathname.replace(/\//g, '_')
        if (query['_']) {
            delete query['_']
        }
        fileName += '__' + Object.keys(query).map(key => {
            return query[key]
        }).join('_') + '_' + postMd5 + '.json'
        fileName.replace(/\//g, '_')
        req.cacheFileName = fileName.replace(/\//g, '_').replace(/=/g, '_')
        resolve(req.cacheFileName)
    })
}

/**
 * 创建json文件
 * @param {*} content 
 * @param {*} req 
 */
const writeJson = function (resContent, req) {
    const dirPath = creatDir(req)
    return getfileName(req).then(fileName => {
        fs.writeFile(`${dirPath}/${fileName}`, resContent, (err) => {
            if (err) {
                console.log('文件生成失败', err)
            }
        })
    })
}

/**
 * 验证文件是否存在
 * @param {*} req 
 */
const isExistJson = function (req) {
    const dirPath = creatDir(req)
    return getfileName(req).then(fileName => {
        if (fs.existsSync(`${dirPath}`)) {
            if (fs.statSync(`${dirPath}/${fileName}`).isFile()) {
                return fs.readFileSync(`${dirPath}/${fileName}`, 'utf8')
            }
            return false
        }
        return false
    }).catch(e => {
        console.log(e)
    })
}

const app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

app.use((req, res, next) => {
    try {
        const routeName = req.originalUrl.match(/\/([^/]*).*/)[1]
        if (baseUrls[routeName].direct) {
            next()
            return
        }
        isExistJson(req).then(contentString => {
            if (contentString) {
                res.json(JSON.parse(contentString))
                res.end()
            } else {
                next()
            }
        })
        return
    } catch (error) {
        next()
    }
})

const creatRouter = function (baseUrl) {
    const router = express.Router()
    router.use(createProxyMiddleware({
        target: baseUrl.target || target,
        changeOrigin: true,
        ws: baseUrl.ws === true ? true : false,
        pathRewrite: baseUrl.pathRewrite ? baseUrl.pathRewrite : {
            '^/': '/'
        },
        async onProxyReq(proxyReq, req, res, options) {
            // 解决body-parser 读取post参数后不能正常代理
            if (req.body) {
                let bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        },
        async onProxyRes(proxyRes, req, res) {
            if (baseUrl.direct) {
                return
            }
            if (proxyRes.statusCode === 200) {
                let resContent = ''
                proxyRes.on('data', (chunk) => {
                    resContent += chunk
                })
                proxyRes.on('end', () => {
                    writeJson(resContent.toString(), req)
                })
            }
        }
    }))
    app.use(baseUrl.url, router)
}

// auth 授权基础模块
creatRouter(baseUrls.auth)
creatRouter(baseUrls.workbench)
creatRouter(baseUrls.admin)
creatRouter(baseUrls.platform)
creatRouter(baseUrls.visitor)
creatRouter(baseUrls.file)
creatRouter(baseUrls.message)
creatRouter(baseUrls.dormitory)
creatRouter(baseUrls.workflow)
creatRouter(baseUrls.attendance)
app.listen(3000, (e) => console.log('已开启'))