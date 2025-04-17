'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      Message.belongsTo(models.Conversation, { 
        foreignKey: 'conversationId',
        onDelete: 'CASCADE'
      });
      Message.belongsTo(models.Interaction, {
        foreignKey: 'interaction_id',
        targetKey: 'interaction_id',
        as: 'interaction',
        scope: {
          conversationId: sequelize.col('Message.conversationId')
        }
      });
    }
    
  }
  
  Message.init({
    // 实际指向conversations表的主键id，存在命名混淆的问题，不改了喵~
    conversationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'conversations',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system'),
      allowNull: false
    },
    interaction_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '跟踪同一次用户-模型交互的所有相关消息'
    },
    round: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    assistant_output: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assistant_reasoning_output: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mcp_service_status: {
      type: DataTypes.JSON,
      allowNull: true
    },
    web_search_status: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Message',
    tableName: 'messages',
    timestamps: true,
    indexes: [
      {
        fields: ['interaction_id']
      }
    ]
  });
  
  return Message;
};