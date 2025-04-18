const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { validateConversationTitle, validatePaginationQuery } = require('../middleware/validators');
const chatController = require('../controllers/chatController');
const { findConfig } = require('../middleware/config');

// 创建新的对话
router.post('/create', authenticateJWT, validateConversationTitle, findConfig, chatController.createNewConversation);

// 继续现有对话
router.post('/continue/:conversationId', authenticateJWT, findConfig, chatController.continuePreviousConversation);

// 获取对话列表
router.get('/list', authenticateJWT, validatePaginationQuery, chatController.getConversationsList);

// 获取特定对话所有消息
router.get('/list/:conversationId', authenticateJWT, validatePaginationQuery, chatController.getConversationData);

// 删除对话
router.delete('/delete', authenticateJWT, chatController.deleteConversation);

// 删除所有对话
router.delete('/deleteAll', authenticateJWT, chatController.deleteAllConversations);

// 更新标题
router.put('/updateTitle/:conversationId', authenticateJWT, validateConversationTitle, chatController.updateConversationTitle);

module.exports = router;