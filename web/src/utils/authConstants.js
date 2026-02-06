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

// Telegram login fields
export const TELEGRAM_LOGIN_FIELDS = [
  'id',
  'first_name',
  'last_name',
  'username',
  'photo_url',
  'auth_date',
  'hash',
  'lang',
];

// Common form styles
export const FORM_STYLES = {
  container: {
    justifyContent: 'center',
    display: 'flex',
    marginTop: 120,
  },
  card: {
    width: 500,
  },
  linkContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  thirdPartyContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 20,
  },
  telegramContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 5,
  },
  turnstileContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 20,
  },
  wechatModalContent: {
    display: 'flex',
    alignItem: 'center',
    flexDirection: 'column',
  },
  wechatModalText: {
    textAlign: 'center',
  },
};

// Common validation messages
export const VALIDATION_MESSAGES = {
  TURNSTILE_WAIT: '请稍后几秒重试，Turnstile 正在检查用户环境！',
  LOGIN_SUCCESS: '登录成功！',
  REGISTER_SUCCESS: '注册成功！',
  PASSWORD_TOO_SHORT: '密码长度不得小于 8 位！',
  PASSWORD_MISMATCH: '两次输入的密码不一致',
  MISSING_CREDENTIALS: '请输入用户名和密码！',
  VERIFICATION_CODE_SENT: '验证码发送成功，请检查你的邮箱！',
  DEFAULT_PASSWORD_WARNING: '您正在使用默认密码！',
  CHANGE_DEFAULT_PASSWORD: '请立刻修改默认密码！',
  SESSION_EXPIRED: '未登录或登录已过期，请重新登录',
};

// Helper functions
export const getAffCode = () => {
  let statusFromStorage = localStorage.getItem('status');
  if (statusFromStorage) {
    statusFromStorage = JSON.parse(statusFromStorage);
    if (statusFromStorage.aff_enabled === true) {
      let affCode = new URLSearchParams(window.location.search).get('aff');
      if (affCode) {
        localStorage.setItem('aff', affCode);
        return affCode;
      }
      return localStorage.getItem('aff');
    }
  }
  return null;
};

export const getStoredStatus = () => {
  let status = localStorage.getItem('status');
  return status ? JSON.parse(status) : {};
};