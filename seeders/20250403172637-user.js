'use strict';
const bcrypt = require('bcryptjs');
const user = require('../models/user');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
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
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.bulkDelete('users', null, {});
	}
};
