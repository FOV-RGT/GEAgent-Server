# 基础镜像选择，使用官方 Node.js 18 LTS 版本
FROM node:22-slim

# 设置工作目录
WORKDIR /app

# 安装 Python 3 和必要依赖
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    netcat-openbsd \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
# 创建 Python 虚拟环境
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV PYTHON_PATH=/opt/venv/bin/python

# 复制 Node.js 依赖文件
COPY package*.json ./

# 复制 Python 依赖文件
COPY services/requirements.txt ./services/

# 安装 Node.js 依赖，只安装生产环境需要的包
RUN npm ci || npm install

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目文件到工作目录
COPY . .

# # 添加 start 脚本到 package.json
# RUN npm pkg set scripts.start="node ./bin/www"

# 创建必要的目录并确保权限
RUN mkdir -p /app/logs /app/temp \
    && chmod +x /app/docker-entrypoint.sh

# 暴露应用端口
EXPOSE 3000

# 设置启动命令
ENTRYPOINT ["/app/docker-entrypoint.sh"]