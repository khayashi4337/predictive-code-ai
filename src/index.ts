/**
 * Predictive Code AI System
 * 
 * TypeScript implementation of the predictive code AI system
 * providing intelligent code prediction and learning capabilities.
 */

// Core modules
export * from './core';

// Version information
export const VERSION = '1.0.0';

/**
 * システムの初期化設定
 */
export interface SystemConfig {
  /** システム名 */
  name: string;
  
  /** バージョン */
  version: string;
  
  /** デバッグモード */
  debug: boolean;
  
  /** ログレベル */
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * デフォルト設定
 */
export const DEFAULT_CONFIG: SystemConfig = {
  name: 'Predictive Code AI',
  version: VERSION,
  debug: false,
  logLevel: 'info'
};

/**
 * システムの初期化
 * 
 * @param config - 設定オプション
 * @returns 初期化結果
 */
export function initializeSystem(config: Partial<SystemConfig> = {}): SystemConfig {
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };

  if (finalConfig.debug) {
    console.log(`Initializing ${finalConfig.name} v${finalConfig.version}`);
  }

  return finalConfig;
}