import { UpdateScopePolicy } from './PolicyInterfaces';
import { UpdateScopeStrategy } from './LearningRateStrategyInterface';
import { SimpleUpdateScopeStrategy } from './SimpleUpdateScopeStrategy';
import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { UpdateScope } from '../learning/UpdateScope';
import { DevelopOption } from '../../debug/DevelopOption';

/**
 * 基本更新スコープポリシー実装（本番用）
 * ストラテジーパターンを使用して更新スコープ決定方式を切り替え可能
 * 
 * @template T - Context インターフェースを継承する型
 */
export class BaseUpdateScopePolicy<T extends Context> implements UpdateScopePolicy<T> {
  private readonly simpleStrategy: UpdateScopeStrategy<T>;

  /**
   * コンストラクタ
   * 
   * @param lowThreshold - 低閾値 (デフォルト: 0.1)
   * @param highThreshold - 高閾値 (デフォルト: 0.8)
   * @param defaultScope - デフォルトスコープ (デフォルト: ['core'])
   * @param focusedScope - 集中スコープ (デフォルト: ['critical'])
   * @param fullScope - 全スコープ (デフォルト: ['all'])
   */
  constructor(
    lowThreshold: number = 0.1,
    highThreshold: number = 0.8,
    defaultScope: Set<string> = new Set(['core']),
    focusedScope: Set<string> = new Set(['critical']),
    fullScope: Set<string> = new Set(['all'])
  ) {
    this.simpleStrategy = new SimpleUpdateScopeStrategy<T>(
      lowThreshold,
      highThreshold, 
      defaultScope,
      focusedScope,
      fullScope
    );
  }

  /**
   * 相対差分と文脈情報から更新スコープを決定
   * 
   * DevelopOptionフラグによって決定方式を切り替え:
   * - isUseSimpleStrategy_SD_01_updateScope = true: シンプル計算（差分ベース）
   * - isUseSimpleStrategy_SD_01_updateScope = false: コンテキスト利用計算（未実装）
   * 
   * @param difference - 相対差分
   * @param context - 文脈情報
   * @returns 決定された更新スコープ
   * @throws Error 無効な入力またはコンテキスト利用計算が未実装の場合
   */
  scope(difference: RelativeDifference<T>, context: ContextInfo<T>): UpdateScope {
    if (!difference) {
      throw new Error('Invalid difference provided to BaseUpdateScopePolicy');
    }
    
    if (!context) {
      throw new Error('Invalid context provided to BaseUpdateScopePolicy');
    }

    if (DevelopOption.isUseSimpleStrategy_SD_01_updateScope) {
      // シンプル計算: 差分の大きさのみを使用
      return this.simpleStrategy.calculate(difference, context);
    } else {
      // コンテキスト利用計算: 未実装のため例外
      throw new Error('Context-based update scope calculation is not yet implemented. Please set DevelopOption.isUseSimpleStrategy_SD_01_updateScope to true.');
    }
  }

  /**
   * ポリシーの名前を取得
   * @returns ポリシー名
   */
  getPolicyName(): string {
    const strategyName = DevelopOption.isUseSimpleStrategy_SD_01_updateScope 
      ? 'Simple' 
      : 'Context-based';
    return `BaseUpdateScopePolicy[${strategyName}]`;
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
    const isUsingSimple = DevelopOption.isUseSimpleStrategy_SD_01_updateScope;
    
    return {
      isUsingSimpleStrategy: isUsingSimple,
      strategyName: isUsingSimple ? this.simpleStrategy.getStrategyName() : 'Context-based (Not Implemented)',
      configuration: isUsingSimple ? (this.simpleStrategy as SimpleUpdateScopeStrategy<T>).getConfiguration() : undefined
    };
  }
}