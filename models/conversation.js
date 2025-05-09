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
      Conversation.hasMany(models.Interaction, {
        foreignKey: 'conversationId',
        as: 'interactions',
        onDelete: 'CASCADE'
      });
    }
    
    // 获取下一个对话ID
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
    
    // 获取当前对话的所有交互
    async getPagingInteractions(page, pageSize) {
      try {
        const totalCount = await this.sequelize.models.Interaction.count({
          where: { conversationId: this.id },
          distinct: true, // 确保只计算唯一的交互
        });
        const interactions = await this.sequelize.models.Interaction.findAndCountAll({
          where: { conversationId: this.id },
          order: [
            ['startTime', 'DESC'],
            [{ model: sequelize.models.Message, as: 'messages' }, 'createdAt', 'ASC']
          ],
          limit: pageSize,
          offset: (page - 1) * pageSize,
          include: {
            model: sequelize.models.Message,
            as: 'messages',
            where: { conversationId: this.id }
          }
        });
        const totalPages = Math.ceil(totalCount / pageSize);
        return {
          pagination: {
            page,
            pageSize,
            totalInteractions: totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page < totalPages ? page + 1 : null,
            previousPage: page > 1 ? page - 1 : null
          },
          interactions
        }
      } catch (e) {
        console.error('获取分页交互失败:', e);
        throw e
      }
    }
    
    // 获取当前对话的所有消息
    async getPreviousMessages(limit) {
      try {
        const previousInteractions = await this.sequelize.models.Interaction.findAll({
          where: { conversationId: this.id },
          order: [
            ['startTime', 'DESC'],
            [{ model: sequelize.models.Message, as: 'messages' }, 'createdAt', 'ASC']
          ],
          limit,
          include: {
            model: sequelize.models.Message,
            as: 'messages',
            where: { conversationId: this.id } 
          }
        });
        let totalMessages = [];
        previousInteractions.reverse().forEach(interaction => {
          totalMessages.push({
            role: 'user',
            content: interaction.user_input
          });
          interaction.messages.forEach(message => {
            totalMessages.push({
              role: message.role,
              content: message.assistant_output
            });
          })
        })
        return totalMessages
      } catch (e) {
        console.error('获取上次用户输入失败:', e);
        throw e;
      }
    }
    static async getConversationList(userId, page, pageSize) {
      try {
        const offset = (page - 1) * pageSize;
        const { count, rows } = await this.findAndCountAll({
          where: { userId },
          order: [['updatedAt', 'DESC']],
          attributes: ['conversationId', 'title', 'createdAt','updatedAt'],
          limit: pageSize,
          offset
        });
        const totalPages = Math.ceil(count / pageSize);
        return {
          pagination: {
            page,
            pageSize,
            totalConversations: count,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page < totalPages ? page + 1 : null,
            previousPage: page > 1 ? page - 1 : null
          },
          conversations: rows
        }
      } catch (e) {
        console.error('获取对话列表失败:', e);
        throw e;
      }
    }
  }
  
  Conversation.init({
    userId: {
      type: DataTypes.UUID,
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