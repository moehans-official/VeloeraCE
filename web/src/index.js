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
import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import HeaderBar from './components/HeaderBar';
import 'semantic-ui-offline/semantic.min.css';
import './index.css';
import './styles/global.scss';
import { UserProvider } from './context/User';
import { StatusProvider } from './context/Status';
import { Layout, LocaleProvider } from '@douyinfe/semi-ui';
import zhCN from '@douyinfe/semi-ui/lib/es/locale/source/zh_CN';
import enUS from '@douyinfe/semi-ui/lib/es/locale/source/en_US';
import SiderBar from './components/SiderBar';
import { ThemeProvider } from './context/Theme';
import FooterBar from './components/Footer';
import { StyleProvider } from './context/Style/index.js';
import PageLayout from './components/PageLayout.js';
import i18n from './i18n/i18n.js';
import { suppressReactLegacyWarningsInDev } from './helpers/suppressReactLegacyWarnings.js';

// initialization

suppressReactLegacyWarningsInDev();

const root = ReactDOM.createRoot(document.getElementById('root'));
const { Sider, Content, Header, Footer } = Layout;

const resolveSemiLocale = (lang) => {
  const language = (lang || 'zh').toLowerCase();
  return language.startsWith('zh') ? zhCN : enUS;
};

const SemiLocaleBridge = ({ children }) => {
  const [lang, setLang] = useState(i18n.resolvedLanguage || i18n.language || 'zh');
  const semiLocale = useMemo(() => resolveSemiLocale(lang), [lang]);

  useEffect(() => {
    const onLanguageChanged = (nextLang) => {
      setLang(nextLang || 'zh');
    };
    i18n.on('languageChanged', onLanguageChanged);
    return () => i18n.off('languageChanged', onLanguageChanged);
  }, []);

  return <LocaleProvider locale={semiLocale}>{children}</LocaleProvider>;
};

const app = (
  <StatusProvider>
    <UserProvider>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <SemiLocaleBridge>
          <ThemeProvider>
            <StyleProvider>
              <PageLayout />
            </StyleProvider>
          </ThemeProvider>
        </SemiLocaleBridge>
      </BrowserRouter>
    </UserProvider>
  </StatusProvider>
);

root.render(app);
