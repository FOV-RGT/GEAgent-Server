const { GetDockerStatus } = require('../services/dockerStatus');
const os = require('os');

exports.getDockerStatus = async (req, res) => {
    try {
        const status = await GetDockerStatus(req, res);
        
        // 如果不在Docker环境中运行，返回系统信息而不是容器信息
        if (!status.isDocker) {
            const systemInfo = {
                success: true,
                isDocker: false,
                system: {
                    platform: os.platform(),
                    release: os.release(),
                    hostname: os.hostname(),
                    uptime: os.uptime(),
                    cpus: os.cpus().length,
                    totalMemory: Math.round(os.totalmem() / (1024 * 1024)),
                    freeMemory: Math.round(os.freemem() / (1024 * 1024)),
                    memoryUsage: parseFloat((1 - (os.freemem() / os.totalmem())) * 100).toFixed(2),
                    nodeVersion: process.version,
                    env: process.env.NODE_ENV || 'development'
                },
                message: status.message,
                timestamp: new Date().toISOString()
            };
            
            return res.status(200).json(systemInfo);
        }
        
        return res.status(200).json({
            success: true,
            ...status
        });
    } catch (e) {
        console.error('获取容器状态信息错误：', e);
        return res.status(500).json({
            success: false,
            message: '获取容器或系统状态信息错误',
            details: e.message || '未知错误'
        });
    }
}