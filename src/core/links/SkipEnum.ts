/**
 * 計算スキップ判定の結果を表すEnum（クラス図準拠版）
 * クラス図P1_Links.SkipEnumに対応
 * 
 * 相対差分の大きさに基づいて、計算処理をどのように扱うかを決定するために使用される。
 * 効率的なリソース配分と計算の最適化に重要な役割を果たす。
 */
export enum SkipEnum {
  /**
   * 部分更新
   * 差分がそれなりにあるが、全体的な更新は不要な場合
   * 重要な部分のパラメータのみを更新する
   */
  PartialUpdate = 'PartialUpdate',
  
  /**
   * 完全スキップ
   * 差分が非常に小さく、更新の必要がない場合
   * 計算リソースを節約し、無駄な処理を避ける
   */
  FullSkip = 'FullSkip',
  
  /**
   * 集中計算
   * 差分が大きく、即座に集中的な計算と更新が必要な場合
   * 高優先度で処理し、大幅なモデル調整を行う
   */
  FocusedCalculation = 'FocusedCalculation'
}

/**
 * SkipEnumに関連するユーティリティ関数を提供するクラス
 */
export class SkipEnumUtils {
  
  /**
   * 差分の大きさに基づいてSkipEnumを決定
   * 
   * @param magnitude - 差分の大きさ（0以上の実数）
   * @param lowThreshold - 完全スキップの上限閾値（デフォルト: 0.01）
   * @param highThreshold - 集中計算の下限閾値（デフォルト: 0.5）
   * @returns 適切なSkipEnum値
   * @throws Error 差分の大きさが負の場合
   */
  public static determineSkipType(
    magnitude: number, 
    lowThreshold: number = 0.01, 
    highThreshold: number = 0.5
  ): SkipEnum {
    if (magnitude < 0) {
      throw new Error(`Magnitude must be non-negative: ${magnitude}`);
    }
    
    if (lowThreshold < 0 || highThreshold < 0) {
      throw new Error('Thresholds must be non-negative');
    }
    
    if (lowThreshold >= highThreshold) {
      throw new Error(`Low threshold (${lowThreshold}) must be less than high threshold (${highThreshold})`);
    }
    
    if (magnitude <= lowThreshold) {
      return SkipEnum.FullSkip;
    } else if (magnitude >= highThreshold) {
      return SkipEnum.FocusedCalculation;
    } else {
      return SkipEnum.PartialUpdate;
    }
  }
  
  /**
   * SkipEnumの優先度を取得（数値で表現）
   * 
   * @param skipType - SkipEnum値
   * @returns 優先度（高いほど緊急度が高い）
   */
  public static getPriority(skipType: SkipEnum): number {
    switch (skipType) {
      case SkipEnum.FullSkip:
        return 0; // 最低優先度
      case SkipEnum.PartialUpdate:
        return 1; // 中優先度
      case SkipEnum.FocusedCalculation:
        return 2; // 最高優先度
      default:
        const exhaustiveCheck: never = skipType;
        throw new Error(`Unhandled skip type: ${exhaustiveCheck}`);
    }
  }
  
  /**
   * SkipEnumが計算を必要とするかを判定
   * 
   * @param skipType - SkipEnum値
   * @returns 計算が必要な場合true
   */
  public static requiresComputation(skipType: SkipEnum): boolean {
    switch (skipType) {
      case SkipEnum.FullSkip:
        return false;
      case SkipEnum.PartialUpdate:
      case SkipEnum.FocusedCalculation:
        return true;
      default:
        const exhaustiveCheck: never = skipType;
        throw new Error(`Unhandled skip type: ${exhaustiveCheck}`);
    }
  }
  
  /**
   * SkipEnumが緊急処理を必要とするかを判定
   * 
   * @param skipType - SkipEnum値
   * @returns 緊急処理が必要な場合true
   */
  public static requiresUrgentProcessing(skipType: SkipEnum): boolean {
    return skipType === SkipEnum.FocusedCalculation;
  }
  
  /**
   * 複数のSkipEnumから最も高い優先度のものを選択
   * 
   * @param skipTypes - SkipEnum値の配列
   * @returns 最も高い優先度のSkipEnum値
   * @throws Error 空配列が渡された場合
   */
  public static selectHighestPriority(skipTypes: SkipEnum[]): SkipEnum {
    if (skipTypes.length === 0) {
      throw new Error('Skip types array cannot be empty');
    }
    
    return skipTypes.reduce((highest, current) => {
      return this.getPriority(current) > this.getPriority(highest) ? current : highest;
    });
  }
  
  /**
   * SkipEnumの説明文を取得
   * 
   * @param skipType - SkipEnum値
   * @returns 説明文
   */
  public static getDescription(skipType: SkipEnum): string {
    switch (skipType) {
      case SkipEnum.FullSkip:
        return '差分が小さく、計算を完全にスキップします';
      case SkipEnum.PartialUpdate:
        return '差分が中程度で、重要部分のみを部分的に更新します';
      case SkipEnum.FocusedCalculation:
        return '差分が大きく、集中的な計算と即座の処理が必要です';
      default:
        const exhaustiveCheck: never = skipType;
        throw new Error(`Unhandled skip type: ${exhaustiveCheck}`);
    }
  }
  
  /**
   * SkipEnumの推奨処理時間（ミリ秒）を取得
   * 
   * @param skipType - SkipEnum値
   * @returns 推奨処理時間（ミリ秒）
   */
  public static getRecommendedProcessingTime(skipType: SkipEnum): number {
    switch (skipType) {
      case SkipEnum.FullSkip:
        return 0; // 処理なし
      case SkipEnum.PartialUpdate:
        return 100; // 100ms以内の軽い処理
      case SkipEnum.FocusedCalculation:
        return 1000; // 1秒以内の集中処理
      default:
        const exhaustiveCheck: never = skipType;
        throw new Error(`Unhandled skip type: ${exhaustiveCheck}`);
    }
  }
  
  /**
   * 全てのSkipEnum値を取得
   * @returns SkipEnum値の配列
   */
  public static getAllValues(): SkipEnum[] {
    return [
      SkipEnum.FullSkip,
      SkipEnum.PartialUpdate,
      SkipEnum.FocusedCalculation
    ];
  }
  
  /**
   * SkipEnumが有効な値かを判定
   * 
   * @param value - チェックする値
   * @returns 有効なSkipEnum値の場合true
   */
  public static isValid(value: any): value is SkipEnum {
    return Object.values(SkipEnum).includes(value as SkipEnum);
  }
}