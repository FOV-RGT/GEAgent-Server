'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserConfig extends Model {
    static associate(models) {
      UserConfig.belongsTo(models.User, {
        foreignKey: 'userId',
        onDelete: 'CASCADE'
      });
    }
  }
  UserConfig.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'userId'
      }
    },
    LLMID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '大语言模型ID'
    },
    max_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2048,
      comment: '最大生成长度'
    },
    temperature: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.8,
      comment: '温度参数'
    },
    top_p: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.7,
      comment: 'Top-P采样参数'
    },
    top_k: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
      comment: 'Top-K采样参数'
    },
    frequent_penalty: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.5,
      comment: '频率惩罚参数'
    }
  }, {
    sequelize,
    modelName: 'UserConfig',
    tableName: 'user_configs',
    timestamps: true,
    indexes: [
      {
        name: 'unique_user_llm_setting',
        unique: true,
        fields: ['userId', 'LLMID']
      }
    ]
  });
  return UserConfig;
};