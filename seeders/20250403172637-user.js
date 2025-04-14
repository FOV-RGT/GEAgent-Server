'use strict';
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

function generatePassword(length = 12) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    for (let i = 4; i < length; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const env = process.env.NODE_ENV || 'development';
		// 开发和测试环境下，使用固定密码
		if (env === 'development' || env === 'test') {
			const users = [];
			const salt = await bcrypt.genSalt(10);
			const hashedPassword = await bcrypt.hash('123123', salt);
			const Anonchan = {
				userId: uuidv4(),
				username: 'Anonchan',
				email: 'Anonchan@qq.com',
				password: hashedPassword,
				fullName: '千早爱音',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Soyorin = {
				userId: uuidv4(),
				username: 'Soyorin',
				email: 'Soyorin@qq.com',
				password: hashedPassword,
				fullName: '长崎素世',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Tomorin = {
				userId: uuidv4(),
				username: 'Tomorin',
				email: 'Tomorin@qq.com',
				password: hashedPassword,
				fullName: '高松灯',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Riki = {
				userId: uuidv4(),
				username: 'Riki',
				email: 'Riki@qq.com',
				password: hashedPassword,
				fullName: '椎名立希',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Ranachan = {
				userId: uuidv4(),
				username: 'Ranachan',
				email: 'Ranachan@qq.com',
				password: hashedPassword,
				fullName: '要乐奈',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			users.push(Anonchan, Soyorin, Tomorin, Riki, Ranachan);
			for (let i = 1; i <= 10; i++) {
				const user = {
					userId: uuidv4(),
					username: `user${i}`,
					email: 'user' + i + '@qq.com',
					password: hashedPassword,
					fullName: `用户${i}`,
					role: 'user',
					isActive: true,
					lastLogin: null,
					createdAt: new Date(),
					updatedAt: new Date()
				}
				users.push(user);
			}
			await queryInterface.bulkInsert('users', users, {});
		};
		// 生产环境下，使用随机密码
		if (env === 'production') {
			const users = [];
			const Anonchan = {
				userId: uuidv4(),
				username: 'Anonchan',
				email: 'Anonchan@qq.com',
				password: null,
				fullName: '千早爱音',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Soyorin = {
				userId: uuidv4(),
				username: 'Soyorin',
				email: 'Soyorin@qq.com',
				password: null,
				fullName: '长崎素世',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Tomorin = {
				userId: uuidv4(),
				username: 'Tomorin',
				email: 'Tomorin@qq.com',
				password: null,
				fullName: '高松灯',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Riki = {
				userId: uuidv4(),
				username: 'Riki',
				email: 'Riki@qq.com',
				password: null,
				fullName: '椎名立希',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Ranachan = {
				userId: uuidv4(),
				username: 'Ranachan',
				email: 'Ranachan@qq.com',
				password: null,
				fullName: '要乐奈',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			users.push(Anonchan, Soyorin, Tomorin, Riki, Ranachan);
			for (let i = 1; i <= 10; i++) {
				const user = {
					userId: uuidv4(),
					username: `user${i}`,
					email: 'user' + i + '@qq.com',
					password: null,
					fullName: `用户${i}`,
					role: 'user',
					isActive: true,
					lastLogin: null,
					createdAt: new Date(),
					updatedAt: new Date()
				}
				users.push(user);
			}
			for (let i = 0; i < users.length; i++) {
				const user = users[i];
				const salt = await bcrypt.genSalt(10);
				const randomPassword = generatePassword(12);
				user.password = await bcrypt.hash(randomPassword, salt);
				console.log(`角色：${user.role}，账号：${user.username}，密码：${randomPassword}`);
			}
			await queryInterface.bulkInsert('users', users, {});
		}
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.bulkDelete('users', null, {});
	}
};
