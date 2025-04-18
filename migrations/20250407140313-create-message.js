'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('messages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      // 实际指向conversations表的主键id，存在命名混淆的问题，不改了喵~
      conversationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'conversations',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      role: {
        type: Sequelize.ENUM('user', 'assistant', 'system'),
        allowNull: false,
      },
      interaction_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '跟踪同一次用户-模型交互的所有相关消息'
      },
      round: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      assistant_output: {
        type: Sequelize.TEXT
      },
      assistant_reasoning_output: {
        type: Sequelize.TEXT
      },
      mcp_service_status: {
        type: Sequelize.JSON
      },
      web_search_status: {
        type: Sequelize.JSON
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
    await queryInterface.addIndex('messages', ['interaction_id']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('messages');
  }
};