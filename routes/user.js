const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');
const {
    validateLogin,
    validateRegister,
    validateUpdateInfo,
    validateEmailAndCode,
    validateEmailAndPurpose,
    validateResetPassword

} = require('../middleware/validators');
const ossController = require('../controllers/ossController');

// 登录路由
router.post('/login', validateLogin, authController.login);

// 注册路由
router.post('/register', validateRegister, authController.register);

// 获取用户信息路由
router.get('/me', authenticateJWT, authController.getCurrentUser);

// 获取所有用户信息路由 - 仅限管理员
router.get('/', authenticateJWT, authorizeRole(['admin']), authController.getAllUsers);

// 创建用户路由 - 仅限管理员
router.post('/create', authenticateJWT, authorizeRole(['admin']), validateRegister, authController.createUser);

// 刷新令牌路由
router.get('/refreshToken', authenticateJWT, authController.refreshToken);

// 更新邮箱或昵称路由
router.put('/me', authenticateJWT, validateUpdateInfo, authController.updateUser);

// 上传头像路由
router.post('/avatar', authenticateJWT, ossController.uploadAvatar);

// 获取头像URL路由
router.get('/avatar', authenticateJWT, ossController.getAvatarUrl);

// 获取邮箱验证码
router.post('/emailVerificationCode', validateEmailAndPurpose, authController.sendVerificationCode);

// 绑定邮箱
router.put('/bindEmail', authenticateJWT, validateEmailAndCode, authController.bindEmail);

// 通过邮箱登录
router.post('/loginByEmail', validateEmailAndCode, authController.loginByEmail);

// 重置密码
router.put('/resetPassword', validateResetPassword, authController.resetPassword);

module.exports = router;