# 快速开始

本文用于快速跑通 VeloeraCE。

## 环境要求

- Go 1.23+
- Node.js 20+
- pnpm 10+
- Docker / Docker Compose（推荐）

## 方式一：Docker Compose（推荐）

```bash
git clone https://github.com/moehans-official/VeloeraCE.git
cd VeloeraCE
cp .env.example .env
docker build -t veloerace:local .
# 修改 docker-compose.yml 中 image 为 veloerace:local
docker compose up -d
```

验证：

```bash
curl http://localhost:3000/api/healthz
curl http://localhost:3000/api/readyz
```

## 方式二：本地开发

```bash
# 前端
cd web
pnpm install
pnpm run build

# 后端
cd ..
go run main.go
```

默认服务地址：`http://localhost:3000`
