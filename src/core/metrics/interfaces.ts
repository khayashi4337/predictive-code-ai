import { Context } from '../tag/Context';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';

/**
 * 差分距離メトリクスインターフェース（クラス図準拠版）
 * クラス図P1_Metrics.DifferenceDistanceMetric<T extends Context>に対応
 * 
 * @template T - Context を継承する型
 */
export interface DifferenceDistanceMetric<T extends Context> {
  /**
   * 期待パターンと実際パターン間の距離を計算
   * 
   * @param expected - 期待パターン
   * @param actual - 実際パターン
   * @returns 距離値（0以上の実数）
   * @throws Error 計算不可能な場合
   */
  distance(expected: ExpectedPatternV2<T>, actual: ActualPatternV2<T>): number;
  
  /**
   * メトリクス名を取得
   * @returns メトリクス名
   */
  getName(): string;
  
  /**
   * 距離値が有効範囲内かチェック
   * @param distance - チェック対象の距離値
   * @returns 有効な場合true
   */
  isValidDistance(distance: number): boolean;
}

/**
 * 距離メトリクス種別列挙型（クラス図準拠版）
 * クラス図P1_Metrics.DistanceMetricTypeに対応
 */
export enum DistanceMetricType {
  L2 = 'L2',
  Cosine = 'Cosine',
  KL_Divergence = 'KL_Divergence',
  EMD = 'EMD'
}

/**
 * 距離メトリクスファクトリーインターフェース（クラス図準拠版）
 * クラス図P1_Metrics.DistanceMetricFactoryに対応
 */
export interface DistanceMetricFactory {
  /**
   * 指定された種別の距離メトリクスを生成
   * 
   * @param type - 距離メトリクス種別
   * @returns 距離メトリクスインスタンス
   * @throws Error サポートされていない種別の場合
   */
  resolve<T extends Context>(type: DistanceMetricType): DifferenceDistanceMetric<T>;
  
  /**
   * サポートされている距離メトリクス種別一覧を取得
   * @returns サポートされている種別の配列
   */
  getSupportedTypes(): DistanceMetricType[];
}