import { LearningRatePolicy } from './PolicyInterfaces';
import { LearningRateStrategy } from './LearningRateStrategyInterface';
import { SimpleLearningRateStrategy } from './SimpleLearningRateStrategy';
import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { AdaptiveLearningRate } from '../learning/AdaptiveLearningRate';
import { DevelopOption } from '../../debug/DevelopOption';

/**
 * 基本学習率ポリシー実装（本番用）
 * ストラテジーパターンを使用して学習率計算方式を切り替え可能
 * 
 * @template T - Context インターフェースを継承する型
 */
export class BaseLearningRatePolicy<T extends Context> implements LearningRatePolicy<T> {
  private readonly simpleStrategy: LearningRateStrategy<T>;

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
    this.simpleStrategy = new SimpleLearningRateStrategy<T>(
      baseLearningRate, 
      scalingFactor, 
      minLearningRate, 
      maxLearningRate
    );
  }

  /**
   * 相対差分と文脈情報から適応学習率を計算
   * 
   * DevelopOptionフラグによって計算方式を切り替え:
   * - isUseSimpleStrategy_SD_01_learningRate = true: シンプル計算（差分ベース）
   * - isUseSimpleStrategy_SD_01_learningRate = false: コンテキスト利用計算（未実装）
   * 
   * @param difference - 相対差分
   * @param context - 文脈情報
   * @returns 計算された適応学習率
   * @throws Error 無効な入力またはコンテキスト利用計算が未実装の場合
   */
  learningRate(difference: RelativeDifference<T>, context: ContextInfo<T>): AdaptiveLearningRate {
    if (!difference) {
      throw new Error('Invalid difference provided to BaseLearningRatePolicy');
    }
    
    if (!context) {
      throw new Error('Invalid context provided to BaseLearningRatePolicy');
    }

    if (DevelopOption.isUseSimpleStrategy_SD_01_learningRate) {
      // シンプル計算: 差分の大きさのみを使用
      return this.simpleStrategy.calculate(difference, context);
    } else {
      // コンテキスト利用計算: 未実装のため例外
      throw new Error('Context-based learning rate calculation is not yet implemented. Please set DevelopOption.isUseSimpleStrategy_SD_01_learningRate to true.');
    }
  }

  /**
   * ポリシーの名前を取得
   * @returns ポリシー名
   */
  getPolicyName(): string {
    const strategyName = DevelopOption.isUseSimpleStrategy_SD_01_learningRate 
      ? 'Simple' 
      : 'Context-based';
    return `BaseLearningRatePolicy[${strategyName}]`;
  }

  /**
   * ポリシーが有効かを判定
   * @returns 有効な場合true
   */
  isValid(): boolean {
    try {
      return this.simpleStrategy.isValid();
    } catch (error) {
      return false;
    }
  }

  /**
   * 使用中のストラテジー情報を取得（デバッグ用）
   * @returns ストラテジー情報
   */
  getStrategyInfo(): {
    isUsingSimpleStrategy: boolean;
    strategyName: string;
    configuration?: any;
  } {
    const isUsingSimple = DevelopOption.isUseSimpleStrategy_SD_01_learningRate;
    
    return {
      isUsingSimpleStrategy: isUsingSimple,
      strategyName: isUsingSimple ? this.simpleStrategy.getStrategyName() : 'Context-based (Not Implemented)',
      configuration: isUsingSimple ? (this.simpleStrategy as SimpleLearningRateStrategy<T>).getConfiguration() : undefined
    };
  }
}