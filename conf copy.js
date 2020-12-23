const target = ''
/**
 * api 代理配置
 */
const baseUrls = {
    auth: { url: '/auth', direct: false }, // 授权基础模块
    workbench: { url: '/workbench', direct: false }, // 工作台模块
    admin: { url: '/admin', direct: false }, // 用户基础模块
    platform: { url: '/platform', direct: false }, // 管理台模块
    visitor: { url: '/visitor', direct: false }, // 访客模块
    file: { url: '/file', direct: true }, // 图片模块
    message: { url: '/message', direct: false }, // 消息模块
    dormitory: { url: '/dormitory', direct: false }, // 宿舍管理
    workflow: { url: '/workflow', direct: false }, // 审批流
    attendance: { target: '', url: '/attendance', direct: true } // 考勤管理
}

module.exports = {
    target,
    baseUrls
}