const redis = require('redis');
require('dotenv').config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

// 创建Redis客户端配置
const redisConfig = {
    socket: {
        host: REDIS_HOST,
        port: REDIS_PORT
    }
};

if (REDIS_PASSWORD) {
    redisConfig.password = REDIS_PASSWORD;
}

const redisClient = redis.createClient(redisConfig);

redisClient.on('error', (err) => console.error('Redis错误：', err));
redisClient.on('connect', () => console.log(`Redis连接成功 - ${REDIS_HOST}:${REDIS_PORT}`));
(async () => {
    await redisClient.connect();
})();

async function setWithExpiry(key, value, seconds) {
    try {
        await redisClient.set(key, value, { EX: seconds})
        return true
    } catch (e) {
        console.error('Redis键值对设置失败：', e);
        return false
    }
}

async function get(key) {
    try {
        return await redisClient.get(key);
    } catch (e) {
        console.error('Redis获取失败：', e);
        return null;
    }
}

async function del(key) {
    try {
        return await redisClient.del(key);
    } catch (e) {
        console.error('Redis删除失败：', e);
        return null;
    }
}

module.exports = {
    redisClient,
    setWithExpiry,
    get,
    del
}