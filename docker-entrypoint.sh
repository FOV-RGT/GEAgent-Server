#!/bin/bash

# 输出版本信息
echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"
echo "Python 版本: $(python3 --version)"

# 激活 Python 虚拟环境
source /opt/venv/bin/activate
echo "Python 虚拟环境已激活"

# 检查必要的环境变量
REQUIRED_VARS=(
  "JWT_SECRET"
  "CHAT_API_KEY" 
  "SEARCH_API_KEY"
  "SEARCH_APP_ID"
  "OSS_ACCESS_KEY_ID"
  "OSS_ACCESS_KEY_SECRET"
  "OSS_REGION"
  "OSS_BUCKET_NAME"
)

MISSING_VARS=0
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "⚠️ 环境变量 $VAR 未设置"
    MISSING_VARS=$((MISSING_VARS+1))
  else
    # 打印变量名称但不打印内容，避免敏感信息泄露
    echo "✓ 环境变量 $VAR 已设置"
  fi
done

if [ $MISSING_VARS -gt 0 ]; then
  echo "⚠️ 警告: $MISSING_VARS 个所需环境变量未设置，服务可能无法正常工作"
fi

# 检查是否需要更新 config.json 
if [ ! -f "/app/config/config.json" ] || [ "$FORCE_DB_CONFIG" = "true" ]; then
  echo "正在配置数据库连接信息..."
  if [ -f "/app/config/config.example" ]; then
    # 如果文件不存在则复制，否则保留现有文件
    [ ! -f "/app/config/config.json" ] && cp /app/config/config.example /app/config/config.json
    # 无论文件是否存在，都更新数据库配置
    sed -i "s/\"host\": \".*\"/\"host\": \"${DB_HOST:-127.0.0.1}\"/g" /app/config/config.json
    sed -i "s/\"port\": \".*\"/\"port\": \"${DB_PORT:-3308}\"/g" /app/config/config.json
    sed -i "s/\"username\": \".*\"/\"username\": \"${DB_USER:-root}\"/g" /app/config/config.json
    sed -i "s/\"password\": \".*\"/\"password\": \"${DB_PASSWORD:-123456}\"/g" /app/config/config.json
    sed -i "s/\"database\": \".*_api_production\"/\"database\": \"${DB_NAME:-GEAgent_api_production}\"/g" /app/config/config.json
    echo "数据库连接配置已更新。"
  else
    echo "⚠️ 错误: 无法找到config.example文件"
    exit 1
  fi
fi

# 设置环境变量 (如果未设置的话)
export NODE_ENV=${NODE_ENV:-"production"}
export PORT=${PORT:-3000}
export TZ=${TZ:-"Asia/Shanghai"}
export PYTHON_PATH=${PYTHON_PATH:-"/opt/venv/bin/python"}

# 配置 MCP 相关环境
if [ -f "/app/services/biliSearch.py" ]; then
  echo "已找到哔哩哔哩搜索服务，正在检查Python依赖..."
  pip list | grep "bilibili-api-python" || {
    echo "正在安装缺失的bilibili-api-python..."
    pip install bilibili-api-python
  }
  pip list | grep "mcp" || {
    echo "正在安装缺失的mcp..."
    pip install mcp mcp[cli]
  }
fi

# 创建必要的临时目录
mkdir -p /app/temp
mkdir -p /app/logs
chmod 777 /app/temp /app/logs

# 检查数据库连接
if [ -n "$DB_HOST" ]; then
  echo "正在检查与数据库 $DB_HOST 的连接..."
  MAX_RETRIES=10
  RETRY_COUNT=0
  
  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    nc -z $DB_HOST ${DB_PORT:-3306} > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      echo "成功连接数据库"
      break
    else
      echo "等待连接数据库... ($((RETRY_COUNT+1))/$MAX_RETRIES)"
      RETRY_COUNT=$((RETRY_COUNT+1))
      sleep 3
    fi
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
      echo "⚠️ 警告：在 $MAX_RETRIES 次重试后仍无法连接到数据库"
      echo "将在无数据库连接下继续运行..."
    fi
  done
fi

# 启动服务器
echo "开始于 $NODE_ENV 环境启动GEAgent Server"
if [ "$NODE_ENV" = "development" ]; then
  exec npm run start:dev
elif [ "$NODE_ENV" = "test" ]; then
  exec npm run start:test
else
  exec npm run start:prod
fi