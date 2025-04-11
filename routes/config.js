const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { findConfig } = require('../middleware/config');
const configController = require('../controllers/configController');
const { validateConfig } = require('../middleware/validators');

// 获取指定LLM设置
router.get('/:LLMID', authenticateJWT, findConfig, configController.getConfig);

// 更新指定LLM设置
router.put('/:LLMID', authenticateJWT, validateConfig, findConfig, configController.updateConfig);

// 获取所有LLM设置
router.get('/', authenticateJWT, configController.getAllConfigs);

module.exports = router;