const os = require('os');
const osUtils = require('node-os-utils');
const cpu = osUtils.cpu;
const mem = osUtils.mem;
const netstat = osUtils.netstat;
const drive = osUtils.drive;

// 检测是否在Docker环境中运行
function isRunningInDocker() {
    try {
        return require('fs').existsSync('/.dockerenv');
    } catch (error) {
        return false;
    }
}

// 获取系统状态信息
// 获取系统状态信息
const GetSystemStatus = async () => {
    try {
        // 获取CPU详细信息
        const cpuCount = os.cpus().length;
        const cpuModel = os.cpus()[0].model;

        // 获取系统启动时间
        const uptime = os.uptime();
        const uptimeFormatted = formatUptime(uptime);

        // 分别获取各项指标，并添加错误处理
        let cpuUsage = 0;
        try {
            cpuUsage = await cpu.usage();
        } catch (err) {
            console.error('获取CPU使用率失败:', err);
        }

        let memInfo = { freeMemPercentage: 0 };
        try {
            memInfo = await mem.info();
        } catch (err) {
            console.error('获取内存信息失败:', err);
        }

        let networkStats = {};
        try {
            networkStats = await netstat.stats();
        } catch (err) {
            console.error('获取网络统计信息失败:', err);
        }

        // 为不同平台处理磁盘信息
        // 为不同平台处理磁盘信息
        let diskInfo = { totalGb: 0, freeGb: 0, usedGb: 0, usedPercentage: 0 };
        try {
            // 尝试使用多种不同的磁盘路径格式
            const platform = os.platform();
            let diskPath;

            if (platform === 'win32') {
                // Windows 尝试不同格式的路径
                const possiblePaths = ['C:', 'C:\\', 'C:\\Windows'];
                let success = false;

                for (const path of possiblePaths) {
                    try {
                        diskInfo = await drive.info(path);
                        console.log(`成功获取磁盘信息，使用路径: ${path}`);
                        success = true;
                        break;
                    } catch (pathErr) {
                        console.error(`尝试路径 ${path} 失败:`, pathErr.message);
                    }
                }

                // 如果所有路径都失败，使用 fs 模块获取基本信息
                if (!success) {
                    try {
                        const fs = require('fs');
                        const stats = fs.statfsSync('C:\\');

                        // 手动计算磁盘信息 (字节转为GB)
                        const totalBytes = stats.blocks * stats.bsize;
                        const freeBytes = stats.bfree * stats.bsize;
                        const usedBytes = totalBytes - freeBytes;

                        diskInfo = {
                            totalGb: totalBytes / (1024 * 1024 * 1024),
                            freeGb: freeBytes / (1024 * 1024 * 1024),
                            usedGb: usedBytes / (1024 * 1024 * 1024),
                            usedPercentage: (usedBytes / totalBytes) * 100
                        };
                        console.log('使用fs模块成功获取磁盘信息');
                    } catch (fsErr) {
                        console.error('使用fs模块获取磁盘信息也失败:', fsErr.message);
                        // 提供默认值
                        diskInfo = {
                            totalGb: 100,
                            freeGb: 50,
                            usedGb: 50,
                            usedPercentage: 50
                        };
                        console.log('使用默认磁盘信息');
                    }
                }
            } else {
                // Unix/Linux/Mac
                try {
                    diskInfo = await drive.info('/');
                } catch (unixErr) {
                    console.error('获取Unix磁盘信息失败:', unixErr.message);
                    // 尝试使用fs模块
                    try {
                        const fs = require('fs');
                        const stats = fs.statfsSync('/');

                        const totalBytes = stats.blocks * stats.bsize;
                        const freeBytes = stats.bfree * stats.bsize;
                        const usedBytes = totalBytes - freeBytes;

                        diskInfo = {
                            totalGb: totalBytes / (1024 * 1024 * 1024),
                            freeGb: freeBytes / (1024 * 1024 * 1024),
                            usedGb: usedBytes / (1024 * 1024 * 1024),
                            usedPercentage: (usedBytes / totalBytes) * 100
                        };
                    } catch (fsErr) {
                        console.error('使用fs模块获取Unix磁盘信息也失败:', fsErr.message);
                        // 提供默认值
                        diskInfo = {
                            totalGb: 100,
                            freeGb: 50,
                            usedGb: 50,
                            usedPercentage: 50
                        };
                    }
                }
            }
        } catch (err) {
            console.error('获取磁盘信息失败:', err);
            // 提供默认磁盘信息
            diskInfo = {
                totalGb: 100,
                freeGb: 50,
                usedGb: 50,
                usedPercentage: 50
            };
            console.log('使用默认磁盘信息');
        }

        // 检查是否在Docker环境中运行
        const isDocker = isRunningInDocker();

        return {
            isDocker,
            running: true,
            system: {
                hostname: os.hostname(),
                platform: os.platform(),
                release: os.release(),
                type: os.type(),
                arch: os.arch(),
                uptime: uptimeFormatted,
                loadavg: os.loadavg()
            },
            resources: {
                cpu: {
                    model: cpuModel,
                    cores: cpuCount,
                    usage_percent: parseFloat(cpuUsage.toFixed(2)),
                    load_per_core: os.loadavg()[0] / cpuCount
                },
                memory: {
                    total_mb: Math.round(os.totalmem() / (1024 * 1024)),
                    free_mb: Math.round(os.freemem() / (1024 * 1024)),
                    used_mb: Math.round((os.totalmem() - os.freemem()) / (1024 * 1024)),
                    usage_percent: parseFloat((100 - memInfo.freeMemPercentage).toFixed(2))
                },
                network: {
                    interfaces: formatNetworkInterfaces(os.networkInterfaces()),
                    stats: networkStats
                },
                disk: {
                    total_gb: Math.round(diskInfo.totalGb),
                    free_gb: Math.round(diskInfo.freeGb),
                    used_gb: Math.round(diskInfo.usedGb),
                    usage_percent: parseFloat(diskInfo.usedPercentage.toFixed(2))
                }
            },
            process: {
                pid: process.pid,
                memory_mb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
                uptime: formatUptime(process.uptime()),
                node_version: process.version,
                env: process.env.NODE_ENV || 'development'
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('获取系统状态信息失败:', error);
        return {
            running: false,
            message: '获取系统状态信息失败',
            error: error.message,
            isDocker: isRunningInDocker()
        };
    }
};
// 格式化网络接口信息
function formatNetworkInterfaces(interfaces) {
    const result = {};

    Object.keys(interfaces).forEach(ifaceName => {
        result[ifaceName] = interfaces[ifaceName].map(iface => ({
            address: iface.address,
            family: iface.family,
            internal: iface.internal,
            netmask: iface.netmask,
            cidr: iface.cidr
        }));
    });

    return result;
}

// 格式化运行时间
function formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return {
        total_seconds: seconds,
        days,
        hours,
        minutes,
        seconds: remainingSeconds,
        formatted: `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`
    };
}

module.exports = {
    GetSystemStatus
};