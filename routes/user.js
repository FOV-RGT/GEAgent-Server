const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');
const {
    validateLogin,
    validateRegister,
    validateUpdateInfo,
    validateUpdatePassword,
    validateEmail,
    validateEmailAndPurpose

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
router.put('/updateInfo/:userId', authenticateJWT, validateUpdateInfo, authController.updateUser);

// 更新密码路由
router.put('/updatePassword/:userId', authenticateJWT, validateUpdatePassword, authController.updatePassword);

// 上传头像路由
router.post('/avatar', authenticateJWT, ossController.uploadAvatar);

// 获取头像URL路由
router.get('/avatar', authenticateJWT, ossController.getAvatarUrl);

// 获取邮箱验证码
router.get('/emailVerificationCode', validateEmailAndPurpose, authController.sendVerificationCode);

// 绑定邮箱
router.put('/bindEmail', authenticateJWT, validateEmail, authController.bindEmail);

// 通过邮箱登录
router.post('/loginByEmail', validateEmail, authController.loginByEmail);

module.exports = router;