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
import React, { useContext, useEffect, useRef, useState } from 'react';
import { initVChartSemiTheme } from '@visactor/vchart-semi-theme';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Card,
  Col,
  Form,
  Layout,
  Row,
  Spin,
  Tabs,
} from '@douyinfe/semi-ui';
import {
  IconBolt,
  IconCalendarClock,
  IconGift,
  IconHistogram,
  IconInherit,
  IconKey,
  IconNoteMoneyStroked,
  IconPriceTag,
  IconRefresh,
  IconSearch,
} from '@douyinfe/semi-icons';
import { VChart } from '@visactor/react-vchart';
import {
  API,
  isAdmin,
  showError,
  timestamp2string,
  timestamp2string1,
} from '../../helpers';
import {
  getQuotaWithUnit,
  modelColorMap,
  renderNumber,
  renderQuota,
  modelToColor,
} from '../../helpers/render';
import { UserContext } from '../../context/User/index.js';
import { StyleContext } from '../../context/Style/index.js';
import { useTranslation } from 'react-i18next';

const getGreetingByHour = (hour, t) => {
  if (hour < 6) return t('凌晨好');
  if (hour < 12) return t('早上好');
  if (hour < 18) return t('下午好');
  return t('晚上好');
};

const cardStyle = {
  borderRadius: 14,
  border: '1px solid var(--semi-color-border)',
  boxShadow: 'var(--velo-shadow-xs)',
  height: '100%',
};

const cardTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 14,
  fontWeight: 650,
  fontSize: 17,
};

const metricRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 14,
};

const metricLeftStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const metricIconStyle = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const metricLabelStyle = {
  fontSize: 14,
  color: 'var(--semi-color-text-1)',
  lineHeight: '18px',
};

const metricValueStyle = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--semi-color-text-0)',
  lineHeight: '26px',
};

const roundActionButtonStyle = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: '1px solid var(--semi-color-border)',
};

const biCardStyle = {
  marginTop: 20,
  borderRadius: 16,
  border: '1px solid var(--velo-glass-border-strong)',
  background: 'var(--velo-panel-bg)',
  boxShadow: 'var(--velo-shadow-xs), var(--velo-glass-highlight)',
};

const biStatGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 10,
  marginBottom: 12,
};

const biStatItemStyle = {
  borderRadius: 12,
  border: '1px solid var(--semi-color-border)',
  background:
    'linear-gradient(180deg, rgba(var(--semi-color-primary-rgb), 0.06) 0%, rgba(var(--semi-color-primary-rgb), 0.02) 100%)',
  padding: '10px 12px',
  minHeight: 68,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

const biStatLabelStyle = {
  fontSize: 12,
  color: 'var(--semi-color-text-2)',
  marginBottom: 6,
  lineHeight: '16px',
};

const biStatValueStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--semi-color-text-0)',
  lineHeight: '22px',
};

const biChartPanelStyle = {
  borderRadius: 14,
  border: '1px solid var(--semi-color-border)',
  background:
    'linear-gradient(180deg, rgba(var(--semi-color-primary-rgb), 0.08) 0%, rgba(var(--semi-color-primary-rgb), 0.02) 100%)',
  padding: '8px 8px 2px',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.35)',
};

const metricIconColor = 'var(--semi-color-text-0)';
const metricIconBg = 'var(--semi-color-fill-1)';

const Detail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formRef = useRef();
  let now = new Date();
  const [userState, userDispatch] = useContext(UserContext);
  const [styleState] = useContext(StyleContext);
  const [dashboardUser, setDashboardUser] = useState(null);
  const [inputs, setInputs] = useState({
    username: '',
    token_name: '',
    model_name: '',
    start_timestamp:
      localStorage.getItem('data_export_default_time') === 'hour'
        ? timestamp2string(now.getTime() / 1000 - 86400)
        : localStorage.getItem('data_export_default_time') === 'week'
          ? timestamp2string(now.getTime() / 1000 - 86400 * 30)
          : timestamp2string(now.getTime() / 1000 - 86400 * 7),
    end_timestamp: timestamp2string(now.getTime() / 1000 + 3600),
    channel: '',
    data_export_default_time: '',
  });
  const { username, start_timestamp, end_timestamp } = inputs;
  const isAdminUser = isAdmin();
  const initialized = useRef(false);
  const [loading, setLoading] = useState(false);
  const [activeBiTab, setActiveBiTab] = useState('1');
  const [, setQuotaData] = useState([]);
  const [consumeQuota, setConsumeQuota] = useState(0);
  const [consumeTokens, setConsumeTokens] = useState(0);
  const [times, setTimes] = useState(0);
  const [dataExportDefaultTime, setDataExportDefaultTime] = useState(
    localStorage.getItem('data_export_default_time') || 'hour',
  );
  const [pieData, setPieData] = useState([{ type: 'null', value: '0' }]);
  const [lineData, setLineData] = useState([]);
  const [spec_pie, setSpecPie] = useState({
    type: 'pie',
    data: [
      {
        id: 'id0',
        values: pieData,
      },
    ],
    outerRadius: 0.78,
    innerRadius: 0.58,
    padAngle: 0.9,
    padding: {
      top: 10,
      right: 16,
      bottom: 36,
      left: 16,
    },
    valueField: 'value',
    categoryField: 'type',
    pie: {
      style: {
        cornerRadius: 8,
        stroke: 'var(--semi-color-bg-0)',
        lineWidth: 1,
      },
      state: {
        hover: {
          outerRadius: 0.83,
          stroke: 'var(--semi-color-text-0)',
          lineWidth: 1.5,
        },
        selected: {
          outerRadius: 0.84,
          stroke: 'var(--semi-color-text-0)',
          lineWidth: 1.5,
        },
      },
    },
    title: {
      visible: true,
      text: t('模型调用次数占比'),
      subtext: `${t('总计')}: ${renderNumber(times)}`,
    },
    legends: {
      visible: true,
      orient: 'bottom',
      item: {
        shape: {
          style: {
            symbolType: 'circle',
          },
        },
      },
    },
    label: {
      visible: true,
      style: {
        fontSize: 11,
        fill: 'var(--semi-color-text-1)',
      },
    },
    tooltip: {
      mark: {
        content: [
          {
            key: (datum) => datum['type'],
            value: (datum) => renderNumber(datum['value']),
          },
        ],
      },
    },
    color: {
      specified: modelColorMap,
    },
    animationAppear: {
      duration: 420,
      easing: 'cubicOut',
    },
  });
  const [spec_line, setSpecLine] = useState({
    type: 'bar',
    data: [
      {
        id: 'barData',
        values: lineData,
      },
    ],
    xField: 'Time',
    yField: 'Usage',
    seriesField: 'Model',
    stack: true,
    padding: {
      top: 10,
      right: 18,
      bottom: 46,
      left: 12,
    },
    legends: {
      visible: true,
      orient: 'bottom',
      selectMode: 'multiple',
    },
    title: {
      visible: true,
      text: t(''),
      subtext: `${t('总计')}: ${renderQuota(consumeQuota, 2)}`,
    },
    bar: {
      style: {
        cornerRadius: [6, 6, 0, 0],
      },
      state: {
        hover: {
          stroke: 'var(--semi-color-text-0)',
          lineWidth: 1,
        },
      },
    },
    axes: [
      {
        orient: 'bottom',
        tick: {
          visible: false,
        },
        domainLine: {
          style: {
            stroke: 'var(--semi-color-border)',
          },
        },
        label: {
          style: {
            fill: 'var(--semi-color-text-2)',
            fontSize: 11,
          },
        },
        grid: {
          visible: false,
        },
      },
      {
        orient: 'left',
        domainLine: {
          visible: false,
        },
        label: {
          style: {
            fill: 'var(--semi-color-text-2)',
            fontSize: 11,
          },
        },
        grid: {
          style: {
            stroke: 'var(--semi-color-fill-1)',
            lineDash: [4, 4],
          },
        },
      },
    ],
    tooltip: {
      mark: {
        content: [
          {
            key: (datum) => datum['Model'],
            value: (datum) => renderQuota(datum['rawQuota'] || 0, 4),
          },
        ],
      },
      dimension: {
        content: [
          {
            key: (datum) => datum['Model'],
            value: (datum) => datum['rawQuota'] || 0,
          },
        ],
        updateContent: (array) => {
          array.sort((a, b) => b.value - a.value);
          let sum = 0;
          for (let i = 0; i < array.length; i++) {
            if (array[i].key == '其他') {
              continue;
            }
            let value = parseFloat(array[i].value);
            if (isNaN(value)) {
              value = 0;
            }
            if (array[i].datum && array[i].datum.TimeSum) {
              sum = array[i].datum.TimeSum;
            }
            array[i].value = renderQuota(value, 4);
          }
          array.unshift({
            key: t('总计'),
            value: renderQuota(sum, 4),
          });
          return array;
        },
      },
    },
    color: {
      specified: modelColorMap,
    },
    animationAppear: {
      duration: 420,
      easing: 'cubicOut',
    },
  });

  // 模型 -> 颜色 映射
  const [modelColors, setModelColors] = useState({});

  const handleInputChange = (value, name) => {
    if (name === 'data_export_default_time') {
      setDataExportDefaultTime(value);
      return;
    }
    setInputs((inputs) => ({ ...inputs, [name]: value }));
  };

  const loadQuotaData = async () => {
    setLoading(true);
    try {
      let url = '';
      const parsedStartTimestamp = Date.parse(start_timestamp);
      const parsedEndTimestamp = Date.parse(end_timestamp);
      const nowTimestamp = Math.floor(Date.now() / 1000);
      const localStartTimestamp = Number.isFinite(parsedStartTimestamp)
        ? Math.floor(parsedStartTimestamp / 1000)
        : nowTimestamp - 7 * 24 * 60 * 60;
      const localEndTimestamp = Number.isFinite(parsedEndTimestamp)
        ? Math.floor(parsedEndTimestamp / 1000)
        : nowTimestamp;
      if (isAdminUser) {
        url = `/api/data/?username=${username}&start_timestamp=${localStartTimestamp}&end_timestamp=${localEndTimestamp}&default_time=${dataExportDefaultTime}`;
      } else {
        url = `/api/data/self/?start_timestamp=${localStartTimestamp}&end_timestamp=${localEndTimestamp}&default_time=${dataExportDefaultTime}`;
      }
      const res = await API.get(url);
      const { success, message, data } = res.data;
      if (success) {
        setQuotaData(data);
        if (data.length === 0) {
          data.push({
            count: 0,
            model_name: t(''),
            quota: 0,
            token_used: 0,
            created_at: now.getTime() / 1000,
          });
        }
        // sort created_at
        data.sort((a, b) => a.created_at - b.created_at);
        updateChartData(data);
      } else {
        showError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadQuotaData();
  };

  const initChart = async () => {
    await loadQuotaData();
  };

  const updateChartData = (data) => {
    let newPieData = [];
    let newLineData = [];
    let totalQuota = 0;
    let totalTimes = 0;
    let uniqueModels = new Set();
    let totalTokens = 0;
    const normalizeNumber = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    // Collect unique model names.
    data.forEach((item) => {
      uniqueModels.add(item.model_name || t('未知模型'));
      totalTokens += normalizeNumber(item.token_used);
      totalQuota += normalizeNumber(item.quota);
      totalTimes += normalizeNumber(item.count);
    });

    // 澶勭悊棰滆壊鏄犲皠
    const newModelColors = {};
    Array.from(uniqueModels).forEach((modelName) => {
      newModelColors[modelName] =
        modelColorMap[modelName] ||
        modelColors[modelName] ||
        modelToColor(modelName);
    });
    setModelColors(newModelColors);

    // 鎸夋椂闂村拰妯″瀷鑱氬悎鏁版嵁
    let aggregatedData = new Map();
    data.forEach((item) => {
      const timeKey = timestamp2string1(item.created_at, dataExportDefaultTime);
      const modelKey = item.model_name || t('未知模型');
      const key = `${timeKey}-${modelKey}`;

      if (!aggregatedData.has(key)) {
        aggregatedData.set(key, {
          time: timeKey,
          model: modelKey,
          quota: 0,
          count: 0,
        });
      }

      const existing = aggregatedData.get(key);
      existing.quota += normalizeNumber(item.quota);
      existing.count += normalizeNumber(item.count);
    });

    // 澶勭悊楗煎浘鏁版嵁
    let modelTotals = new Map();
    for (let [_, value] of aggregatedData) {
      if (!modelTotals.has(value.model)) {
        modelTotals.set(value.model, 0);
      }
      modelTotals.set(value.model, modelTotals.get(value.model) + value.count);
    }

    newPieData = Array.from(modelTotals).map(([model, count]) => ({
      type: model,
      value: count,
    }));

    // Build timeline points.
    let timePoints = Array.from(
      new Set([...aggregatedData.values()].map((d) => d.time)),
    );
    if (timePoints.length < 7) {
      const createdAtList = data
        .map((item) => Number(item.created_at))
        .filter((item) => Number.isFinite(item));
      const lastTime =
        createdAtList.length > 0
          ? Math.max(...createdAtList)
          : Math.floor(Date.now() / 1000);
      const interval =
        dataExportDefaultTime === 'hour'
          ? 3600
          : dataExportDefaultTime === 'day'
            ? 86400
            : 604800;

      timePoints = Array.from({ length: 7 }, (_, i) =>
        timestamp2string1(lastTime - (6 - i) * interval, dataExportDefaultTime),
      );
    }

    // Build bar chart data.
    timePoints.forEach((time) => {
      // 涓烘瘡涓椂闂寸偣鏀堕泦鎵€鏈夋ā鍨嬬殑鏁版嵁
      let timeData = Array.from(uniqueModels).map((model) => {
        const key = `${time}-${model}`;
        const aggregated = aggregatedData.get(key);
        return {
          Time: time,
          Model: model,
          rawQuota: normalizeNumber(aggregated?.quota),
          Usage: aggregated?.quota
            ? getQuotaWithUnit(normalizeNumber(aggregated.quota), 4)
            : 0,
        };
      });

      // 璁＄畻璇ユ椂闂寸偣鐨勬€昏
      const timeSum = timeData.reduce((sum, item) => sum + item.rawQuota, 0);

      // 鎸夌収 rawQuota 浠庡ぇ鍒板皬鎺掑簭
      timeData.sort((a, b) => b.rawQuota - a.rawQuota);

      // 涓烘瘡涓暟鎹偣娣诲姞璇ユ椂闂寸殑鎬昏
      timeData = timeData.map((item) => ({
        ...item,
        TimeSum: timeSum,
      }));

      // 灏嗘帓搴忓悗鐨勬暟鎹坊鍔犲埌 newLineData
      newLineData.push(...timeData);
    });

    // 鎺掑簭
    newPieData.sort((a, b) => b.value - a.value);
    newLineData.sort((a, b) => a.Time.localeCompare(b.Time));

    // Update chart config and data.
    setSpecPie((prev) => ({
      ...prev,
      data: [{ id: 'id0', values: newPieData }],
      title: {
        ...prev.title,
        subtext: `${t('总计')}: ${renderNumber(totalTimes)}`,
      },
      color: {
        specified: newModelColors,
      },
    }));

    setSpecLine((prev) => ({
      ...prev,
      data: [{ id: 'barData', values: newLineData }],
      title: {
        ...prev.title,
        subtext: `${t('总计')}: ${renderQuota(totalQuota, 2)}`,
      },
      color: {
        specified: newModelColors,
      },
    }));

    setPieData(newPieData);
    setLineData(newLineData);
    setConsumeQuota(totalQuota);
    setTimes(totalTimes);
    setConsumeTokens(totalTokens);
  };

  const getUserData = async () => {
    let res = await API.get(`/api/user/self`);
    const { success, message, data } = res.data;
    if (success) {
      setDashboardUser(data);
      userDispatch({ type: 'login', payload: data });
    } else {
      showError(message);
    }
  };

  useEffect(() => {
    getUserData();
    if (!initialized.current) {
      initVChartSemiTheme({
        isWatchingThemeSwitch: true,
      });
      initialized.current = true;
      initChart();
    }
  }, []);

  const parsedStart = Date.parse(start_timestamp);
  const parsedEnd = Date.parse(end_timestamp);
  const durationMinutes = Math.max(
    Number.isFinite(parsedEnd) && Number.isFinite(parsedStart)
      ? (parsedEnd - parsedStart) / 60000
      : 0,
    1,
  );
  const averageRpmRaw = Number(times) / durationMinutes;
  const averageTpmRaw = Number(consumeTokens) / durationMinutes;
  const averageRpm = Number.isFinite(averageRpmRaw)
    ? averageRpmRaw.toFixed(3)
    : '0.000';
  const averageTpm = Number.isFinite(averageTpmRaw)
    ? averageTpmRaw.toFixed(3)
    : '0.000';
  const biChartHeight = styleState.isMobile ? 360 : 500;
  const totalQuotaText = renderQuota(consumeQuota, 2);
  const totalTimesText = renderNumber(times);
  const totalTokensText = renderNumber(consumeTokens);
  const currentUser = dashboardUser || userState?.user;
  const usernameForGreeting =
    currentUser?.display_name || currentUser?.username || t('用户');
  const greetingText = `${getGreetingByHour(now.getHours(), t)}, ${usernameForGreeting}`;

  const renderMetricRow = (icon, iconBgColor, label, value, action) => (
    <div style={metricRowStyle}>
      <div style={metricLeftStyle}>
        <div style={{ ...metricIconStyle, backgroundColor: iconBgColor }}>
          {icon}
        </div>
        <div>
          <div style={metricLabelStyle}>{label}</div>
          <div style={metricValueStyle}>{value}</div>
        </div>
      </div>
      {action || null}
    </div>
  );

  return (
    <>
      <Layout>
        <Layout.Header style={{ padding: 0, background: 'transparent' }}>
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: styleState.isMobile ? 22 : 28,
                fontWeight: 750,
              }}
            >
              {greetingText}
            </h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button
                icon={<IconSearch />}
                theme='borderless'
                type='tertiary'
                style={roundActionButtonStyle}
                onClick={refresh}
              />
              <Button
                icon={<IconRefresh />}
                theme='borderless'
                type='tertiary'
                style={roundActionButtonStyle}
                loading={loading}
                onClick={refresh}
              />
            </div>
          </div>
        </Layout.Header>
        <Layout.Content>
          <Form ref={formRef} layout='horizontal' style={{ marginTop: 10 }}>
            <>
              <Form.DatePicker
                field='start_timestamp'
                label={t('开始时间')}
                style={{ width: 272 }}
                initValue={start_timestamp}
                value={start_timestamp}
                type='dateTime'
                name='start_timestamp'
                onChange={(value) =>
                  handleInputChange(value, 'start_timestamp')
                }
              />
              <Form.DatePicker
                field='end_timestamp'
                fluid
                label={t('结束时间')}
                style={{ width: 272 }}
                initValue={end_timestamp}
                value={end_timestamp}
                type='dateTime'
                name='end_timestamp'
                onChange={(value) => handleInputChange(value, 'end_timestamp')}
              />
              <Form.Select
                field='data_export_default_time'
                label={t('时间粒度')}
                style={{ width: 176 }}
                initValue={dataExportDefaultTime}
                placeholder={t('时间粒度')}
                name='data_export_default_time'
                optionList={[
                  { label: t('小时'), value: 'hour' },
                  { label: t('天'), value: 'day' },
                  { label: t('周'), value: 'week' },
                ]}
                onChange={(value) =>
                  handleInputChange(value, 'data_export_default_time')
                }
              ></Form.Select>
              {isAdminUser && (
                <>
                  <Form.Input
                    field='username'
                    label={t('用户名')}
                    style={{ width: 176 }}
                    value={username}
                    placeholder={t('留空则查询全部用户')}
                    name='username'
                    onChange={(value) => handleInputChange(value, 'username')}
                  />
                </>
              )}
              <Button
                label={t('查询')}
                type='primary'
                htmlType='submit'
                className='btn-margin-right'
                onClick={refresh}
                loading={loading}
                style={{ marginTop: 24 }}
              >
                {t('查询')}
              </Button>
              <Form.Section></Form.Section>
            </>
          </Form>
          <Spin spinning={loading}>
            <Row
              gutter={{ xs: 16, sm: 16, md: 16, lg: 24, xl: 24, xxl: 24 }}
              style={{ marginTop: 20 }}
              type='flex'
              justify='space-between'
            >
              <Col span={styleState.isMobile ? 24 : 6}>
                <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
                  <div style={cardTitleStyle}>
                    <IconNoteMoneyStroked size='large' />
                    <span>{t('账户数据')}</span>
                  </div>
                  {renderMetricRow(
                    <IconNoteMoneyStroked style={{ color: metricIconColor }} />,
                    metricIconBg,
                    t('当前余额'),
                    renderQuota(currentUser?.quota || 0),
                    <Button
                      size='small'
                      type='tertiary'
                      theme='borderless'
                      onClick={() => navigate('/app/wallet')}
                      style={{
                        borderRadius: 10,
                        border: '1px solid var(--semi-color-border)',
                      }}
                    >
                      {t('充值')}
                    </Button>,
                  )}
                  {renderMetricRow(
                    <IconGift style={{ color: metricIconColor }} />,
                    metricIconBg,
                    t('订阅余额'),
                    renderQuota(currentUser?.subscription_quota || 0),
                  )}
                </Card>
              </Col>
              <Col span={styleState.isMobile ? 24 : 6}>
                <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
                  <div style={cardTitleStyle}>
                    <IconCalendarClock size='large' />
                    <span>{t('使用统计')}</span>
                  </div>
                  {renderMetricRow(
                    <IconCalendarClock style={{ color: metricIconColor }} />,
                    metricIconBg,
                    t('请求次数'),
                    renderNumber(currentUser?.request_count || 0),
                  )}
                  {renderMetricRow(
                    <IconInherit style={{ color: metricIconColor }} />,
                    metricIconBg,
                    t('统计次数'),
                    renderNumber(times),
                  )}
                </Card>
              </Col>
              <Col span={styleState.isMobile ? 24 : 6}>
                <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
                  <div style={cardTitleStyle}>
                    <IconPriceTag size='large' />
                    <span>{t('')}</span>
                  </div>
                  {renderMetricRow(
                    <IconPriceTag style={{ color: metricIconColor }} />,
                    metricIconBg,
                    t('统计额度'),
                    renderQuota(consumeQuota),
                  )}
                  {renderMetricRow(
                    <IconKey style={{ color: metricIconColor }} />,
                    metricIconBg,
                    t('统计Tokens'),
                    renderNumber(consumeTokens),
                  )}
                </Card>
              </Col>
              <Col span={styleState.isMobile ? 24 : 6}>
                <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
                  <div style={cardTitleStyle}>
                    <IconBolt size='large' />
                    <span>{t('性能指标')}</span>
                  </div>
                  {renderMetricRow(
                    <IconRefresh style={{ color: metricIconColor }} />,
                    metricIconBg,
                    t('平均RPM'),
                    averageRpm,
                  )}
                  {renderMetricRow(
                    <IconBolt style={{ color: metricIconColor }} />,
                    metricIconBg,
                    t('平均TPM'),
                    averageTpm,
                  )}
                </Card>
              </Col>
            </Row>
            <Card
              style={biCardStyle}
              bodyStyle={{ padding: styleState.isMobile ? 12 : 16 }}
            >
              <Tabs
                type='line'
                activeKey={activeBiTab}
                onChange={(itemKey) => setActiveBiTab(String(itemKey))}
              >
                <Tabs.TabPane tab={t('')} itemKey='1'>
                  <div
                    style={{
                      ...biStatGridStyle,
                      gridTemplateColumns: styleState.isMobile
                        ? 'repeat(2, minmax(0, 1fr))'
                        : biStatGridStyle.gridTemplateColumns,
                    }}
                  >
                    <div style={biStatItemStyle}>
                      <div style={biStatLabelStyle}>{t('统计额度')}</div>
                      <div style={biStatValueStyle}>{totalQuotaText}</div>
                    </div>
                    <div style={biStatItemStyle}>
                      <div style={biStatLabelStyle}>{t('统计Tokens')}</div>
                      <div style={biStatValueStyle}>{totalTokensText}</div>
                    </div>
                    <div style={biStatItemStyle}>
                      <div style={biStatLabelStyle}>{t('统计次数')}</div>
                      <div style={biStatValueStyle}>{totalTimesText}</div>
                    </div>
                  </div>
                  <div style={{ ...biChartPanelStyle, height: biChartHeight }}>
                    {activeBiTab === '1' ? (
                      <VChart
                        key={`bi-line-${styleState.isMobile ? 'mobile' : 'desktop'}`}
                        spec={spec_line}
                        option={{ mode: 'desktop-browser' }}
                      />
                    ) : null}
                  </div>
                </Tabs.TabPane>
                <Tabs.TabPane tab={t('调用次数分布')} itemKey='2'>
                  <div
                    style={{
                      ...biStatGridStyle,
                      gridTemplateColumns: styleState.isMobile
                        ? 'repeat(2, minmax(0, 1fr))'
                        : 'repeat(3, minmax(0, 1fr))',
                    }}
                  >
                    <div style={biStatItemStyle}>
                      <div style={biStatLabelStyle}>{t('模型数量')}</div>
                      <div style={biStatValueStyle}>
                        {renderNumber(pieData.length)}
                      </div>
                    </div>
                    <div style={biStatItemStyle}>
                      <div style={biStatLabelStyle}>{t('')}</div>
                      <div style={biStatValueStyle}>{totalTimesText}</div>
                    </div>
                    <div style={biStatItemStyle}>
                      <div style={biStatLabelStyle}>{t('时间点数')}</div>
                      <div style={biStatValueStyle}>
                        {renderNumber(lineData.length)}
                      </div>
                    </div>
                  </div>
                  <div style={{ ...biChartPanelStyle, height: biChartHeight }}>
                    {activeBiTab === '2' ? (
                      <VChart
                        key={`bi-pie-${styleState.isMobile ? 'mobile' : 'desktop'}`}
                        spec={spec_pie}
                        option={{ mode: 'desktop-browser' }}
                      />
                    ) : null}
                  </div>
                </Tabs.TabPane>
              </Tabs>
            </Card>
          </Spin>
        </Layout.Content>
      </Layout>
    </>
  );
};

export default Detail;



