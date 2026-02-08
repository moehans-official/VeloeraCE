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
import React, { useEffect, useRef, useState } from 'react';
import {
  Banner,
  Button,
  Card,
  Col,
  Form,
  Row,
  Switch,
} from '@douyinfe/semi-ui';
import Text from '@douyinfe/semi-ui/lib/es/typography/text';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../helpers';

const defaultInputs = {
  Notice: '',
  SystemName: '',
  SystemNameColor: '',
  Logo: '',
  Footer: '',
  About: '',
  HomePageContent: '',
  custom_head_html: '',
  global_css: '',
  global_js: '',
  DisplayInCurrencyEnabled: false,
  DisplayTokenStatEnabled: false,
  HideHeaderLogoEnabled: false,
  HideHeaderTextEnabled: false,
};

const OtherSetting = () => {
  const { t } = useTranslation();
  const [inputs, setInputs] = useState(defaultInputs);

  const [loadingInput, setLoadingInput] = useState({
    Notice: false,
    SystemName: false,
    SystemNameColor: false,
    Logo: false,
    HomePageContent: false,
    About: false,
    Footer: false,
    custom_head_html: false,
    global_css: false,
    global_js: false,
  });

  const formAPISettingGeneral = useRef();
  const formAPIPersonalization = useRef();

  const updateOption = async (key, value) => {
    const valueToStore = typeof value === 'boolean' ? value.toString() : value;
    const res = await API.put('/api/option/', {
      key,
      value: valueToStore,
    });
    const { success, message } = res.data;
    if (success) {
      setInputs((current) => ({ ...current, [key]: value }));
      return true;
    }
    showError(message);
    return false;
  };

  const handleInputChange = (value, e) => {
    const name = e?.target?.id;
    if (!name) {
      return;
    }
    setInputs((current) => ({ ...current, [name]: value }));
  };

  const isValidHexColor = (value) => {
    const normalized = (value || '').trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized);
  };

  const submitNotice = async () => {
    try {
      setLoadingInput((current) => ({ ...current, Notice: true }));
      const ok = await updateOption('Notice', inputs.Notice);
      if (ok) {
        showSuccess(t('Notice updated'));
      }
    } catch (error) {
      console.error('Notice update failed', error);
      showError(t('Notice update failed'));
    } finally {
      setLoadingInput((current) => ({ ...current, Notice: false }));
    }
  };

  const submitSystemName = async () => {
    try {
      setLoadingInput((current) => ({ ...current, SystemName: true }));
      const ok = await updateOption('SystemName', inputs.SystemName);
      if (!ok) {
        return;
      }
      const systemName = (inputs.SystemName || '').trim();
      if (systemName) {
        localStorage.setItem('system_name', systemName);
      } else {
        localStorage.removeItem('system_name');
      }
      window.dispatchEvent(new Event('brandingUpdated'));
      showSuccess(t('System name updated'));
    } catch (error) {
      console.error('System name update failed', error);
      showError(t('System name update failed'));
    } finally {
      setLoadingInput((current) => ({ ...current, SystemName: false }));
    }
  };

  const submitSystemNameColor = async () => {
    const color = (inputs.SystemNameColor || '').trim();
    if (color !== '' && !isValidHexColor(color)) {
      showError(t('Please use hex color like #1677ff'));
      return;
    }

    try {
      setLoadingInput((current) => ({ ...current, SystemNameColor: true }));
      const ok = await updateOption('SystemNameColor', color);
      if (!ok) {
        return;
      }
      if (color) {
        localStorage.setItem('system_name_color', color);
      } else {
        localStorage.removeItem('system_name_color');
      }
      window.dispatchEvent(new Event('brandingUpdated'));
      showSuccess(t('Logo name color updated'));
    } catch (error) {
      console.error('Logo name color update failed', error);
      showError(t('Logo name color update failed'));
    } finally {
      setLoadingInput((current) => ({ ...current, SystemNameColor: false }));
    }
  };

  const submitLogo = async () => {
    try {
      setLoadingInput((current) => ({ ...current, Logo: true }));
      const ok = await updateOption('Logo', inputs.Logo);
      if (!ok) {
        return;
      }
      const logo = (inputs.Logo || '').trim();
      if (logo) {
        localStorage.setItem('logo', logo);
      } else {
        localStorage.removeItem('logo');
      }
      window.dispatchEvent(new Event('brandingUpdated'));
      showSuccess(t('Logo updated'));
    } catch (error) {
      console.error('Logo update failed', error);
      showError(t('Logo update failed'));
    } finally {
      setLoadingInput((current) => ({ ...current, Logo: false }));
    }
  };

  const submitOption = async (key) => {
    try {
      setLoadingInput((current) => ({ ...current, HomePageContent: true }));
      const ok = await updateOption(key, inputs[key]);
      if (ok) {
        showSuccess(t('Home page content updated'));
      }
    } catch (error) {
      console.error('Home page content update failed', error);
      showError(t('Home page content update failed'));
    } finally {
      setLoadingInput((current) => ({ ...current, HomePageContent: false }));
    }
  };

  const submitAbout = async () => {
    try {
      setLoadingInput((current) => ({ ...current, About: true }));
      const ok = await updateOption('About', inputs.About);
      if (ok) {
        showSuccess(t('About content updated'));
      }
    } catch (error) {
      console.error('About content update failed', error);
      showError(t('About content update failed'));
    } finally {
      setLoadingInput((current) => ({ ...current, About: false }));
    }
  };

  const submitFooter = async () => {
    try {
      setLoadingInput((current) => ({ ...current, Footer: true }));
      const ok = await updateOption('Footer', inputs.Footer);
      if (ok) {
        showSuccess(t('Footer content updated'));
      }
    } catch (error) {
      console.error('Footer content update failed', error);
      showError(t('Footer content update failed'));
    } finally {
      setLoadingInput((current) => ({ ...current, Footer: false }));
    }
  };

  const submitCustomHeadHtml = async () => {
    try {
      setLoadingInput((current) => ({ ...current, custom_head_html: true }));
      const ok = await updateOption(
        'custom_head_html',
        inputs.custom_head_html,
      );
      if (ok) {
        showSuccess(t('Custom head HTML updated'));
      }
    } catch (error) {
      console.error('Custom head HTML update failed', error);
      showError(t('Custom head HTML update failed'));
    } finally {
      setLoadingInput((current) => ({ ...current, custom_head_html: false }));
    }
  };

  const submitGlobalCss = async () => {
    try {
      setLoadingInput((current) => ({ ...current, global_css: true }));
      const ok = await updateOption('global_css', inputs.global_css);
      if (ok) {
        showSuccess(t('Global CSS updated'));
      }
    } catch (error) {
      console.error('Global CSS update failed', error);
      showError(t('Global CSS update failed'));
    } finally {
      setLoadingInput((current) => ({ ...current, global_css: false }));
    }
  };

  const submitGlobalJs = async () => {
    try {
      setLoadingInput((current) => ({ ...current, global_js: true }));
      const ok = await updateOption('global_js', inputs.global_js);
      if (ok) {
        showSuccess(t('Global JavaScript updated'));
      }
    } catch (error) {
      console.error('Global JavaScript update failed', error);
      showError(t('Global JavaScript update failed'));
    } finally {
      setLoadingInput((current) => ({ ...current, global_js: false }));
    }
  };

  const getOptions = async () => {
    const res = await API.get('/api/option/');
    const { success, message, data } = res.data;
    if (!success) {
      showError(message);
      return;
    }

    const nextInputs = { ...defaultInputs };
    data.forEach((item) => {
      if (!(item.key in nextInputs)) {
        return;
      }
      if (
        item.key === 'DisplayInCurrencyEnabled' ||
        item.key === 'DisplayTokenStatEnabled' ||
        item.key === 'HideHeaderLogoEnabled' ||
        item.key === 'HideHeaderTextEnabled'
      ) {
        nextInputs[item.key] = item.value === 'true';
      } else {
        nextInputs[item.key] = item.value;
      }
    });

    setInputs(nextInputs);
    formAPISettingGeneral.current?.setValues(nextInputs);
    formAPIPersonalization.current?.setValues(nextInputs);
  };

  useEffect(() => {
    getOptions();
  }, []);

  return (
    <Row>
      <Col
        span={24}
        style={{
          marginTop: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <Form
          values={inputs}
          getFormApi={(formAPI) => {
            formAPISettingGeneral.current = formAPI;
          }}
        >
          <Card>
            <Form.Section text={t('通用设置')}>
              <Form.TextArea
                label={t('公告')}
                placeholder={t(
                  '在此输入新的公告内容，支持 Markdown 和 HTML 代码。',
                )}
                field={'Notice'}
                onChange={handleInputChange}
                style={{ fontFamily: 'JetBrains Mono, Consolas' }}
                autosize={{ minRows: 6, maxRows: 12 }}
              />
              <Button onClick={submitNotice} loading={loadingInput.Notice}>
                {t('设置公告')}
              </Button>
            </Form.Section>
          </Card>
        </Form>

        <Form
          values={inputs}
          getFormApi={(formAPI) => {
            formAPIPersonalization.current = formAPI;
          }}
        >
          <Card>
            <Form.Section text={t('个性化设置')}>
              <Form.Input
                label={t('系统名称')}
                placeholder={t('在此输入系统名称')}
                field={'SystemName'}
                onChange={handleInputChange}
              />
              <Button
                onClick={submitSystemName}
                loading={loadingInput.SystemName}
              >
                {t('设置系统名称')}
              </Button>

              <Form.Input
                label={t('Logo 图片地址')}
                placeholder={t('在此输入 Logo 图片地址')}
                field={'Logo'}
                onChange={handleInputChange}
              />
              <Button onClick={submitLogo} loading={loadingInput.Logo}>
                {t('设置 Logo')}
              </Button>

              <Form.Input
                label={t('Logo 名称颜色（调试）')}
                placeholder={t(
                  '仅支持十六进制颜色，如 #1677ff。留空可恢复默认渐变。',
                )}
                field={'SystemNameColor'}
                onChange={handleInputChange}
              />
              <Row style={{ marginTop: 8, marginBottom: 16 }}>
                <Col
                  span={24}
                  style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <Button
                    onClick={submitSystemNameColor}
                    loading={loadingInput.SystemNameColor}
                  >
                    {t('设置 Logo 名称颜色')}
                  </Button>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      border: '1px solid var(--semi-color-border)',
                      backgroundColor: isValidHexColor(inputs.SystemNameColor)
                        ? inputs.SystemNameColor
                        : 'transparent',
                    }}
                  />
                  <Text type='tertiary'>
                    {inputs.SystemNameColor || t('使用默认渐变')}
                  </Text>
                </Col>
              </Row>

              <Form.TextArea
                label={t('首页内容')}
                placeholder={t(
                  '在此输入首页内容，支持 Markdown 和 HTML 代码。',
                )}
                field={'HomePageContent'}
                onChange={handleInputChange}
                style={{ fontFamily: 'JetBrains Mono, Consolas' }}
                autosize={{ minRows: 6, maxRows: 12 }}
              />
              <Button
                onClick={() => submitOption('HomePageContent')}
                loading={loadingInput.HomePageContent}
              >
                {t('设置首页内容')}
              </Button>

              <Form.TextArea
                label={t('关于')}
                placeholder={t(
                  '在此输入关于内容，支持 Markdown 和 HTML 代码。',
                )}
                field={'About'}
                onChange={handleInputChange}
                style={{ fontFamily: 'JetBrains Mono, Consolas' }}
                autosize={{ minRows: 6, maxRows: 12 }}
              />
              <Button onClick={submitAbout} loading={loadingInput.About}>
                {t('设置关于')}
              </Button>

              <Banner
                fullMode={false}
                type='info'
                description={t(
                  '移除 Veloera 的版权标识不可在此处进行，如需处理请先获得授权。',
                )}
                closeIcon={null}
                style={{ marginTop: 15 }}
              />

              <Form.Input
                label={t('页脚')}
                placeholder={t(
                  '在此输入新的页脚，留空则使用默认页脚，支持 HTML 代码。',
                )}
                field={'Footer'}
                onChange={handleInputChange}
              />
              <Button onClick={submitFooter} loading={loadingInput.Footer}>
                {t('设置页脚')}
              </Button>

              <Form.TextArea
                label={t('自定义头部 HTML')}
                placeholder={t('在此输入自定义 HTML 头部内容。')}
                field={'custom_head_html'}
                onChange={handleInputChange}
                style={{ fontFamily: 'JetBrains Mono, Consolas' }}
                autosize={{ minRows: 6, maxRows: 12 }}
              />
              <Button
                onClick={submitCustomHeadHtml}
                loading={loadingInput.custom_head_html}
              >
                {t('设置自定义头部 HTML')}
              </Button>

              <Form.TextArea
                label={t('全局 CSS 样式')}
                placeholder={t('在此输入自定义 CSS 样式代码。')}
                field={'global_css'}
                onChange={handleInputChange}
                style={{ fontFamily: 'JetBrains Mono, Consolas' }}
                autosize={{ minRows: 6, maxRows: 12 }}
              />
              <Button
                onClick={submitGlobalCss}
                loading={loadingInput.global_css}
              >
                {t('设置全局 CSS 样式')}
              </Button>

              <Form.TextArea
                label={t('全局 JavaScript 代码')}
                placeholder={t('在此输入自定义 JavaScript 代码。')}
                field={'global_js'}
                onChange={handleInputChange}
                style={{ fontFamily: 'JetBrains Mono, Consolas' }}
                autosize={{ minRows: 6, maxRows: 12 }}
              />
              <Button onClick={submitGlobalJs} loading={loadingInput.global_js}>
                {t('设置全局 JavaScript 代码')}
              </Button>
            </Form.Section>

            <Form.Section text={t('显示设置')}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Switch
                    checked={inputs.DisplayInCurrencyEnabled}
                    onChange={async (checked) => {
                      setInputs((current) => ({
                        ...current,
                        DisplayInCurrencyEnabled: checked,
                      }));
                      await updateOption('DisplayInCurrencyEnabled', checked);
                    }}
                  />
                  <Text>{t('以货币形式显示配额')}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Switch
                    checked={inputs.DisplayTokenStatEnabled}
                    onChange={async (checked) => {
                      setInputs((current) => ({
                        ...current,
                        DisplayTokenStatEnabled: checked,
                      }));
                      await updateOption('DisplayTokenStatEnabled', checked);
                    }}
                  />
                  <Text>{t('显示 Token 统计信息')}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Switch
                    checked={inputs.HideHeaderLogoEnabled}
                    onChange={async (checked) => {
                      setInputs((current) => ({
                        ...current,
                        HideHeaderLogoEnabled: checked,
                      }));
                      await updateOption('HideHeaderLogoEnabled', checked);
                      localStorage.setItem(
                        'hide_header_logo_enabled',
                        checked ? 'true' : 'false',
                      );
                      window.dispatchEvent(new Event('brandingUpdated'));
                    }}
                  />
                  <Text>{t('隐藏标题 Logo')}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Switch
                    checked={inputs.HideHeaderTextEnabled}
                    onChange={async (checked) => {
                      setInputs((current) => ({
                        ...current,
                        HideHeaderTextEnabled: checked,
                      }));
                      await updateOption('HideHeaderTextEnabled', checked);
                      localStorage.setItem(
                        'hide_header_text_enabled',
                        checked ? 'true' : 'false',
                      );
                      window.dispatchEvent(new Event('brandingUpdated'));
                    }}
                  />
                  <Text>{t('隐藏标题文字')}</Text>
                </div>
              </div>
            </Form.Section>
          </Card>
        </Form>
      </Col>
    </Row>
  );
};

export default OtherSetting;
