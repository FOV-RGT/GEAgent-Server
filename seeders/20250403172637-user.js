'use strict';
const bcrypt = require('bcryptjs');
require('dotenv').config();

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
				userId: 1,
				username: 'Anonchan',
				email: 'Anonchan@qq.com',
				password: hashedPassword,
				fullName: '千早爱音',
				avatarUrl: 'https://example.com/avatar/admin.jpg',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Soyorin = {
				userId: 2,
				username: 'Soyorin',
				email: 'Soyorin@qq.com',
				password: hashedPassword,
				fullName: '长崎素世',
				avatarUrl: 'https://example.com/avatar/admin.jpg',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Tomorin = {
				userId: 3,
				username: 'Tomorin',
				email: 'Tomorin@qq.com',
				password: hashedPassword,
				fullName: '高松灯',
				avatarUrl: 'https://example.com/avatar/admin.jpg',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Rikichan = {
				userId: 4,
				username: 'Rikichan',
				email: 'Rikichan@qq.com',
				password: hashedPassword,
				fullName: '椎名立希',
				avatarUrl: 'https://example.com/avatar/admin.jpg',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Ranachan = {
				userId: 5,
				username: 'Ranachan',
				email: 'Ranachan@qq.com',
				password: hashedPassword,
				fullName: '要乐奈',
				avatarUrl: 'https://example.com/avatar/admin.jpg',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			users.push(Anonchan, Soyorin, Tomorin, Rikichan, Ranachan);
			for (let i = 1; i <= 10; i++) {
				const user = {
					userId: 100 + i,
					username: `user${i}`,
					email: 'user' + i + '@qq.com',
					password: hashedPassword,
					fullName: `用户${i}`,
					avatarUrl: `https://example.com/avatar/user${i}.jpg`,
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
				userId: 1,
				username: 'Anonchan',
				email: 'Anonchan@qq.com',
				password: null,
				fullName: '千早爱音',
				avatarUrl: 'https://example.com/avatar/admin.jpg',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Soyorin = {
				userId: 2,
				username: 'Soyorin',
				email: 'Soyorin@qq.com',
				password: null,
				fullName: '长崎素世',
				avatarUrl: 'https://example.com/avatar/admin.jpg',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Tomorin = {
				userId: 3,
				username: 'Tomorin',
				email: 'Tomorin@qq.com',
				password: null,
				fullName: '高松灯',
				avatarUrl: 'https://example.com/avatar/admin.jpg',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Rikichan = {
				userId: 4,
				username: 'Rikichan',
				email: 'Rikichan@qq.com',
				password: null,
				fullName: '椎名立希',
				avatarUrl: 'https://example.com/avatar/admin.jpg',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const Ranachan = {
				userId: 5,
				username: 'Ranachan',
				email: 'Ranachan@qq.com',
				password: null,
				fullName: '要乐奈',
				avatarUrl: 'https://example.com/avatar/admin.jpg',
				role: 'admin',
				isActive: true,
				lastLogin: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			users.push(Anonchan, Soyorin, Tomorin, Rikichan, Ranachan);
			for (let i = 1; i <= 10; i++) {
				const user = {
					userId: 100 + i,
					username: `user${i}`,
					email: 'user' + i + '@qq.com',
					password: null,
					fullName: `用户${i}`,
					avatarUrl: `https://example.com/avatar/user${i}.jpg`,
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
