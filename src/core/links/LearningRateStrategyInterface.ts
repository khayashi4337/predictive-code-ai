import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { AdaptiveLearningRate } from '../learning/AdaptiveLearningRate';

/**
 * 学習率計算ストラテジーインターフェース
 * Strategyパターンに基づく学習率計算の抽象化
 * 
 * @template T - Context インターフェースを継承する型
 */
export interface LearningRateStrategy<T extends Context> {
  /**
   * 相対差分と文脈情報から学習率を計算
   * 
   * @param difference - 相対差分
   * @param context - 文脈情報
   * @returns 計算された適応学習率
   * @throws Error 計算に失敗した場合
   */
  calculate(difference: RelativeDifference<T>, context: ContextInfo<T>): AdaptiveLearningRate;
  
  /**
   * ストラテジーの名前を取得
   * @returns ストラテジー名
   */
  getStrategyName(): string;
  
  /**
   * ストラテジーが有効かを判定
   * @returns 有効な場合true
   */
  isValid(): boolean;
}

/**
 * 更新スコープ計算ストラテジーインターフェース
 * Strategyパターンに基づく更新スコープ計算の抽象化
 * 
 * @template T - Context インターフェースを継承する型
 */
export interface UpdateScopeStrategy<T extends Context> {
  /**
   * 相対差分と文脈情報から更新スコープを計算
   * 
   * @param difference - 相対差分
   * @param context - 文脈情報
   * @returns 計算された更新スコープ
   * @throws Error 計算に失敗した場合
   */
  calculate(difference: RelativeDifference<T>, context: ContextInfo<T>): import('../learning/UpdateScope').UpdateScope;
  
  /**
   * ストラテジーの名前を取得
   * @returns ストラテジー名
   */
  getStrategyName(): string;
  
  /**
   * ストラテジーが有効かを判定
   * @returns 有効な場合true
   */
  isValid(): boolean;
}

/**
 * スキップ判定ストラテジーインターフェース
 * Strategyパターンに基づくスキップ判定の抽象化
 * 
 * @template T - Context インターフェースを継承する型
 */
export interface SkipStrategy<T extends Context> {
  /**
   * 相対差分からスキップ判定を計算
   * 
   * @param difference - 相対差分
   * @returns スキップ判定結果
   * @throws Error 計算に失敗した場合
   */
  calculate(difference: RelativeDifference<T>): import('./SkipEnum').SkipEnum;
  
  /**
   * ストラテジーの名前を取得
   * @returns ストラテジー名
   */
  getStrategyName(): string;
  
  /**
   * ストラテジーが有効かを判定
   * @returns 有効な場合true
   */
  isValid(): boolean;
}