'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            // 定义与其他模型的关联
            User.hasMany(models.Conversation, { 
                foreignKey: 'userId', 
                as: 'conversations' 
            });
            User.hasMany(models.UserConfig, {
                foreignKey: 'userId', 
                as: 'configs'
            })
        }
        // 验证密码方法
        async validatePassword(password) {
            return bcrypt.compare(password, this.password);
        }
        static getNewUserId() {
            return uuidv4();
        }
    }
    User.init({
        userId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
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
        avatarId: {
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
        indexes: [
            {
                unique: true,
                fields: ['userId']
            }
        ],
        hooks: {
            // 加密密码的钩子
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
                if (!user.userId) {
                    user.userId = uuidv4();
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