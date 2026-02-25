import { createEffect } from 'solid-js';
import { createStore, type SetStoreFunction } from 'solid-js/store';

/**
 * 从 localStorage 读取并解析 JSON，失败时返回 undefined
 */
function loadFromStorage<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/**
 * 将值序列化写入 localStorage
 */
function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage 不可用（隐私模式 / 配额超出等）
  }
}

/**
 * 创建持久化的 SolidJS Store
 *
 * @param key       localStorage key（建议使用 "gitsage:" 前缀）
 * @param defaults  默认初始值
 * @param options.pick  只持久化指定字段；未列出的字段不写入 localStorage
 */
export function createPersistedStore<T extends object>(
  key: string,
  defaults: T,
  options?: { pick?: (keyof T)[] },
): [T, SetStoreFunction<T>] {
  // 读取已存储的值，与默认值合并
  const saved = loadFromStorage<Partial<T>>(key);
  const initial = saved ? { ...defaults, ...saved } : { ...defaults };

  const [state, setState] = createStore<T>(initial);

  // 响应式写回 localStorage
  createEffect(() => {
    const toSave: Partial<T> = {};
    const keys = options?.pick ?? (Object.keys(defaults) as (keyof T)[]);
    for (const k of keys) {
      // 通过属性访问触发 SolidJS tracking
      toSave[k] = (state as T)[k];
    }
    saveToStorage(key, toSave);
  });

  return [state, setState];
}
