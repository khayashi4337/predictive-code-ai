import { Experience } from '../tag/Experience';
import { ExpectedPattern } from '../pattern/ExpectedPattern';
import { ActualPattern } from '../pattern/ActualPattern';

/**
 * 数値ベクトル表現可能なExperienceインターフェース
 * 距離メトリクス計算のため数値ベクトルに変換可能な体験データ
 */
export interface VectorizableExperience extends Experience {
  /**
   * 数値ベクトルに変換
   * @returns 正規化された数値ベクトル配列
   */
  toVector(): number[];
  
  /**
   * ベクトルの次元数を取得
   * @returns ベクトルの次元数
   */
  getDimension(): number;
}

/**
 * 差分距離メトリクスインターフェース
 * 期待パターンと実際パターンの距離を計算する
 * 
 * @template T - VectorizableExperience を継承する型
 */
export interface DifferenceDistanceMetric<T extends VectorizableExperience> {
  /**
   * 期待パターンと実際パターン間の距離を計算
   * 
   * @param expected - 期待パターン
   * @param actual - 実際パターン
   * @returns 距離値（0以上の実数）
   * @throws Error 計算不可能な場合
   */
  distance(expected: ExpectedPattern<T>, actual: ActualPattern<T>): number;
  
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
 * 距離メトリクス種別列挙型
 */
export enum DistanceMetricType {
  L2 = 'L2',
  COSINE = 'COSINE',
  KL = 'KL',
  EMD = 'EMD'
}

/**
 * 距離メトリクスファクトリーインターフェース
 */
export interface DistanceMetricFactory {
  /**
   * 指定された種別の距離メトリクスを生成
   * 
   * @param type - 距離メトリクス種別
   * @returns 距離メトリクスインスタンス
   * @throws Error サポートされていない種別の場合
   */
  resolve<T extends VectorizableExperience>(type: DistanceMetricType): DifferenceDistanceMetric<T>;
  
  /**
   * サポートされている距離メトリクス種別一覧を取得
   * @returns サポートされている種別の配列
   */
  getSupportedTypes(): DistanceMetricType[];
}