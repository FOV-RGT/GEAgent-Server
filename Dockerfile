# 构建阶段
FROM node:22-slim AS builder

# 设置工作目录
WORKDIR /app

# 安装构建所需的系统依赖
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
# 创建Python虚拟环境
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 复制依赖文件
COPY package*.json requirements.txt ./

# 安装Node.js和Python依赖
RUN npm ci --only=production && npm cache clean --force
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 运行阶段
FROM node:22-slim

# 创建docker组(GID与宿主机相同)和非root用户
ARG DOCKER_GID=999  # 宿主机上docker组的GID，可能需要调整
RUN groupadd -r geagent && useradd -r -g geagent -m geagent && \
    (getent group docker > /dev/null || groupadd -g $DOCKER_GID docker || groupadd docker) && \
    usermod -aG docker geagent

# 设置工作目录
WORKDIR /app

# 安装运行时必要的系统依赖
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv curl netcat-openbsd dos2unix && \
    apt-get clean && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*
# 从构建阶段复制Python虚拟环境
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 设置环境变量
ARG NODE_ENV_ARG=production
ENV NODE_ENV=${NODE_ENV_ARG}
ENV PORT=3000
ENV PYTHON_PATH=/opt/venv/bin/python

# 从构建阶段复制node_modules
COPY --from=builder /app/node_modules ./node_modules

# 复制项目文
COPY . .

# 单独处理入口脚本，确保格式正确并有执行权限
RUN dos2unix /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh && \
    ls -la /app/docker-entrypoint.sh  # 验证文件存在

# 创建必要的目录并设置权限
RUN mkdir -p /app/logs /app/temp && \
    chown -R geagent:geagent /app

# 切换到非root用户
USER geagent

# 暴露应用端口
EXPOSE ${PORT}

# 设置启动命令
ENTRYPOINT ["/app/docker-entrypoint.sh"]