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
	"net/http"
	"strconv"
	"strings"
	"veloera/common"
	"veloera/model"

	"github.com/gin-gonic/gin"
)

type upsertSubscriptionPlanRequest struct {
	Id           int    `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	Price        int    `json:"price"`
	TotalQuota   int    `json:"total_quota"`
	DailyQuota   int    `json:"daily_quota"`
	DurationDays int    `json:"duration_days"`
	Status       int    `json:"status"`
	SortOrder    int    `json:"sort_order"`
}

type purchaseSubscriptionPlanRequest struct {
	PlanId int `json:"plan_id"`
}

func PurchaseSubscriptionPlanNotAllowed(c *gin.Context) {
	c.JSON(http.StatusMethodNotAllowed, gin.H{
		"success": false,
		"message": "请求方法不支持，请使用 POST /api/plan/purchase",
	})
}

func validateSubscriptionPlanRequest(req *upsertSubscriptionPlanRequest) string {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return "套餐名称不能为空"
	}
	if len(req.Name) > 64 {
		return "套餐名称长度不能超过64个字符"
	}
	if req.Price < 0 {
		return "套餐价格必须大于等于0"
	}
	if req.TotalQuota <= 0 {
		return "套餐总额度必须大于0"
	}
	if req.DailyQuota < 0 {
		return "套餐每日额度必须大于等于0"
	}
	if req.DurationDays < 0 {
		return "套餐有效期天数必须大于等于0"
	}
	if req.Status != model.SubscriptionPlanStatusEnabled && req.Status != model.SubscriptionPlanStatusDisabled {
		return "套餐状态不合法"
	}
	return ""
}

func GetSubscriptionPlans(c *gin.Context) {
	plans, err := model.GetAllSubscriptionPlans(false)
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
		"data":    plans,
	})
}

func GetUserPlanOrders(c *gin.Context) {
	p, _ := strconv.Atoi(c.Query("p"))
	pageSize, _ := strconv.Atoi(c.Query("page_size"))
	if p <= 0 {
		p = 1
	}
	if pageSize < 1 {
		pageSize = common.ItemsPerPage
	}

	userId := c.GetInt("id")
	orders, total, err := model.GetUserPlanOrders(userId, (p-1)*pageSize, pageSize)
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
		"data": gin.H{
			"items":     orders,
			"total":     total,
			"page":      p,
			"page_size": pageSize,
		},
	})
}

func PurchaseSubscriptionPlan(c *gin.Context) {
	req := purchaseSubscriptionPlanRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if req.PlanId <= 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "套餐ID不合法",
		})
		return
	}

	order, err := model.PurchaseSubscriptionPlan(c.GetInt("id"), req.PlanId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "套餐购买成功",
		"data":    order,
	})
}

func AdminGetSubscriptionPlans(c *gin.Context) {
	plans, err := model.GetAllSubscriptionPlans(true)
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
		"data":    plans,
	})
}

func AdminCreateSubscriptionPlan(c *gin.Context) {
	req := upsertSubscriptionPlanRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if msg := validateSubscriptionPlanRequest(&req); msg != "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": msg,
		})
		return
	}

	plan := &model.SubscriptionPlan{
		Name:         req.Name,
		Description:  req.Description,
		Price:        req.Price,
		TotalQuota:   req.TotalQuota,
		DailyQuota:   req.DailyQuota,
		DurationDays: req.DurationDays,
		Status:       req.Status,
		SortOrder:    req.SortOrder,
	}
	if err := plan.Insert(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    plan,
	})
}

func AdminUpdateSubscriptionPlan(c *gin.Context) {
	req := upsertSubscriptionPlanRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if req.Id <= 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "套餐ID不合法",
		})
		return
	}
	if msg := validateSubscriptionPlanRequest(&req); msg != "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": msg,
		})
		return
	}

	plan, err := model.GetSubscriptionPlanById(req.Id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	plan.Name = req.Name
	plan.Description = req.Description
	plan.Price = req.Price
	plan.TotalQuota = req.TotalQuota
	plan.DailyQuota = req.DailyQuota
	plan.DurationDays = req.DurationDays
	plan.Status = req.Status
	plan.SortOrder = req.SortOrder

	if err = plan.Update(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    plan,
	})
}

func AdminDeleteSubscriptionPlan(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "套餐ID不合法",
		})
		return
	}
	if err = model.DeleteSubscriptionPlanById(id); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
