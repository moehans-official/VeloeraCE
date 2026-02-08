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
package model

import (
	"errors"
	"fmt"
	"veloera/common"

	"github.com/bytedance/gopkg/util/gopool"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	SubscriptionPlanStatusDisabled = 0
	SubscriptionPlanStatusEnabled  = 1
)

const (
	UserPlanOrderStatusActive  = 1
	UserPlanOrderStatusExpired = 2
)

type SubscriptionPlan struct {
	Id           int            `json:"id"`
	Name         string         `json:"name" gorm:"type:varchar(64);index;not null"`
	Description  string         `json:"description" gorm:"type:text"`
	Price        int            `json:"price" gorm:"type:int;default:0"`         // Deducted from user.quota
	TotalQuota   int            `json:"total_quota" gorm:"type:int;default:0"`   // Added to user.subscription_quota
	DailyQuota   int            `json:"daily_quota" gorm:"type:int;default:0"`   // For display and future daily-limit enforcement
	DurationDays int            `json:"duration_days" gorm:"type:int;default:0"` // 0 means no expiration
	Status       int            `json:"status" gorm:"type:int;default:1;index"`
	SortOrder    int            `json:"sort_order" gorm:"type:int;default:0;index"`
	CreatedTime  int64          `json:"created_time" gorm:"bigint;index"`
	UpdatedTime  int64          `json:"updated_time" gorm:"bigint"`
	DeletedAt    gorm.DeletedAt `gorm:"index"`
}

type UserPlanOrder struct {
	Id           int            `json:"id"`
	UserId       int            `json:"user_id" gorm:"index;not null"`
	PlanId       int            `json:"plan_id" gorm:"index;not null"`
	PlanName     string         `json:"plan_name" gorm:"type:varchar(64);not null"`
	Price        int            `json:"price" gorm:"type:int;default:0"`
	GrantedQuota int            `json:"granted_quota" gorm:"type:int;default:0"` // Added to user.subscription_quota on purchase
	DailyQuota   int            `json:"daily_quota" gorm:"type:int;default:0"`
	DurationDays int            `json:"duration_days" gorm:"type:int;default:0"`
	StartTime    int64          `json:"start_time" gorm:"bigint;index"`
	ExpireTime   int64          `json:"expire_time" gorm:"bigint;index"` // 0 means no expiration
	Status       int            `json:"status" gorm:"type:int;default:1;index"`
	CreatedTime  int64          `json:"created_time" gorm:"bigint;index"`
	DeletedAt    gorm.DeletedAt `gorm:"index"`
}

func GetAllSubscriptionPlans(includeDisabled bool) (plans []*SubscriptionPlan, err error) {
	tx := DB.Model(&SubscriptionPlan{})
	if !includeDisabled {
		tx = tx.Where("status = ?", SubscriptionPlanStatusEnabled)
	}
	err = tx.Order("sort_order asc, id desc").Find(&plans).Error
	return plans, err
}

func GetSubscriptionPlanById(id int) (*SubscriptionPlan, error) {
	if id <= 0 {
		return nil, errors.New("套餐ID不合法")
	}
	plan := SubscriptionPlan{Id: id}
	if err := DB.First(&plan, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &plan, nil
}

func (plan *SubscriptionPlan) Insert() error {
	if plan == nil {
		return errors.New("套餐数据不合法")
	}
	now := common.GetTimestamp()
	plan.CreatedTime = now
	plan.UpdatedTime = now
	if plan.Status != SubscriptionPlanStatusDisabled && plan.Status != SubscriptionPlanStatusEnabled {
		plan.Status = SubscriptionPlanStatusEnabled
	}
	return DB.Create(plan).Error
}

func (plan *SubscriptionPlan) Update() error {
	if plan == nil || plan.Id <= 0 {
		return errors.New("套餐数据不合法")
	}
	plan.UpdatedTime = common.GetTimestamp()
	return DB.Model(plan).Select(
		"name",
		"description",
		"price",
		"total_quota",
		"daily_quota",
		"duration_days",
		"status",
		"sort_order",
		"updated_time",
	).Updates(plan).Error
}

func DeleteSubscriptionPlanById(id int) error {
	if id <= 0 {
		return errors.New("套餐ID不合法")
	}
	type userPlanRefund struct {
		UserId      int `gorm:"column:user_id"`
		RefundQuota int `gorm:"column:refund_quota"`
		ClearQuota  int `gorm:"column:clear_quota"`
	}
	refunds := make([]userPlanRefund, 0)

	err := DB.Transaction(func(tx *gorm.DB) error {
		plan := SubscriptionPlan{Id: id}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", id).
			Take(&plan).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("套餐不存在")
			}
			return err
		}

		if err := tx.Model(&UserPlanOrder{}).
			Select("user_id, COALESCE(SUM(price), 0) AS refund_quota, COALESCE(SUM(granted_quota), 0) AS clear_quota").
			Where("plan_id = ?", id).
			Group("user_id").
			Scan(&refunds).Error; err != nil {
			return err
		}

		for i := range refunds {
			refund := &refunds[i]
			if refund.UserId <= 0 {
				continue
			}

			var userSnapshot struct {
				SubscriptionQuota int
			}
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Model(&User{}).
				Where("id = ?", refund.UserId).
				Select("subscription_quota").
				Take(&userSnapshot).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					refund.RefundQuota = 0
					refund.ClearQuota = 0
					continue
				}
				return err
			}

			if refund.ClearQuota > userSnapshot.SubscriptionQuota {
				refund.ClearQuota = userSnapshot.SubscriptionQuota
			}

			updates := make(map[string]interface{}, 2)
			if refund.RefundQuota > 0 {
				updates["quota"] = gorm.Expr("quota + ?", refund.RefundQuota)
			}
			if refund.ClearQuota > 0 {
				updates["subscription_quota"] = gorm.Expr("subscription_quota - ?", refund.ClearQuota)
			}
			if len(updates) == 0 {
				continue
			}

			if err := tx.Model(&User{}).
				Where("id = ?", refund.UserId).
				Updates(updates).Error; err != nil {
				return err
			}
		}

		if err := tx.Where("plan_id = ?", id).Delete(&UserPlanOrder{}).Error; err != nil {
			return err
		}
		return tx.Delete(&SubscriptionPlan{}, "id = ?", id).Error
	})
	if err != nil {
		return err
	}

	for _, refund := range refunds {
		if refund.UserId <= 0 {
			continue
		}
		if refund.RefundQuota > 0 {
			userId := refund.UserId
			incrQuota := refund.RefundQuota
			gopool.Go(func() {
				if cacheErr := cacheIncrUserQuota(userId, int64(incrQuota)); cacheErr != nil {
					common.SysError("failed to refund user quota cache: " + cacheErr.Error())
				}
			})
		}
		if refund.ClearQuota > 0 {
			userId := refund.UserId
			decrQuota := refund.ClearQuota
			gopool.Go(func() {
				if cacheErr := cacheDecrUserSubscriptionQuota(userId, int64(decrQuota)); cacheErr != nil {
					common.SysError("failed to clear user subscription quota cache: " + cacheErr.Error())
				}
			})
		}

		RecordLog(
			refund.UserId,
			LogTypeSystem,
			fmt.Sprintf("套餐已被删除，系统自动退款 %s，并清除套餐余额 %s", common.LogQuota(refund.RefundQuota), common.LogQuota(refund.ClearQuota)),
		)
	}

	return nil
}

func MarkExpiredUserPlanOrders(userId int) error {
	now := common.GetTimestamp()
	return DB.Model(&UserPlanOrder{}).
		Where("user_id = ? AND status = ? AND expire_time > 0 AND expire_time <= ?", userId, UserPlanOrderStatusActive, now).
		Update("status", UserPlanOrderStatusExpired).Error
}

func GetUserPlanOrders(userId int, startIdx int, num int) (orders []*UserPlanOrder, total int64, err error) {
	if userId <= 0 {
		return nil, 0, errors.New("用户ID不合法")
	}
	if err = MarkExpiredUserPlanOrders(userId); err != nil {
		return nil, 0, err
	}
	tx := DB.Model(&UserPlanOrder{}).Where("user_id = ?", userId)
	if err = tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err = tx.Order("id desc").Limit(num).Offset(startIdx).Find(&orders).Error; err != nil {
		return nil, 0, err
	}
	return orders, total, nil
}

func PurchaseSubscriptionPlan(userId int, planId int) (*UserPlanOrder, error) {
	if userId <= 0 {
		return nil, errors.New("用户ID不合法")
	}
	if planId <= 0 {
		return nil, errors.New("套餐ID不合法")
	}

	now := common.GetTimestamp()
	var plan SubscriptionPlan
	var order *UserPlanOrder

	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", planId).
			Take(&plan).Error; err != nil {
			return errors.New("套餐不存在")
		}
		if plan.Status != SubscriptionPlanStatusEnabled {
			return errors.New("套餐已下架")
		}
		if plan.Price < 0 {
			return errors.New("套餐价格不合法")
		}
		if plan.TotalQuota <= 0 {
			return errors.New("套餐额度不合法")
		}
		if plan.DurationDays < 0 {
			return errors.New("套餐有效期不合法")
		}

		var userBalance struct {
			Quota int
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Model(&User{}).
			Where("id = ?", userId).
			Select("quota").
			Take(&userBalance).Error; err != nil {
			return errors.New("用户不存在")
		}
		if userBalance.Quota < plan.Price {
			return fmt.Errorf("随用随付余额不足，需要 %s", common.LogQuota(plan.Price))
		}

		if plan.Price > 0 {
			if err := tx.Model(&User{}).
				Where("id = ?", userId).
				Update("quota", gorm.Expr("quota - ?", plan.Price)).Error; err != nil {
				return err
			}
		}

		if err := tx.Model(&User{}).
			Where("id = ?", userId).
			Update("subscription_quota", gorm.Expr("subscription_quota + ?", plan.TotalQuota)).Error; err != nil {
			return err
		}

		expireTime := int64(0)
		if plan.DurationDays > 0 {
			expireTime = now + int64(plan.DurationDays)*86400
		}

		order = &UserPlanOrder{
			UserId:       userId,
			PlanId:       plan.Id,
			PlanName:     plan.Name,
			Price:        plan.Price,
			GrantedQuota: plan.TotalQuota,
			DailyQuota:   plan.DailyQuota,
			DurationDays: plan.DurationDays,
			StartTime:    now,
			ExpireTime:   expireTime,
			Status:       UserPlanOrderStatusActive,
			CreatedTime:  now,
		}
		return tx.Create(order).Error
	})
	if err != nil {
		return nil, err
	}

	if plan.Price > 0 {
		gopool.Go(func() {
			if cacheErr := cacheDecrUserQuota(userId, int64(plan.Price)); cacheErr != nil {
				common.SysError("failed to decrease user quota cache: " + cacheErr.Error())
			}
		})
	}
	if plan.TotalQuota > 0 {
		gopool.Go(func() {
			if cacheErr := cacheIncrUserSubscriptionQuota(userId, int64(plan.TotalQuota)); cacheErr != nil {
				common.SysError("failed to increase user subscription quota cache: " + cacheErr.Error())
			}
		})
	}

	RecordLog(
		userId,
		LogTypeTopup,
		fmt.Sprintf("购买套餐 %s，支付 %s，获得积分额度 %s", plan.Name, common.LogQuota(plan.Price), common.LogQuota(plan.TotalQuota)),
	)
	return order, nil
}
