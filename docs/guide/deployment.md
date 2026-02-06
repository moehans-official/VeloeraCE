# 部署指南

本文档提供 VeloeraCE 的部署建议，以 Docker Compose 为主。

## 1. 单机部署（Docker Compose）

### 步骤

1. 克隆仓库并进入目录

```bash
git clone https://github.com/moehans-official/VeloeraCE.git
cd VeloeraCE
```

2. 准备环境变量

```bash
cp .env.example .env
```

3. 构建并启动

```bash
docker build -t veloerace:local .
# 修改 docker-compose.yml 的 image 为 veloerace:local
docker compose up -d
```

4. 检查容器与健康状态

```bash
docker compose ps
docker compose logs -f veloera
curl http://localhost:3000/api/readyz
```

## 2. 关键配置项

常用环境变量示例：

- `SQL_DSN`：主数据库连接串（MySQL/PostgreSQL）
- `REDIS_CONN_STRING`：Redis 连接串
- `SESSION_SECRET`：会话密钥（生产环境必须自定义）
- `TRUSTED_PROXIES`：可信代理 CIDR/IP 列表
- `SERVER_READ_TIMEOUT` / `SERVER_WRITE_TIMEOUT` / `SERVER_IDLE_TIMEOUT`
- `SERVER_SHUTDOWN_TIMEOUT`

## 3. 生产部署建议

- 使用反向代理（Nginx/Caddy）处理 TLS
- 将 `SESSION_SECRET`、数据库密码放入安全密钥管理
- 为数据库与数据目录启用备份策略
- 通过 `/api/healthz` 和 `/api/readyz` 接入监控/探针
- 开启 CI，确保每次变更可构建与可回归

## 4. 升级建议

- 升级前先备份数据库与配置
- 先在测试环境验证迁移与启动
- 生产变更采用分批/低峰发布
