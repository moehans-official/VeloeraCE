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
package middleware

import (
	"github.com/gin-gonic/gin"
	"strings"
)

func Cache() func(c *gin.Context) {
	return func(c *gin.Context) {
		uri := c.Request.RequestURI

		// Never cache API responses (otherwise user余额/额度等会“卡住”不更新).
		if strings.HasPrefix(uri, "/api") || strings.HasPrefix(uri, "/v1") || strings.HasPrefix(uri, "/pg") {
			c.Header("Cache-Control", "no-store")
			c.Next()
			return
		}

		// Custom assets are user-editable; keep them always fresh.
		if strings.HasPrefix(uri, "/custom/") {
			c.Header("Cache-Control", "no-cache")
			c.Next()
			return
		}

		if uri == "/" {
			c.Header("Cache-Control", "no-cache")
		} else {
			c.Header("Cache-Control", "max-age=604800") // one week
		}
		c.Next()
	}
}
