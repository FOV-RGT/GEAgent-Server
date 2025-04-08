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
    title: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '新对话'
    },
    modelId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Conversation',
    tableName: 'conversations'
  });
  
  return Conversation;
};