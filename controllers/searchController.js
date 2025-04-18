const { client } = require('../services/searchService');
const util = require('util');
require('dotenv').config();
const { getMCPClient } = require('../services/mcp-client');
let mcp = null;
getMCPClient()
    .then((client) => {
        mcp = client;
        console.log('MCP初始化成功');
    })
    .catch(err => {
        console.error('初始化MCP Client失败：', err);
        return null;
    });

exports.createNewSearch = async (query) => {
    try {
        const data = JSON.stringify({ app_id: process.env.SEARCH_APP_ID });
        const response = await client.post('/v2/app/conversation', data);
        console.log('创建新搜索会话成功:', response);
        return await exports.search(query, response.conversation_id);
    } catch (e) {
        throw new Error(`创建新搜索会话失败: ${e.message || '未知错误'}`);
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
            message: response.answer,
            searchId: conversation_id,
        };
    } catch (e) {
        throw new Error(`搜索失败: ${e.message || '未知错误'}`);
    }
};

exports.getToolslist = async () => {
    const result = await mcp.listTools();
    const formattedTools = result.tools.map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema
            }
    }));
    console.log('获取工具列表成功:', util.inspect(formattedTools, { depth: null, colors: true }));
    return formattedTools;
}

exports.getMCPToolslist = async (req, res) => {
    try {
        res.json({
            success: true,
            tools: await exports.getToolslist()
        })
    } catch (e) {
        console.error('获取工具列表失败:', e);
        res.status(500).json({
            success: false,
            message: '获取工具列表失败',
            details: e.message || '未知错误'
        });
    }
}

exports.callTool = async (name, arguments) => {
    try {
        const result = await mcp.callTool({
            name,
            arguments
        });
        return formattedResult(result, name);
    } catch (e) {
        throw new Error(`调用工具失败: ${e.message || '未知错误'}`);
    }
}

exports.MCPCallTool = async (req, res) => {
    try {
        const { name, arguments, type } = req.body;
        console.log('调用工具请求数据:', name, arguments, type);
        if (!name) {
            return res.status(400).json({
                success: false,
                message: '缺少工具名称'
            });
        }
        if (Object.keys(arguments).length === 0) {
            return res.status(400).json({
                success: false,
                message: '缺少工具参数'
            });
        }
        const { normalResult, extraData } = await exports.callTool(name, arguments);
        res.json({
            result: type === 'normal' ? normalResult : extraData,
        });
    } catch (e) {
        console.error('调用工具失败:', e);
        res.status(500).json({
            success: false,
            message: '调用工具失败',
            details: e.message || '未知错误'
        });
    }
}

const formattedResult = (result, toolName) => {
    let normalResult = result;
    let extraData = {}
    // 检查是否有需要解析的文本字段
    if (result && result.content && Array.isArray(result.content)) {
        const processedContent = result.content.map(item => {
            if (item.type === 'text' && typeof item.text === 'string') {
                try {
                    // 尝试解析 JSON 字符串
                    const parsedText = JSON.parse(item.text);
                    if (!parsedText.success) {
                        extraData[toolName] = {
                            success: false,
                            error: parsedText.error || '未知错误'
                        }
                        return {
                            ...item,
                            text: parsedText.error || '未知错误',
                            success: false
                        }
                    }
                    if (parsedText.extra_data) {
                        extraData[toolName] = {
                            success: true,
                            ...parsedText.extra_data
                        };
                    }
                    return {
                        ...item,
                        success: true,
                        text: JSON.stringify(parsedText.data)
                    };
                } catch (e) {
                    // 如果不是有效的 JSON，保留原始文本
                    console.log('解析JSON失败:', e);
                    return item;
                }
            }
            return item;
        });
        normalResult = {
            ...result,
            content: processedContent
        };
    }
    return {
        normalResult,
        extraData
    }
}

exports.ping = async (req, res) => {
    try {
        const result = mcp.ping();
        res.json({
            success: true,
            message: 'Ping成功',
            result
        })
    } catch (e) {
        console.error('Ping失败:', e);
        res.status(500).json({
            success: false,
            message: 'Ping失败',
            details: e.message || '未知错误'
        });
    }
}

exports.getPrompt = async () => {
    try {
        const result = await mcp.getPrompt({
            name: 'baseprompt',
            arguments: {
                msg: 'list'
            }
        });
        console.log('获取提示词列表成功:', result);
        return result
    } catch (e) {
        throw new Error(`获取提示词列表失败:${e.message || 未知错误}`);
    }
}

exports.routerGetPrompt = async (req, res) => {
    try {
        res.json({
            success: true,
            prompts: await exports.getPrompt()
        })
    } catch (e) {
        console.error('获取提示词列表失败:', e);
        res.status(500).json({
            success: false,
            message: '获取提示词列表失败',
            details: e.message || '未知错误'
        });
    }
}

exports.getResourcesList = async () => {
    try {
        const result = await mcp.listResources();
        console.log('获取资源列表成功:', util.inspect(result, { depth: null, colors: true }));
        return result;
    } catch (e) {
        throw new Error(`获取资源列表失败:${e.message || '未知错误'}`);
    }
}

exports.routerGetResourcesList = async (req, res) => {
    try {
        res.json({
            success: true,
            resources: await exports.getResourcesList()
        });
    } catch (e) {
        console.error('获取资源列表失败:', e);
        res.status(500).json({
            success: false,
            message: '获取资源列表失败',
            details: e.message || '未知错误'
        });
    }
}
