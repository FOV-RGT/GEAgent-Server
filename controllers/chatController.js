const { streamClient, normalClient } = require('../services/chatService_stream');
const searchController = require('../controllers/searchController');
const { Conversation, Message } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const { LLM_CONFIG } = require('../middleware/config');
const promptManager = require('../services/promptManager')

// 创建新的对话
exports.createNewConversation = async (req, res) => {
    try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '参数验证失败',
                errors: error.array()
            });
        }
        const { message = "mygo和mujica哪个好看？", LLMID = 2, title = "新对话" } = req.body;
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
        // 创建新的对话
        let conversation;
        const nextConversationId = await Conversation.getNextConversationId(req.user.userId);
        conversation = await Conversation.create({
            userId: req.user.userId,
            conversationId: nextConversationId,
            title
        });
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        res.write(`data: ${JSON.stringify({ connectionSuccess: true })}\n\n`);
        res.write(`data: ${JSON.stringify({ conversationId: nextConversationId, title })}\n\n`);
        // 保存对话数据
        await conversationManager(req, res, conversation, message);
    } catch (e) {
        console.error('创建对话失败:', e);
        return res.write(`data: ${JSON.stringify({
            success: false,
            message: '创建对话失败',
            details: e.message || '未知错误'
        })}\n\n`);
    }
};

const MCPManager = async (req, res, conversation, message) => {
    try {
        const messages = await Message.findAll({
            where: { conversationId: conversation.id },
            order: [['createdAt', 'ASC']]
        });
        const historyMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content,
        }));
        historyMessages.push({
            role: 'user',
            content: message
        });
        historyMessages.push({
            role: 'system',
            content: promptManager.basePrompt
        })
        const model = LLM_CONFIG[3].model;
        const tools = await searchController.getToolslist();
        const data = {
            model,
            messages: historyMessages,
            stream: false,
            max_tokens: 1024,
            stop: null,
            temperature: 0.4,
            top_p: 0.7,
            top_k: 40,
            frequent_penalty: 0.5,
            n: 1,
            response_format: {
                type: 'text'
            },
            tools
        };
        const response = await normalClient.post('/chat/completions', data);
        const resMessage = response.data.choices[0].message;
        console.log('MCPManager消息:', resMessage);
        const toolCall = resMessage?.tool_calls;
        if (!resMessage || !resMessage?.tool_calls) {
            return 0
        }
        console.log('工具调用:', toolCall);
        let toolCallPromise = [];
        let calltools = []
        for (const tool of toolCall) {
            const fn = tool.function
            if (fn) {
                const name = fn.name;
                calltools.push(name);
                const arguments = JSON.parse(fn.arguments);
                const callPromise = searchController.callTool(name, arguments)
                    .catch((e) => {
                        console.error('调用工具失败:', name, arguments);
                        return res.write(`data: ${JSON.stringify({
                            success: false,
                            message: `调用工具 ${name} 失败`,
                            details: e.message || '未知错误'
                        })}\n\n`);
                    });
                toolCallPromise.push(callPromise);
            }
        }
        const prompt = promptManager.functionCallPrompt(tools, calltools);
        const results = await Promise.allSettled(toolCallPromise);
        let toolResults = null;
        let content = '';
        if (results.length > 0) {
            for (const res of results) {
                const text = res.value.normalResult.content[0].text || 'null'
                content += `${text}\n --- \n`;
            }
            toolResults = {
                role: 'system',
                content: prompt + content
            }
            res.write(`data: ${JSON.stringify({ MCPSuccess: true })}\n\n`);
            return toolResults
        }
        return 0
    } catch (e) {
        console.error('MCPManager错误:', e.message || '未知错误');
        return res.write(`data: ${JSON.stringify({
            success: false,
            message: 'MCPManager错误',
            details: e.message || '未知错误'
        })}\n\n`);
    }
}

const conversationManager = async (req, res, conversation, message) => {
    try {
        const { LLMID, webSearch, MCP } = req.body;
        const { max_tokens, temperature, top_p, top_k, frequent_penalty } = req.configs;
        const tasks = [];
        let toolResults = null;
        let searchRes = null;
        if (MCP) {
            const mcpTask = MCPManager(req, res, conversation, message).then(result => {
                if (result) {
                    toolResults = result;
                    console.log('工具结果:', toolResults);
                }
                return result;
            }).catch(e => {
                console.error('MCP处理错误:', e);
                res.write(`data: ${JSON.stringify({
                    success: false,
                    message: 'MCP处理错误',
                    details: e.message || '未知错误'
                })}\n\n`);
                return null;
            });
            tasks.push(mcpTask);
        }
        if (webSearch) {
            let webSearchTask;
            if (!conversation.searchId) {
                webSearchTask = searchController.createNewSearch(message).then(result => {
                    searchRes = result;
                    console.log('搜索结果:', searchRes);
                    res.write(`data: ${JSON.stringify({ webSearchSuccess: true })}\n\n`);
                    conversation.searchId = searchRes.searchId;
                    return conversation.save();
                }).catch(e => {
                    console.error('创建新搜索会话失败:', e.message || '未知错误');
                    res.write(`data: ${JSON.stringify({
                        success: false,
                        message: '创建新搜索会话失败',
                        details: e.message || '未知错误'
                    })}\n\n`);
                    return null;
                });
            } else {
                webSearchTask = searchController.search(message, conversation.searchId).then(result => {
                    searchRes = result;
                    console.log('搜索结果:', searchRes);
                    res.write(`data: ${JSON.stringify({ webSearchSuccess: true })}\n\n`);
                    return result;
                }).catch(e => {
                    console.error('搜索失败:', e);
                    res.write(`data: ${JSON.stringify({
                        success: false,
                        message: '搜索失败',
                        details: e.message || '未知错误'
                    })}\n\n`);
                    return null;
                });
            }
            tasks.push(webSearchTask);
        }
        if (tasks.length > 0) {
            await Promise.all(tasks);
        }
        const messages = await Message.findAll({
            where: { conversationId: conversation.id },
            order: [['createdAt', 'ASC']]
        });
        let historyMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content,
        }));
        if (toolResults) {
            historyMessages.push(toolResults);
        }
        if (searchRes) {
            historyMessages.push({
                role: "system",
                content: promptManager.webSearchPrompt + searchRes.message || null
            });
        }
        historyMessages.push({
            role: 'user',
            content: message
        });
        await Message.create({
            conversationId: conversation.id,
            role: 'user',
            content: message
        });
        const model = LLM_CONFIG[LLMID].model;
        const tools = await searchController.getToolslist();
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
            },
            tools
        };
        let resContent = '';
        let resReasoningContent = '';
        const response = await streamClient.post('/chat/completions', data);
        // 添加一个缓冲区变量
        let dataBuffer = '';
        let streamingToolCalls = {};
        // 处理流式响应
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
                            // 声明一个变量来跟踪流式工具调用
                            
                            // 在 response.data.on('data') 处理函数内修改处理工具调用的部分
                            if (parsedData.choices && parsedData.choices.length > 0) {
                                const delta = parsedData.choices[0].delta;
                                const content = delta.content || null;
                                const reasoning_content = delta.reasoning_content || null;
                                // 处理工具调用
                                if (delta.tool_calls && delta.tool_calls.length > 0) {
                                    for (const toolCall of delta.tool_calls) {
                                        const index = toolCall.index;
                                        // 初始化工具调用对象（如果不存在）
                                        if (!streamingToolCalls[index]) {
                                            streamingToolCalls[index] = {
                                                index,
                                                id: toolCall.id || null,
                                                type: toolCall.type || null,
                                                function: {
                                                    name: toolCall.function?.name || null,
                                                    arguments: ''
                                                }
                                            };
                                        }
                                        // 更新工具调用对象
                                        if (toolCall.id) streamingToolCalls[index].id = toolCall.id;
                                        if (toolCall.type) streamingToolCalls[index].type = toolCall.type;
                                        if (toolCall.function) {
                                            if (toolCall.function.name) {
                                                streamingToolCalls[index].function.name = toolCall.function.name;
                                            }
                                            if (toolCall.function.arguments) {
                                                streamingToolCalls[index].function.arguments += toolCall.function.arguments;
                                            }
                                        }
                                        console.log(`工具调用更新 [${index}]:`, streamingToolCalls[index]);
                                    }
                                }
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
            res.write(`data: ${JSON.stringify({ error: '流处理出错: ' + err.message })}\n\n`);
            res.end();
        });
        response.data.on('end', async () => {
            try {
                // 处理完成的工具调用
                if (Object.keys(streamingToolCalls).length > 0) {
                    console.log('完整的工具调用:', Object.values(streamingToolCalls));
                    // 这里可以添加代码来处理完整的工具调用
                    // 例如，可以调用 searchController.callTool 来执行工具调用
                    const toolCallPromises = Object.values(streamingToolCalls)
                        .filter(tool => tool.function?.name && tool.function?.arguments)
                        .map(async (tool) => {
                            try {
                                const args = JSON.parse(tool.function.arguments);
                                return searchController.callTool(tool.function.name, args);
                            } catch (e) {
                                console.error(`解析或执行工具调用失败: ${tool.function.name}`, e);
                                return null;
                            }
                        });
                    // 如果需要等待工具调用完成，可以使用 Promise.all
                    const toolResults = await Promise.all(toolCallPromises);
                    console.log('工具调用结果:', toolResults);
                    
                }
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
}

// 继续上次对话
exports.continuePreviousConversation = async (req, res) => {
    const { message = "mygo和mujica哪个好看？", LLMID = 2 } = req.body;
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
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        res.write(`data: ${JSON.stringify({ connectionSuccess: true })}\n\n`);
        await conversationManager(req, res, conversation, message);
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

// 获取对话列表
exports.getConversationsList = async (req, res) => {
    try {
        const conversations = await Conversation.findAll({
            where: { userId: req.user.userId },
            order: [['updatedAt', 'DESC']],
            attributes: ['id', 'conversationId', 'title', 'createdAt', 'updatedAt'],
        });
        if (conversations.length === 0) {
            return res.json({
                success: false,
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

// 获取单个对话数据
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

// 删除单个对话
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

// 更新对话标题
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

// 删除所有对话
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