#!/bin/bash

# 输出版本信息
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"
echo "Python version: $(python3 --version)"

# 激活 Python 虚拟环境
source /opt/venv/bin/activate
echo "Python virtual environment activated"

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

# 检查是否需要更新 config.json (仅复制，不执行数据库操作)
if [ ! -f "/app/config/config.json" ]; then
  echo "Config file not found, copying example config..."
  if [ -f "/app/config/config.example" ]; then
    cp /app/config/config.example /app/config/config.json
    sed -i "s/127.0.0.1/${DB_HOST:-mysql}/g" /app/config/config.json
    sed -i "s/3306/${DB_PORT:-3306}/g" /app/config/config.json
    sed -i "s/\"username\": \"root\"/\"username\": \"${DB_USER:-root}\"/g" /app/config/config.json
    sed -i "s/\"password\": \"123456\"/\"password\": \"${DB_PASSWORD:-123456}\"/g" /app/config/config.json
    sed -i "s/\"database\": \"GESeek_api_production\"/\"database\": \"${DB_NAME:-GESeek_api_production}\"/g" /app/config/config.json
    echo "Config file created successfully."
  else
    echo "⚠️ Error: config.example file not found."
    exit 1
  fi
fi

# 设置环境变量 (如果未设置的话)
export NODE_ENV=${NODE_ENV:-"production"}
export PORT=${PORT:-3000}
export PYTHON_PATH=${PYTHON_PATH:-"/opt/venv/bin/python"}

# 配置 MCP 相关环境
if [ -f "/app/services/biliSearch.py" ]; then
  echo "BiliBili search service found, checking Python dependencies..."
  pip list | grep "bilibili-api-python" || {
    echo "Installing missing bilibili-api-python..."
    pip install bilibili-api-python
  }
  pip list | grep "mcp" || {
    echo "Installing missing mcp..."
    pip install mcp mcp[cli]
  }
fi

# 创建必要的临时目录
mkdir -p /app/temp
mkdir -p /app/logs
chmod 777 /app/temp /app/logs

# 检查数据库连接
if [ -n "$DB_HOST" ]; then
  echo "Checking database connection to $DB_HOST..."
  MAX_RETRIES=10
  RETRY_COUNT=0
  
  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    nc -z $DB_HOST ${DB_PORT:-3306} > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      echo "Successfully connected to database."
      break
    else
      echo "Waiting for database connection... ($((RETRY_COUNT+1))/$MAX_RETRIES)"
      RETRY_COUNT=$((RETRY_COUNT+1))
      sleep 3
    fi
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
      echo "⚠️ Warning: Could not connect to database after $MAX_RETRIES attempts."
      echo "Continuing without database connection verification..."
    fi
  done
fi

# 启动服务器
echo "Starting GESeek Server in $NODE_ENV mode..."
if [ "$NODE_ENV" = "development" ]; then
  exec npm run server_start:dev
elif [ "$NODE_ENV" = "test" ]; then
  exec npm run server_start:test
else
  exec npm run server_start:prod
fi