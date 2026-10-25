import type { DataAdapter } from './adapter'
import { cloudAdapter } from './cloudAdapter'
import { localAdapter } from './localAdapter'
import { isCloudMode } from '../config'

/** 根据 .env 配置自动选择存储实现 */
export const dataAdapter: DataAdapter = isCloudMode ? cloudAdapter : localAdapter
