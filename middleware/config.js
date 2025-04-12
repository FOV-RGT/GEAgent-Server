const { UserConfig } = require('../models');

const LLM_CONFIG = [
    {
        model: "deepseek-ai/DeepSeek-R1",
        max_tokens: 16384
    },
    {
        model: 'deepseek-ai/DeepSeek-V3',
        max_tokens: 8192
    },
    {
        model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
        max_tokens: 16384
    },
    {
        model: 'Qwen/QwQ-32B',
        max_tokens: 32768
    },
    {
        model: 'Qwen/Qwen2.5-72B-Instruct-128K',
        max_tokens: 4096
    }
]

const findConfig = async (req, res, next) => {
    let { LLMID } = req.params;
    if (LLMID === undefined || LLMID === null) {
        LLMID = req.body.LLMID;
    }
    LLMID = parseInt(LLMID);
    const userId = req.user.userId;
    if (isNaN(LLMID)) {
        return res.status(400).json({
            success: false,
            message: '无效的LLMID'
        })
    }
    if (LLMID === null || LLMID === undefined || LLMID < 0 || LLMID > 4) {
        return res.status(400).json({
            success: false,
            message: '无效的LLMID',
            details: 'LLMID必须在0到4之间'
        })
    }
    try {
        let configs = await UserConfig.findOne({
            where: {
                userId,
                LLMID: parseInt(LLMID)
            }
        });
        if (!configs) {
            configs = await UserConfig.create({
                userId,
                LLMID: parseInt(LLMID),
                max_tokens: 2048,
                temperature: 0.8,
                top_p: 0.7,
                top_k: 50,
                frequent_penalty: 0.5
            });
        }
        req.configs = {
            max_tokens: configs.max_tokens,
            temperature: configs.temperature,
            top_p: configs.top_p,
            top_k: configs.top_k,
            frequent_penalty: configs.frequent_penalty
        };
        next();
    } catch (e) {
        return res.status(500).json({
            success: false,
            message: '获取LLM设置失败',
            details: e.message || '未知错误'
        })
    }
}

module.exports = {
    LLM_CONFIG,
    findConfig
}