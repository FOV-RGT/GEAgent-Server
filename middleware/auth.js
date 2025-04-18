const jwt = require('jsonwebtoken');
const { User } = require('../models');
require('dotenv').config();

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'token格式错误'
            });
        }
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Token无效或已过期'
                });
            }
            const userData = await User.findOne({
                where: {
                    userId: user.userId,
                    isActive: true
                }
            });
            if (!userData) {
                return res.status(403).json({
                    success: false,
                    message: '用户不存在或已被禁用'
                });
            }
            req.user = user;
            next();
        })
    } else {
        res.status(401).json({
            success: false,
            message: '未提供Token',
        });
    }
};

const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: '未认证用户'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: '没有权限访问此资源'
            });
        }
        next();
    }
}

module.exports = {
    authenticateJWT,
    authorizeRole
}