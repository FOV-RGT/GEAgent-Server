const axios = require('axios');
require('dotenv').config();

// 创建axios客户端实例
const client = axios.create({
    baseURL: 'https://qianfan.baidubce.com',
    headers: {
        'Authorization': `Bearer ${process.env.SEARCH_API_KEY}`,
        'Content-Type': 'application/json',
    },
});

// 请求拦截器
client.interceptors.request.use((config) => {
    return config;
}, (error) => {
    return Promise.reject(error);
});

// 响应拦截器
client.interceptors.response.use((response) => {
    return response;
}, (error) => {
    console.error(`响应错误：`, error.response?.data || error.message || '未知');
    return Promise.reject(error);
});

module.exports = {
    client
}