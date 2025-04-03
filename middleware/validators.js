const { check } = require('express-validator');

// 登录验证
exports.validateLogin = [
    check('credential')
        .notEmpty().withMessage('账号或邮箱不能为空'),
    check('password')
        .notEmpty().withMessage('密码不能为空')
];

// 注册验证
exports.validateRegister = [
    check('username')
        .notEmpty().withMessage('账号不能为空')
        .isLength({ min: 6, max: 50 }).withMessage('账号长度应在6到50个字符之间')
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage('账号只能包含字母、数字、下划线与连字符'),
    check('email')
        .optional({ checkFalsy: true }) // 允许为空或未提供
        .isEmail().withMessage('无效的电子邮件地址'),
    check('password')
        .notEmpty().withMessage('密码不能为空')
        .isLength({ min: 8, max: 100 }).withMessage('密码长度必须在8-100字符之间')
        .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/).withMessage('密码必须包含大小写字母和数字'),
    check('fullName')
        .optional({ checkFalsy: true })
        .isLength({ max: 100 }).withMessage('昵称长度不能超过100个字符'),
]