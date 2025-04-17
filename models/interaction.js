'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Interaction extends Model {
    static associate(models) {
      Interaction.belongsTo(models.Conversation, {
        foreignKey: 'conversationId',
        onDelete: 'CASCADE'
      });
      Interaction.hasMany(models.Message, {
        foreignKey: 'interaction_id',
        sourceKey: 'interaction_id',
        as: 'messages',
        onDelete: 'CASCADE'
      });
    }
    static async getNextInteractionId(conversationId) {
      try {
        const maxInteraction = await this.findOne({
          where: { conversationId },
          order: [['interaction_id', 'DESC']]
        });
        return maxInteraction ? maxInteraction.interaction_id + 1 : 1;
      } catch (e) {
        console.error('获取最大交互ID失败:', e);
        return 1
      }
    }
    static async getPreviousMessages(conversationId, interaction_id, limit) {
      try {
        const previousInteractions = await this.findAll({
          where: {
            conversationId,
            interaction_id
          },
          order: [['startTime', 'DESC']],
          limit
        });
        return previousInteractions.map(interaction => {
          return {
            role: 'user',
            content: interaction.user_input
          }
        });
      } catch (e) {
        console.error('获取上次用户输入失败:', e);
        return e;
      }
    }
    async complete() {
      this.status = 'completed',
      this.endTime = new Date();
      return this.save();
    }
    async markError() {
      this.status = 'error';
      this.endTime = new Date();
      return this.save();
    }
    async stop() {
      this.status = 'stop';
      this.endTime = new Date();
      return this.save();
    }
  }
  Interaction.init({
    conversationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'conversations',
        key: 'id'
      }
    },
    interaction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '跟踪同一次用户-模型交互的所有相关消息'
    },
    user_input: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'stop', 'error'),
      allowNull: false,
      defaultValue: 'active'
    },
    mcp_service: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    web_search_used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Interaction',
    tableName: 'interactions',
    indexes: [
      {
        name: 'unique_conversation_interaction_id',
        unique: true,
        fields: ['conversationId', 'interaction_id']
      }
    ]
  });
  return Interaction;
};