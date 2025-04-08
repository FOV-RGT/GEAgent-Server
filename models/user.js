'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            // 定义与其他模型的关联
            User.hasMany(models.Conversation, { 
                foreignKey: 'userId', 
                as: 'conversations' 
            });
        }
        // 验证密码方法
        async validatePassword(password) {
            return bcrypt.compare(password, this.password);
        }
        static async getNewUserId() {
            try {
                const maxUser = await this.findOne({
                    order: [['userId', 'DESC']]
                });
                console.log('最大用户ID:', maxUser ? maxUser.userId : 100);
                return maxUser ? maxUser.userId + 1 : 101; // 从101开始
            } catch (e) {
                console.error('获取最大用户ID失败:', e);
                return 101;
            }
        }
    }
    User.init({
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                len: [6, 50],
                notEmpty: true
            }
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true,
            validate: {
                isEmail: {
                    msg: '请提供有效的邮箱地址',
                    args: true
                },
                customValidator(value) {
                    if (value === '') {
                        this.setDataValue('email', null);
                    }
                }
            }
        },
        password: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                len: [8, 100] // 密码长度8-100
            }
        },
        fullName: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        avatarUrl: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        role: {
            type: DataTypes.ENUM('user', 'admin'),
            defaultValue: 'user',
            allowNull: false
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false
        },
        lastLogin: {
            type: DataTypes.DATE,
            allowNull: true
        },
    }, {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
        hooks: {
            // 加密密码的钩子
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            }
        }
    });
    return User;
};