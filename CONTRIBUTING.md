# Contributing to VeloeraCE

感谢你为 VeloeraCE 做贡献。

## Basic Rules

- 所有贡献默认按 `GPL-3.0` 许可提交。
- 提交前请确保代码可编译、可运行。
- 保持改动最小化，避免把无关格式化和重构混在同一个 PR。
- 大改动请先提 Issue 讨论，再开 PR。

## Development Workflow

1. Fork 仓库并创建分支：`feat/<topic>`、`fix/<topic>`。
2. 在本地通过 Docker Compose 启动并验证。
3. 提交前自检：
   - Go 代码通过基础构建
   - 前端依赖和构建通过
   - 不引入明显回归
4. 发起 PR，并填写模板中的变更说明和验证步骤。

## Pull Request Requirements

- PR 标题清晰说明目的。
- 描述中必须包含：
  - 背景与问题
  - 解决方案
  - 验证方式
  - 兼容性影响（如有）
- 如果改动影响接口或行为，请补充文档。

## Issue Labels (Suggested)

- `bug`
- `feature`
- `documentation`
- `refactor`
- `help wanted`
- `good first issue`

## Code of Conduct

参与社区即表示同意遵守 `CODE_OF_CONDUCT.md`。
