const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { storeVerificationCode, verifyCode, sendCodeEmail } = require('../services/emailService.js');

// 登录
exports.login = async (req, res) => {
    try {
        // 验证请求
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        // 查找用户
        const { username, password } = req.body;
        const user = await User.findOne({
            where: {
                username,
                isActive: true // 确保账号处于激活状态
            }
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }
        // 验证密码
        const isMatch = await user.validatePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }
        user.lastLogin = new Date(); // 更新最后登录时间
        await user.save(); // 保存更新
        // 生成JWT
        const token = jwt.sign(
            {
                id: user.id,
                userId: user.userId,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '3d' } // 3天过期
        );
        res.json({
            success: true,
            message: '登录成功',
            token,
            user: {
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });
    } catch (e) {
        console.error('登录错误:', e);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后再试',
            details: e.message || '未知错误'
        });
    }
}

// 注册
exports.register = async (req, res) => {
    try {
        // 验证请求
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        const { username, password, fullName, email, code } = req.body;
        // 检查用户名是否已存在
        const existingUsername = await User.findOne({
            where: { username }
        });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: '账号已被注册'
            });
        }
        const isValidate = await verifyCode('register', email, code);
        if (!isValidate) {
            return res.status(400).json({
                success: false,
                message: "验证码错误或已过期"
            });
        }
        // 创建新用户
        const newUser = await User.create({
            username,
            password, // 密码会在模型中自动哈希加密
            email,
            userId: User.getNewUserId(), // 获取最大用户ID并加1
            fullName: fullName || null,
            role: 'user', // 默认角色为用户
            isActive: true // 默认激活状态
            
        });
        // 生成JWT
        const token = jwt.sign(
            {
                id: newUser.id,
                userId: newUser.userId,
                username: newUser.username,
                fullName: newUser.fullName,
                email: newUser.email,
                role: newUser.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '3d' } // 3天过期
        );
        res.status(201).json({
            success: true,
            token,
            user: {
                username: newUser.username,
                email: newUser.email,
                fullName: newUser.fullName,
                role: newUser.role
            }
        });
    } catch (e) {
        console.error('注册错误:', e);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后再试',
            details: e.message || '未知错误'
        });
    }
}

// 获取用户信息
exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: {
                exclude: ['id', 'password']
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }     
        res.json({
            success: true,
            user
        });
    } catch (e) {
        console.error('获取用户信息错误:', e);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后再试',
            details: e.message || '未知错误'
        });
    }
}

// 获取所有用户信息
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: [
                'id',
                'userId',
                'username',
                'email',
                'fullName',
                'avatarId',
                'role',
                'lastLogin',
                'isActive',
                'createdAt',
                'updatedAt'
            ]
        });
        res.json({
            success: true,
            users
        })
    } catch (e) {
        console.error('获取所有用户信息错误:', e);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后再试',
            details: e.message || '未知错误'
        });
    }
}

// 刷新令牌
exports.refreshToken = async (req, res) => {
    try {
        const user = await User.findOne({
            where: {
                id: req.user.id,
                isActive: true
            },
            attributes: [
                'id',
                'userId',
                'username',
                'email',
                'role'
            ]
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在或已被禁用'
            });
        }
        // 生成新token
        const newToken = jwt.sign(
            {
                id: user.id,
                userId: user.userId,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '3d' } // 3天过期
        );
        res.json({
            success: true,
            token: newToken
        });
    } catch (e) {
        console.error('刷新令牌错误:', e);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后再试',
            details: e.message || '未知错误'
        });
    }
}

// 创建用户
exports.createUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        // 验证请求
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        const { username, email, password, fullName, role } = req.body;
        const existingUsername = await User.findOne({
            where: { username }
        });
        // 检查用户名是否已存在
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: '用户名已被注册'
            });
        }
        let emailToSave = null;
        // 检查邮箱是否已存在
        if (email && email.trim() !== '') {
            emailToSave = email.trim();
            const existingEmail = await User.findOne({
                where: { email: emailToSave }
            });
            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: '邮箱已被注册'
                });
            }
        }
        // 创建新用户
        const newUser = await User.create({
            username,
            email: emailToSave,
            password,
            fullName: fullName || null,
            userId: User.getNewUserId(),
            role: role || 'admin', // 默认角色为管理员
            isActive: true // 默认激活状态
        });
        res.status(201).json({
            success: true,
            user: {
                id: newUser.id,
                userId: parseInt(newUser.userId, 10),
                username: newUser.username,
                password,
                email: newUser.email,
                fullName: newUser.fullName,
                role: newUser.role
            }
        })
    } catch (e) {
        console.error('创建用户错误:', e);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后再试',
            details: e.message || '未知错误'
        });
    }
}

// 更新用户信息
exports.updateUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    const { currentPassword, email, fullName } = req.body;
    try {
        const user = await User.findByPk(req.params.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        if (!!email) {
            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    message: '更新邮箱需要提供当前密码'
                });
            }
            const isMatch = await user.validatePassword(currentPassword);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: '当前密码错误'
                });
            }
            if (email && email.trim() !== user.email) {
                const existingEmail = await User.findOne({
                    where: {
                        email: email.trim(),
                        id: { [Op.ne]: user.id }
                    }
                });
                if (existingEmail) {
                    return res.status(400).json({
                        success: false,
                        message: '邮箱已被注册'
                    });
                }
                user.email = email.trim();
            }
        }
        if (!!fullName && fullName !== user.fullName) {
            user.fullName = fullName;
        }
        await user.save();
        res.json({
            success: true,
            user: {
                email: user.email,
                fullName: user.fullName
            }
        });
    } catch (e) {
        console.error('更新用户信息错误:', e);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后再试',
            details: e.message || '未知错误'
        });
    }
};

exports.sendVerificationCode = async (req, res) => {
    try {
        const error = validationResult(req)
        if (!error.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '参数验证失败',
                errors: error.array()
            })
        }
        const { purpose, email } = req.body;
        const code = await storeVerificationCode(purpose, email, 60 * 5);
        if (!code) {
            return res.status(500).json({
                success: false,
                message: '验证码生成失败，请稍后再试'
            });
        }
        const result = await sendCodeEmail(email, code)
        if (!result) {
            return res.status(500).json({
                success: false,
                message: '验证码发送失败，请稍后再试'
            });
        }
        res.json({
            success: true,
            message: '验证码已发送到您的邮箱，请注意查收'
        })
    } catch (e) {
        console.error('发送验证码错误:', e);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后再试',
            details: e.message || '未知错误'
        });
    }
}

// 绑定邮箱
exports.bindEmail = async (req, res) => {
    try {
        const error = validationResult(req)
        if (!error.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '参数验证失败',
                errors: error.array()
            })
        }
        const { email, code } = req.body
        const isValidate = await verifyCode('bindEmail', email, code)
        if (!isValidate) {
            return res.status(400).json({
                success: false,
                message: "验证码错误或已过期"
            })
        }
        const user = await User.findOne({
            where: {
                userId: req.user.userId
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            })
        }
        user.email = email
        await user.save()
        res.json({
            success: true,
            message: '邮箱绑定成功'
        })
    } catch (e) {
        console.error('绑定邮箱错误:', e);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后再试',
            details: e.message || '未知错误'
        });
    }
}

// 邮箱登录
exports.loginByEmail = async (req, res) => {
    try {
        const error = validationResult(req)
        if (!error.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '参数验证失败',
                errors: error.array()
            })
        }
        const { email, code } = req.body
        const isValidate = await verifyCode('login', email, code)
        if (!isValidate) {
            return res.status(400).json({
                success: false,
                message: "验证码错误或已过期"
            })
        }
        const user = await User.findOne({
            where: {
                email,
                isActive: true
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            })
        }
        const token = jwt.sign(
            {
                id: user.id,
                userId: user.userId,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '3d' }
        );
        user.lastLogin = new Date();
        await user.save();
        return res.json({
            success: true,
            message: '登录成功',
            token,
            user: {
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        })
    } catch (e) {
        console.error('邮箱登录错误:', e);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后再试',
            details: e.message || '未知错误'
        });
    }
}

// 重置密码
exports.resetPassword = async (req, res) => {
    try {
        const error = validationResult(req)
        if (!error.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '参数验证失败',
                errors: error.array()
            })
        }
        const { code, newPassword, email } = req.body
        const user = await User.findOne({
            where: { 
                email,
                isActive: true
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            })
        }
        const isValidate = await verifyCode('resetPassword', email, code)
        if (!isValidate) {
            return res.status(400).json({
                success: false,
                message: "验证码错误或已过期"
            })
        }
        user.password = newPassword
        await user.save()
        const token = jwt.sign(
            {
                id: user.id,
                userId: user.userId,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '3d' } // 3天过期
        )
        res.json({
            success: true,
            message: '密码重置成功',
            token
        })
    } catch (e) {
        console.error('找回密码错误:', e);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后再试',
            details: e.message || '未知错误'
        });
    }
}