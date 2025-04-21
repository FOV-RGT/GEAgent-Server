const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { storeVerificationCode, verifyCode, emailTransporter } = require('../services/emailService.js');
const { validate } = require('uuid');

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
        const { username, password, fullName } = req.body;
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
        // 创建新用户
        const newUser = await User.create({
            username,
            password, // 密码会在模型中自动哈希加密
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

// 更新密码
exports.updatePassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    const { currentPassword, updatedPassword } = req.body;
    const passwordRequestedValidate = !!currentPassword && !!updatedPassword
    if (!passwordRequestedValidate) {
        return res.status(400).json({
            success: false,
            message: '密码上传不完整'
        });
    }
    try {
        const user = await User.findByPk(req.params.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        const isMatch = await user.validatePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: '当前密码错误'
            });
        }
        user.password = updatedPassword;
        await user.save();
        let token = null;
        try {
            const user = await User.findOne({
                where: {
                    id: req.user.id,
                    isActive: true // 确保账号处于激活状态
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
            token = jwt.sign(
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
        } catch (e) {
            console.error('刷新令牌错误:', e);
            res.status(500).json({
                success: false,
                message: '服务器错误，请稍后再试',
                details: e.message || '未知错误'
            });
        }
        res.json({
            success: true,
            message: '密码更新成功',
            token
        });
    } catch (e) {
        console.error('更新用户信息错误:', e);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后再试',
            details: e.message || '未知错误'
        });
    }
}

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
        await emailTransporter.sendMail({
            from: `"GEAgent平台" < ${process.env.EMAIL_USER} >`,
            to: email,
            subject: 'GEAgent - 邮箱验证码',
            text: `您的验证码是: ${code}，有效期5分钟。请勿泄露给他人。`,
            html:   `<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e3e3e3; border-radius: 5px;">
                        <h2 style="color: #333;">GEAgent - 邮箱验证</h2>
                        <p>您好!</p>
                        <p>您的验证码是: <strong style="font-size: 18px; letter-spacing: 2px;">${code}</strong></p>
                        <p>此验证码将在5分钟后失效。请勿泄露给他人。</p>
                        <p>如果您没有请求此验证码，请忽略此邮件。</p>
                        <p style="margin-top: 30px; font-size: 12px; color: #999;">此邮件由系统自动发送，请勿回复。</p>
                    </div>`,
            headers: {
                'X-Priority': '1',
                'X-MSMail-Priority': 'High',
                'Importance': 'High'
            }
        })
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