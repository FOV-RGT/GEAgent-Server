'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      Message.belongsTo(models.Conversation, { 
        foreignKey: 'conversationId',
        onDelete: 'CASCADE'
      });
    }
  }
  
  Message.init({
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
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reasoning_content: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Message',
    tableName: 'messages',
    timestamps: true
  });
  
  return Message;
};