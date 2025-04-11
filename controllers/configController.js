const { UserConfig } = require('../models');
const { Op } = require('sequelize');
const { LLM_CONFIG } = require('../middleware/config');
const { validationResult } = require('express-validator');

exports.getConfig = async (req, res) => {
    try {
        res.json({
            success: true,
            configs: req.configs
        })
    } catch (e) {
        return res.status(500).json({
            success: false, 
            message: '获取LLM设置失败',
            details: e.message || '未知错误'
        });
    }
}

exports.updateConfig = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: '参数验证失败',
            details: errors.array()
        });
    }
    try {
        const LLMID = req.params.LLMID;
        const { configs } = req.body;
        if (configs.max_tokens > LLM_CONFIG[LLMID].max_tokens || configs.max_tokens < 0) {
            return res.status(400).json({
                success: false,
                message: 'max_tokens超出范围',
                details: `max_tokens必须在0到${LLM_CONFIG[LLMID].max_tokens}之间`
            });
        }
        const currentConfig = await UserConfig.findOne({
            where: {
                userId: req.user.userId,
                LLMID: parseInt(req.params.LLMID)
            }
        });
        if (configs.max_tokens !== undefined) currentConfig.max_tokens = configs.max_tokens;
        if (configs.temperature !== undefined) currentConfig.temperature = configs.temperature;
        if (configs.top_p !== undefined) currentConfig.top_p = configs.top_p;
        if (configs.top_k !== undefined) currentConfig.top_k = configs.top_k;
        if (configs.frequent_penalty !== undefined) currentConfig.frequent_penalty = configs.frequent_penalty;
        await currentConfig.save();
        res.json({
            success: true,
            message: 'LLM设置更新成功'
        });
    } catch (e) {
        return res.status(500).json({
            success: false, 
            message: '更新LLM设置失败',
            details: e.message || '未知错误'
        });
    }
}