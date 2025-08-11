import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { AdaptiveLearningRate } from '../learning/AdaptiveLearningRate';
import { UpdateScope } from '../learning/UpdateScope';
import { SkipEnum } from './SkipEnum';

/**
 * 学習率ポリシーインターフェース（クラス図準拠版）
 * クラス図P1_Links.LearningRatePolicyに対応
 * 
 * 相対差分と文脈情報に基づいて適応学習率を決定するためのポリシー
 * 
 * @template T - Context インターフェースを継承する型
 */
export interface LearningRatePolicy<T extends Context> {
  /**
   * 相対差分と文脈情報から適応学習率を計算
   * 
   * @param difference - 相対差分
   * @param context - 文脈情報
   * @returns 計算された適応学習率
   * @throws Error 無効な入力が提供された場合
   */
  learningRate(difference: RelativeDifference<T>, context: ContextInfo<T>): AdaptiveLearningRate;
  
  /**
   * ポリシーの名前を取得
   * デバッグやログ出力に使用される
   * 
   * @returns ポリシー名
   */
  getPolicyName(): string;
  
  /**
   * ポリシーが有効かを判定
   * 設定やパラメータの妥当性をチェック
   * 
   * @returns 有効な場合true
   */
  isValid(): boolean;
}

/**
 * 更新スコープポリシーインターフェース（クラス図準拠版）
 * クラス図P1_Links.UpdateScopePolicyに対応
 * 
 * 相対差分と文脈情報に基づいて更新スコープを決定するためのポリシー
 * 
 * @template T - Context インターフェースを継承する型
 */
export interface UpdateScopePolicy<T extends Context> {
  /**
   * 相対差分と文脈情報から更新スコープを決定
   * 
   * @param difference - 相対差分
   * @param context - 文脈情報
   * @returns 決定された更新スコープ
   * @throws Error 無効な入力が提供された場合
   */
  scope(difference: RelativeDifference<T>, context: ContextInfo<T>): UpdateScope;
  
  /**
   * ポリシーの名前を取得
   * デバッグやログ出力に使用される
   * 
   * @returns ポリシー名
   */
  getPolicyName(): string;
  
  /**
   * ポリシーが有効かを判定
   * 設定やパラメータの妥当性をチェック
   * 
   * @returns 有効な場合true
   */
  isValid(): boolean;
}

/**
 * スキップポリシーインターフェース（クラス図準拠版）
 * クラス図P1_Links.SkipPolicyに対応
 * 
 * 相対差分に基づいて計算スキップの判定を行うためのポリシー
 * 
 * @template T - Context インターフェースを継承する型
 */
export interface SkipPolicy<T extends Context> {
  /**
   * 相対差分からスキップ判定を行う
   * 
   * @param difference - 相対差分
   * @returns スキップ判定の結果
   * @throws Error 無効な入力が提供された場合
   */
  judgeSkip(difference: RelativeDifference<T>): SkipEnum;
  
  /**
   * ポリシーの名前を取得
   * デバッグやログ出力に使用される
   * 
   * @returns ポリシー名
   */
  getPolicyName(): string;
  
  /**
   * ポリシーが有効かを判定
   * 設定やパラメータの妥当性をチェック
   * 
   * @returns 有効な場合true
   */
  isValid(): boolean;
}

/**
 * ポリシー設定の基底インターフェース
 * 全てのポリシー実装で共通する設定項目を定義
 */
export interface PolicyConfiguration {
  /** ポリシーの有効性 */
  enabled: boolean;
  
  /** ポリシーの優先度（高いほど優先される） */
  priority: number;
  
  /** ポリシーのメタデータ */
  metadata?: Map<string, any>;
  
  /** ポリシーの説明 */
  description?: string;
  
  /** ポリシーの作成者/由来 */
  origin?: string;
  
  /** ポリシーのバージョン */
  version?: string;
}

/**
 * ポリシーファクトリーインターフェース
 * 設定に基づいて適切なポリシーインスタンスを生成する
 * 
 * @template T - Context インターフェースを継承する型
 * @template P - 生成するポリシーの型
 */
export interface PolicyFactory<_T extends Context, P> {
  /**
   * 設定に基づいてポリシーインスタンスを作成
   * 
   * @param configuration - ポリシー設定
   * @returns 作成されたポリシーインスタンス
   * @throws Error 無効な設定が提供された場合
   */
  createPolicy(configuration: PolicyConfiguration): P;
  
  /**
   * サポートされているポリシー名一覧を取得
   * @returns サポートされているポリシー名の配列
   */
  getSupportedPolicyNames(): string[];
  
  /**
   * 指定されたポリシー名がサポートされているかチェック
   * 
   * @param policyName - ポリシー名
   * @returns サポートされている場合true
   */
  isSupported(policyName: string): boolean;
}

/**
 * ポリシー管理インターフェース
 * 複数のポリシーを管理し、適切なポリシーを選択する
 * 
 * @template T - Context インターフェースを継承する型
 * @template P - 管理するポリシーの型
 */
export interface PolicyManager<T extends Context, P> {
  /**
   * ポリシーを登録
   * 
   * @param name - ポリシー名
   * @param policy - ポリシーインスタンス
   * @param configuration - ポリシー設定
   */
  registerPolicy(name: string, policy: P, configuration: PolicyConfiguration): void;
  
  /**
   * ポリシーを削除
   * 
   * @param name - 削除するポリシー名
   * @returns 削除された場合true
   */
  unregisterPolicy(name: string): boolean;
  
  /**
   * 指定された名前のポリシーを取得
   * 
   * @param name - ポリシー名
   * @returns ポリシーインスタンス、存在しない場合undefined
   */
  getPolicy(name: string): P | undefined;
  
  /**
   * 条件に基づいて最適なポリシーを選択
   * 
   * @param context - 選択の文脈情報
   * @returns 選択されたポリシー、適切なものがない場合undefined
   */
  selectBestPolicy(context: ContextInfo<T>): P | undefined;
  
  /**
   * 登録されているポリシー名一覧を取得
   * @returns 登録されているポリシー名の配列
   */
  getRegisteredPolicyNames(): string[];
  
  /**
   * 有効なポリシーの数を取得
   * @returns 有効なポリシーの数
   */
  getActivePolicyCount(): number;
}