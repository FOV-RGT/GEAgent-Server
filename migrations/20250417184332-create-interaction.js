'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('interactions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
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
      interaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '跟踪同一次用户-模型交互的所有相关消息'
      },
      user_input: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '用户输入的内容'
      },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'stop', 'error'),
        defaultValue: 'active',
        allowNull: false,
        comment: '交互状态'
      },
      mcp_service: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      web_search_used: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      startTime: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      endTime: {
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
    await queryInterface.addIndex('interactions', ['conversationId', 'interaction_id'], {
      name: 'unique_conversation_interaction_id',
      unique: true
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('interactions');
  }
};