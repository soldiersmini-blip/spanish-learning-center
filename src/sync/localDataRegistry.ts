import type { UserDataNamespace } from '../lib/supabase/types';

export type LocalDataCategory =
  | '界面设置'
  | '训练设置'
  | '学习进度'
  | '错题'
  | '收藏词'
  | '测试记录'
  | '最近学习'
  | 'Neural 状态'
  | '临时会话';

export type LocalDataKeyDefinition = {
  category: LocalDataCategory;
  keyPattern: string;
  namespace?: UserDataNamespace;
  structure: string;
  guestData: boolean;
  cloudSync: boolean;
  mergeStrategy: string;
};

export const localDataRegistry: LocalDataKeyDefinition[] = [
  {
    category: '界面设置',
    keyPattern: 'spanish-locale',
    namespace: 'settings',
    structure: 'Locale string: zh | en | es',
    guestData: true,
    cloudSync: false,
    mergeStrategy: '默认保留当前设备设置，用户可手动选择覆盖。',
  },
  {
    category: '界面设置',
    keyPattern: 'spanish-theme',
    namespace: 'settings',
    structure: 'Theme string: light | dark',
    guestData: true,
    cloudSync: false,
    mergeStrategy: '默认保留当前设备设置，用户可手动选择覆盖。',
  },
  {
    category: '学习进度',
    keyPattern: 'spanish-progress-a1 / spanish-progress-a2',
    namespace: 'learning_progress',
    structure: 'string[] of completed module ids',
    guestData: true,
    cloudSync: true,
    mergeStrategy: '按模块 id 取并集，保留较新的 updatedAt/revision。',
  },
  {
    category: '测试记录',
    keyPattern: 'spanish-vocab-test-records-A1 / spanish-vocab-test-records-A2',
    namespace: 'test_history',
    structure: 'VocabTestRecord[]',
    guestData: true,
    cloudSync: true,
    mergeStrategy: '按 record/session id 去重合并，保留全部历史记录。',
  },
  {
    category: '错题',
    keyPattern: 'spanish-vocab-training-wrong-A1 / spanish-vocab-training-wrong-A2',
    namespace: 'mistakes',
    structure: 'string[] of word ids',
    guestData: true,
    cloudSync: true,
    mergeStrategy: '按词条 id 取并集，未来可扩展错误次数和最近错误时间。',
  },
  {
    category: '训练设置',
    keyPattern: 'spanish-learning-center:training-mode-preferences:v1',
    namespace: 'training_preferences',
    structure: '{ version, selectedModes, updatedAt }',
    guestData: true,
    cloudSync: true,
    mergeStrategy: '用户确认后选择本机或云端版本。',
  },
  {
    category: 'Neural 状态',
    keyPattern: 'spanish-neural-learning-progress',
    namespace: 'neural_state',
    structure: '{ visitedNodeIds, completedNodeIds, updatedAt }',
    guestData: true,
    cloudSync: true,
    mergeStrategy: '按稳定节点 id 取并集，保留较新的 updatedAt。',
  },
  {
    category: '临时会话',
    keyPattern: 'sessionStorage: spanish-neural-return-url',
    structure: 'temporary return URL',
    guestData: false,
    cloudSync: false,
    mergeStrategy: '只用于当前浏览器会话，不迁移。',
  },
  {
    category: '临时会话',
    keyPattern: 'sessionStorage: spanish-vocab-training-draft-A1 / A2',
    structure: 'temporary in-progress training draft',
    guestData: false,
    cloudSync: false,
    mergeStrategy: '只用于当前浏览器会话，不迁移。',
  },
];

export function getOwnedLocalStorageSnapshot() {
  const result: Record<string, string> = {};
  if (typeof localStorage === 'undefined') return result;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !isOwnedLocalStorageKey(key)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) result[key] = value;
  }
  return result;
}

export function isOwnedLocalStorageKey(key: string) {
  return key.startsWith('spanish-') || key.startsWith('spanish-learning-center:');
}

export function hasGuestLearningData() {
  return Object.keys(getOwnedLocalStorageSnapshot()).some((key) =>
    key.startsWith('spanish-progress-')
    || key.startsWith('spanish-vocab-test-records-')
    || key.startsWith('spanish-vocab-training-wrong-')
    || key === 'spanish-neural-learning-progress'
    || key === 'spanish-learning-center:training-mode-preferences:v1',
  );
}
