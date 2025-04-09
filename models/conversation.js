'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Conversation extends Model {
    static associate(models) {
      // 定义与其他模型的关联
      Conversation.belongsTo(models.User, { foreignKey: 'userId' });
      Conversation.hasMany(models.Message, { 
        foreignKey: 'conversationId',
        as: 'messages',
        onDelete: 'CASCADE'
      });
    }
    static async getNextConversationId(userId) {
      try {
        const maxConversation = await this.findOne({
          where: { userId },
          order: [['conversationId', 'DESC']]
        })
        return maxConversation ? maxConversation.conversationId + 1 : 1;
      } catch (e) {
        console.error('获取最大对话ID失败:', e);
        return 1; // 默认返回1
      }
    }
  }
  
  Conversation.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    conversationId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    searchId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '新对话'
    }
  }, {
    sequelize,
    modelName: 'Conversation',
    tableName: 'conversations',
    timestamps: true,
    indexes: [
      {
        name: 'unique_user_conversation_id',
        unique: true,
        fields: ['userId', 'conversationId']
      }
    ]
  });
  
  return Conversation;
};