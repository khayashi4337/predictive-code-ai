import { SkipStrategy } from './LearningRateStrategyInterface';
import { Context } from '../tag/Context';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { SkipEnum } from './SkipEnum';

/**
 * シンプルスキップ判定ストラテジー
 * 差分の大きさに基づく基本的なスキップ判定を提供
 * 
 * @template T - Context インターフェースを継承する型
 */
export class SimpleSkipStrategy<T extends Context> implements SkipStrategy<T> {
  private readonly lowThreshold: number;
  private readonly highThreshold: number;

  /**
   * コンストラクタ
   * 
   * @param lowThreshold - 低閾値 (デフォルト: 0.01) - これ以下はFullSkip
   * @param highThreshold - 高閾値 (デフォルト: 0.5) - これ以上はFocusedCalculation
   */
  constructor(
    lowThreshold: number = 0.01,
    highThreshold: number = 0.5
  ) {
    if (lowThreshold <= 0 || highThreshold <= lowThreshold || highThreshold > 1.0) {
      throw new Error(`Invalid thresholds: low=${lowThreshold}, high=${highThreshold}`);
    }
    
    this.lowThreshold = lowThreshold;
    this.highThreshold = highThreshold;
  }

  /**
   * 相対差分からスキップ判定を計算
   * 
   * スキップ判定ロジック:
   * - magnitude < lowThreshold: FullSkip (差分が小さすぎて更新不要)
   * - lowThreshold <= magnitude < highThreshold: PartialUpdate (標準的な部分更新)
   * - magnitude >= highThreshold: FocusedCalculation (重要な差分のため集中計算)
   * 
   * @param difference - 相対差分
   * @returns スキップ判定結果
   * @throws Error 無効な差分が提供された場合
   */
  calculate(difference: RelativeDifference<T>): SkipEnum {
    if (!difference || typeof difference.magnitude !== 'number') {
      throw new Error('Invalid difference provided to SimpleSkipStrategy');
    }
    
    if (difference.magnitude < 0 || !isFinite(difference.magnitude)) {
      throw new Error(`Invalid difference magnitude: ${difference.magnitude}`);
    }

    if (difference.magnitude < this.lowThreshold) {
      // 非常に小さな差分: 計算をスキップ
      return SkipEnum.FullSkip;
    } else if (difference.magnitude < this.highThreshold) {
      // 中程度の差分: 部分的な更新
      return SkipEnum.PartialUpdate;
    } else {
      // 大きな差分: 集中的な計算
      return SkipEnum.FocusedCalculation;
    }
  }

  /**
   * ストラテジーの名前を取得
   * @returns ストラテジー名
   */
  getStrategyName(): string {
    return 'SimpleSkipStrategy';
  }

  /**
   * ストラテジーが有効かを判定
   * @returns 有効な場合true
   */
  isValid(): boolean {
    return this.lowThreshold > 0 && 
           this.highThreshold > this.lowThreshold && 
           this.highThreshold <= 1.0;
  }

  /**
   * 設定パラメータを取得（デバッグ用）
   * @returns 設定パラメータのオブジェクト
   */
  getConfiguration(): {
    lowThreshold: number;
    highThreshold: number;
  } {
    return {
      lowThreshold: this.lowThreshold,
      highThreshold: this.highThreshold
    };
  }
}