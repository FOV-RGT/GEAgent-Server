const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');
const { validateLogin, validateRegister, validateUserCreation, validateUpdateInfo, validateUpdatePassword } = require('../middleware/validators');

// 登录路由
router.post('/login', validateLogin, authController.login);
// 注册路由
router.post('/register', validateRegister, authController.register);
// 获取用户信息路由
router.get('/me', authenticateJWT, authController.getCurrentUser);
// 获取所有用户信息路由 - 仅限管理员
router.get('/', authenticateJWT, authorizeRole(['admin']), authController.getAllUsers);
// 创建用户路由 - 仅限管理员
router.post('/create', authenticateJWT, authorizeRole(['admin']), validateUserCreation, authController.createUser);
// 刷新令牌路由
router.get('/refreshToken', authenticateJWT, authController.refreshToken);
// 更新邮箱或昵称路由
router.put('/updateInfo/:userId', authenticateJWT, validateUpdateInfo, authController.updateUser);
// 更新密码路由
router.put('/updatePassword/:userId', authenticateJWT, validateUpdatePassword, authController.updatePassword);

module.exports = router;
