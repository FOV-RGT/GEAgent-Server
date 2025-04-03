'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const users = [];
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash('123123', salt);
		const adminUser = {
			username: 'admin',
			email: 'admin@qq.com',
			password: hashedPassword,
			fullName: '管理员',
			avatarUrl: 'https://example.com/avatar/admin.jpg',
			role: 'admin',
			isActive: true,
			lastLogin: null,
			createdAt: new Date(),
			updatedAt: new Date()
		}
		users.push(adminUser);
		for (let i = 1; i < 10; i++) {
			const user = {
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
