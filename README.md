<h1 style="display:flex;justify-content:center">GEAgent-Server</h1>

## 项目简介

**GEAgent-Server** 是一款创新型Agent平台后端系统，为多样化的客户端提供强大的API支持。该项目核心特点如下：

### 项目定位

**GEAgent** 基于中央身份认证系统构建，作为统一的Agent平台，旨在连接和整合多个专业子系统。**当前的 "GE酱" 智能助手仅是平台初始功能的一种体现**，未来将发展为多平台统一管理中心，实现子系统甚至跨系统的信息流通与协作。

### 核心功能

- [ ] **中央身份认证系统：**  提供统一的用户管理、权限控制和认证服务
- [x] **智能对话系统：** 支持连续多轮对话，保持上下文理解能力
- [x] **Agent工具框架：** 基于[Model Context Protocol (MCP)协议](https://modelcontextprotocol.io/introduction)，支持多种工具的灵活调用
- [x] **信息集成能力：** 设计用于连接和整合不同子系统的数据与功能
- [x] **对话历史管理：** 支持创建、保存、检索与删除会话
- [ ] **更多的智能助手角色：** 支持切换智能助手的角色，例如*专业的任务规划大师*
- [ ] **高度客制化的服务管理：** 支持管理员使用Web面板管理后端服务

### 当前实现的能力

- **B站内容搜索：** 视频、UP主、统计数据等B站资源的查询
- **B站课程查询：** 提供B站课程的详细信息与推荐
- **二次元风格交互：** 以二次元美少女为人设的对话体验
- **表情包功能：** 通过情感化表达增强用户交互体验

### 技术特色

- **微服务架构：** 使用MCP协议实现服务端与子系统工具服务的松耦合
- **流式响应：** 支持大语言模型的流式输出，提供实时反馈
- **强数据持久化：** 基于 Sequelize ORM 的完整数据库设计
- **灵活的工具扩展系统：** 可动态注册与调用不同功能的工具
- **外部服务集成：** 集成硅基流动(大语言模型服务)、阿里云OSS(对象存储)及百度千帆AppBuilder(搜索服务)，提供丰富的功能支持

### 未来发展方向

**GEAgent** 将发展为一个最高层级Agent，统合旗下多个子系统的信息（子系统可能是其他Agent或各类平台），提供统一的身份认证、服务接入和数据交换能力，支持更多专业领域的功能集成，从而为用户创造无缝、智能的服务体验。

### 开源仓库地址

[前端仓库](https://github.com/xl-xlxl/GEAgent)
[后端仓库](https://github.com/FOV-RGT/GEAgent-Server)

欢迎PR~

---

## 前置运行条件

运行环境：
- `Python v3.13.3`
- `Node v22.14.0`

包管理器：
- `npm v10.9.2`
- `pip v25.0.1`

**版本号不可相差过大**

该项目包含 Python 文件，如需 Python 虚拟环境的支持，请自行进行虚拟环境的配置

## 项目结构

```graphql
├── app.js        # 应用入口文件 
├── bin/          # 服务器启动脚本 
├── config/       # 数据库配置文件 
├── controllers/  # 控制器，处理请求逻辑 
├── env.example   # .env文件的示例 
├── middleware/   # 中间件 
├── migrations/   # 数据库迁移文件 
├── models/       # 数据模型 
├── package.json  # npm依赖版本控制文件 
├── public/       # 静态资源 
├── README.md     # 项目说明文档 
├── routes/       # 路由定义 
├── seeders/      # 数据库种子文件 
└── services/     # 服务层，处理外部API通信 
```

---

## 配置环境变量
- 将根目录下的`env.example`文件重命名为`.env`
- 根据下表设置`.env`中的变量
> 数据库相关环境变量，当前仅支持创建docker容器时配置

| 变量名 | 必填 | 说明 | 示例值 |
| :---: | :---: | :---: | :---: |
| PORT | 否 | 服务运行的端口 | 3000 |
| TZ | 否 | 服务器时区设置 | 'Asia/Shanghai' |
| NODE_ENV | 否 | 运行环境 | development |
| JWT_SECRET | 是 | JWT签名密钥 | 394hbf5a4... |
| CHAT_API_KEY | 是 | 硅基流动API密钥 | sk-tqulpvl... |
| SEARCH_API_KEY | 是 | 百度千帆API密钥 | bce-v3/ALT... |
| SEARCH_APP_ID | 是 | 百度千帆`AppBuilder`创建应用并发布后的`app_id` | 200d45e5-7b... |
| OSS_ACCESS_KEY_ID | 是 | 阿里云服务ACCESS_KEY_ID | MsqgQ... |
| OSS_ACCESS_KEY_SECRET | 是 | 阿里云服务ACCESS_KEY_SECRET | mh3qqNt1D... |
| OSS_REGION | 是 | 阿里云OSS Bucket REGION | oss-cn-shenzhen |
| OSS_BUCKET_NAME | 是 | 阿里云OSS Bucket Name | geseekbucket |
| DB_HOST | 否 | 数据库主机地址 | 127.0.0.1 |
| DB_PORT | 否 | 数据库端口 | 3308 |
| DB_USER | 否 | 数据库用户名 | root |
| DB_PASSWORD | 否 | 数据库密码 | 123456 |
| DB_NAME | 否 | 数据库名称 | GEAgent_api_production |
| FORCE_DB_CONFIG | 否 | 是否强制更新数据库配置 | false |

> JWT_SECRET可参照以下方式创建
```js
// 于终端中运行

// 进入node环境
node

// 引入crypto库
const crypto = require('crypto');

// 输出32位16进制随机字符串
console.log(crypto.randomBytes(32).toString('hex'));
```
---

## 配置数据库设置
- 将`/config/config.example`文件重命名为`config.json`
默认数据库端口使用`3308`而非更常见的`3306`
> 如需更改设置，请自行斟酌

---

## 安装与运行

### Python环境

> 安装依赖

```bash
pip install -r requirements.txt
```

### Node.js环境

> 安装依赖
```bash
npm install
```

#### NPM脚本

- **前缀**
  - **`start` - 启动服务器**
  - **`db:setup` - 一键完成数据库初始化，无需执行`db:create`等后续操作**
  - **`db:reset` - 一键重置数据库**
  - **`db:create` - 创建数据库**
  - **`db:migrate` - 运行表迁移**
  - **`db:seed` - 填充种子**
  - **`db:drop` - 删除数据库**
- **后缀**
  - **`^~:dev` - 开发环境**
  - **`^~:test` - 测试环境**
  - **`^~:prod` - 生产环境**

#### 终端操作

```bash
# 请根据运行环境选择<NODE_ENV>
# <NODE_ENV>枚举值：development test production
# 分别对应 开发环境 测试环境 生产环境
# 开发环境与测试环境下种子填充的用户密码全为固定值 123123
# 生产环境下种子填充的用户信息将会是12位的随机强密码，将于终端或服务器日志中输出相应的角色、账号、密码

# 创建数据库
npx sequelize-cli db:create --env <NODE_ENV> --charset utf8mb4 --collate utf8mb4_general_ci

# 表迁移
npx sequelize-cli db:migrate --env <NODE_ENV>

# 填充初始数据
npx sequelize-cli db:seed:all --env <NODE_ENV>

# 启动服务，需选择启动环境

# 开发环境
npm run start:dev

# 测试环境
npm run start:test

# 生产环境
npm run start:prod
```

> 服务器访问地址默认为[http://localhost:3000](http://localhost:3000)，具体由`.env`文件中的`PORT`变量决定

---

## API 简介

项目主要API端点：

- **`/api/user/login` - 用户登录**
- **`/api/user/register` - 用户注册**
- **`/api/chat/create` - 创建新对话**
- **`/api/chat/continue/:conversationId` - 继续已有对话**
- **`/api/chat/list` - 获取会话列表**
- **`/api/chat/continue/:conversationId` - 获取特定对话数据**

> 完整API文档请参阅[apifox](https://app.apifox.com/project/6155869)接口对应预览文档

---

## 常见问题排查

### 跨域问题

如遇到跨域问题，请检查前端请求源是否被后端允许。项目使用了 CORS 中间件处理跨域请求。若服务器反向代理后端服务，建议于代理层配置跨域设置，并移除后端服务所使用的 CORS 中间件，以避免重复添加响应头所造成的潜在配置冲突问题

### 认证错误

- 检查令牌是否过期（默认3天）
- 验证请求头格式是否为 `Authorization: Bearer <token>`