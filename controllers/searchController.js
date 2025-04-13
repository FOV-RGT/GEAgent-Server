const { client } = require('../services/searchService');
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

exports.getToolslist = async () => {
    const result = await mcp.listTools();
    const tools = result.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
    }));
    return tools;
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

exports.callTool = async (req, res) => {
    try {
        console.log('调用工具请求数据:', req.body);
        const result = await mcp.callTool({
            name: req.body.tool,
            arguments: {
                keyword: req.body.args
            }
        });
        const { normalResult, extraData } = formattedResult(result, req.body.tool);
        if (Object.keys(extraData).length > 0) {
            res.json({
                success: true,
                result: extraData
            });
        }
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
                    if (parsedText.extra_data) {
                        extraData[toolName] = parsedText.extra_data;
                    }
                    return {
                        ...item,
                        text: JSON.stringify(parsedText.data),
                    };
                } catch (e) {
                    // 如果不是有效的 JSON，保留原始文本
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