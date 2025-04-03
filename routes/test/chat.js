const express = require('express');
const router = express.Router();
const { client } = require('../../services/test/chatService');

const LLM_CONFIG = [
    { model: 'deepseek-ai/DeepSeek-R1' },
    { model: 'deepseek-ai/DeepSeek-V3' },
    { model: 'Qwen/QwQ-32B' }
]

router.post('/', async (req, res) => {
    try {
        const { message, LLMID } = req.body;
        const model = LLM_CONFIG[LLMID].model;
        console.log(`请求模型: ${model}`);
        console.log(`请求消息: ${message}`);
        const data = {
            model,
            messages: [
                {
                    role: 'user',
                    content: message,
                }
            ],
            stream: false,
            max_tokens: 512,
            stop: null,
            temperature: 0.8,
            top_p: 0.7,
            top_k: 50,
            frequent_penalty: 0.5,
            n: 1,
            response_format: {
                type: 'text'
            }
        }
        const response = await client.post('/chat/completions', data);
        res.json(response.data);
    } catch (error) {
        console.error('LLM请求错误:', error.response?.data || error.message);
        res.status(500).json({ 
            error: '处理请求时出错：', 
            details: error.message || '未知',
        });
    }
})

module.exports = router;