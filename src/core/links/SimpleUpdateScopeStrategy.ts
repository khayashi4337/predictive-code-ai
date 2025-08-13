import { UpdateScopeStrategy } from './LearningRateStrategyInterface';
import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { UpdateScope } from '../learning/UpdateScope';

/**
 * シンプル更新スコープ計算ストラテジー
 * 差分の大きさに基づく基本的な更新スコープ決定を提供
 * 
 * @template T - Context インターフェースを継承する型
 */
export class SimpleUpdateScopeStrategy<T extends Context> implements UpdateScopeStrategy<T> {
  private readonly lowThreshold: number;
  private readonly highThreshold: number;
  private readonly defaultScope: Set<string>;
  private readonly focusedScope: Set<string>;
  private readonly fullScope: Set<string>;

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
    if (lowThreshold <= 0 || highThreshold <= lowThreshold || highThreshold > 1.0) {
      throw new Error(`Invalid thresholds: low=${lowThreshold}, high=${highThreshold}`);
    }
    
    this.lowThreshold = lowThreshold;
    this.highThreshold = highThreshold;
    this.defaultScope = new Set(defaultScope);
    this.focusedScope = new Set(focusedScope);
    this.fullScope = new Set(fullScope);
  }

  /**
   * 相対差分と文脈情報から更新スコープを計算
   * 
   * スコープ決定ロジック:
   * - magnitude < lowThreshold: focusedScope (最小限の更新)
   * - lowThreshold <= magnitude < highThreshold: defaultScope (標準更新)
   * - magnitude >= highThreshold: fullScope (全体更新)
   * 
   * @param difference - 相対差分
   * @param context - 文脈情報（現在未使用、将来の拡張用）
   * @returns 計算された更新スコープ
   * @throws Error 無効な差分が提供された場合
   */
  calculate(difference: RelativeDifference<T>, context: ContextInfo<T>): UpdateScope {
    if (!difference || typeof difference.magnitude !== 'number') {
      throw new Error('Invalid difference provided to SimpleUpdateScopeStrategy');
    }
    
    if (difference.magnitude < 0 || !isFinite(difference.magnitude)) {
      throw new Error(`Invalid difference magnitude: ${difference.magnitude}`);
    }

    let scopeSet: Set<string>;

    if (difference.magnitude < this.lowThreshold) {
      // 小さな差分: 集中的な更新
      scopeSet = new Set(this.focusedScope);
    } else if (difference.magnitude < this.highThreshold) {
      // 中程度の差分: 標準的な更新
      scopeSet = new Set(this.defaultScope);
    } else {
      // 大きな差分: 全体的な更新
      scopeSet = new Set(this.fullScope);
    }

    return new UpdateScope(scopeSet);
  }

  /**
   * ストラテジーの名前を取得
   * @returns ストラテジー名
   */
  getStrategyName(): string {
    return 'SimpleUpdateScopeStrategy';
  }

  /**
   * ストラテジーが有効かを判定
   * @returns 有効な場合true
   */
  isValid(): boolean {
    return this.lowThreshold > 0 && 
           this.highThreshold > this.lowThreshold && 
           this.highThreshold <= 1.0 &&
           this.defaultScope.size > 0 &&
           this.focusedScope.size > 0 &&
           this.fullScope.size > 0;
  }

  /**
   * 設定パラメータを取得（デバッグ用）
   * @returns 設定パラメータのオブジェクト
   */
  getConfiguration(): {
    lowThreshold: number;
    highThreshold: number;
    defaultScope: Set<string>;
    focusedScope: Set<string>;
    fullScope: Set<string>;
  } {
    return {
      lowThreshold: this.lowThreshold,
      highThreshold: this.highThreshold,
      defaultScope: new Set(this.defaultScope),
      focusedScope: new Set(this.focusedScope),
      fullScope: new Set(this.fullScope)
    };
  }
}