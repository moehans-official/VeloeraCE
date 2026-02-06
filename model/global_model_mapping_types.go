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
	"fmt"
	"math/rand"
	"strings"
	"sync"
	"time"
)

// ModelMappingItem 模型映射项
type ModelMappingItem struct {
	Model      string `json:"model" binding:"required"`   // 实际模型名
	Priorities int    `json:"priorities" binding:"min=0"` // 优先级(非负整数)
}

// GlobalModelMapping 全局模型映射配置
type GlobalModelMapping struct {
	Mapping map[string][]ModelMappingItem `json:"mapping"` // 虚拟模型名 -> 实际模型映射列表
}

// RoundRobinCounter 轮询计数器
type RoundRobinCounter struct {
	counters map[string]int
	mutex    sync.RWMutex
}

// NewRoundRobinCounter 创建新的轮询计数器
func NewRoundRobinCounter() *RoundRobinCounter {
	return &RoundRobinCounter{
		counters: make(map[string]int),
	}
}

// GetNext 获取下一个轮询索引
func (rrc *RoundRobinCounter) GetNext(key string, maxIndex int) int {
	if maxIndex <= 0 {
		return 0
	}
	
	rrc.mutex.Lock()
	defer rrc.mutex.Unlock()
	
	current, exists := rrc.counters[key]
	if !exists {
		current = 0
	}
	
	next := (current + 1) % maxIndex
	rrc.counters[key] = next
	
	return current
}

// ClearAllCounters 清空所有计数器
func (rrc *RoundRobinCounter) ClearAllCounters() {
	rrc.mutex.Lock()
	defer rrc.mutex.Unlock()
	
	rrc.counters = make(map[string]int)
}

// GetActualModel 根据虚拟模型名获取实际模型名（考虑优先级和轮询）
func GetActualModel(virtualModel string) (string, error) {
	ModelMappingMutex.RLock()
	defer ModelMappingMutex.RUnlock()
	
	if globalModelMapping == nil || len(globalModelMapping.Mapping) == 0 {
		// 如果没有配置映射，直接返回原模型名
		return virtualModel, nil
	}
	
	mappingItems, exists := globalModelMapping.Mapping[virtualModel]
	if !exists || len(mappingItems) == 0 {
		// 如果虚拟模型没有映射配置，直接返回原模型名
		return virtualModel, nil
	}
	
	// 按优先级分组
	priorityGroups := make(map[int][]ModelMappingItem)
	for _, item := range mappingItems {
		if item.Priorities < 0 {
			// 跳过无效的优先级（负数）
			continue
		}
		priorityGroups[item.Priorities] = append(priorityGroups[item.Priorities], item)
	}
	
	if len(priorityGroups) == 0 {
		return virtualModel, nil
	}
	
	// 获取最高优先级
	var maxPriority int = -1
	for priority := range priorityGroups {
		if priority > maxPriority {
			maxPriority = priority
		}
	}
	
	highestPriorityItems := priorityGroups[maxPriority]
	if len(highestPriorityItems) == 0 {
		return virtualModel, nil
	}
	
	// 如果只有一个最高优先级项目，直接返回
	if len(highestPriorityItems) == 1 {
		return highestPriorityItems[0].Model, nil
	}
	
	// 使用轮询策略从最高优先级项目中选择
	if roundRobinCounter == nil {
		// 如果轮询计数器未初始化，使用随机选择
		rand.Seed(time.Now().UnixNano())
		index := rand.Intn(len(highestPriorityItems))
		return highestPriorityItems[index].Model, nil
	}
	
	// 使用轮询计数器
	index := roundRobinCounter.GetNext(virtualModel, len(highestPriorityItems))
	return highestPriorityItems[index].Model, nil
}

// ValidateModelMapping 验证模型映射配置
func ValidateModelMapping(mapping *GlobalModelMapping) error {
	if mapping == nil {
		return fmt.Errorf("映射配置不能为空")
	}
	
	if mapping.Mapping == nil {
		return fmt.Errorf("映射字典不能为空")
	}
	
	for virtualModel, items := range mapping.Mapping {
		if strings.TrimSpace(virtualModel) == "" {
			return fmt.Errorf("虚拟模型名不能为空")
		}
		
		if len(items) == 0 {
			return fmt.Errorf("虚拟模型 '%s' 的映射项不能为空", virtualModel)
		}
		
		// 用于检查同一虚拟模型内实际模型名的重复
		modelSet := make(map[string]bool)
		
		for i, item := range items {
			if strings.TrimSpace(item.Model) == "" {
				return fmt.Errorf("虚拟模型 '%s' 的第 %d 个映射项的实际模型名不能为空", virtualModel, i+1)
			}
			
			if item.Priorities < 0 {
				return fmt.Errorf("虚拟模型 '%s' 的实际模型 '%s' 的优先级必须为非负整数", virtualModel, item.Model)
			}
			
			// 检查同一虚拟模型内实际模型名的重复
			trimmedModel := strings.TrimSpace(item.Model)
			if modelSet[trimmedModel] {
				return fmt.Errorf("虚拟模型 '%s' 中存在重复的实际模型名 '%s'", virtualModel, trimmedModel)
			}
			modelSet[trimmedModel] = true
		}
	}
	
	return nil
}