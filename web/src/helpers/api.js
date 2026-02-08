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
import { getUserIdFromLocalStorage } from './utils';
import axios from 'axios';

const getServerBaseURL = () =>
  import.meta.env.VITE_REACT_APP_SERVER_URL
    ? import.meta.env.VITE_REACT_APP_SERVER_URL
    : '';

const isAbsoluteUrl = (url) => /^https?:\/\//i.test(url || '');

const normalizeApiUrl = (url, baseURL) => {
  if (typeof url !== 'string' || url.length === 0 || isAbsoluteUrl(url)) {
    return url;
  }

  if (url.startsWith('/api/api/')) {
    return url.replace('/api/api/', '/api/');
  }

  const normalizedBaseURL = String(baseURL || '').replace(/\/+$/, '');
  if (normalizedBaseURL.endsWith('/api') && url.startsWith('/api/')) {
    return url.slice(4);
  }

  return url;
};

const attachInterceptors = (client) => {
  client.interceptors.request.use((config) => {
    const baseURL = config?.baseURL || client.defaults.baseURL || '';
    return {
      ...config,
      url: normalizeApiUrl(config?.url, baseURL),
    };
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        window.localStorage.removeItem('user');
        const returnTo = encodeURIComponent(
          window.location.pathname + window.location.search,
        );
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = `/login?expired=true&returnTo=${returnTo}`;
        }
      }
      return Promise.reject(error);
    },
  );

  return client;
};

const createApiClient = () =>
  attachInterceptors(
    axios.create({
      baseURL: getServerBaseURL(),
      headers: {
        'Veloera-User': getUserIdFromLocalStorage(),
        'Cache-Control': 'no-store',
      },
    }),
  );

export let API = createApiClient();

export function updateAPI() {
  API = createApiClient();
}
