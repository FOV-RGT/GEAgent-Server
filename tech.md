## 技术栈概述

GEAgent-Server 是一个基于现代 Web 技术栈构建的智能 Agent 后端服务平台，采用以下核心技术：

- **后端框架**: [Express.js](https://expressjs.com/) (Node.js)
- **数据库**: MySQL
- **ORM 框架**: [Sequelize](https://sequelize.org/)
- **认证机制**: JWT (JSON Web Token)
- **辅助语言**: Python (用于特定功能模块)
- **API 协议**: 支持 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction)
- **架构风格**: 微服务架构

## 集成服务

项目集成了多个外部服务以增强功能：

- **硅基流动**: 提供大语言模型能力
- **阿里云 OSS**: 对象存储服务
- **百度千帆 AppBuilder**: 搜索服务支持

## 核心功能

### 1. 智能对话系统
- 支持连续多轮对话
- 维持上下文理解能力
- 流式响应输出

### 2. B站内容服务
- **视频搜索**: 提供标题、作者、统计数据等信息
- **课程查询**: 获取付费/免费课程详情

### 3. Agent 工具框架
- 基于 MCP 协议实现工具调用
- 支持动态注册与扩展功能
- 松耦合的服务设计

### 4. 用户系统
- 中央身份认证
- 权限控制管理
- 安全的 JWT 实现

### 5. 对话管理
- 创建新对话
- 继续已有对话
- 查看会话历史
- 删除对话记录

### 6. 互动特色
- 二次元风格界面交互
- 表情包功能支持

## 技术特点

- **微服务设计**: 各功能模块松耦合，便于扩展
- **流式响应**: 实时输出大模型响应，提升用户体验
- **强数据持久化**: 完整的数据库迁移和种子设计
- **灵活扩展**: 支持工具的动态注册与调用
- **多环境支持**: 开发、测试、生产环境配置分离

## 部署要求

- Node.js 环境
- Python 环境
- MySQL 数据库
- 第三方服务 API 密钥配置

## API 端点

主要 API 端点包括：
- `/api/user/login` - 用户登录
- `/api/user/register` - 用户注册
- `/api/chat/create` - 创建新对话
- `/api/chat/continue/:conversationId` - 继续已有对话
- `/api/chat/list` - 获取会话列史
- 更多详细 API 文档可查阅 [apifox](https://app.apifox.com/project/6155869)

## 项目定位与愿景

GEAgent 基于中央身份认证系统构建，作为统一的 Agent 平台，旨在连接和整合多个专业子系统。当前的 "GE酱" 智能助手是平台初始功能的展现，未来将发展为多平台统一管理中心，实现子系统甚至跨系统的信息流通与协作。

---

项目开源仓库：
- [前端仓库](https://github.com/xl-xlxl/GEAgent)
- [后端仓库](https://github.com/FOV-RGT/GEAgent-Server)