const { streamClient } = require('../services/chatService_stream');
const searchController = require('../controllers/searchController');
const { Conversation, Message, Interaction } = require('../models');
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
        const { message = "mygo和mujica哪个好看？", LLMID = 2, title = "新对话", webSearch, enableMCPService } = req.body;
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
        if (!LLM_CONFIG[LLMID].functionCall && enableMCPService) {
            return res.status(400).json({
                success: false,
                message: '当前模型不支持MCP服务',
                details: '请使用支持MCP服务的模型'
            });
        }
        // 创建新的对话
        const nextConversationId = await Conversation.getNextConversationId(req.user.userId);
        const conversation = await Conversation.create({
            userId: req.user.userId,
            conversationId: nextConversationId,
            title
        });
        const nextInteractionId = await Interaction.getNextInteractionId(conversation.id);
        const round = 1;
        const interaction = await Interaction.create({
            conversationId: conversation.id,
            interaction_id: nextInteractionId,
            user_input: message,
            web_search_used: !!webSearch,
            mcp_service: !!enableMCPService
        })
        const historyMessages = [];
        historyMessages.push({
            role: 'user',
            content: message
        })
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Content-Encoding', 'identity');
        res.flushHeaders();
        const connectionStatus = {
            status: true
        };
        const controller = new AbortController();
        const handleClose = async () => {
            if (!controller.signal.aborted) {
                try {
                    console.log('连接终止处理完成');
                    controller.abort();
                    connectionStatus.status = false;
                    await interaction.stop();
                } catch (e) {
                    console.error('终止错误:', e.message);
                }
            }
        };
        req.on('aborted', handleClose);
        req.on('close', handleClose);
        res.write(`data: ${JSON.stringify({ connection: connectionStatus.status, conversationId: nextConversationId })}\n\n`);
        conversationManager(req, res, conversation, historyMessages, interaction, round, connectionStatus, controller);
    } catch (e) {
        console.error('创建对话失败:', e);
        return res.write(`data: ${JSON.stringify({
            success: false,
            message: '创建对话失败',
            details: e.message || '未知错误'
        })}\n\n`);
    }
};

const MCPManager = async (res, toolCalls, connectionStatus) => {
    try {
        let toolCallPromise = [];
        let MCPStatus = {
            status: 'running',
            fnCall: [],
            callStatuses: []
        }
        for (const tool of toolCalls) {
            const name = tool.name;
            const arguments = JSON.parse(tool.arguments);
            MCPStatus.fnCall.push({
                name,
                arguments
            });
            const callPromise = searchController.callTool(name, arguments)
                .catch((e) => { // 实际上正常的callTool并不会触发catch，因为server无法直接抛出错误，否则程序将会崩溃。
                    // 推测是并未捕获server或client的应用级错误，导致express崩溃
                    console.error('调用工具失败:', name, arguments);
                    res.write(`data: ${JSON.stringify({
                        success: false,
                        message: `调用工具 ${name} 失败`,
                        details: e.message || '未知错误'
                    })}\n\n`);
                    return Promise.reject({
                        success: false,
                        name
                    });
                });
            toolCallPromise.push(callPromise);
        }
        res.write(`data: ${JSON.stringify({ MCPStatus })}\n\n`);
        const results = await Promise.allSettled(toolCallPromise);
        let fnCallResults = null;
        let content = '';
        let failedCalls = results
            .filter(res => res.status === 'rejected')
            .map(res => res.value)
            .filter(Boolean);
        if (!connectionStatus.status) {
            MCPStatus.status = 'stop'
            return {
                fnCallResults: null,
                MCPStatus
            }
        }
        if (results.length > 0) {
            for (const res of results) {
                if (res.status === 'rejected') continue
                const text = res.value.normalResult.content[0].text || 'null'
                const toolName = MCPStatus.fnCall[results.indexOf(res)].name;
                content += `你使用了function call功能调用了工具【${toolName}】，并返回了结果:\n${text}\n --- \n`;
            }
            fnCallResults = {
                role: 'user',
                content
            }
            const callStatuses = MCPStatus.fnCall.map((tool) => {
                if (failedCalls.length > 0) {
                    if (failedCalls.some(call => call.name === tool.name)) {
                        return {
                            name: tool.name,
                            success: false
                        };
                    }
                }
                return {
                    name: tool.name,
                    success: true
                };
            })
            MCPStatus.callStatuses = callStatuses;
            MCPStatus.status = 'completed';
            res.write(`data: ${JSON.stringify({ MCPStatus })}\n\n`);
            return {
                fnCallResults,
                MCPStatus
            }
        }
        res.write(`data: ${JSON.stringify({
            success: false,
            message: '工具调用失败'
        })}\n\n`);
        MCPStatus.status = 'failed';
        return {
            fnCallResults: null,
            MCPStatus
        }
    } catch (e) {
        console.error('MCPManager错误:', e.message || '未知错误');
        res.write(`data: ${JSON.stringify({
            success: false,
            message: 'MCPManager错误',
            details: e.message || '未知错误'
        })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        MCPStatus.status = 'failed';
        return {
            fnCallResults: null,
            MCPStatus
        }
    }
}

const conversationManager = async (req, res, conversation, historyMessages, interaction, round = 1, connectionStatus, controller) => {
    try {
        const { LLMID, webSearch, enableMCPService, message } = req.body;
        const { max_tokens, temperature, top_p, top_k, frequent_penalty } = req.configs;
        const tasks = [];
        let toolResults = null;
        let searchRes = null;
        let MCPStatus = {
            status: 'none'
        }
        let webSearchStatus = {
            status: 'none'
        };
        // if (MCP) {
        //     const mcpTask = MCPManager(req, res, conversation, message).then(result => {
        //         if (result) {
        //             toolResults = result;
        //             console.log('工具结果:', toolResults);
        //         }
        //         return result;
        //     }).catch(e => {
        //         console.error('MCP处理错误:', e);
        //         res.write(`data: ${JSON.stringify({
        //             success: false,
        //             message: 'MCP处理错误',
        //             details: e.message || '未知错误'
        //         })}\n\n`);
        //         return null;
        //     });
        //     tasks.push(mcpTask);
        // }
        if (!webSearch && connectionStatus.status) {
            let webSearchTask;
            if (!conversation.searchId) {
                webSearchTask = searchController.createNewSearch(message).then(result => {
                    searchRes = result;
                    console.log('搜索结果:', searchRes);
                    conversation.searchId = searchRes.searchId;
                    return conversation.save();
                }).catch(e => {
                    console.error('创建新搜索会话失败:', e.message || '未知错误');
                    webSearchStatus.status = 'failed';
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
                    return result;
                }).catch(e => {
                    console.error('搜索失败:', e);
                    webSearchStatus.status = 'failed';
                    res.write(`data: ${JSON.stringify({
                        success: false,
                        message: '搜索失败',
                        details: e.message || '未知错误'
                    })}\n\n`);
                    return null;
                });
            }
            webSearchStatus.status = 'running';
            res.write(`data: ${JSON.stringify({ webSearchStatus })}\n\n`);
            tasks.push(webSearchTask);
        }
        if (tasks.length > 0) await Promise.all(tasks);
        if (searchRes) {
            webSearchStatus.status = 'completed';
            res.write(`data: ${JSON.stringify({ webSearchStatus })}\n\n`);
            historyMessages.push({
                role: "user",
                content: promptManager.webSearchPrompt + searchRes.message || null
            });
        }
        const model = LLM_CONFIG[LLMID].model;
        let tools = null;
        if (enableMCPService) {
            tools = await searchController.getToolslist();
            historyMessages.push({
                role: "system",
                content: promptManager.functionCallPrompt
            });
        }
        const data = {
            model,
            messages: historyMessages,
            stream: true,
            max_tokens,
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
        res.write(`data: ${JSON.stringify({ postConversationRequest: true, round })}\n\n`);
        if (!connectionStatus.status) return
        const response = await streamClient.post('/chat/completions', data, {
            signal: controller.signal
        });
        // 添加一个缓冲区变量
        let dataBuffer = '';
        let toolCalls = [];
        // 处理流式响应
        response.data.on('data', (chunk) => {
            if (!connectionStatus.status) {
                // 尝试终止请求
                try {
                    response.request.abort();
                } catch (e) {
                    console.error('终止请求失败:', e);
                }
                return;
            }
            const chunkText = chunk.toString();
            try {
                // 检查是否完成
                if (chunkText.includes('[DONE]')) {
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
                            if (parsedData.choices && parsedData.choices.length > 0) {
                                const delta = parsedData.choices[0].delta;
                                const content = delta.content || null;
                                const reasoning_content = delta.reasoning_content || null;
                                const tool_calls = delta.tool_calls || null;
                                // 处理工具调用
                                if (tool_calls && tool_calls.length > 0) {
                                    for (const toolCall of delta.tool_calls) {
                                        const index = toolCall.index;
                                        // 初始化工具调用对象（如果不存在）
                                        if (!toolCalls[index]) {
                                            toolCalls.push({
                                                name: toolCall.function?.name || null,
                                                arguments: ''
                                            });
                                        }
                                        // 更新工具调用参数
                                        if (toolCall.function?.arguments) {
                                            toolCalls[index].arguments += toolCall.function.arguments;
                                        }
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
                res.end();
                interaction.markError();
            }
        });
        // 处理流错误
        response.data.on('error', err => {
            console.error('流错误:', err.message);
            res.write(`data: ${JSON.stringify({ error: '流处理出错: ' + err.message })}\n\n`);
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
            interaction.markError();
        });
        response.data.on('end', async () => {
            try {
                if (!connectionStatus.status) {
                    try {
                        await interaction.stop();
                        if (resContent || resReasoningContent) {
                            await Message.create({
                                conversationId: conversation.id,
                                role: 'assistant',
                                assistant_output: resContent,
                                assistant_reasoning_output: resReasoningContent,
                                mcp_service_status: MCPStatus,
                                web_search_status: webSearchStatus,
                                round,
                                interaction_id: interaction.interaction_id
                            });
                        }
                    } catch (e) {
                        console.error('停止交互失败:', e.message || '未知错误');
                    }
                }
                // 处理完成的工具调用
                if (toolCalls.length > 0) {
                    console.log('完整的工具调用:', toolCalls);
                    const functionCallRes = await MCPManager(res, toolCalls, connectionStatus);
                    if (functionCallRes.fnCallResults) {
                        historyMessages.push({
                            role: 'user',
                            content: resContent || null
                        })
                        historyMessages.push(functionCallRes.fnCallResults);
                        MCPStatus = functionCallRes.MCPStatus;
                        req.body.webSearch = false;
                        conversationManager(req, res, conversation, historyMessages, interaction, round + 1, connectionStatus, controller);
                    } else {
                        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                        res.end();
                        interaction.markError();
                    }
                } else {
                    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                    res.end();
                    interaction.complete();
                }
                if (resContent || resReasoningContent) {
                    await Message.create({
                        conversationId: conversation.id,
                        role: 'assistant',
                        assistant_output: resContent,
                        assistant_reasoning_output: resReasoningContent,
                        mcp_service_status: MCPStatus,
                        web_search_status: webSearchStatus,
                        round,
                        interaction_id: interaction.interaction_id
                    });
                }
            } catch (e) {
                console.error('保存AI回复失败:', e);
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                res.end();
                interaction.markError();
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
                interaction.markError();
            } catch (e) {
                console.error('无法发送错误响应:', e);
            }
        }
    }
}

// 继续上次对话
exports.continuePreviousConversation = async (req, res) => {
    const { message = "mygo和mujica哪个好看？", LLMID = 2, webSearch, enableMCPService } = req.body;
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
    if (!LLM_CONFIG[LLMID].functionCall && enableMCPService) {
        return res.status(400).json({
            success: false,
            message: '当前模型不支持MCP服务',
            details: '请使用支持MCP服务的模型'
        });
    }
    let interaction
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
        const nextInteractionId = await Interaction.getNextInteractionId(conversation.id);
        const round = 1;
        interaction = await Interaction.create({
            conversationId: conversation.id,
            interaction_id: nextInteractionId,
            user_input: message,
            web_search_used: !!webSearch,
            mcp_service: !!enableMCPService
        });
        const historyMessages = await conversation.getPreviousMessages(5);
        historyMessages.push({
            role: 'user',
            content: message
        });
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Content-Encoding', 'identity');
        res.flushHeaders();
        const connectionStatus = {
            status: true
        };
        const controller = new AbortController();
        const handleClose = async () => {
            if (!controller.signal.aborted) {
                try {
                    console.log('连接终止处理完成');
                    controller.abort();
                    connectionStatus.status = false;
                    await interaction.stop();
                } catch (e) {
                    console.error('终止错误:', e.message);
                }
            }
        };
        req.on('aborted', handleClose);
        req.on('close', handleClose);
        res.write(`data: ${JSON.stringify({ connection: connectionStatus.status })}\n\n`);
        conversationManager(req, res, conversation, historyMessages, interaction, round, connectionStatus, controller);
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
                interaction.markError();
            } catch (e) {
                console.error('无法发送错误响应:', e);
            }
        }
    }
};

// 获取对话列表
exports.getConversationsList = async (req, res) => {
    try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '参数验证失败',
                errors: error.array()
            });
        }
        const { page = 1, pageSize = 10 } = req.query;
        const userId = req.user.userId
        const conversationsList = await Conversation.getConversationList(userId, page, pageSize);
        if (conversationsList.conversations.length === 0) {
            return res.json({
                success: false,
                message: '没有找到对话'
            });
        }
        res.json({ success: true, conversationsList });
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
        const error = validationResult(req);
        if (!error.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '参数验证失败',
                errors: error.array()
            });
        }
        const userConversationId = parseInt(req.params.conversationId);
        const { page = 1, pageSize = 10 } = req.query;
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
            }
        });
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: '对话不存在或无权访问'
            });
        }
        const pagingInteractions = await conversation.getPagingInteractions(page, pageSize);
        if (pagingInteractions.interactions.rows.length === 0) {
            return res.json({
                success: false,
                message: '没有找到对话消息',
            });
        }
        res.json({
            success: true,
            pagingInteractions
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