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
package main

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"
	"veloera/common"
	"veloera/constant"
	"veloera/controller"
	"veloera/middleware"
	"veloera/model"
	"veloera/router"
	"veloera/service"
	"veloera/setting/operation_setting"

	"github.com/bytedance/gopkg/util/gopool"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	_ "net/http/pprof"
)

//go:embed web/dist
var buildFS embed.FS

//go:embed web/dist/index.html
var indexPage []byte

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		common.SysLog("Support for .env file is disabled: " + err.Error())
	}

	common.LoadEnv()

	common.SetupLogger()
	common.SysLog("Veloera " + common.Version + " started")
	if os.Getenv("GIN_MODE") != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}
	if common.DebugEnabled {
		common.SysLog("running in debug mode")
	}
	// Initialize SQL Database
	err = model.InitDB()
	if err != nil {
		common.FatalLog("failed to initialize database: " + err.Error())
	}

	model.CheckSetup()

	// Initialize SQL Database
	err = model.InitLogDB()
	if err != nil {
		common.FatalLog("failed to initialize database: " + err.Error())
	}
	defer func() {
		err := model.CloseDB()
		if err != nil {
			common.FatalLog("failed to close database: " + err.Error())
		}
	}()

	// Initialize Redis
	err = common.InitRedisClient()
	if err != nil {
		common.FatalLog("failed to initialize Redis: " + err.Error())
	}

	// Initialize model settings
	operation_setting.InitModelSettings()
	// Initialize constants
	constant.InitEnv()
	// Initialize options
	model.InitOptionMap()

	// Initialize global model mapping service
	if err := service.InitializeModelMappingService(); err != nil {
		common.SysError("failed to initialize model mapping service: " + err.Error())
	}

	if common.RedisEnabled {
		// for compatibility with old versions
		common.MemoryCacheEnabled = true
	}
	if common.MemoryCacheEnabled {
		common.SysLog("memory cache enabled")
		common.SysError(fmt.Sprintf("sync frequency: %d seconds", common.SyncFrequency))
		model.InitChannelCache()
	}
	if common.MemoryCacheEnabled {
		go model.SyncOptions(common.SyncFrequency)
		go model.SyncChannelCache(common.SyncFrequency)
	}

	// 数据看板
	go model.UpdateQuotaData()

	if os.Getenv("CHANNEL_UPDATE_FREQUENCY") != "" {
		frequency, err := strconv.Atoi(os.Getenv("CHANNEL_UPDATE_FREQUENCY"))
		if err != nil {
			common.FatalLog("failed to parse CHANNEL_UPDATE_FREQUENCY: " + err.Error())
		}
		go controller.AutomaticallyUpdateChannels(frequency)
	}
	if os.Getenv("CHANNEL_TEST_FREQUENCY") != "" {
		frequency, err := strconv.Atoi(os.Getenv("CHANNEL_TEST_FREQUENCY"))
		if err != nil {
			common.FatalLog("failed to parse CHANNEL_TEST_FREQUENCY: " + err.Error())
		}
		go controller.AutomaticallyTestChannels(frequency)
	}
	if common.IsMasterNode && constant.UpdateTask {
		gopool.Go(func() {
			controller.UpdateMidjourneyTaskBulk()
		})
		gopool.Go(func() {
			controller.UpdateTaskBulk()
		})
	}
	if os.Getenv("BATCH_UPDATE_ENABLED") == "true" {
		common.BatchUpdateEnabled = true
		common.SysLog("batch update enabled with interval " + strconv.Itoa(common.BatchUpdateInterval) + "s")
		model.InitBatchUpdater()
	}

	if os.Getenv("ENABLE_PPROF") == "true" {
		gopool.Go(func() {
			log.Println(http.ListenAndServe("0.0.0.0:8005", nil))
		})
		go common.Monitor()
		common.SysLog("pprof enabled")
	}

	service.InitTokenEncoders()

	// Initialize HTTP server
	server := gin.New()
	server.Use(gin.CustomRecovery(func(c *gin.Context, err any) {
		common.SysError(fmt.Sprintf("panic detected: %v", err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": fmt.Sprintf("Panic detected, error: %v. Please submit a issue here: https://github.com/Veloera/Veloera", err),
				"type":    "veloera_panic",
			},
		})
	}))
	// This will cause SSE not to work!!!
	//server.Use(gzip.Gzip(gzip.DefaultCompression))
	trustedProxies := parseTrustedProxies(os.Getenv("TRUSTED_PROXIES"))
	if err := server.SetTrustedProxies(trustedProxies); err != nil {
		common.FatalLog("failed to set trusted proxies: " + err.Error())
	}
	server.Use(middleware.RequestId())
	server.Use(middleware.SecurityHeaders())
	middleware.SetUpLogger(server)
	maxMultipartMemoryMB := common.GetEnvOrDefault("MAX_MULTIPART_MEMORY_MB", 32)
	if maxMultipartMemoryMB > 0 {
		server.MaxMultipartMemory = int64(maxMultipartMemoryMB) << 20
	}
	// Initialize session store
	store := cookie.NewStore([]byte(common.SessionSecret))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   2592000, // 30 days
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteStrictMode,
	})
	server.Use(sessions.Sessions("session", store))

	router.SetRouter(server, buildFS, indexPage)
	var port = os.Getenv("PORT")
	if port == "" {
		port = strconv.Itoa(*common.Port)
	}

	readTimeout := time.Duration(common.GetEnvOrDefault("SERVER_READ_TIMEOUT", 30)) * time.Second
	writeTimeout := time.Duration(common.GetEnvOrDefault("SERVER_WRITE_TIMEOUT", 120)) * time.Second
	idleTimeout := time.Duration(common.GetEnvOrDefault("SERVER_IDLE_TIMEOUT", 120)) * time.Second
	shutdownTimeout := time.Duration(common.GetEnvOrDefault("SERVER_SHUTDOWN_TIMEOUT", 15)) * time.Second

	httpServer := &http.Server{
		Addr:         ":" + port,
		Handler:      server,
		ReadTimeout:  readTimeout,
		WriteTimeout: writeTimeout,
		IdleTimeout:  idleTimeout,
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- httpServer.ListenAndServe()
	}()

	common.SysLog(fmt.Sprintf("HTTP server listening on :%s", port))

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-quit:
		common.SysLog("shutdown signal received: " + sig.String())
	case serveErr := <-errCh:
		if serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			common.FatalLog("failed to start HTTP server: " + serveErr.Error())
		}
		return
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		common.FatalLog("failed to shutdown HTTP server gracefully: " + err.Error())
	}
	common.SysLog("HTTP server shutdown complete")
}

func parseTrustedProxies(raw string) []string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}
	if trimmed == "*" {
		return []string{"0.0.0.0/0", "::/0"}
	}

	parts := strings.Split(trimmed, ",")
	proxies := make([]string, 0, len(parts))
	for _, part := range parts {
		p := strings.TrimSpace(part)
		if p != "" {
			proxies = append(proxies, p)
		}
	}
	if len(proxies) == 0 {
		return nil
	}
	return proxies
}
