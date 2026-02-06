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
	"fmt"
	"os"
	"veloera/common"

	"github.com/gin-gonic/gin"
)

func SecurityHeaders() gin.HandlerFunc {
	maxAge := common.GetEnvOrDefault("SECURITY_HSTS_MAX_AGE", 31536000)
	forceHSTS := common.GetEnvOrDefaultBool("SECURITY_HSTS_FORCE", false)

	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Header("X-XSS-Protection", "0")

		if c.Request.TLS != nil || forceHSTS {
			c.Header("Strict-Transport-Security", fmt.Sprintf("max-age=%d; includeSubDomains", maxAge))
		}

		if csp := os.Getenv("SECURITY_CONTENT_SECURITY_POLICY"); csp != "" {
			c.Header("Content-Security-Policy", csp)
		}

		c.Next()
	}
}
