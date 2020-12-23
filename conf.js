const target = ''
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

module.exports = {
    target,
    baseUrls
}