const http = require('http')
const fs = require("fs")
const url = require('url')
const querystring = require('querystring')
const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware');
const {
    target,
    baseUrls
} = require('./conf');

const creatDir = function (req) {
    const myURL = new URL((req.originalUrl || req.url), target);
    const dir = `cache/${myURL.hostname}/${req.hostname}`
    try {
        fs.mkdirSync(`cache/${myURL.hostname}`)
        fs.mkdirSync(dir)
    } catch (error) {
        console.log('mkdirSync error', error)
    }
    return dir
}

const getfileName = function (req) {
    const myURL = new URL((req.originalUrl || req.url), target);
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
        const routeName = req.originalUrl.match(/\/([^/]*).*/)[1]
        if (baseUrls[routeName].direct) {
            next()
            return
        }
        const contentString = isExistJson(req)
        if (contentString) {
            res.json(JSON.parse(contentString))
            res.end()
        } else {
            throw new Error('无缓存')
        }
    } catch (error) {
        next()
    }
})

const creatRouter = function (baseUrl, directAgent = false) {
    const router = express.Router()
    router.use(createProxyMiddleware({
        target: baseUrl.target || target,
        changeOrigin: true,
        async onProxyRes(proxyRes, req, res) {
            if (directAgent) {
                return
            }
            if (proxyRes.statusCode === 200) {
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

    app.use(baseUrl.url, router)
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
app.listen(3000, (e) => console.log('已开启'))