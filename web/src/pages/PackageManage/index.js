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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
} from '@douyinfe/semi-ui';
import { API, showError, showSuccess, timestamp2string } from '../../helpers';
import { renderQuota } from '../../helpers/render';

const emptyForm = {
  id: 0,
  name: '',
  description: '',
  price: 0,
  total_quota: 500000,
  daily_quota: 0,
  duration_days: 30,
  status: 1,
  sort_order: 0,
};

const PackageManage = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [plans, setPlans] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editing, setEditing] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/plan/admin/');
      const { success, data, message } = res?.data || {};
      if (!success) {
        showError(message || '加载套餐失败');
        return;
      }
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      showError(error?.response?.data?.message || error?.message || '加载套餐失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const openCreateModal = () => {
    setEditing(false);
    setFormData(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditing(true);
    setFormData({
      id: record.id,
      name: record.name || '',
      description: record.description || '',
      price: record.price || 0,
      total_quota: record.total_quota || 0,
      daily_quota: record.daily_quota || 0,
      duration_days: record.duration_days || 0,
      status: record.status ?? 1,
      sort_order: record.sort_order || 0,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setFormData(emptyForm);
    setEditing(false);
  };

  const savePlan = async () => {
    if (!String(formData.name || '').trim()) {
      showError('套餐名称不能为空');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        name: String(formData.name || '').trim(),
      };
      const res = editing
        ? await API.put('/api/plan/admin/', payload)
        : await API.post('/api/plan/admin/', payload);
      const { success, message } = res?.data || {};
      if (!success) {
        showError(message || '保存套餐失败');
        return;
      }
      showSuccess(editing ? '套餐更新成功' : '套餐创建成功');
      closeModal();
      await loadPlans();
    } catch (error) {
      showError(error?.response?.data?.message || error?.message || '保存套餐失败');
    } finally {
      setSubmitting(false);
    }
  };

  const deletePlan = (record) => {
    Modal.confirm({
      title: '删除套餐',
      content: `确认删除“${record.name}”吗？删除后会自动退款并清除该套餐余额。`,
      onOk: async () => {
        try {
          const res = await API.delete(`/api/plan/admin/${record.id}`);
          const { success, message } = res?.data || {};
          if (!success) {
            showError(message || '删除套餐失败');
            return;
          }
          showSuccess('套餐删除成功');
          await loadPlans();
        } catch (error) {
          showError(error?.response?.data?.message || error?.message || '删除套餐失败');
        }
      },
    });
  };

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id' },
      { title: '名称', dataIndex: 'name' },
      {
        title: '价格',
        dataIndex: 'price',
        render: (value) => renderQuota(value || 0),
      },
      {
        title: '总额度',
        dataIndex: 'total_quota',
        render: (value) => renderQuota(value || 0),
      },
      {
        title: '每日额度',
        dataIndex: 'daily_quota',
        render: (value) => (value > 0 ? renderQuota(value) : '不限'),
      },
      {
        title: '有效期',
        dataIndex: 'duration_days',
        render: (value) => (value > 0 ? `${value} 天` : '永久'),
      },
      {
        title: '状态',
        dataIndex: 'status',
        render: (value) => <Tag color='grey'>{value === 1 ? '上架' : '下架'}</Tag>,
      },
      {
        title: '更新时间',
        dataIndex: 'updated_time',
        render: (value) => (value > 0 ? timestamp2string(value) : '-'),
      },
      {
        title: '操作',
        dataIndex: 'operate',
        render: (_, record) => (
          <Space>
            <Button size='small' onClick={() => openEditModal(record)}>
              编辑
            </Button>
            <Button size='small' type='danger' onClick={() => deletePlan(record)}>
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [],
  );

  return (
    <Layout className='package-manage-page'>
      <Layout.Header style={{ padding: 0, background: 'transparent' }}>
        <Space>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>管理套餐</h3>
          <Button type='primary' onClick={openCreateModal}>
            新建套餐
          </Button>
        </Space>
      </Layout.Header>
      <Layout.Content style={{ marginTop: 14 }}>
        <Table
          loading={loading}
          columns={columns}
          dataSource={plans}
          rowKey='id'
          pagination={false}
          empty={<Empty description='暂无套餐' />}
        />

        <Modal
          title={editing ? '编辑套餐' : '新建套餐'}
          visible={modalVisible}
          onCancel={closeModal}
          onOk={savePlan}
          confirmLoading={submitting}
          width={640}
        >
          <Form layout='vertical'>
            <Form.Input
              label='名称'
              value={formData.name}
              onChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
            />
            <Form.TextArea
              label='描述'
              value={formData.description}
              onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
              autosize
            />
            <Form.Slot>
              <Space style={{ width: '100%' }}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  value={formData.price}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, price: Number(value) || 0 }))
                  }
                  prefix='价格'
                />
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  value={formData.total_quota}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, total_quota: Number(value) || 0 }))
                  }
                  prefix='总额度'
                />
              </Space>
            </Form.Slot>
            <Form.Slot>
              <Space style={{ width: '100%' }}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  value={formData.daily_quota}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, daily_quota: Number(value) || 0 }))
                  }
                  prefix='每日额度'
                />
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  value={formData.duration_days}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, duration_days: Number(value) || 0 }))
                  }
                  prefix='有效期天数'
                />
              </Space>
            </Form.Slot>
            <Form.Slot>
              <Space style={{ width: '100%' }}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  value={formData.sort_order}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, sort_order: Number(value) || 0 }))
                  }
                  prefix='排序'
                />
                <Input
                  value={formData.status === 1 ? '上架' : '下架'}
                  disabled
                  prefix='状态'
                  suffix={
                    <Switch
                      checked={formData.status === 1}
                      onChange={(checked) =>
                        setFormData((prev) => ({ ...prev, status: checked ? 1 : 0 }))
                      }
                    />
                  }
                />
              </Space>
            </Form.Slot>
          </Form>
        </Modal>
      </Layout.Content>
    </Layout>
  );
};

export default PackageManage;
