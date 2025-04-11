<h1 style="display:flex;justify-content:center">GESeek-Server</h1>

### 该项目使用 *硅基流动* 作为LLM服务平台，请参照该文档进行环境配置

---

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
- 设置`.env`文件中的`JWT_SECRET`与`API_KEY`为相应值
<!-- **attr:**
  - **PORT**：该服务运行的端口
  - **JWT_SECRET**：用于签名和验证用户认证令牌的密钥，确保其足够复杂且保密，影响系统安全
  - **NODE_ENV**：运行环境
  **NODE_ENV**枚举值: **`development` `test` `production`**
  分别对应 **`开发环境` `测试环境` `生产环境`**
  - **CHAT_API_KEY**：硅基流动平台的`API Key`
  - **SEARCH_API_KEY**：百度智能云千帆的`API key`，作为调用搜索模型的凭证
  - **SEARCH_APP_ID**：使用百度智能云千帆`AppBuilder`创建应用并发布后的`app_id`，该应用应能返回联网搜索结果
 -->
| 变量名 | 必填 | 说明 | 示例值 |
|:-:|:-:|:-:|:-:|
| PORT | 是 | 服务运行的端口 | 3000 |
| NODE_ENV | 是 | 运行环境 | development |
| JWT_SECRET | 是 | JWT签名密钥 | 399f5e625a4... |
| CHAT_API_KEY | 是 | 硅基流动API密钥 | sk-tqulpvl... |
| SEARCH_API_KEY | 是 | 百度千帆API密钥 | bce-v3/ALT... |
| SEARCH_APP_ID | 是 | 百度千帆`AppBuilder`创建应用并发布后的`app_id` | 200d45e5-7b... |

> JWT_SECRET可参照以下方式创建
```js
// 于终端中运行

// 进入node环境
node

// 引入crypto库
const crypto = require('crypto');

// 输出32位随机字符串
console.log(crypto.randomBytes(32).toString('hex'));
```
---

## 配置数据库设置
- 将`/config/config.example`文件重命名为`config.json`
默认数据库端口使用`3308`而非更常见的`3306`
> 如需更改设置，请自行斟酌

---

## 安装与运行

#### 此章节操作可通过NPM脚本完成，或直接使用终端操作

### NPM脚本

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

### 终端操作

```bash
# 安装项目依赖包
npm i

# 请根据运行环境选择<NODE_ENV>
# <NODE_ENV>枚举值：development test production
# 分别对应 开发环境 测试环境 生产环境
# 开发环境与测试环境下种子填充的用户密码全为固定值 123123
# 生产环境下种子填充的用户信息将会是12位的随机强密码，将于终端或服务器日志中输出相应的角色、账号、密码

# 创建数据库
npx sequelize-cli db:create --env <NODE_ENV> --charset utf8mb4 --collate utf8mb4_general_ci

# 表迁移
npx sequelize-cli db:migrate --env <NODE_ENV>

# 种子，填充初始数据
npx sequelize-cli db:seed:all --env <NODE_ENV>

# 启动服务，需选择启动环境

# 开发环境
npm run start:dev

# 测试环境
npm run start:test

# 生产环境
npm run start:prod
```

> 服务器访问地址默认为[http://localhost:3000](http://localhost:3000)，具体由`.env`文件中的`PORT`变量决定。

---

## API 简介

项目主要API端点：

- **`/api/user/login` - 用户登录**
- **`/api/user/register` - 用户注册**
- **`/api/chat/create` - 创建新对话**
- **`/api/chat/continue/:conversationId` - 继续已有对话**
- **`/api/chat/list` - 获取会话列表**
- **`/api/chat/continue/:conversationId` - 获取特定对话数据**

> 完整API文档请参阅[apifox](https://app.apifox.com/project/6155869)接口对应预览文档。

---

## 常见问题排查

### 跨域问题

如遇到跨域问题，请检查前端请求源是否被后端允许。项目使用了 CORS 中间件处理跨域请求。若服务器反向代理后端服务，建议于代理层配置跨域设置，并移除后端服务所使用的 CORS 中间件，以避免重复添加响应头所造成的潜在配置冲突问题。

### 认证错误

- 确保`JWT_SECRET`在前后端保持一致
- 检查令牌是否过期（默认12小时）
- 验证请求头格式是否为 `Authorization: Bearer <token>`