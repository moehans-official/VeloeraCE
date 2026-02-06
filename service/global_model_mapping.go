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

package service

import (
	"veloera/model"
)

// GetActualModel 根据虚拟模型名获取实际模型名（考虑优先级和轮询）
// 这是model包中GetActualModel函数的包装函数
func GetActualModel(virtualModel string) (string, error) {
	return model.GetActualModel(virtualModel)
}

// InitializeModelMappingService 初始化模型映射服务
// 这是model包中InitializeModelMapping函数的包装函数
func InitializeModelMappingService() error {
	return model.InitializeModelMapping()
}

// ReloadModelMapping 重新加载模型映射配置
// 这是model包中ReloadModelMapping函数的包装函数
func ReloadModelMapping() error {
	return model.ReloadModelMapping()
}

// GetGlobalModelMapping 获取全局模型映射配置的副本
// 这是model包中GetGlobalModelMapping函数的包装函数
func GetGlobalModelMapping() *model.GlobalModelMapping {
	return model.GetGlobalModelMapping()
}

// GlobalModelMappingToJSONString 将全局模型映射配置转换为JSON字符串
// 这是model包中GlobalModelMappingToJSONString函数的包装函数
func GlobalModelMappingToJSONString() string {
	return model.GlobalModelMappingToJSONString()
}

// UpdateGlobalModelMappingFromJSONString 从JSON字符串更新全局模型映射配置
// 这是model包中UpdateGlobalModelMappingFromJSONString函数的包装函数
func UpdateGlobalModelMappingFromJSONString(jsonStr string) error {
	return model.UpdateGlobalModelMappingFromJSONString(jsonStr)
}

// UpdateGlobalModelMapping 更新全局模型映射配置
// 这是model包中UpdateGlobalModelMapping函数的包装函数
func UpdateGlobalModelMapping(mapping *model.GlobalModelMapping) error {
	return model.UpdateGlobalModelMapping(mapping)
}