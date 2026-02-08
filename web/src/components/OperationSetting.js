/*
Copyright (c) 2025 Tethys Plex

This file is part of Veloera.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import React, { useEffect, useState } from 'react';
import { Button, Collapse, Input, Space, Spin, Tabs } from '@douyinfe/semi-ui';
import SettingsGeneral from '../pages/Setting/Operation/SettingsGeneral.js';
import SettingsDrawing from '../pages/Setting/Operation/SettingsDrawing.js';
import SettingsSensitiveWords from '../pages/Setting/Operation/SettingsSensitiveWords.js';
import SettingsLog from '../pages/Setting/Operation/SettingsLog.js';
import SettingsDataDashboard from '../pages/Setting/Operation/SettingsDataDashboard.js';
import SettingsMonitoring from '../pages/Setting/Operation/SettingsMonitoring.js';
import SettingsCheckIn from '../pages/Setting/Operation/SettingsCheckIn.js';
import SettingsCreditLimit from '../pages/Setting/Operation/SettingsCreditLimit.js';
import SettingsRebate from '../pages/Setting/Operation/SettingsRebate.js';
import ModelSettingsVisualEditor from '../pages/Setting/Operation/ModelSettingsVisualEditor.js';
import GroupRatioSettings from '../pages/Setting/Operation/GroupRatioSettings.js';
import ModelCommonRatioSettings from '../pages/Setting/Operation/ModelCommonRatioSettings.js';
import ModelRatioSettings from '../pages/Setting/Operation/ModelRatioSettings.js';

import { API, showError, showSuccess } from '../helpers';
import SettingsChats from '../pages/Setting/Operation/SettingsChats.js';
import { useTranslation } from 'react-i18next';
import ModelRatioNotSetEditor from '../pages/Setting/Operation/ModelRationNotSetEditor.js';

const OperationSetting = () => {
  const { t } = useTranslation();
  let [inputs, setInputs] = useState({
    QuotaForNewUser: 0,
    QuotaForInviter: 0,
    QuotaForInvitee: 0,
    QuotaRemindThreshold: 0,
    PreConsumedQuota: 0,
    StreamCacheQueueLength: 0,
    ModelRatio: '',
    CacheRatio: '',
    CompletionRatio: '',
    ModelPrice: '',
    GroupRatio: '',
    UserUsableGroups: '',
    TopUpLink: '',
    'general_setting.docs_link': '',
    // ChatLink2: '', // 添加的新状态变量
    QuotaPerUnit: 0,
    AutomaticDisableChannelEnabled: false,
    AutomaticEnableChannelEnabled: false,
    ChannelDisableThreshold: 0,
    LogConsumeEnabled: false,
    LogChatContentEnabled: false,
    LogErrorEnabled: false,
    DisplayInCurrencyEnabled: false,
    DisplayTokenStatEnabled: false,
    CheckSensitiveEnabled: false,
    CheckSensitiveOnPromptEnabled: false,
    CheckSensitiveOnCompletionEnabled: '',
    StopOnSensitiveEnabled: '',
    SensitiveWords: '',
    MjNotifyEnabled: false,
    MjAccountFilterEnabled: false,
    MjModeClearEnabled: false,
    MjForwardUrlEnabled: false,
    MjActionCheckSuccessEnabled: false,
    DrawingEnabled: false,
    DataExportEnabled: false,
    DataExportDefaultTime: 'hour',
    DataExportInterval: 5,
    DefaultCollapseSidebar: false, // 默认折叠侧边栏
    RetryTimes: 0,
    Chats: '[]',
    DemoSiteEnabled: false,
    SelfUseModeEnabled: false,
    AutomaticDisableKeywords: '',
    CheckInEnabled: false,
    CheckInQuota: '',
    CheckInMaxQuota: '',
    RebateEnabled: false,
    RebatePercentage: 0,
    AffEnabled: false,
  });

  let [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [activeKeys, setActiveKeys] = useState([
    'general',
    'credit_limit',
    'group_ratio',
    'model_ratio',
  ]);

  const getOptions = async () => {
    const res = await API.get('/api/option/');
    const { success, message, data } = res.data;
    if (success) {
      let newInputs = {};
      data.forEach((item) => {
        if (
          item.key === 'ModelRatio' ||
          item.key === 'GroupRatio' ||
          item.key === 'UserUsableGroups' ||
          item.key === 'CompletionRatio' ||
          item.key === 'ModelPrice' ||
          item.key === 'CacheRatio'
        ) {
          item.value = JSON.stringify(JSON.parse(item.value), null, 2);
        }
        if (
          item.key.endsWith('Enabled') ||
          ['DefaultCollapseSidebar'].includes(item.key)
        ) {
          newInputs[item.key] = item.value === 'true' ? true : false;
        } else {
          newInputs[item.key] = item.value;
        }
      });

      setInputs(newInputs);
    } else {
      showError(message);
    }
  };
  async function onRefresh() {
    try {
      setLoading(true);
      await getOptions();
      // showSuccess('刷新成功');
    } catch (error) {
      showError('刷新失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    onRefresh();
  }, []);

  const normalizedFilter = String(filterText || '').trim().toLowerCase();
  const matchesFilter = (value) => {
    if (!normalizedFilter) return true;
    return String(value || '').toLowerCase().includes(normalizedFilter);
  };

  const sections = [
    {
      key: 'general',
      title: t('通用设置'),
      keywords: [t('通用设置'), 'general', 'quota', 'currency'],
      content: <SettingsGeneral options={inputs} refresh={onRefresh} />,
    },
    {
      key: 'drawing',
      title: t('绘图设置'),
      keywords: [t('绘图设置'), 'drawing', 'midjourney'],
      content: <SettingsDrawing options={inputs} refresh={onRefresh} />,
    },
    {
      key: 'sensitive_words',
      title: t('屏蔽词过滤设置'),
      keywords: [t('屏蔽词过滤设置'), 'sensitive', 'words'],
      content: <SettingsSensitiveWords options={inputs} refresh={onRefresh} />,
    },
    {
      key: 'log',
      title: t('日志设置'),
      keywords: [t('日志设置'), 'log'],
      content: <SettingsLog options={inputs} refresh={onRefresh} />,
    },
    {
      key: 'data_dashboard',
      title: t('数据看板'),
      keywords: [t('数据看板'), 'dashboard', 'data export'],
      content: <SettingsDataDashboard options={inputs} refresh={onRefresh} />,
    },
    {
      key: 'monitoring',
      title: t('监控设置'),
      keywords: [t('监控设置'), 'monitor', 'alert'],
      content: <SettingsMonitoring options={inputs} refresh={onRefresh} />,
    },
    {
      key: 'checkin',
      title: t('签到设置'),
      keywords: [t('签到设置'), 'check in'],
      content: <SettingsCheckIn options={inputs} refresh={onRefresh} />,
    },
    {
      key: 'credit_limit',
      title: t('额度设置'),
      keywords: [t('额度设置'), 'credit', 'limit'],
      content: <SettingsCreditLimit options={inputs} refresh={onRefresh} />,
    },
    {
      key: 'rebate',
      title: t('返佣设置'),
      keywords: [t('返佣设置'), 'rebate', 'aff'],
      content: <SettingsRebate options={inputs} refresh={onRefresh} />,
    },
    {
      key: 'chats',
      title: t('聊天设置'),
      keywords: [t('聊天设置'), 'chat'],
      content: <SettingsChats options={inputs} refresh={onRefresh} />,
    },
    {
      key: 'group_ratio',
      title: t('分组倍率设置'),
      keywords: [t('分组倍率设置'), 'group', 'ratio'],
      content: <GroupRatioSettings options={inputs} refresh={onRefresh} />,
    },
    {
      key: 'model_common_ratio',
      title: t('模型倍率相关设置'),
      keywords: [t('模型倍率相关设置'), 'model', 'ratio', 'common'],
      content: <ModelCommonRatioSettings options={inputs} refresh={onRefresh} />,
    },
    {
      key: 'model_ratio',
      title: t('模型倍率设置'),
      keywords: [t('模型倍率设置'), t('可视化倍率设置'), t('未设置倍率模型')],
      content: (
        <Tabs type='line'>
          <Tabs.TabPane tab={t('模型倍率设置')} itemKey='model'>
            <ModelRatioSettings options={inputs} refresh={onRefresh} />
          </Tabs.TabPane>
          <Tabs.TabPane tab={t('可视化倍率设置')} itemKey='visual'>
            <ModelSettingsVisualEditor options={inputs} refresh={onRefresh} />
          </Tabs.TabPane>
          <Tabs.TabPane tab={t('未设置倍率模型')} itemKey='unset_models'>
            <ModelRatioNotSetEditor options={inputs} refresh={onRefresh} />
          </Tabs.TabPane>
        </Tabs>
      ),
    },
  ];

  const filteredSections = sections.filter((section) => {
    if (!normalizedFilter) return true;
    if (matchesFilter(section.title)) return true;
    return (section.keywords || []).some(matchesFilter);
  });

  const visibleKeys = filteredSections.map((section) => section.key);
  const isAllExpanded =
    visibleKeys.length > 0 &&
    visibleKeys.every((key) => activeKeys.includes(key));

  return (
    <>
      <Spin spinning={loading} size='large'>
        <Space
          style={{
            marginTop: 10,
            marginBottom: 10,
            width: '100%',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <Input
            value={filterText}
            onChange={setFilterText}
            placeholder={t('搜索设置项')}
            showClear
            style={{ width: 320, maxWidth: '100%' }}
          />
          <Space>
            <Button onClick={onRefresh}>{t('刷新')}</Button>
            <Button
              type='primary'
              onClick={() => setActiveKeys(isAllExpanded ? [] : visibleKeys)}
              disabled={visibleKeys.length === 0}
            >
              {isAllExpanded ? t('全部折叠') : t('全部展开')}
            </Button>
          </Space>
        </Space>

        <Collapse
          keepDOM
          activeKey={activeKeys}
          onChange={(keys) =>
            setActiveKeys(Array.isArray(keys) ? keys : [keys])
          }
        >
          {filteredSections.map((section) => (
            <Collapse.Panel
              header={section.title}
              itemKey={section.key}
              key={section.key}
            >
              <div style={{ paddingTop: 10 }}>{section.content}</div>
            </Collapse.Panel>
          ))}
        </Collapse>
      </Spin>
    </>
  );
};

export default OperationSetting;
