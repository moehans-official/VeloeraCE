<div align="center">

![Veloera-CE Logo](https://img.cdn1.vip/i/695929a70c0bc_1767451047.webp)


# Veloera CE
**高性能、可扩展的轻量级 LLM API 网关**

简体中文 / [English](./README_EN.md)

[![License](https://img.shields.io/badge/license-MIT%202.0-blue.svg)](LICENSE)

</div>

---

## 项目简介

**Veloera CE (Community Edition)** 是由社区开发并维护的第三方开源 LLM API 网关，基于 Veloera 和 new-api。<br>

### 相关链接

- [**Veloera 原仓库**](https://github.com/Veloera/Veloera)  
- [**new-api 仓库**](https://github.com/QuantumNous/new-api)

在多模型并存的时代，Veloera CE 致力于解决 API 集成碎片化的痛点。它充当了应用层与底层模型厂商（如 OpenAI、Anthropic、Google Gemini、DeepSeek、文心一言等）之间的中转桥梁，提供统一的标准接口、负载均衡与资源监控功能。

---

## 核心特性

- **统一协议**：支持将各类异构 LLM API 统一转换为标准的 OpenAI Chat Completion 格式。
- **多渠道管理**：支持多 Key 轮询、优先级调度及自动故障转移（Failover）。
- **精细化流控**：内置 Token 统计、配额管理及 QPS 限制，防止 API 滥用。
- **高性能路由**：基于异步 I/O 构建，确保极高的吞吐量与极低的转发延迟。
- **可扩展插件**：支持自定义中间件，轻松实现 Prompt 审查、响应缓存及敏感词过滤。
- **私有化部署**：支持 Docker 一键运行，确保 API Key 等敏感数据不出本地环境。

---

### 使用与部署

- **Docker 一键部署**：提供简便的 Docker 配置文件，快速启动服务。
- **灵活的 API 集成**：支持与各种模型厂商 API 的无缝连接与集成，减少开发者负担。

---

## 联系我们

如果你有任何问题或建议，欢迎通过 [Issues](https://github.com/Veloera/Veloera/issues) 提交反馈，或者通过 [Gitter](https://gitter.im/veloeera) 与社区成员交流。

---

---

## 联系我们

如果你有任何问题或建议，欢迎通过 [Issues](https://github.com/Veloera/Veloera/issues) 提交反馈，或者通过 [Gitter](https://gitter.im/veloeera) 与社区成员交流。

---
