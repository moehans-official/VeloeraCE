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
import Decimal from 'decimal.js';
import { API, copy, showError, showSuccess } from '../helpers';
import { UserContext } from '../context/User/index.js';
import {
  Button,
  Empty,
  Input,
  Modal,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IconCopy,
  IconRefresh,
  IconSearch,
  IconVerify,
} from '@douyinfe/semi-icons';
import {
  AlibabaCloud,
  Anthropic,
  Cohere,
  DeepSeek,
  Google,
  LobeHub,
  Meta,
  Mistral,
  Moonshot,
  OpenAI,
  Qwen,
  Zhipu,
} from '@lobehub/icons';
import './ModelPricing.css';

const ALL_PROVIDER = '全部供应商';
const ALL_TAG = '全部标签';

const PROVIDER_META = {
  [ALL_PROVIDER]: {
    Icon: LobeHub,
  },
  OpenAI: {
    Icon: OpenAI,
  },
  Anthropic: {
    Icon: Anthropic,
  },
  Google: {
    Icon: Google,
  },
  DeepSeek: {
    Icon: DeepSeek,
  },
  智谱: {
    Icon: Zhipu,
  },
  阿里云: {
    Icon: AlibabaCloud,
  },
  Moonshot: {
    Icon: Moonshot,
  },
  Qwen: {
    Icon: Qwen,
  },
  Mistral: {
    Icon: Mistral,
  },
  Meta: {
    Icon: Meta,
  },
  Cohere: {
    Icon: Cohere,
  },
  其他: {
    Icon: LobeHub,
  },
};

const toDecimal = (value, fallback = 0) => {
  try {
    if (value === null || value === undefined || value === '') {
      return new Decimal(fallback);
    }
    return new Decimal(value);
  } catch {
    return new Decimal(fallback);
  }
};

const formatMoney = (value) => {
  if (value === null || value === undefined) {
    return '--';
  }
  try {
    const decimal = value instanceof Decimal ? value : new Decimal(value);
    if (!decimal.isFinite()) {
      return '--';
    }
    return `$${decimal.toFixed(4)}`;
  } catch {
    return '--';
  }
};

const formatRatio = (value, digits = 3) => {
  try {
    return toDecimal(value).toFixed(digits);
  } catch {
    return '--';
  }
};

const inferProvider = (modelName, ownerBy) => {
  if (ownerBy && ownerBy.trim()) {
    return ownerBy.trim();
  }
  const name = (modelName || '').toLowerCase();
  if (
    /gpt|o1|o3|o4|chatgpt|text-embedding|whisper|tts|dall-e|omni/.test(name)
  ) {
    return 'OpenAI';
  }
  if (/claude/.test(name)) {
    return 'Anthropic';
  }
  if (/gemini|imagen|veo|learnlm|palm/.test(name)) {
    return 'Google';
  }
  if (/deepseek/.test(name)) {
    return 'DeepSeek';
  }
  if (/glm|chatglm/.test(name)) {
    return '智谱';
  }
  if (/qwen|tongyi|qwq/.test(name)) {
    return '阿里云';
  }
  if (/kimi|moonshot/.test(name)) {
    return 'Moonshot';
  }
  if (/mistral/.test(name)) {
    return 'Mistral';
  }
  if (/llama/.test(name)) {
    return 'Meta';
  }
  if (/cohere|command-r/.test(name)) {
    return 'Cohere';
  }
  return '其他';
};

const inferModelTags = (modelName, quotaType) => {
  const name = (modelName || '').toLowerCase();
  const tags = [];
  const contextMatch = name.match(/(\d{1,4}(k|m))/i);
  if (contextMatch) {
    tags.push(contextMatch[1].toLowerCase());
  }
  if (/vision|image|vl|omni|multimodal|gpt-4o|gemini/.test(name)) {
    tags.push('多模态');
  }
  if (/audio|speech|tts|whisper|realtime|voice/.test(name)) {
    tags.push('音频');
  }
  if (/embed|embedding/.test(name)) {
    tags.push('向量');
  }
  if (/rerank/.test(name)) {
    tags.push('重排');
  }
  if (/reason|o1|o3|o4|r1/.test(name)) {
    tags.push('推理');
  }
  tags.push(quotaType === 1 ? '按次' : '按量');
  return [...new Set(tags)];
};

const calcPricing = (model, ratio) => {
  const activeRatio = toDecimal(ratio, 1);
  if (Number(model.quota_type) === 1) {
    const fixed = toDecimal(model.model_price).mul(activeRatio);
    return { fixed, input: null, output: null };
  }
  const modelRatio = toDecimal(model.model_ratio);
  const completionRatio = toDecimal(model.completion_ratio, 1);
  const input = modelRatio.mul(2).mul(activeRatio);
  const output = modelRatio.mul(completionRatio).mul(2).mul(activeRatio);
  return { fixed: null, input, output };
};

const getProviderMeta = (provider) => PROVIDER_META[provider] || PROVIDER_META.其他;

const ProviderIcon = ({ provider, className }) => {
  const { Icon } = getProviderMeta(provider);
  return <Icon className={`model-market-provider-icon ${className}`} size='1em' />;
};

const sortModels = (a, b) => {
  const aName = (a.model_name || '').toLowerCase();
  const bName = (b.model_name || '').toLowerCase();
  const aGpt = aName.startsWith('gpt');
  const bGpt = bName.startsWith('gpt');
  if (aGpt && !bGpt) return -1;
  if (!aGpt && bGpt) return 1;
  return aName.localeCompare(bName);
};

const ModelPricing = () => {
  const [userState] = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [groupRatio, setGroupRatio] = useState({});
  const [usableGroup, setUsableGroup] = useState({});
  const [selectedGroup, setSelectedGroup] = useState('default');
  const [selectedProvider, setSelectedProvider] = useState(ALL_PROVIDER);
  const [selectedTag, setSelectedTag] = useState(ALL_TAG);
  const [searchValue, setSearchValue] = useState('');
  const [showRatio, setShowRatio] = useState(false);
  const [hideUnavailable, setHideUnavailable] = useState(true);

  const handleCopyText = useCallback(async (text) => {
    if (!text) {
      return;
    }
    if (await copy(text)) {
      showSuccess(`已复制：${text}`);
      return;
    }
    Modal.error({ title: '无法复制到剪贴板，请手动复制', content: text });
  }, []);

  const loadPricing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/pricing');
      const { success, message, data, group_ratio, usable_group } = res.data || {};
      if (!success) {
        showError(message || '模型广场加载失败');
        return;
      }
      const nextModels = Array.isArray(data) ? [...data] : [];
      nextModels.sort(sortModels);
      setModels(nextModels);

      const nextGroupRatio = group_ratio || {};
      const nextUsableGroup = usable_group || {};
      setGroupRatio(nextGroupRatio);
      setUsableGroup(nextUsableGroup);

      const groupKeys = Object.keys(nextGroupRatio);
      const userGroup = userState?.user?.group;
      const fallbackGroup =
        (userGroup && nextGroupRatio[userGroup] !== undefined && userGroup) ||
        groupKeys[0] ||
        'default';
      setSelectedGroup((prev) =>
        prev && nextGroupRatio[prev] !== undefined ? prev : fallbackGroup,
      );
    } catch (error) {
      showError(error.message || '模型广场加载失败');
    } finally {
      setLoading(false);
    }
  }, [userState?.user?.group]);

  useEffect(() => {
    loadPricing().then();
  }, [loadPricing]);

  const activeGroupRatio = useMemo(
    () => toDecimal(groupRatio[selectedGroup], 1),
    [groupRatio, selectedGroup],
  );

  const enrichedModels = useMemo(
    () =>
      models.map((model) => {
        const groups = Array.isArray(model.enable_groups) ? model.enable_groups : [];
        const provider = inferProvider(model.model_name, model.owner_by);
        const tags = inferModelTags(model.model_name, Number(model.quota_type));
        return {
          ...model,
          key: model.model_name,
          groups,
          provider,
          tags,
          available: selectedGroup ? groups.includes(selectedGroup) : true,
          pricing: calcPricing(model, activeGroupRatio),
        };
      }),
    [models, selectedGroup, activeGroupRatio],
  );

  const providerStats = useMemo(() => {
    const counter = new Map();
    for (const model of enrichedModels) {
      counter.set(model.provider, (counter.get(model.provider) || 0) + 1);
    }
    const items = Array.from(counter.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return [{ name: ALL_PROVIDER, count: enrichedModels.length }, ...items];
  }, [enrichedModels]);

  const tagStats = useMemo(() => {
    const counter = new Map();
    for (const model of enrichedModels) {
      for (const tag of model.tags) {
        counter.set(tag, (counter.get(tag) || 0) + 1);
      }
    }
    const items = Array.from(counter.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return [{ name: ALL_TAG, count: enrichedModels.length }, ...items];
  }, [enrichedModels]);

  const groupStats = useMemo(() => {
    const groupKeys =
      Object.keys(groupRatio).length > 0
        ? Object.keys(groupRatio)
        : Object.keys(usableGroup || {});
    return groupKeys
      .map((group) => ({
        name: group,
        count: models.filter((model) =>
          (model.enable_groups || []).includes(group),
        ).length,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [groupRatio, usableGroup, models]);

  const filteredModels = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    return enrichedModels.filter((model) => {
      if (
        keyword &&
        !(model.model_name || '').toLowerCase().includes(keyword)
      ) {
        return false;
      }
      if (
        selectedProvider !== ALL_PROVIDER &&
        model.provider !== selectedProvider
      ) {
        return false;
      }
      if (selectedTag !== ALL_TAG && !model.tags.includes(selectedTag)) {
        return false;
      }
      if (hideUnavailable && !model.available) {
        return false;
      }
      return true;
    });
  }, [enrichedModels, hideUnavailable, searchValue, selectedProvider, selectedTag]);

  const copyVisibleModels = useCallback(async () => {
    if (filteredModels.length === 0) {
      return;
    }
    const modelNames = filteredModels.map((model) => model.model_name).join('\n');
    if (await copy(modelNames)) {
      showSuccess(`已复制 ${filteredModels.length} 个模型`);
      return;
    }
    showError('复制失败，请稍后再试');
  }, [filteredModels]);

  const resetFilters = useCallback(() => {
    setSelectedProvider(ALL_PROVIDER);
    setSelectedTag(ALL_TAG);
    setSearchValue('');
    setHideUnavailable(true);
  }, []);

  const heroTitle =
    selectedProvider === ALL_PROVIDER ? '全部供应商' : selectedProvider;
  const heroSubtitle =
    selectedProvider === ALL_PROVIDER
      ? '查看所有可用的 AI 模型供应商，快速筛选适合你的模型。'
      : `当前展示 ${selectedProvider} 的可用模型。`;

  return (
    <div className='model-market-page'>
      <div className='model-market-layout'>
        <aside className='model-market-filter-panel'>
          <div className='model-market-filter-head'>
            <Typography.Title heading={5} style={{ margin: 0 }}>
              筛选
            </Typography.Title>
            <Button size='small' theme='light' type='tertiary' onClick={resetFilters}>
              重置
            </Button>
          </div>

          <div className='model-market-filter-section'>
            <div className='model-market-filter-title'>供应商</div>
            <div className='model-market-chip-grid'>
              {providerStats.map((item) => (
                <button
                  type='button'
                  key={item.name}
                  className={`model-market-chip ${selectedProvider === item.name ? 'is-active' : ''}`}
                  onClick={() => setSelectedProvider(item.name)}
                >
                  <span className='model-market-chip-main'>
                    {item.name !== ALL_PROVIDER && (
                      <ProviderIcon
                        provider={item.name}
                        className='model-market-provider-mini'
                      />
                    )}
                    <span className='chip-label'>{item.name}</span>
                  </span>
                  <span className='chip-count'>{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className='model-market-filter-section'>
            <div className='model-market-filter-title'>标签</div>
            <div className='model-market-chip-grid'>
              {tagStats.map((item) => (
                <button
                  type='button'
                  key={item.name}
                  className={`model-market-chip ${selectedTag === item.name ? 'is-active' : ''}`}
                  onClick={() => setSelectedTag(item.name)}
                >
                  <span className='chip-label'>{item.name}</span>
                  <span className='chip-count'>{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className='model-market-filter-section'>
            <div className='model-market-filter-title'>计价分组</div>
            <div className='model-market-chip-grid'>
              {groupStats.map((item) => (
                <button
                  type='button'
                  key={item.name}
                  className={`model-market-chip ${selectedGroup === item.name ? 'is-active' : ''}`}
                  onClick={() => setSelectedGroup(item.name)}
                >
                  <span className='chip-label'>{item.name}</span>
                  <span className='chip-count'>{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className='model-market-main'>
          <div className='model-market-hero'>
            <div>
              <div className='model-market-hero-title'>{heroTitle}</div>
              <div className='model-market-hero-subtitle'>{heroSubtitle}</div>
            </div>
            <div className='model-market-hero-count'>共 {filteredModels.length} 个模型</div>
          </div>

          <div className='model-market-toolbar'>
            <Input
              value={searchValue}
              onChange={setSearchValue}
              showClear
              prefix={<IconSearch />}
              placeholder='模糊搜索模型名称'
              className='model-market-search'
            />
            <Space wrap spacing={8}>
              <Button
                icon={<IconCopy />}
                theme='light'
                type='tertiary'
                onClick={copyVisibleModels}
                disabled={filteredModels.length === 0}
              >
                复制
              </Button>
              <Button
                icon={<IconRefresh />}
                theme='light'
                type='tertiary'
                onClick={loadPricing}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
            <div className='model-market-switches'>
              <span>显示倍率</span>
              <Switch checked={showRatio} onChange={setShowRatio} />
              <span>隐藏不可用</span>
              <Switch checked={hideUnavailable} onChange={setHideUnavailable} />
            </div>
          </div>

          <div className='model-market-group-hint'>
            <Tag color='blue' size='small'>
              当前分组：{selectedGroup || 'default'}
            </Tag>
            <Tag color='cyan' size='small'>
              分组倍率：{formatRatio(activeGroupRatio)}
            </Tag>
            {userState?.user ? (
              <Tag color='green' size='small'>
                登录分组：{userState.user.group}
              </Tag>
            ) : (
              <Tag color='orange' size='small'>
                未登录，按默认分组倍率展示
              </Tag>
            )}
          </div>

          <Spin spinning={loading}>
            {filteredModels.length === 0 ? (
              <div className='model-market-empty'>
                <Empty description='没有匹配到模型，请调整筛选条件' />
              </div>
            ) : (
              <div className='model-market-card-grid'>
                {filteredModels.map((model) => {
                  const visibleTags = model.tags.filter(
                    (tag) => tag !== '按量' && tag !== '按次',
                  );
                  return (
                    <article
                      className={`model-market-card ${model.available ? '' : 'is-disabled'}`}
                      key={model.model_name}
                    >
                      <div className='model-market-card-head'>
                        <div className='model-market-brand-mark'>
                          <ProviderIcon
                            provider={model.provider}
                            className='model-market-brand-icon'
                          />
                        </div>
                        <div className='model-market-title-wrap'>
                          <Typography.Text strong className='model-market-card-title'>
                            {model.model_name}
                          </Typography.Text>
                          <Typography.Text type='tertiary' className='model-market-card-provider'>
                            {model.provider}
                          </Typography.Text>
                        </div>
                        <Button
                          theme='borderless'
                          type='tertiary'
                          icon={<IconCopy />}
                          onClick={() => handleCopyText(model.model_name)}
                        />
                      </div>

                      <div className='model-market-price-line'>
                        {Number(model.quota_type) === 1 ? (
                          <span>单次 {formatMoney(model.pricing.fixed)}/次</span>
                        ) : (
                          <>
                            <span>输入 {formatMoney(model.pricing.input)}/M</span>
                            <span>输出 {formatMoney(model.pricing.output)}/M</span>
                          </>
                        )}
                      </div>

                      <div className='model-market-card-desc'>
                        <span className='model-market-card-provider-name'>
                          供应商：{model.provider}
                        </span>
                        <span className='model-market-card-groups'>
                          可用分组：{model.groups.length > 0 ? model.groups.join(' / ') : '--'}
                        </span>
                      </div>

                      {showRatio && (
                        <div className='model-market-ratio-line'>
                          模型倍率 {formatRatio(model.model_ratio)} · 补全倍率{' '}
                          {formatRatio(model.completion_ratio)} · 分组倍率{' '}
                          {formatRatio(activeGroupRatio)}
                        </div>
                      )}

                      <div className='model-market-tag-row'>
                        <Tag color={Number(model.quota_type) === 1 ? 'teal' : 'violet'} size='small'>
                          {Number(model.quota_type) === 1 ? '按次计费' : '按量计费'}
                        </Tag>
                        <Tag
                          color={model.available ? 'green' : 'grey'}
                          size='small'
                          prefixIcon={model.available ? <IconVerify /> : null}
                        >
                          {model.available ? '可用' : '不可用'}
                        </Tag>
                        {visibleTags.slice(0, 3).map((tag) => (
                          <Tag key={tag} size='small' color='blue'>
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Spin>
        </section>
      </div>
    </div>
  );
};

export default ModelPricing;
