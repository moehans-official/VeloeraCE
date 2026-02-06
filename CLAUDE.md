# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands
- Build frontend: `cd web && pnpm build`
- Build backend: `go build -o main`
- Run dev server: `cd web && pnpm build && cd .. && go run main.go`

## Code Style Guidelines
- **Go Style**: Follow standard Go conventions with camelCase for unexported and PascalCase for exported
- **Error Handling**: Use package errors and common logging utilities in common/logger.go
- **Frontend**: React with Semi UI components; use single quotes for strings/JSX
- **Types**: Define structured DTOs in dto/ package; use strong typing
- **Imports**: Group standard library, external packages, and internal packages
- **Formatting**: Use gofmt for Go code, prettier for frontend (configured in package.json)
- **File Organization**: Group related functionality in packages following project structure