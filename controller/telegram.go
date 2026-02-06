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
package controller

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"sort"
	"veloera/common"
	"veloera/model"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func TelegramBind(c *gin.Context) {
	if !common.TelegramOAuthEnabled {
		respondWithError(c, http.StatusOK, "管理员未开启通过 Telegram 登录以及注册")
		return
	}

	params := c.Request.URL.Query()
	if !checkTelegramAuthorization(params, common.TelegramBotToken) {
		respondWithError(c, http.StatusOK, "无效的请求")
		return
	}

	telegramId := params["id"][0]
	if model.IsTelegramIdAlreadyTaken(telegramId) {
		respondWithError(c, http.StatusOK, "该 Telegram 账户已被绑定")
		return
	}

	session := sessions.Default(c)
	id := session.Get("id")
	user := model.User{Id: id.(int)}

	if err := user.FillUserById(); err != nil {
		respondWithError(c, http.StatusOK, err.Error())
		return
	}

	if !checkUserStatus(c, &user) {
		return
	}

	user.TelegramId = telegramId
	if err := user.Update(false); err != nil {
		respondWithError(c, http.StatusOK, err.Error())
		return
	}

	c.Redirect(302, "/setting")
}

func TelegramLogin(c *gin.Context) {
	if !common.TelegramOAuthEnabled {
		respondWithError(c, http.StatusOK, "管理员未开启通过 Telegram 登录以及注册")
		return
	}

	params := c.Request.URL.Query()
	if !checkTelegramAuthorization(params, common.TelegramBotToken) {
		respondWithError(c, http.StatusOK, "无效的请求")
		return
	}

	telegramId := params["id"][0]
	user := model.User{TelegramId: telegramId}

	if err := user.FillUserByTelegramId(); err != nil {
		respondWithError(c, http.StatusOK, err.Error())
		return
	}

	if !checkUserStatus(c, &user) {
		return
	}

	setupLogin(&user, c)
}

func checkTelegramAuthorization(params map[string][]string, token string) bool {
	strs := []string{}
	var hash = ""
	for k, v := range params {
		if k == "hash" {
			hash = v[0]
			continue
		}
		strs = append(strs, k+"="+v[0])
	}
	sort.Strings(strs)
	var imploded = ""
	for _, s := range strs {
		if imploded != "" {
			imploded += "\n"
		}
		imploded += s
	}
	sha256hash := sha256.New()
	io.WriteString(sha256hash, token)
	hmachash := hmac.New(sha256.New, sha256hash.Sum(nil))
	io.WriteString(hmachash, imploded)
	ss := hex.EncodeToString(hmachash.Sum(nil))
	return hash == ss
}
