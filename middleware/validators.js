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
        .isLength({ max: 20 }).withMessage('昵称长度不能超过20个字符')
]

// 用户创建验证
exports.validateUserCreation = [
    ...exports.validateRegister,
    check('userId')
        .optional({ checkFalsy: true })
        .isInt({ min: 1, max: 100 }).withMessage('用户ID必须是1到100之间的整数')
];

// 验证对话标题
exports.validateConversationTitle = [
    check('title')
        .isLength({ max: 50 }).withMessage('标题长度不能超过50个字符')
        .matches(/^[^<>]*$/).withMessage('标题不能包含HTML标签字符')
        .trim()
        .escape() // 转义HTML特殊字符，防止XSS
];

exports.validateUpdateInfo = [
    check('email')
        .optional({ checkFalsy: true }) // 允许为空或未提供
        .isEmail().withMessage('无效的电子邮件地址'),
    check('fullName')
        .optional({ checkFalsy: true })
        .isLength({ max: 20 }).withMessage('昵称长度不能超过20个字符')
]

exports.validateUpdatePassword = [
    check('updatedPassword')
        .notEmpty().withMessage('新密码不能为空')
        .isLength({ min: 8, max: 100 }).withMessage('新密码长度必须在8-100字符之间')
        .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/).withMessage('新密码必须包含大小写字母和数字')
]

exports.validateConfig = [
    check('configs')
        .exists().withMessage('configs对象是必需的')
        .isObject().withMessage('configs必须是一个对象'),
    check('configs.temperature')
        .optional()
        .isFloat({ min: 0, max: 2 }).withMessage('temperature 必须是 0 到 2 之间的浮点数')
        .customSanitizer(value => parseFloat(value)),
    check('configs.top_p')
        .optional()
        .isFloat({ min: 0.1, max: 1.0 }).withMessage('top_p 必须是 0.1 到 1.0 之间的浮点数')
        .customSanitizer(value => parseFloat(value)),
    check('configs.top_k')
        .optional()
        .isInt({ min: 0, max: 100 }).withMessage('top_k 必须是 0 到 100 之间的整数')
        .customSanitizer(value => parseInt(value)),
    check('configs.frequent_penalty')
        .optional()
        .isFloat({ min: -2, max: 2 }).withMessage('frequent_penalty 必须是 -2 到 2 之间的浮点数')
        .customSanitizer(value => parseFloat(value))
]