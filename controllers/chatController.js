const { client } = require('../services/chatService_stream');
const searchController = require('../controllers/searchController');
const { Conversation, Message } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const { LLM_CONFIG } = require('../middleware/config');

// 创建新的对话
exports.createNewConversation = async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: '参数验证失败',
            errors: error.array()
        });
    }
    const { message = "mygo和mujica哪个好看？", LLMID = 2, title = "新对话", webSearch = true} = req.body;
    const { max_tokens, temperature, top_p, top_k, frequent_penalty } = req.configs;
    console.log(req.configs);
    if (!message) {
        return res.status(400).json({
            success: false,
            message: '缺少必要参数',
            details: 'message是必需的'
        });
    }
    if (LLMID === null || LLMID === undefined || LLMID < 0 || LLMID >= LLM_CONFIG.length) {
        return res.status(400).json({
            success: false,
            message: '无效的LLMID',
            details: `LLMID必须在0到${LLM_CONFIG.length - 1}之间`
        });
    }
    let searchRes;
    if (webSearch) {
        try {
            searchRes = await searchController.createNewSearch(message);
            console.log('搜索结果:', searchRes);
        } catch (e) {
            console.error('创建新搜索会话失败:', e.message || '未知错误');
            return res.status(500).json({
                success: false,
                message: '创建新搜索会话失败',
                details: e.message || '未知错误'
            });
        }
    }
    // 创建新的对话
    let conversation;
    const nextConversationId = await Conversation.getNextConversationId(req.user.userId);
    try {
        conversation = await Conversation.create({
            userId: req.user.userId,
            conversationId: nextConversationId,
            searchId: searchRes ? searchRes.searchId : null,
            title,
        });
        // 保存对话数据
        await Message.create({
            conversationId: conversation.id,
            role: 'user',
            content: message.trim()
        });
    } catch (e) {
        console.error('创建对话失败:', e);
        return res.status(500).json({
            success: false,
            message: '创建对话失败',
            details: e.message || '未知错误'
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
        res.write(`data: ${JSON.stringify({ conversationId: nextConversationId, title })}\n\n`);
        // 发送响应头
        res.flushHeaders();
        const messages = [];
        messages.push({
            role: 'user',
            content: parsedMessage
        });
        if (searchRes) {
            messages.push({
                role: 'system',
                content: searchRes ? searchRes.message : null
            });
        }
        // 准备请求数据
        const data = {
            model,
            messages,
            stream: true,
            max_tokens,
            stop: null,
            temperature,
            top_p,
            top_k,
            frequent_penalty,
            n: 1,
            response_format: {
                type: 'text'
            }
        }
        let resContent = '';
        let resReasoningContent = '';
        // 发送请求
        const response = await client.post('/chat/completions', data);
        // 添加一个缓冲区变量
        let dataBuffer = '';
        // 处理流式响应
        // response.data.on('data', (chunk) => {
        //     const chunkText = chunk.toString();
        //     try {
        //         if (chunkText.includes('[DONE]')) {
        //             res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        //             return;
        //         }
        //         console.log('chunkText:', chunkText);
        //         const dataChunks = chunkText.split('\n\n').filter(chunk => chunk.trim() !== '');
        //         for (const dataChunk of dataChunks) {
        //             // 处理每个独立的数据块
        //             if (dataChunk.trim().startsWith('data: ')) {
        //                 try {
        //                     // 提取JSON部分
        //                     const jsonText = dataChunk.trim().substring(6);
        //                     const parsedData = JSON.parse(jsonText);
        //                     if (parsedData.choices && parsedData.choices.length > 0) {
        //                         const delta = parsedData.choices[0].delta;
        //                         const content = delta.content || null;
        //                         const reasoning_content = delta.reasoning_content || null;
        //                         if (content) {
        //                             resContent += content;
        //                         }
        //                         if (reasoning_content) {
        //                             resReasoningContent += reasoning_content;
        //                         }
        //                         // 只转发有内容的部分
        //                         if (content || reasoning_content) {
        //                             res.write(`data: ${JSON.stringify({ content, reasoning_content })}\n\n`);
        //                         }
        //                     }
        //                 } catch (parseError) {
        //                     // 单个数据块解析错误，记录并继续处理其他块
        //                     console.error('解析JSON块失败:', parseError.message);
        //                     console.error('问题数据块:', dataChunk);
        //                     // 作为原始数据发送
        //                     res.write(`data: ${JSON.stringify({ raw: dataChunk })}\n\n`);
        //                 }
        //             } else {
        //                 // 非标准格式数据发送为原始数据
        //                 res.write(`data: ${JSON.stringify({ raw: dataChunk })}\n\n`);
        //             }
        //         }
        //     } catch (e) {
        //         // 整体处理异常
        //         console.error('处理响应数据错误:', e);
        //         console.error('原始数据:', chunkText);
        //         res.write(`data: ${JSON.stringify({ error: '数据处理错误: ' + e.message })}\n\n`);
        //     }
        // });
        response.data.on('data', (chunk) => {
            const chunkText = chunk.toString();
            try {
                // 检查是否完成
                if (chunkText.includes('[DONE]')) {
                    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                    return;
                }
                // 将新数据添加到缓冲区
                dataBuffer += chunkText;
                // 尝试提取并处理完整的数据块
                while (true) {
                    // 寻找完整的数据块 (data: {...}\n\n 格式)
                    const endOfBlockIndex = dataBuffer.indexOf('\n\n');
                    if (endOfBlockIndex === -1) break; // 没有找到完整块，退出循环
                    const dataBlock = dataBuffer.substring(0, endOfBlockIndex);
                    dataBuffer = dataBuffer.substring(endOfBlockIndex + 2); // 移除已处理的数据块
                    // 现在处理提取出的完整数据块
                    if (dataBlock.trim().startsWith('data: ')) {
                        try {
                            // 提取JSON部分
                            const jsonStart = dataBlock.indexOf('{');
                            if (jsonStart === -1) continue; // 没有找到JSON开始，跳过这个块
                            const jsonText = dataBlock.substring(jsonStart);
                            const parsedData = JSON.parse(jsonText);
                            if (parsedData.choices && parsedData.choices.length > 0) {
                                const delta = parsedData.choices[0].delta;
                                const content = delta.content || null;
                                const reasoning_content = delta.reasoning_content || null;
                                if (content) {
                                    resContent += content;
                                }
                                if (reasoning_content) {
                                    resReasoningContent += reasoning_content;
                                }
                                // 只转发有内容的部分
                                if (content || reasoning_content) {
                                    res.write(`data: ${JSON.stringify({ content, reasoning_content })}\n\n`);
                                }
                            }
                        } catch (parseError) {
                            console.error('解析JSON块失败:', parseError.message);
                            console.error('问题数据块:', dataBlock);
                            res.write(`data: ${JSON.stringify({ raw: dataBlock })}\n\n`);
                        }
                    }
                }
                // 检查缓冲区是否过大 (防止内存泄漏)
                if (dataBuffer.length > 1000000) { // 1MB限制
                    console.warn('缓冲区过大，清空');
                    dataBuffer = dataBuffer.substring(dataBuffer.length - 100000); // 保留最后100KB
                }
            } catch (e) {
                console.error('处理响应数据错误:', e);
                console.error('原始数据:', chunkText);
                res.write(`data: ${JSON.stringify({ error: '数据处理错误: ' + e.message })}\n\n`);
            }
        });
        // 处理流错误
        response.data.on('error', err => {
            console.error('流错误:', err);
            res.write(`${JSON.stringify({ error: '流处理出错: ' + err.message })}\n\n`);
            res.end();
        });
        response.data.on('end', async () => {
            try {
                if (resContent) {
                    await Message.create({
                        conversationId: conversation.id,
                        role: 'assistant',
                        content: resContent,
                        reasoning_content: resReasoningContent
                    });
                }
            } catch (e) {
                console.error('保存AI回复失败:', e);
            } finally {
                res.end();
            }
        });
    } catch (error) {
        // 这里只有在设置响应头之前发生的错误才会执行
        console.error('LLM请求错误:', error.response?.data || error.message);
        if (!res.headersSent) {
            // 只有在响应头未发送时才设置状态和发送JSON
            res.status(500).json({
                success: false,
                message: '处理请求时出错',
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
};

// 继续上次对话
exports.continuePreviousConversation = async (req, res) => {
    const { message = "mygo和mujica哪个好看？", LLMID = 2, webSearch = true} = req.body;
    const { max_tokens, temperature, top_p, top_k, frequent_penalty } = req.configs;
    const userConversationId = parseInt(req.params.conversationId);
    if (isNaN(userConversationId) || userConversationId < 1) {
        return res.status(400).json({
            success: false,
            message: '无效的会话ID',
            details: '会话ID必须是正整数'
        });
    }
    if (!message) {
        return res.status(400).json({
            success: false,
            message: '缺少必要参数',
            details: 'message是必需的'
        });
    }
    if (LLMID === null || LLMID === undefined || LLMID < 0 || LLMID >= LLM_CONFIG.length) {
        return res.status(400).json({
            success: false,
            message: '无效的LLMID',
            details: `LLMID必须在0到${LLM_CONFIG.length - 1}之间`
        });
    }
    try {
        const conversation = await Conversation.findOne({
            where: {
                userId: req.user.userId,
                conversationId: userConversationId
            }
        });
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: '对话不存在或无权访问',
            });
        }
        let searchRes;
        if (webSearch) {
            if (!conversation.searchId) {
                try {
                    searchRes = await searchController.createNewSearch(message);
                    conversation.searchId = searchRes.searchId;
                    await conversation.save();
                } catch (e) {
                    console.error('创建新搜索会话失败:', e.message || '未知错误');
                    return res.status(500).json({
                        success: false,
                        message: '创建新搜索会话失败',
                        details: e.message || '未知错误'
                    });
                }
            } else {
                try {
                    searchRes = await searchController.search(message, conversation.searchId);
                    console.log('搜索结果:', searchRes);
                } catch (e) {
                    return res.status(500).json({
                        success: false,
                        message: '搜索失败',
                        details: e.message || '未知错误'
                    });
                }
            }
        }
        const messages = await Message.findAll({
            where: { conversationId: conversation.id },
            order: [['createdAt', 'ASC']]
        });
        await Message.create({
            conversationId: conversation.id,
            role: 'user',
            content: message.trim()
        });
        const historyMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content,
        }));
        historyMessages.push({
            role: 'user',
            content: message.trim()
        });
        if (searchRes) {
            historyMessages.push({
                role: "system",
                content: searchRes ? searchRes.message : null
            });
        }
        const model = LLM_CONFIG[LLMID].model;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        const data = {
            model,
            messages: historyMessages,
            stream: true,
            max_tokens,
            stop: null,
            temperature,
            top_p,
            top_k,
            frequent_penalty,
            n: 1,
            response_format: {
                type: 'text'
            }
        };
        let resContent = '';
        let resReasoningContent = '';
        const response = await client.post('/chat/completions', data);
        response.data.on('data', (chunk) => {
            const chunkText = chunk.toString();
            try {
                if (chunkText.includes('[DONE]')) {
                    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                    return;
                }
                const dataChunks = chunkText.split('\n\n').filter(chunk => chunk.trim() !== '');
                for (const dataChunk of dataChunks) {
                    // 处理每个独立的数据块
                    if (dataChunk.trim().startsWith('data: ')) {
                        try {
                            // 提取JSON部分
                            const jsonText = dataChunk.trim().substring(6);
                            const parsedData = JSON.parse(jsonText);
                            if (parsedData.choices && parsedData.choices.length > 0) {
                                const delta = parsedData.choices[0].delta;
                                const content = delta.content || null;
                                const reasoning_content = delta.reasoning_content || null;
                                if (content) {
                                    resContent += content;
                                }
                                if (reasoning_content) {
                                    resReasoningContent += reasoning_content;
                                }
                                // 只转发有内容的部分
                                if (content || reasoning_content) {
                                    res.write(`data: ${JSON.stringify({ content, reasoning_content })}\n\n`);
                                }
                            }
                        } catch (parseError) {
                            // 单个数据块解析错误，记录并继续处理其他块
                            console.error('解析JSON块失败:', parseError.message);
                            console.error('问题数据块:', dataChunk);
                            // 作为原始数据发送
                            res.write(`data: ${JSON.stringify({ raw: dataChunk })}\n\n`);
                        }
                    } else {
                        // 非标准格式数据发送为原始数据
                        res.write(`data: ${JSON.stringify({ raw: dataChunk })}\n\n`);
                    }
                }
            } catch (e) {
                // 整体处理异常
                console.error('处理响应数据错误:', e);
                console.error('原始数据:', chunkText);
                res.write(`data: ${JSON.stringify({ error: '数据处理错误: ' + e.message })}\n\n`);
            }
        });
        // 处理流错误
        response.data.on('error', err => {
            console.error('流错误:', err);
            res.write(`${JSON.stringify({ error: '流处理出错: ' + err.message })}\n\n`);
            res.end();
        });
        response.data.on('end', async () => {
            try {
                if (resContent) {
                    await Message.create({
                        conversationId: conversation.id,
                        role: 'assistant',
                        content: resContent,
                        reasoning_content: resReasoningContent
                    });
                }
            } catch (e) {
                console.error('保存AI回复失败:', e);
            } finally {
                res.end();
            }
        });
    } catch (error) {
        // 这里只有在设置响应头之前发生的错误才会执行
        console.error('LLM请求错误:', error.response?.data || error.message);
        if (!res.headersSent) {
            // 只有在响应头未发送时才设置状态和发送JSON
            res.status(500).json({
                success: false,
                message: '处理请求时出错',
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
};

exports.getConversationsList = async (req, res) => {
    try {
        const conversations = await Conversation.findAll({
            where: { userId: req.user.userId },
            order: [['updatedAt', 'DESC']],
            attributes: ['id', 'conversationId', 'title', 'createdAt', 'updatedAt'],
        });
        if (conversations.length === 0) {
            return res.status(200).json({
                success: true,
                message: '没有找到对话',
            });
        }
        res.json({ success: true, conversations });
    } catch (e) {
        console.error('获取对话列表失败:', e);
        res.status(500).json({
            success: false,
            message: '获取对话列表失败',
            details: e.message || '未知错误'
        });
    }
};

exports.getConversationData = async (req, res) => {
    try {
        const userConversationId = parseInt(req.params.conversationId);
        if (isNaN(userConversationId)) {
            return res.status(400).json({
                success: false,
                message: '无效的会话ID',
                details: '会话ID必须是数字'
            });
        }
        const conversation = await Conversation.findOne({
            where: {
                userId: req.user.userId,
                conversationId: userConversationId
            },
            include: {
                model: Message,
                as: 'messages',
                order: [['createdAt', 'ASC']]
            }
        });
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: '对话不存在或无权访问'
            });
        }
        res.json({
            success: true,
            conversation,
        })
    } catch (e) {
        console.error('获取对话消息失败:', e);
        res.status(500).json({
            success: false,
            message: '获取对话消息失败',
            details: e.message || '未知错误'
        });
    }
};

exports.deleteConversation = async (req, res) => {
    try {
        let { conversationIds } = req.body;
        if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: '请提供有效的对话ID数组'
            });
        }
        conversationIds = conversationIds.map(id => parseInt(id)).filter(id => !isNaN(id));
        if (conversationIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: '无效的对话ID'
            });
        }
        const result = await Conversation.destroy({
            where: {
                userId: req.user.userId,
                conversationId: { [Op.in]: conversationIds }
            }
        });
        if (result === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到可删除的对话或无权访问'
            });
        }
        res.json({
            success: true,
            message: `成功删除了${result}个对话`,
            deletedCount: result
        });
    } catch (e) {
        console.error('删除对话失败:', e);
        res.status(500).json({
            success: false,
            message: '删除对话失败',
            details: e.message || '未知错误'
        });
    }
};

exports.updateConversationTitle = async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: '参数验证失败',
            errors: error.array()
        });
    }
    try {
        const userConversationId = parseInt(req.params.conversationId);
        const { title } = req.body;
        if (isNaN(userConversationId)) {
            return res.status(400).json({
                success: false,
                message: '无效的会话ID',
                details: '会话ID必须是数字'
            });
        }
        if (!title) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数',
                details: 'title是必需的'
            });
        }
        const conversation = await Conversation.findOne({
            where: {
                userId: req.user.userId,
                conversationId: userConversationId
            }
        });
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: '对话不存在或无权访问'
            });
        }
        conversation.title = title;
        await conversation.save();
        res.json({
            success: true,
            message: '标题更新成功',
            conversationId: userConversationId,
            title: title
        });
    } catch (e) {
        console.error('更新标题失败:', e);
        return res.status(500).json({
            success: false,
            message: '更新标题失败',
            details: e.message || '未知错误'
        });
    }
};

exports.deleteAllConversations = async (req, res) => {
    try {
        const result = await Conversation.destroy({
            where: {
                userId: req.user.userId
            }
        });
        if (result === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到可删除的对话或无权访问'
            });
        }
        res.json({
            success: true,
            message: `成功删除了${result}个对话`,
            deletedCount: result
        });
    } catch (e) {
        console.error('删除所有对话失败:', e);
        res.status(500).json({
            success: false,
            message: '删除所有对话失败',
            details: e.message || '未知错误'
        });
    }
}