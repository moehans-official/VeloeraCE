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
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SSE } from 'sse';
import {
  Button,
  Card,
  Chat,
  Input,
  Layout,
  Select,
  Slider,
  Switch,
  Tag,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui';
import { IconSetting } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

import { UserContext } from '../../context/User/index.js';
import { StyleContext } from '../../context/Style/index.js';
import { API, getUserIdFromLocalStorage, showError } from '../../helpers/index.js';
import { renderGroupOption, truncateText } from '../../helpers/render.js';

const roleInfo = {
  user: {
    name: '用户',
    avatar:
      'https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/docs-icon.png',
  },
  assistant: {
    name: '助手',
    avatar: 'logo.png',
  },
  system: {
    name: '系统',
    avatar:
      'https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/other/logo.png',
  },
};

let idSeed = 100;
const getId = () => `${idSeed++}`;

const Playground = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [userState] = useContext(UserContext);
  const [styleState] = useContext(StyleContext);

  const [inputs, setInputs] = useState({
    model: 'gpt-4o-mini',
    group: '',
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 1,
  });
  const [systemPrompt, setSystemPrompt] = useState(
    '你是一个乐于助人的助手，请清晰、准确地回答问题。',
  );
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      id: getId(),
      createAt: Date.now(),
      content: '你好，请问有什么可以帮助您的吗？',
      status: 'complete',
    },
  ]);
  const [models, setModels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showSettings, setShowSettings] = useState(!styleState.isMobile);
  const [showDebug, setShowDebug] = useState(false);
  const [customBodyEnabled, setCustomBodyEnabled] = useState(false);
  const [customBody, setCustomBody] = useState('');

  const handleInputChange = (name, value) => {
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const getSystemMessage = useCallback(() => {
    if (!systemPrompt || !systemPrompt.trim()) {
      return null;
    }
    return {
      role: 'system',
      content: systemPrompt.trim(),
    };
  }, [systemPrompt]);

  const buildPayload = useCallback(
    (conversationMessages) => {
      const payload = {
        messages: conversationMessages,
        stream: true,
        model: inputs.model,
        group: inputs.group,
        temperature: Number(inputs.temperature),
        top_p: Number(inputs.top_p),
      };

      const maxTokens = Number(inputs.max_tokens);
      if (Number.isFinite(maxTokens) && maxTokens > 0) {
        payload.max_tokens = maxTokens;
      }

      if (!customBodyEnabled) {
        return payload;
      }

      if (!customBody.trim()) {
        throw new Error('已开启自定义请求体，但内容为空');
      }

      const parsedCustomBody = JSON.parse(customBody);
      return {
        ...parsedCustomBody,
        messages: parsedCustomBody.messages || conversationMessages,
        stream: true,
      };
    },
    [customBody, customBodyEnabled, inputs],
  );

  const payloadPreview = useMemo(() => {
    const previewMessages = [
      ...(getSystemMessage() ? [getSystemMessage()] : []),
      { role: 'user', content: '示例问题' },
    ];

    try {
      return JSON.stringify(buildPayload(previewMessages), null, 2);
    } catch (error) {
      return `预览失败: ${error.message}`;
    }
  }, [buildPayload, getSystemMessage]);

  const completeAssistantMessage = useCallback((assistantId, status = 'complete') => {
    setMessages((prev) =>
      prev.map((item) =>
        item.id === assistantId && item.role === 'assistant'
          ? { ...item, status }
          : item,
      ),
    );
  }, []);

  const appendAssistantMessage = useCallback((assistantId, deltaContent) => {
    if (!deltaContent) {
      return;
    }

    setMessages((prev) =>
      prev.map((item) =>
        item.id === assistantId && item.role === 'assistant'
          ? {
              ...item,
              content: `${item.content || ''}${deltaContent}`,
              status: 'incomplete',
            }
          : item,
      ),
    );
  }, []);

  const handleSSE = useCallback(
    (payload, assistantId) => {
      const source = new SSE('/pg/chat/completions', {
        headers: {
          'Content-Type': 'application/json',
          'Veloera-User': getUserIdFromLocalStorage(),
        },
        method: 'POST',
        payload: JSON.stringify(payload),
      });

      source.addEventListener('message', (event) => {
        if (event.data === '[DONE]') {
          source.close();
          completeAssistantMessage(assistantId);
          return;
        }

        try {
          const chunk = JSON.parse(event.data);
          const delta =
            chunk?.choices?.[0]?.delta?.content ||
            chunk?.choices?.[0]?.message?.content ||
            '';
          appendAssistantMessage(assistantId, delta);
        } catch (error) {
          // Ignore malformed chunks and continue streaming.
        }
      });

      source.addEventListener('error', () => {
        source.close();
        completeAssistantMessage(assistantId, 'error');
      });

      source.stream();
    },
    [appendAssistantMessage, completeAssistantMessage],
  );

  const onMessageSend = useCallback(
    (content) => {
      if (!content || !content.trim()) {
        return;
      }

      setMessages((prev) => {
        const userMessage = {
          role: 'user',
          content,
          createAt: Date.now(),
          id: getId(),
          status: 'complete',
        };
        const assistantId = getId();
        const assistantMessage = {
          role: 'assistant',
          content: '',
          createAt: Date.now(),
          id: assistantId,
          status: 'loading',
        };

        const nextMessages = [...prev, userMessage];
        const systemMessage = getSystemMessage();
        const requestMessages = [
          ...(systemMessage ? [systemMessage] : []),
          ...nextMessages.map((item) => ({
            role: item.role,
            content: item.content,
          })),
        ];

        try {
          const payload = buildPayload(requestMessages);
          handleSSE(payload, assistantId);
        } catch (error) {
          showError(error.message || '请求体构建失败');
          return prev;
        }

        return [...nextMessages, assistantMessage];
      });
    },
    [buildPayload, getSystemMessage, handleSSE],
  );

  const loadModels = useCallback(async () => {
    const res = await API.get('/api/user/models');
    const { success, message, data } = res?.data || {};
    if (!success) {
      showError(t(message || '加载模型失败'));
      return;
    }

    const modelList = Array.isArray(data) ? data : [];
    const modelOptions = modelList.map((modelName) => ({
      label: modelName,
      value: modelName,
    }));
    setModels(modelOptions);
    setInputs((prev) => {
      if (prev.model || modelList.length === 0) {
        return prev;
      }
      return { ...prev, model: modelList[0] };
    });
  }, [t]);

  const loadGroups = useCallback(async () => {
    const res = await API.get('/api/user/self/groups');
    const { success, message, data } = res?.data || {};
    if (!success) {
      showError(t(message || '加载分组失败'));
      return;
    }

    let groupOptions = Object.entries(data || {}).map(([group, info]) => ({
      label: truncateText(info.desc, '50%'),
      value: group,
      ratio: info.ratio,
      fullLabel: info.desc,
    }));

    if (groupOptions.length === 0) {
      groupOptions = [{
        label: '用户分组',
        value: '',
        ratio: 1,
      }];
    } else {
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userGroup = userState?.user?.group || localUser?.group;
      if (userGroup) {
        const userGroupIndex = groupOptions.findIndex(
          (groupItem) => groupItem.value === userGroup,
        );
        if (userGroupIndex > -1) {
          const selectedGroup = groupOptions.splice(userGroupIndex, 1)[0];
          groupOptions.unshift(selectedGroup);
        }
      }
    }

    setGroups(groupOptions);
    setInputs((prev) => {
      if (prev.group) {
        return prev;
      }
      return { ...prev, group: groupOptions[0]?.value ?? '' };
    });
  }, [t, userState?.user?.group]);

  useEffect(() => {
    if (searchParams.get('expired')) {
      showError('未登录或登录已过期，请重新登录');
    }
    loadModels();
    loadGroups();
  }, [loadGroups, loadModels, searchParams]);

  useEffect(() => {
    if (!styleState.isMobile) {
      setShowSettings(true);
    }
  }, [styleState.isMobile]);

  const renderInputArea = useCallback((props) => {
    const { detailProps } = props;
    const { inputNode, sendNode, onClick } = detailProps;

    return (
      <div className='playground-chat-input-shell' onClick={onClick}>
        <div className='playground-chat-input-core'>{inputNode}</div>
        <div className='playground-chat-input-action'>{sendNode}</div>
      </div>
    );
  }, []);

  const settingToggle =
    styleState.isMobile && !showSettings ? (
      <Button
        icon={<IconSetting />}
        type='primary'
        theme='solid'
        className='playground-mobile-setting-toggle'
        onClick={() => setShowSettings(true)}
      />
    ) : null;

  return (
    <Layout className='playground-shell'>
      {(showSettings || !styleState.isMobile) && (
        <Layout.Sider className='playground-config-sider'>
          <Card className='playground-config-card' bodyStyle={{ padding: 16 }}>
            <div className='playground-config-header'>
              <div className='playground-config-title-row'>
                <IconSetting />
                <Typography.Text strong className='playground-config-title'>
                  模型配置
                </Typography.Text>
              </div>
              {styleState.isMobile && (
                <Button
                  size='small'
                  theme='borderless'
                  type='tertiary'
                  onClick={() => setShowSettings(false)}
                >
                  收起
                </Button>
              )}
            </div>

            <div className='playground-config-section'>
              <div className='playground-config-switch'>
                <Typography.Text strong>自定义请求体模式</Typography.Text>
                <Switch
                  checked={customBodyEnabled}
                  onChange={(checked) => setCustomBodyEnabled(checked)}
                />
              </div>
              {customBodyEnabled && (
                <TextArea
                  autosize={{ minRows: 5, maxRows: 10 }}
                  value={customBody}
                  placeholder='请输入 JSON 请求体，messages 将自动兼容'
                  onChange={setCustomBody}
                />
              )}
            </div>

            <div className='playground-config-section'>
              <Typography.Text strong className='playground-label'>分组</Typography.Text>
              <Select
                placeholder='请选择分组'
                value={inputs.group}
                optionList={groups}
                renderOptionItem={renderGroupOption}
                onChange={(value) => handleInputChange('group', value)}
              />
            </div>

            <div className='playground-config-section'>
              <Typography.Text strong className='playground-label'>模型</Typography.Text>
              <Select
                filter
                searchPosition='dropdown'
                placeholder='请选择模型'
                value={inputs.model}
                optionList={models}
                onChange={(value) => handleInputChange('model', value)}
              />
            </div>

            <div className='playground-config-section'>
              <div className='playground-slider-header'>
                <Typography.Text strong>Temperature</Typography.Text>
                <Tag color='blue'>{Number(inputs.temperature).toFixed(1)}</Tag>
              </div>
              <Typography.Text type='tertiary' size='small'>
                控制输出的随机性和创造性
              </Typography.Text>
              <Slider
                step={0.1}
                min={0}
                max={2}
                value={inputs.temperature}
                onChange={(value) => handleInputChange('temperature', value)}
              />
            </div>

            <div className='playground-config-section'>
              <div className='playground-slider-header'>
                <Typography.Text strong>Top P</Typography.Text>
                <Tag color='green'>{Number(inputs.top_p).toFixed(1)}</Tag>
              </div>
              <Typography.Text type='tertiary' size='small'>
                核采样，控制词汇选择的多样性
              </Typography.Text>
              <Slider
                step={0.1}
                min={0}
                max={1}
                value={inputs.top_p}
                onChange={(value) => handleInputChange('top_p', value)}
              />
            </div>

            <div className='playground-config-section'>
              <Typography.Text strong className='playground-label'>Max Tokens</Typography.Text>
              <Input
                value={String(inputs.max_tokens)}
                onChange={(value) => handleInputChange('max_tokens', value)}
                placeholder='默认由模型决定'
              />
            </div>

            <div className='playground-config-section'>
              <Typography.Text strong className='playground-label'>系统提示词</Typography.Text>
              <TextArea
                autosize={{ minRows: 4, maxRows: 8 }}
                value={systemPrompt}
                onChange={setSystemPrompt}
                placeholder='你是一个乐于助人的助手...'
              />
            </div>
          </Card>
        </Layout.Sider>
      )}

      <Layout.Content className='playground-chat-content'>
        {settingToggle}
        <div className='playground-chat-card'>
          <div className='playground-chat-header'>
            <div>
              <Typography.Title heading={4} style={{ margin: 0 }}>
                AI 对话
              </Typography.Title>
              <Typography.Text type='tertiary'>
                当前模型：{inputs.model || '-'}
              </Typography.Text>
            </div>
            <div className='playground-chat-header-right'>
              <Typography.Text type='secondary'>显示调试</Typography.Text>
              <Switch checked={showDebug} onChange={setShowDebug} />
            </div>
          </div>

          {showDebug && (
            <pre className='playground-debug-panel'>{payloadPreview}</pre>
          )}

          <div className='playground-chat-main'>
            <Chat
              roleConfig={roleInfo}
              className='playground-chat-component'
              renderInputArea={renderInputArea}
              chats={messages}
              onMessageSend={onMessageSend}
            />
          </div>
        </div>
      </Layout.Content>
    </Layout>
  );
};

export default Playground;
