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
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Banner, Button, Spin } from '@douyinfe/semi-ui';
import {
  IconCopy,
  IconHelpCircle,
  IconKey,
  IconRefresh,
} from '@douyinfe/semi-icons';
import {
  API,
  showError,
  showNotice,
  showSuccess,
  timestamp2string,
} from '../../helpers';
import { StatusContext } from '../../context/Status';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import './home.css';

const ENDPOINT_ROTATE_INTERVAL = 2800;
const endpointPaths = [
  '/v1/chat/completions',
  '/v1/completions',
  '/v1/edits',
  '/v1/embeddings',
  '/v1/engines/{model}/embeddings',
  '/v1/moderations',
  '/v1/images/generations',
  '/v1/audio/transcriptions',
  '/v1/audio/translations',
  '/v1/audio/speech',
  '/v1/responses',
  '/v1/realtime',
  '/v1/rerank',
  '/v1/messages',
  '/v1/messages/count_tokens',
  '/v1/models',
];

const isUrlContent = (content) => /^https?:\/\//i.test(content.trim());

const isHtmlDocument = (content) => {
  const normalized = content.trim().toLowerCase();
  return normalized.startsWith('<!doctype') || normalized.startsWith('<html');
};

const Home = () => {
  const { i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [endpointIndex, setEndpointIndex] = useState(0);
  const [loadingContent, setLoadingContent] = useState(false);
  const initializedRef = useRef(false);
  const navigate = useNavigate();

  const isZh = (i18n.resolvedLanguage || i18n.language || 'zh')
    .toLowerCase()
    .startsWith('zh');

  const text = useMemo(
    () =>
      isZh
        ? {
            warning: '本站管理员可查看你的对话内容，请避免提交敏感信息。',
            eyebrow: 'Enterprise AI Gateway',
            title: '统一的模型网关控制台',
            subtitle:
              '一个入口管理模型调用、账号体系与支付能力，兼顾稳定性、可观测性和多渠道扩展。',
            getKey: '管理密钥',
            docs: '查看文档',
            copySuccess: '接口地址已复制',
            copyFail: '复制失败，请手动复制',
            loading: '正在加载首页内容...',
            refresh: '刷新',
            unknown: '未知',
            online: '在线',
            sectionRuntime: '运行状态',
            sectionAuth: '认证能力',
            sectionFeature: '平台能力',
            version: '版本',
            startTime: '启动时间',
            serverAddress: '服务地址',
            systemName: '系统名称',
            oauthCount: 'OAuth 启用',
            featureCount: '功能启用',
            authProviders: '认证提供方',
            setup: '初始化状态',
            enabled: '启用',
            disabled: '关闭',
            setupDone: '已完成',
            setupPending: '未完成',
            emailVerification: '邮箱验证',
            turnstile: 'Turnstile 验证',
            register: '新用户注册',
            github: 'GitHub 登录',
            oidc: 'OIDC 登录',
            wechat: '微信登录',
            telegram: 'Telegram 登录',
            linuxdo: 'Linux DO 登录',
            idcflare: 'IDC Flare 登录',
            drawing: '图像能力',
            task: '任务能力',
            dataExport: '数据导出',
            topup: '在线充值',
            quickActions: '快捷操作',
            openPricing: '套餐中心',
            openDashboard: '数据看板',
            openSetting: '系统设置',
          }
        : {
            warning:
              'Site administrators can review chat logs. Please avoid sharing sensitive content.',
            eyebrow: 'Enterprise AI Gateway',
            title: 'Unified Model Gateway Console',
            subtitle:
              'Manage model traffic, identity and billing from one control plane with strong reliability and observability.',
            getKey: 'Manage Keys',
            docs: 'Open Docs',
            copySuccess: 'API endpoint copied',
            copyFail: 'Copy failed, please copy manually',
            loading: 'Loading homepage content...',
            refresh: 'Refresh',
            unknown: 'Unknown',
            online: 'Online',
            sectionRuntime: 'Runtime',
            sectionAuth: 'Authentication',
            sectionFeature: 'Platform Features',
            version: 'Version',
            startTime: 'Started At',
            serverAddress: 'Server Address',
            systemName: 'System Name',
            oauthCount: 'OAuth Enabled',
            featureCount: 'Features Enabled',
            authProviders: 'Auth Providers',
            setup: 'Setup State',
            enabled: 'Enabled',
            disabled: 'Disabled',
            setupDone: 'Completed',
            setupPending: 'Pending',
            emailVerification: 'Email Verification',
            turnstile: 'Turnstile Check',
            register: 'User Registration',
            github: 'GitHub Login',
            oidc: 'OIDC Login',
            wechat: 'WeChat Login',
            telegram: 'Telegram Login',
            linuxdo: 'Linux DO Login',
            idcflare: 'IDC Flare Login',
            drawing: 'Drawing',
            task: 'Task',
            dataExport: 'Data Export',
            topup: 'Online Top-up',
            quickActions: 'Quick Actions',
            openPricing: 'Package Center',
            openDashboard: 'Dashboard',
            openSetting: 'System Settings',
          },
    [isZh],
  );

  const status = useMemo(() => {
    if (statusState?.status) {
      return statusState.status;
    }
    try {
      return JSON.parse(localStorage.getItem('status') || '{}');
    } catch (_) {
      return {};
    }
  }, [statusState?.status]);

  const oauthEnabledCount = [
    status.github_oauth,
    status.oidc_enabled,
    status.wechat_login,
    status.telegram_oauth,
    status.linuxdo_oauth,
    status.idcflare_oauth,
  ].filter(Boolean).length;

  const featureEnabledCount = [
    status.enable_drawing,
    status.enable_task,
    status.enable_data_export,
    status.enable_online_topup,
  ].filter(Boolean).length;

  const displayNotice = async () => {
    try {
      const res = await API.get('/api/notice');
      const { success, message, data } = res?.data || {};
      if (success) {
        const oldNotice = localStorage.getItem('notice');
        if (typeof data === 'string' && data !== oldNotice && data !== '') {
          showNotice(marked.parse(data), true);
          localStorage.setItem('notice', data);
        }
      } else {
        showError(message || 'Failed to load notice');
      }
    } catch (error) {
      showError(error?.response?.data?.message || 'Failed to load notice');
    }
  };

  const displayHomePageContent = async () => {
    setLoadingContent(true);
    try {
      setHomePageContent(localStorage.getItem('home_page_content') || '');
      const res = await API.get('/api/home_page_content');
      const { success, message, data } = res?.data || {};
      if (success && typeof data === 'string') {
        const content =
          isUrlContent(data) || isHtmlDocument(data)
            ? data
            : marked.parse(data);
        setHomePageContent(content);
        localStorage.setItem('home_page_content', content);
      } else {
        showError(message || 'Failed to load home page content');
        setHomePageContent('');
      }
    } catch (error) {
      showError(
        error?.response?.data?.message || 'Failed to load home page content',
      );
      setHomePageContent('');
    } finally {
      setHomePageContentLoaded(true);
      setLoadingContent(false);
    }
  };

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    displayNotice();
    displayHomePageContent();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setEndpointIndex((current) => (current + 1) % endpointPaths.length);
    }, ENDPOINT_ROTATE_INTERVAL);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!isUrlContent(homePageContent)) {
      return;
    }
    const iframe = document.querySelector('iframe.home-custom-frame');
    if (!iframe) {
      return;
    }
    const theme = localStorage.getItem('theme-mode') || 'light';
    iframe.onload = () => {
      iframe.contentWindow.postMessage({ themeMode: theme }, '*');
      iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
    };
  }, [homePageContent, i18n.language]);

  const serverAddress = status.server_address || window.location.origin;
  const normalizedServerAddress = String(serverAddress).replace(/\/+$/, '');
  const endpointPath = endpointPaths[endpointIndex];
  const endpointUrl = `${normalizedServerAddress}${endpointPath}`;
  const docsLink = status.docs_link || localStorage.getItem('docs_link') || '';
  const systemName =
    status.system_name || localStorage.getItem('system_name') || 'VeloeraCE';
  const version = status.version || text.unknown;
  const startTimeText = status.start_time
    ? timestamp2string(status.start_time)
    : text.unknown;
  const setupText = status.setup ? text.setupDone : text.setupPending;

  const handleCopyEndpoint = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(endpointUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = endpointUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      showSuccess(text.copySuccess);
    } catch (error) {
      showError(text.copyFail);
    }
  };

  const renderStatusItem = (label, enabled) => (
    <div className='home-status-item' key={label}>
      <span className='home-status-item__label'>{label}</span>
      <span
        className={`home-status-item__value ${
          enabled ? 'is-enabled' : 'is-disabled'
        }`}
      >
        {enabled ? text.enabled : text.disabled}
      </span>
    </div>
  );

  const defaultHome = (
    <section className='home-console'>
      <div className='home-console-hero'>
        <div className='home-console-hero__main'>
          <div className='home-console-eyebrow'>{text.eyebrow}</div>
          <h1 className='home-console-title'>{text.title}</h1>
          <p className='home-console-subtitle'>{text.subtitle}</p>

          <div className='home-endpoint-card' title={endpointUrl}>
            <span className='home-endpoint-card__host'>
              {normalizedServerAddress}
            </span>
            <span
              key={endpointPath}
              className='home-endpoint-card__path home-endpoint-card__path--animated'
            >
              {endpointPath}
            </span>
            <Button
              icon={<IconCopy />}
              theme='borderless'
              type='tertiary'
              onClick={handleCopyEndpoint}
            />
          </div>

          <div className='home-console-actions'>
            <Button
              type='primary'
              theme='solid'
              icon={<IconKey />}
              onClick={() => navigate('/app/tokens')}
            >
              {text.getKey}
            </Button>
            <Button
              type='tertiary'
              theme='light'
              icon={<IconHelpCircle />}
              onClick={() => {
                if (docsLink) {
                  window.open(docsLink, '_blank', 'noopener,noreferrer');
                } else {
                  navigate('/about');
                }
              }}
            >
              {text.docs}
            </Button>
            <Button
              theme='borderless'
              type='tertiary'
              icon={<IconRefresh />}
              loading={loadingContent}
              onClick={displayHomePageContent}
            >
              {text.refresh}
            </Button>
          </div>
        </div>

        <div className='home-console-hero__side'>
          <div className='home-health-card'>
            <div className='home-health-card__title'>{text.sectionRuntime}</div>
            <div className='home-health-card__line'>
              <span>{text.systemName}</span>
              <strong>{systemName}</strong>
            </div>
            <div className='home-health-card__line'>
              <span>{text.version}</span>
              <strong>{version}</strong>
            </div>
            <div className='home-health-card__line'>
              <span>{text.startTime}</span>
              <strong>{startTimeText}</strong>
            </div>
            <div className='home-health-card__line'>
              <span>{text.setup}</span>
              <strong>{setupText}</strong>
            </div>
            <div className='home-health-card__badge'>{text.online}</div>
          </div>
        </div>
      </div>

      <div className='home-console-metrics'>
        <div className='home-metric-card'>
          <div className='home-metric-card__label'>{text.serverAddress}</div>
          <div className='home-metric-card__value'>
            {normalizedServerAddress}
          </div>
        </div>
        <div className='home-metric-card'>
          <div className='home-metric-card__label'>{text.oauthCount}</div>
          <div className='home-metric-card__value'>{oauthEnabledCount}/6</div>
        </div>
        <div className='home-metric-card'>
          <div className='home-metric-card__label'>{text.featureCount}</div>
          <div className='home-metric-card__value'>{featureEnabledCount}/4</div>
        </div>
        <div className='home-metric-card'>
          <div className='home-metric-card__label'>{text.authProviders}</div>
          <div className='home-metric-card__value'>{oauthEnabledCount}</div>
        </div>
      </div>

      <div className='home-console-grid'>
        <div className='home-section-card'>
          <h3 className='home-section-card__title'>{text.sectionAuth}</h3>
          {renderStatusItem(text.emailVerification, status.email_verification)}
          {renderStatusItem(text.turnstile, status.turnstile_check)}
          {renderStatusItem(text.register, status.register_enabled)}
        </div>
        <div className='home-section-card'>
          <h3 className='home-section-card__title'>{text.authProviders}</h3>
          {renderStatusItem(text.github, status.github_oauth)}
          {renderStatusItem(text.oidc, status.oidc_enabled)}
          {renderStatusItem(text.wechat, status.wechat_login)}
          {renderStatusItem(text.telegram, status.telegram_oauth)}
          {renderStatusItem(text.linuxdo, status.linuxdo_oauth)}
          {renderStatusItem(text.idcflare, status.idcflare_oauth)}
        </div>
        <div className='home-section-card'>
          <h3 className='home-section-card__title'>{text.sectionFeature}</h3>
          {renderStatusItem(text.drawing, status.enable_drawing)}
          {renderStatusItem(text.task, status.enable_task)}
          {renderStatusItem(text.dataExport, status.enable_data_export)}
          {renderStatusItem(text.topup, status.enable_online_topup)}
          <div className='home-quick-actions'>
            <div className='home-quick-actions__label'>{text.quickActions}</div>
            <div className='home-quick-actions__buttons'>
              <Button size='small' onClick={() => navigate('/app/pricing')}>
                {text.openPricing}
              </Button>
              <Button size='small' onClick={() => navigate('/app/dashboard')}>
                {text.openDashboard}
              </Button>
              <Button size='small' onClick={() => navigate('/admin/settings')}>
                {text.openSetting}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <>
      {status.log_chat_content_enabled && (
        <Banner
          type='warning'
          description={text.warning}
          style={{ margin: '0 0 16px 0', borderRadius: '8px' }}
        />
      )}
      {!homePageContentLoaded ? (
        <section className='home-loading-wrap'>
          <Spin spinning={true}>
            <div className='home-loading-text'>{text.loading}</div>
          </Spin>
        </section>
      ) : homePageContent === '' ? (
        defaultHome
      ) : isUrlContent(homePageContent) ? (
        <iframe className='home-custom-frame' src={homePageContent} />
      ) : isHtmlDocument(homePageContent) ? (
        <iframe className='home-custom-frame' srcDoc={homePageContent} />
      ) : (
        <div
          className='home-custom-html'
          dangerouslySetInnerHTML={{ __html: homePageContent }}
        />
      )}
    </>
  );
};

export default Home;
