'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_configs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'userId'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      LLMID: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '大语言模型ID'
      },
      max_tokens: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 2048,
        comment: '最大生成长度'
      },
      temperature: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.8,
        comment: '温度参数'
      },
      top_p: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.7,
        comment: 'Top-P采样参数'
      },
      top_k: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 50,
        comment: 'Top-K采样参数'
      },
      frequent_penalty: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.5,
        comment: '频率惩罚参数'
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
    
    // 添加联合唯一索引
    await queryInterface.addIndex('user_configs', ['userId', 'LLMID'], {
      name: 'unique_user_llm_setting',
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_configs');
  }
};