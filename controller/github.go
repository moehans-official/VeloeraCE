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
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
	"veloera/common"
	"veloera/model"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type GitHubOAuthResponse struct {
	AccessToken string `json:"access_token"`
	Scope       string `json:"scope"`
	TokenType   string `json:"token_type"`
}

type GitHubUser struct {
	Login string `json:"login"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func getGitHubUserInfoByCode(code string) (*GitHubUser, error) {
	if code == "" {
		return nil, errors.New("无效的参数")
	}
	values := map[string]string{"client_id": common.GitHubClientId, "client_secret": common.GitHubClientSecret, "code": code}
	jsonData, err := json.Marshal(values)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest("POST", "https://github.com/login/oauth/access_token", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	client := http.Client{
		Timeout: 5 * time.Second,
	}
	res, err := client.Do(req)
	if err != nil {
		common.SysLog(err.Error())
		return nil, errors.New("无法连接至 GitHub 服务器，请稍后重试！")
	}
	defer res.Body.Close()
	var oAuthResponse GitHubOAuthResponse
	err = json.NewDecoder(res.Body).Decode(&oAuthResponse)
	if err != nil {
		return nil, err
	}
	req, err = http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", oAuthResponse.AccessToken))
	res2, err := client.Do(req)
	if err != nil {
		common.SysLog(err.Error())
		return nil, errors.New("无法连接至 GitHub 服务器，请稍后重试！")
	}
	defer res2.Body.Close()
	var githubUser GitHubUser
	err = json.NewDecoder(res2.Body).Decode(&githubUser)
	if err != nil {
		return nil, err
	}
	if githubUser.Login == "" {
		return nil, errors.New("返回值非法，用户字段为空，请稍后重试！")
	}
	return &githubUser, nil
}

func GitHubOAuth(c *gin.Context) {
	code := c.Query("code")
	githubUser, err := getGitHubUserInfoByCode(code)
	if err != nil {
		respondWithError(c, http.StatusOK, err.Error())
		return
	}

	oauthUser := &OAuthUser{
		ID:          githubUser.Login,
		Username:    githubUser.Login,
		DisplayName: githubUser.Name,
		Email:       githubUser.Email,
		Provider:    ProviderGitHub,
	}

	config := &OAuthConfig{
		Enabled:      common.GitHubOAuthEnabled,
		ClientID:     common.GitHubClientId,
		ClientSecret: common.GitHubClientSecret,
	}

	handleOAuthLogin(c, oauthUser, config,
		model.IsGitHubIdAlreadyTaken,
		func(user *model.User) error {
			user.GitHubId = oauthUser.ID
			return user.FillUserByGitHubId()
		},
		createGitHubUser,
	)
}

func GitHubBind(c *gin.Context) {
	code := c.Query("code")
	githubUser, err := getGitHubUserInfoByCode(code)
	if err != nil {
		respondWithError(c, http.StatusOK, err.Error())
		return
	}

	oauthUser := &OAuthUser{
		ID:          githubUser.Login,
		Username:    githubUser.Login,
		DisplayName: githubUser.Name,
		Email:       githubUser.Email,
		Provider:    ProviderGitHub,
	}

	config := &OAuthConfig{
		Enabled:      common.GitHubOAuthEnabled,
		ClientID:     common.GitHubClientId,
		ClientSecret: common.GitHubClientSecret,
	}

	handleOAuthBind(c, oauthUser, config,
		model.IsGitHubIdAlreadyTaken,
		func(user *model.User) error {
			user.GitHubId = oauthUser.ID
			return user.FillUserByGitHubId()
		},
	)
}

func GenerateOAuthCode(c *gin.Context) {
	session := sessions.Default(c)
	state := common.GetRandomString(12)
	affCode := c.Query("aff")
	if affCode != "" {
		session.Set("aff", affCode)
	}
	session.Set("oauth_state", state)
	err := session.Save()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    state,
	})
}
