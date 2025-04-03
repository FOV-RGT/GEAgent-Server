'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('users', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            username: {
                type: Sequelize.STRING(50),
                allowNull: false,
                unique: true
            },
            email: {
                type: Sequelize.STRING(100),
                allowNull: true,
                unique: true
            },
            password: {
                type: Sequelize.STRING,
                allowNull: false
            },
            fullName: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            avatarUrl: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            role: {
                type: Sequelize.ENUM('user', 'admin'),
                defaultValue: 'user',
                allowNull: false
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
                allowNull: false
            },
            lastLogin: {
                type: Sequelize.DATE,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
        // 添加索引以提高查询性能
        await queryInterface.addIndex('users', ['email']);
        await queryInterface.addIndex('users', ['username']);
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('users');
    }
};