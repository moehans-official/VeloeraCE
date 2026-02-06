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
import React from 'react';
import { Modal, Form } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

const WeChatLoginModal = ({
  visible,
  onOk,
  onCancel,
  status,
  inputs,
  handleChange,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={t('微信扫码登录')}
      visible={visible}
      maskClosable={true}
      onOk={onOk}
      onCancel={onCancel}
      okText={t('登录')}
      size={'small'}
      centered={true}
    >
      <div
        style={{
          display: 'flex',
          alignItem: 'center',
          flexDirection: 'column',
        }}
      >
        <img src={status.wechat_qrcode} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p>
          {t(
            '微信扫码关注公众号，输入「验证码」获取验证码（三分钟内有效）',
          )}
        </p>
      </div>
      <Form size='large'>
        <Form.Input
          field={'wechat_verification_code'}
          placeholder={t('验证码')}
          label={t('验证码')}
          value={inputs.wechat_verification_code}
          onChange={(value) =>
            handleChange('wechat_verification_code', value)
          }
        />
      </Form>
    </Modal>
  );
};

export default WeChatLoginModal;