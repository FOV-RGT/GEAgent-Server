'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            // 定义与其他模型的关联
            // 例如:
            // User.hasMany(models.Post, { foreignKey: 'userId', as: 'posts' });
        }
        // 验证密码方法
        async validatePassword(password) {
            return bcrypt.compare(password, this.password);
        }
    }
    User.init({
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
                isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [8, 100] // 密码长度8-100
            }
        },
        fullName: {
            type: DataTypes.STRING(100),
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
        timestamps: true, // 创建 createdAt 和 updatedAt
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