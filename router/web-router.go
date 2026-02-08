// Copyright (c) 2025 Tethys Plex
//
// This file is part of Veloera.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.
package router

import (
	"bytes"
	"embed"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"net/http"
	"strings"
	"veloera/common"
	"veloera/controller"
	"veloera/middleware"
)

func runAuthAndHandle(c *gin.Context, authMiddleware func(c *gin.Context), handler func(c *gin.Context)) {
	authMiddleware(c)
	if c.IsAborted() {
		return
	}
	handler(c)
}

// handlePlanAPINoRoute provides a compatibility fallback for plan routes when
// a request unexpectedly falls through to NoRoute.
func handlePlanAPINoRoute(c *gin.Context) bool {
	path := c.Request.URL.Path
	method := c.Request.Method

	switch {
	case method == http.MethodGet && (path == "/api/plan" || path == "/api/plan/"):
		runAuthAndHandle(c, middleware.UserAuth(), controller.GetSubscriptionPlans)
		return true
	case method == http.MethodGet && (path == "/api/plan/self" || path == "/api/plan/self/"):
		runAuthAndHandle(c, middleware.UserAuth(), controller.GetUserPlanOrders)
		return true
	case method == http.MethodGet && (path == "/api/plan/purchase" || path == "/api/plan/purchase/"):
		controller.PurchaseSubscriptionPlanNotAllowed(c)
		return true
	case method == http.MethodPost && (path == "/api/plan/purchase" || path == "/api/plan/purchase/"):
		runAuthAndHandle(c, middleware.UserAuth(), controller.PurchaseSubscriptionPlan)
		return true
	case path == "/api/plan/admin" || path == "/api/plan/admin/":
		switch method {
		case http.MethodGet:
			runAuthAndHandle(c, middleware.AdminAuth(), controller.AdminGetSubscriptionPlans)
			return true
		case http.MethodPost:
			runAuthAndHandle(c, middleware.AdminAuth(), controller.AdminCreateSubscriptionPlan)
			return true
		case http.MethodPut:
			runAuthAndHandle(c, middleware.AdminAuth(), controller.AdminUpdateSubscriptionPlan)
			return true
		}
	case method == http.MethodDelete && strings.HasPrefix(path, "/api/plan/admin/"):
		id := strings.TrimPrefix(path, "/api/plan/admin/")
		id = strings.Trim(id, "/")
		if id == "" {
			return false
		}
		c.Params = append(c.Params, gin.Param{
			Key:   "id",
			Value: id,
		})
		runAuthAndHandle(c, middleware.AdminAuth(), controller.AdminDeleteSubscriptionPlan)
		return true
	}

	return false
}

// processCustomHead replaces the custom head placeholder with the stored custom_head_html content
func processCustomHead(indexPage []byte) []byte {
	common.OptionMapRWMutex.RLock()
	customHead := common.OptionMap["custom_head_html"]
	common.OptionMapRWMutex.RUnlock()
	
	placeholder := []byte("<!-- if veloera custom::custom_head -->")
	
	if customHead != "" {
		return bytes.Replace(indexPage, placeholder, []byte(customHead), -1)
	}
	
	// Return original page with placeholder preserved when custom content is empty
	return indexPage
}

func SetWebRouter(router *gin.Engine, buildFS embed.FS, indexPage []byte) {
	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(middleware.GlobalWebRateLimit())
	router.Use(middleware.Cache())
	router.Use(static.Serve("/", common.EmbedFolder(buildFS, "web/dist")))
	router.GET("/veloera", func(c *gin.Context) {
		c.String(http.StatusOK, "如果您在阅读这个, 则证明该项目基于 Veloera 二次开发, 如果您在 /veloera 上阅读到了此文件, 那么该网站同样基于 Veloera.\nVeloera 是一个智能的开源 LLM API 网关, 为商用和大并发准备的. 该项目基于 GPL v3 开源, 附加条款适用.  \n访问源代码: https://github.com/Veloera/Veloera\n\n---\n\nIf you are reading this, it means the project is a secondary development based on Veloera. If you are reading this file under /veloera, then that site is also based on Veloera.\n\nVeloera is an intelligent open-source LLM API gateway, built for commercial use and high concurrency. This project is open-sourced under the GPL v3 license, with additional terms applicable.\nSource code available at: https://github.com/Veloera/Veloera")
	})

	// Custom content routes
	router.GET("/custom/global.css", controller.GetCustomCSS)
	router.GET("/custom/global.js", controller.GetCustomJS)

	router.NoRoute(func(c *gin.Context) {
		if handlePlanAPINoRoute(c) {
			return
		}
		if strings.HasPrefix(c.Request.RequestURI, "/v1") || strings.HasPrefix(c.Request.RequestURI, "/api") || strings.HasPrefix(c.Request.RequestURI, "/assets") {
			controller.RelayNotFound(c)
			return
		}
		c.Header("Cache-Control", "no-cache")
		processedPage := processCustomHead(indexPage)
		c.Data(http.StatusOK, "text/html; charset=utf-8", processedPage)
	})
}
