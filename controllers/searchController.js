const { client } = require('../services/searchService');
require('dotenv').config();

exports.createNewSearch = async (query) => {
    try {
        const data = JSON.stringify({ app_id: process.env.SEARCH_APP_ID });
        const response = await client.post('/v2/app/conversation', data);
        console.log('创建新搜索会话成功:', response.data);
        
        return await exports.search(query, response.data.conversation_id);
    } catch (e) {
        throw new Error('创建新搜索会话失败: ', e.message || '未知错误');
    }
};

exports.search = async (query, conversation_id) => {
    try {
        const data = JSON.stringify({
            app_id: process.env.SEARCH_APP_ID,
            query,
            conversation_id,
            stream: false
        });
        console.log('搜索请求数据:', data);
        
        const response = await client.post('/v2/app/conversation/runs', data);
        return {
            message: response.data.answer,
            searchId: conversation_id,
        };
    } catch (e) {
        throw new Error('搜索失败: ', e.message || '未知错误');  
    }
};
