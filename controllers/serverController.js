const { GetSystemStatus } = require('../services/systemStatus');

exports.getDockerStatus = async (req, res) => {
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