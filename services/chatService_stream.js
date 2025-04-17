const axios = require('axios');
require('dotenv').config();

// 创建流式输出axios客户端实例
const streamClient = axios.create({
    baseURL: 'https://api.siliconflow.cn/v1',
    headers: {
        'Authorization': `Bearer ${process.env.CHAT_API_KEY}`,
        'Content-Type': 'application/json',
    },
    responseType: 'stream'
});

// 请求拦截器
streamClient.interceptors.request.use((config) => {
    return config;
}, (error) => {
    return Promise.reject(error);
});

// 响应拦截器
streamClient.interceptors.response.use((response) => {
    return response;
}, (error) => {
    console.error(`响应错误：`, error.response?.data || error.message || '未知');
    return Promise.reject(error);
});

module.exports = {
    streamClient
}