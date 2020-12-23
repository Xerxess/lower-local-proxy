const http = require('http')
const fs = require("fs")
const url = require('url')
const md5 = require('md5')
const qs = require('querystring')
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
    return new Promise((resolve, reject) => {
        const myURL = new URL((req.originalUrl || req.url), target);
        const query = qs.parse(myURL.search.substring(1))
        if (req.cacheFileName) {
            resolve(req.cacheFileName)
            return
        }
        if (req.method == 'POST') {
            var body = '';
            req.on('data', function (chunk) {
                body += chunk;   //读取请求体
            })

            req.on('end', function () {
                const postMd5 = md5(body)
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
        } else {
            let fileName = myURL.pathname.replace(/\//g, '_')
            if (query['_']) {
                delete query['_']
            }
            fileName += '__' + Object.keys(query).map(key => {
                return query[key]
            }).join('_') + '.json'
            fileName.replace(/\//g, '_')
            req.cacheFileName = fileName.replace(/\//g, '_').replace(/=/g, '_')
            resolve(req.cacheFileName)
        }
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
            console.log('文件生成失败', err)
        })
    })
}

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