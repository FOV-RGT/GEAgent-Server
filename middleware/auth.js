const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Token无效或已过期'
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