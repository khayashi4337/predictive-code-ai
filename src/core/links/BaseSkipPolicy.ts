import { SkipPolicy } from './PolicyInterfaces';
import { SkipStrategy } from './LearningRateStrategyInterface';
import { SimpleSkipStrategy } from './SimpleSkipStrategy';
import { Context } from '../tag/Context';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { SkipEnum } from './SkipEnum';
import { DevelopOption } from '../../debug/DevelopOption';

/**
 * 基本スキップポリシー実装（本番用）
 * ストラテジーパターンを使用してスキップ判定方式を切り替え可能
 * 
 * @template T - Context インターフェースを継承する型
 */
export class BaseSkipPolicy<T extends Context> implements SkipPolicy<T> {
  private readonly simpleStrategy: SkipStrategy<T>;

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
    this.simpleStrategy = new SimpleSkipStrategy<T>(lowThreshold, highThreshold);
  }

  /**
   * 相対差分からスキップ判定を行う
   * 
   * DevelopOptionフラグによって判定方式を切り替え:
   * - isUseSimpleStrategy_SD_01_skip = true: シンプル計算（差分ベース）
   * - isUseSimpleStrategy_SD_01_skip = false: コンテキスト利用計算（未実装）
   * 
   * Note: SkipPolicyは元々差分のみを受け取るインターフェースのため、
   * コンテキスト利用の場合も差分から推定する設計とする
   * 
   * @param difference - 相対差分
   * @returns スキップ判定の結果
   * @throws Error 無効な入力またはコンテキスト利用計算が未実装の場合
   */
  judgeSkip(difference: RelativeDifference<T>): SkipEnum {
    if (!difference) {
      throw new Error('Invalid difference provided to BaseSkipPolicy');
    }

    if (DevelopOption.isUseSimpleStrategy_SD_01_skip) {
      // シンプル計算: 差分の大きさのみを使用
      return this.simpleStrategy.calculate(difference);
    } else {
      // コンテキスト利用計算: 未実装のため例外
      // Note: 将来的にはdifferenceに含まれるcontextInfoから推論する予定
      throw new Error('Context-based skip calculation is not yet implemented. Please set DevelopOption.isUseSimpleStrategy_SD_01_skip to true.');
    }
  }

  /**
   * ポリシーの名前を取得
   * @returns ポリシー名
   */
  getPolicyName(): string {
    const strategyName = DevelopOption.isUseSimpleStrategy_SD_01_skip 
      ? 'Simple' 
      : 'Context-based';
    return `BaseSkipPolicy[${strategyName}]`;
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
    const isUsingSimple = DevelopOption.isUseSimpleStrategy_SD_01_skip;
    
    return {
      isUsingSimpleStrategy: isUsingSimple,
      strategyName: isUsingSimple ? this.simpleStrategy.getStrategyName() : 'Context-based (Not Implemented)',
      configuration: isUsingSimple ? (this.simpleStrategy as SimpleSkipStrategy<T>).getConfiguration() : undefined
    };
  }
}