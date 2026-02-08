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
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Layout,
  Row,
  Space,
  Spin,
  Tabs,
  Tag,
} from '@douyinfe/semi-ui';
import {
  API,
  showError,
  showInfo,
  showSuccess,
  timestamp2string,
} from '../../helpers';
import { UserContext } from '../../context/User';
import { setUserData } from '../../helpers/data';
import { renderQuota } from '../../helpers/render';

const PLAN_API_PREFIX = '/api/plan';

const isPlanApiNotFound = (error) => {
  const status = error?.response?.status;
  const requestPath = String(error?.config?.url || '');
  return status === 404 && requestPath.includes(PLAN_API_PREFIX);
};

const isPlanApiUnavailable = async (error) => {
  if (!isPlanApiNotFound(error)) {
    return false;
  }
  try {
    await API.get('/api/plan/purchase');
    return false;
  } catch (probeError) {
    return probeError?.response?.status === 404;
  }
};

const getWith404Fallback = async (paths) => {
  let lastError = null;
  for (const path of paths) {
    try {
      return await API.get(path);
    } catch (error) {
      lastError = error;
      if (error?.response?.status !== 404) {
        throw error;
      }
    }
  }
  throw lastError;
};

const showRequestError = (error, fallbackMessage) => {
  const dataMessage = String(error?.response?.data?.message || '');
  const dataErrorMessage = String(error?.response?.data?.error?.message || '');
  const resolvedMessage = dataMessage || dataErrorMessage;

  if (resolvedMessage) {
    showError(resolvedMessage);
    return;
  }
  if (error) {
    showError(error);
    return;
  }
  showError(fallbackMessage);
};

const PackageCenter = () => {
  const [, userDispatch] = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [planApiAvailable, setPlanApiAvailable] = useState(true);
  const [plans, setPlans] = useState([]);
  const [orders, setOrders] = useState([]);
  const [balance, setBalance] = useState({
    quota: 0,
    subscription_quota: 0,
  });
  const [purchasingPlanId, setPurchasingPlanId] = useState(0);

  const loadPlans = useCallback(async () => {
    try {
      const res = await getWith404Fallback(['/api/plan/', '/api/plan']);
      const { success, data, message } = res?.data || {};
      if (!success) {
        throw new Error(message || '加载套餐失败');
      }
      setPlans(Array.isArray(data) ? data : []);
      return true;
    } catch (error) {
      if (await isPlanApiUnavailable(error)) {
        setPlans([]);
        return false;
      }
      throw error;
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const res = await getWith404Fallback([
        '/api/plan/self?p=1&page_size=20',
        '/api/plan/self/?p=1&page_size=20',
      ]);
      const { success, data, message } = res?.data || {};
      if (!success) {
        throw new Error(message || '加载我的套餐失败');
      }
      setOrders(Array.isArray(data?.items) ? data.items : []);
      return true;
    } catch (error) {
      if (await isPlanApiUnavailable(error)) {
        setOrders([]);
        return false;
      }
      throw error;
    }
  }, []);

  const loadBalance = useCallback(async () => {
    const res = await API.get('/api/user/self');
    const { success, data, message } = res?.data || {};
    if (!success || !data) {
      throw new Error(message || '加载账户余额失败');
    }
    userDispatch({ type: 'login', payload: data });
    setUserData(data);
    setBalance({
      quota: data.quota || 0,
      subscription_quota: data.subscription_quota || 0,
    });
  }, [userDispatch]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansResult, ordersResult, balanceResult] = await Promise.allSettled([
        loadPlans(),
        loadOrders(),
        loadBalance(),
      ]);

      const plansApiMissing =
        plansResult.status === 'fulfilled'
          ? plansResult.value === false
          : await isPlanApiUnavailable(plansResult.reason);
      const ordersApiMissing =
        ordersResult.status === 'fulfilled'
          ? ordersResult.value === false
          : await isPlanApiUnavailable(ordersResult.reason);

      if (plansResult.status === 'rejected' && !plansApiMissing) {
        throw plansResult.reason;
      }
      if (ordersResult.status === 'rejected' && !ordersApiMissing) {
        throw ordersResult.reason;
      }
      if (balanceResult.status === 'rejected') {
        throw balanceResult.reason;
      }

      const unavailable = plansApiMissing || ordersApiMissing;
      setPlanApiAvailable(!unavailable);
      if (unavailable) {
        showInfo('当前服务端未启用套餐中心功能');
      }
    } catch (error) {
      showRequestError(error, '加载套餐中心失败');
    } finally {
      setLoading(false);
    }
  }, [loadBalance, loadOrders, loadPlans]);

  const purchasePlan = async (planId) => {
    if (!planApiAvailable) {
      showInfo('当前服务端未启用套餐购买功能');
      return;
    }

    setPurchasingPlanId(planId);
    try {
      const res = await API.post('/api/plan/purchase', { plan_id: planId });
      const { success, message } = res?.data || {};
      if (!success) {
        showError(message || '购买套餐失败');
        return;
      }
      showSuccess(message || '套餐购买成功');
      await Promise.all([loadOrders(), loadBalance()]);
    } catch (error) {
      if (await isPlanApiUnavailable(error)) {
        setPlanApiAvailable(false);
        setPlans([]);
        setOrders([]);
        showInfo('当前服务端未启用套餐购买功能');
        return;
      }
      showRequestError(error, '购买套餐失败');
    } finally {
      setPurchasingPlanId(0);
    }
  };

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <Layout className='package-center-page'>
      <Layout.Header style={{ padding: 0, background: 'transparent' }}>
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>套餐中心</h3>
      </Layout.Header>
      <Layout.Content style={{ marginTop: 14 }}>
        <Spin spinning={loading}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Card>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>按量余额</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  {renderQuota(balance.quota || 0)}
                </div>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>套餐余额</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  {renderQuota(balance.subscription_quota || 0)}
                </div>
              </Card>
            </Col>
          </Row>

          <Card style={{ marginTop: 16 }}>
            {!planApiAvailable ? (
              <Empty description='当前后端未启用套餐中心功能' />
            ) : (
              <Tabs type='line' defaultActiveKey='buy'>
                <Tabs.TabPane tab='购买套餐' itemKey='buy'>
                  {plans.length === 0 ? (
                    <Empty description='暂无可购买套餐' />
                  ) : (
                    <Row gutter={16}>
                      {plans.map((plan) => (
                        <Col key={plan.id} xs={24} md={12} xl={8} style={{ marginBottom: 16 }}>
                          <Card>
                            <div
                              style={{
                                marginBottom: 10,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <div style={{ fontWeight: 700, fontSize: 16 }}>{plan.name}</div>
                              <Tag color='grey'>{plan.status === 1 ? '上架' : '下架'}</Tag>
                            </div>
                            <Space vertical align='start' spacing='tight' style={{ width: '100%' }}>
                              <div style={{ color: 'var(--semi-color-text-1)' }}>
                                {plan.description || '暂无描述'}
                              </div>
                              <div>有效期：{plan.duration_days > 0 ? `${plan.duration_days} 天` : '永久不过期'}</div>
                              <div>每日额度：{plan.daily_quota > 0 ? renderQuota(plan.daily_quota) : '不限'}</div>
                              <div>总额度：{renderQuota(plan.total_quota || 0)}</div>
                              <div>价格：{renderQuota(plan.price || 0)}</div>
                              <Button
                                type='primary'
                                block
                                loading={purchasingPlanId === plan.id}
                                disabled={plan.status !== 1}
                                onClick={() => purchasePlan(plan.id)}
                              >
                                立即购买
                              </Button>
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </Tabs.TabPane>
                <Tabs.TabPane tab='我的套餐' itemKey='mine'>
                  {orders.length === 0 ? (
                    <Empty description='暂无已购套餐' />
                  ) : (
                    <Row gutter={16}>
                      {orders.map((order) => (
                        <Col key={order.id} xs={24} xl={12} style={{ marginBottom: 16 }}>
                          <Card>
                            <div
                              style={{
                                marginBottom: 10,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <div style={{ fontWeight: 700, fontSize: 16 }}>{order.plan_name}</div>
                              <Tag color='grey'>{order.status === 1 ? '生效中' : '已过期'}</Tag>
                            </div>
                            <Space vertical align='start' spacing='tight'>
                              <div>发放额度：{renderQuota(order.granted_quota || 0)}</div>
                              <div>价格：{renderQuota(order.price || 0)}</div>
                              <div>开始时间：{timestamp2string(order.start_time)}</div>
                              <div>结束时间：{order.expire_time > 0 ? timestamp2string(order.expire_time) : '永久'}</div>
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </Tabs.TabPane>
              </Tabs>
            )}
          </Card>
        </Spin>
      </Layout.Content>
    </Layout>
  );
};

export default PackageCenter;
