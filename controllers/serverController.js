const { GetSystemStatus } = require('../services/systemStatus');
const MCPManager = require('../services/mcp-client');

exports.getSystemStatus = async (req, res) => {
    try {
        const systemInfo = await GetSystemStatus();
        return res.status(200).json({
            success: true,
            ...systemInfo
        });
    } catch (e) {
        console.error('获取系统状态信息错误：', e);
        return res.status(500).json({
            success: false,
            message: '获取系统状态信息错误',
            details: e.message || '未知错误'
        });
    }
};

// 获取所有MCP客户端配置
exports.getClientConfigs = (req, res) => {
    try {
        const configs = MCPManager.getClientConfigs();
        res.json({
            success: true,
            configs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取MCP客户端配置失败',
            details: error.message || '未知错误'
        });
    }
};

// 更新MCP客户端配置
exports.updateClientConfigs = async (req, res) => {
    try {
        const { configs } = req.body;
        
        if (!Array.isArray(configs)) {
            return res.status(400).json({
                success: false,
                message: '无效的配置格式',
                details: 'configs必须是数组'
            });
        }
        // 更新配置文件
        const success = MCPManager.saveClientConfigs(configs);
        if (success) {
            res.json({
                success: true,
                message: 'MCP客户端配置更新成功'
            });
        } else {
            res.status(500).json({
                success: false,
                message: '更新MCP客户端配置失败'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '更新MCP客户端配置失败',
            details: error.message || '未知错误'
        });
    }
};

// 重新加载MCP客户端配置
exports.reloadClientConfigs = async (req, res) => {
    try {
        const result = await MCPManager.reloadClients();
        if (result) {
            const tools = await MCPManager.listTools();
            res.json({
                success: true,
                message: 'MCP客户端重新加载成功',
                toolCount: tools.length
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'MCP客户端重新加载失败'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'MCP客户端重新加载失败',
            details: error.message || '未知错误'
        });
    }
};