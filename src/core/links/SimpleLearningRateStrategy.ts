import { LearningRateStrategy } from './LearningRateStrategyInterface';
import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { AdaptiveLearningRate, LearningRateOrigin } from '../learning/AdaptiveLearningRate';

/**
 * シンプル学習率計算ストラテジー
 * 差分の大きさに基づく基本的な学習率計算を提供
 * 
 * @template T - Context インターフェースを継承する型
 */
export class SimpleLearningRateStrategy<T extends Context> implements LearningRateStrategy<T> {
  private readonly baseLearningRate: number;
  private readonly scalingFactor: number;
  private readonly minLearningRate: number;
  private readonly maxLearningRate: number;

  /**
   * コンストラクタ
   * 
   * @param baseLearningRate - 基本学習率 (デフォルト: 0.1)
   * @param scalingFactor - スケーリング係数 (デフォルト: 1.0)
   * @param minLearningRate - 最小学習率 (デフォルト: 0.001)
   * @param maxLearningRate - 最大学習率 (デフォルト: 1.0)
   */
  constructor(
    baseLearningRate: number = 0.1,
    scalingFactor: number = 1.0,
    minLearningRate: number = 0.001,
    maxLearningRate: number = 1.0
  ) {
    if (baseLearningRate <= 0 || baseLearningRate > 1.0) {
      throw new Error(`Invalid base learning rate: ${baseLearningRate}. Must be in (0, 1.0]`);
    }
    if (scalingFactor <= 0) {
      throw new Error(`Invalid scaling factor: ${scalingFactor}. Must be positive`);
    }
    if (minLearningRate <= 0 || minLearningRate >= maxLearningRate) {
      throw new Error(`Invalid learning rate bounds: min=${minLearningRate}, max=${maxLearningRate}`);
    }
    
    this.baseLearningRate = baseLearningRate;
    this.scalingFactor = scalingFactor;
    this.minLearningRate = minLearningRate;
    this.maxLearningRate = maxLearningRate;
  }

  /**
   * 相対差分と文脈情報から学習率を計算
   * 
   * 現在の実装:
   * - 差分の大きさに比例した学習率調整
   * - 最小・最大値での制限
   * 
   * @param difference - 相対差分
   * @param context - 文脈情報（現在未使用、将来の拡張用）
   * @returns 計算された適応学習率
   * @throws Error 無効な差分が提供された場合
   */
  calculate(difference: RelativeDifference<T>, context: ContextInfo<T>): AdaptiveLearningRate {
    if (!difference || typeof difference.magnitude !== 'number') {
      throw new Error('Invalid difference provided to SimpleLearningRateStrategy');
    }
    
    if (difference.magnitude < 0 || !isFinite(difference.magnitude)) {
      throw new Error(`Invalid difference magnitude: ${difference.magnitude}`);
    }
    
    // 基本計算: 差分の大きさに基づくスケーリング
    // η = η_base * scaling_factor * sqrt(|difference|)
    const rawLearningRate = this.baseLearningRate * this.scalingFactor * Math.sqrt(difference.magnitude);
    
    // 最小・最大値でクランプ
    const clampedLearningRate = Math.max(
      this.minLearningRate, 
      Math.min(this.maxLearningRate, rawLearningRate)
    );
    
    return new AdaptiveLearningRate(clampedLearningRate, LearningRateOrigin.STRATEGY);
  }

  /**
   * ストラテジーの名前を取得
   * @returns ストラテジー名
   */
  getStrategyName(): string {
    return 'SimpleLearningRateStrategy';
  }

  /**
   * ストラテジーが有効かを判定
   * @returns 常にtrue（シンプルな実装のため）
   */
  isValid(): boolean {
    return this.baseLearningRate > 0 && 
           this.scalingFactor > 0 && 
           this.minLearningRate > 0 && 
           this.maxLearningRate > this.minLearningRate;
  }

  /**
   * 設定パラメータを取得（デバッグ用）
   * @returns 設定パラメータのオブジェクト
   */
  getConfiguration(): {
    baseLearningRate: number;
    scalingFactor: number;
    minLearningRate: number;
    maxLearningRate: number;
  } {
    return {
      baseLearningRate: this.baseLearningRate,
      scalingFactor: this.scalingFactor,
      minLearningRate: this.minLearningRate,
      maxLearningRate: this.maxLearningRate
    };
  }
}