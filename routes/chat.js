const express = require('express');
const router = express.Router();
const { client } = require('../services/chatService_stream');

const LLM_CONFIG = [
    { model: "deepseek-ai/DeepSeek-R1" },
    { model: 'deepseek-ai/DeepSeek-V3' },
    { model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B' },
    { model: 'Qwen/QwQ-32B' },
    { model: 'Qwen/Qwen2.5-72B-Instruct-128K' }
]

router.post('/newSession', async (req, res) => {
    // 在发送任何响应前检查必要参数
    const { message, LLMID } = req.body;
    if (LLMID === undefined || !message) {
        return res.status(400).json({
            error: '缺少必要参数',
            details: 'LLMID和message是必需的'
        });
    }
    if (LLMID < 0 || LLMID >= LLM_CONFIG.length) {
        return res.status(400).json({
            error: '无效的LLMID',
            details: `LLMID必须在0到${LLM_CONFIG.length - 1}之间`
        });
    }
    try {
        const model = LLM_CONFIG[LLMID].model;
        const parsedMessage = message.trim();
        console.log(`请求模型: ${model}`);
        console.log(`请求消息: ${parsedMessage}`);
        // 设置响应头以支持SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // 发送响应头
        res.flushHeaders();
        // 准备请求数据
        const data = {
            model,
            messages: [
                {
                    role: 'user',
                    content: parsedMessage,
                }
            ],
            stream: true,
            max_tokens: 4096,
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
        // 发送请求
        const response = await client.post('/chat/completions', data);
        // 处理流式响应
        response.data.on('data', (chunk) => {
            const chunkText = chunk;
            res.write(`${chunkText}\n\n`);
        });
        // 处理流错误
        response.data.on('error', err => {
            console.error('流错误:', err);
            res.write(`${JSON.stringify({ error: '流处理出错: ' + err.message })}\n\n`);
            res.end();
        });
        response.data.on('end', () => {
            res.end();
        });
    } catch (error) {
        // 这里只有在设置响应头之前发生的错误才会执行
        console.error('LLM请求错误:', error.response?.data || error.message);
        if (!res.headersSent) {
            // 只有在响应头未发送时才设置状态和发送JSON
            res.status(500).json({
                error: '处理请求时出错',
                details: error.message || '未知'
            });
        } else {
            // 如果响应头已发送，通过流式方式发送错误
            try {
                res.write(`data: ${JSON.stringify({ error: '处理出错: ' + (error.message || '未知') })}\n\n`);
                res.end();
            } catch (e) {
                console.error('无法发送错误响应:', e);
            }
        }
    }
});

module.exports = router;