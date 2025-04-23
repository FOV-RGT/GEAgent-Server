const Docker = require('dockerode');
const fs = require('fs');
const os = require('os');

// 创建Docker客户端实例 - 使用只读socket
let docker;
try {
    docker = new Docker(
        os.platform() === 'win32'
            ? { socketPath: '//./pipe/docker_engine' } // Windows路径
            : { socketPath: '/var/run/docker.sock' }   // Linux/Mac路径
    );
    
} catch (error) {
    console.warn('Docker客户端初始化失败:', error.message);
    docker = null;
}

// 获取当前容器ID
function getCurrentContainerId() {
    // 检查是否在容器环境中运行
    if (os.platform() !== 'linux') {
        console.log('不在Linux容器环境中运行，跳过容器ID获取');
        return null;
    }

    try {
        if (!fs.existsSync('/proc/self/cgroup')) {
            console.log('找不到容器相关文件，可能不在容器中运行');
            return null;
        }

        const content = fs.readFileSync('/proc/self/cgroup', 'utf8');
        const matches = content.match(/[0-9a-f]{64}/g);
        return matches ? matches[0] : null;
    } catch (error) {
        console.warn('获取容器ID失败:', error.message);
        return null;
    }
}

// API接口 - 获取容器状态
const GetDockerStatus = async (req, res) => {
    // 如果不在Docker环境中或Docker客户端初始化失败，返回适当的信息
    if (!docker) {
        return {
            running: false,
            message: '当前环境中Docker客户端不可用',
            isDocker: false
        };
    }

    try {
        const containerId = getCurrentContainerId();
        if (!containerId) {
            return {
                running: false,
                message: '未检测到在Docker容器中运行',
                isDocker: false
            };
        }

        const container = docker.getContainer(containerId);
        const info = await container.inspect();
        const stats = await container.stats({ stream: false });

        // 计算CPU使用率
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemCpuDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        const cpuCount = stats.cpu_stats.online_cpus || 1;
        const cpuUsage = (cpuDelta / systemCpuDelta) * cpuCount * 100;

        // 计算内存使用率
        const memoryUsage = stats.memory_stats.usage;
        const memoryLimit = stats.memory_stats.limit;
        const memoryPercent = (memoryUsage / memoryLimit) * 100;

        // 返回JSON响应
        return {
            isDocker: true,
            running: true,
            container: {
                id: containerId.substring(0, 12),
                name: info.Name.startsWith('/') ? info.Name.substring(1) : info.Name,
                status: info.State.Status,
                created: info.Created
            },
            resources: {
                cpu: {
                    usage_percent: parseFloat(cpuUsage.toFixed(2)),
                    cores: cpuCount
                },
                memory: {
                    usage_mb: Math.round(memoryUsage / (1024 * 1024)),
                    limit_mb: Math.round(memoryLimit / (1024 * 1024)),
                    usage_percent: parseFloat(memoryPercent.toFixed(2))
                },
                network: stats.networks ? {
                    rx_bytes: stats.networks.eth0?.rx_bytes,
                    tx_bytes: stats.networks.eth0?.tx_bytes
                } : null
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.warn('获取容器统计信息失败:', error.message);
        return {
            running: false,
            message: '获取Docker容器统计信息失败',
            error: error.message,
            isDocker: false
        };
    }
};

module.exports = {
    GetDockerStatus
};