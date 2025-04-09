<h1 style="display:flex;justify-content:center">GESeek-Server</h1>

### 该项目使用 *硅基流动* 作为LLM服务平台，请参照该文档进行环境配置

---

## 配置环境变量
- 将根目录下的`env.example`重命名为`.env`
- 设置`.env`中的`JWT_SECRET`与`API_KEY`为相应值
**attr:**
  - **CHAT_API_KEY**：硅基流动平台的API Key
  - **SEARCH_API_KEY**：百度智能云千帆的API key，作为调用搜索模型的凭证
  - **SEARCH_APP_ID**：使用百度智能云千帆`AppBuilder`创建应用并发布后的`app_id`，该应用应能返回联网搜索结果


> **JWT_SECRET可参照以下方式创建**
```shell
# 于终端中运行
node
const crypto = require('crypto');
console.log(crypto.randomBytes(32).toString('hex'));
```
---

## 配置数据库设置
- 将`/config/config.example`文件重命名为`config.json`
> 如需更改设置，请自行斟酌

---

## 安装与运行

```shell
# 安装项目依赖包
npm i

# 创建数据库。如创建失败，可以手动建库。
npx sequelize-cli db:create --charset utf8mb4 --collate utf8mb4_general_ci

# 运行迁移，自动建表。
npx sequelize-cli db:migrate

# 运行种子，填充初始数据。
npx sequelize-cli db:seed:all

# 启动服务
npm start
```

> **服务器访问地址默认为[http://localhost:3000](http://localhost:3000)，具体由`.env`中的`PORT`变量决定。API详情请参阅[apifox](https://app.apifox.com/project/6155869)接口对应预览文档。**
