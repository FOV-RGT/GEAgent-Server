const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');
const { validateLogin, validateRegister, validateUserCreation } = require('../middleware/validators');

// 登录路由
router.post('/login', validateLogin, authController.login);
// 注册路由
router.post('/register', validateRegister, authController.register);
// 用户信息路由
router.get('/me', authenticateJWT, authController.getCurrentUser);
// 获取所有用户信息 - 仅限管理员
router.get('/', authenticateJWT, authorizeRole(['admin']), authController.getAllUsers);
// 创建用户 - 仅限管理员
router.post('/create', authenticateJWT, authorizeRole(['admin']), validateUserCreation, authController.createUser);
// 刷新令牌路由
router.get('/refreshToken', authenticateJWT, authController.refreshToken);

module.exports = router;
