import { DifferenceDistanceMetric } from './interfaces';
import { VectorizableContext } from '../tag/VectorizableContext';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';

/**
 * L2距離（ユークリッド距離）メトリクス実装（クラス図準拠版）
 * クラス図P1_Metrics.L2Distanceに対応
 * 
 * L2距離は以下の式で計算される：
 * d(x, y) = √(Σ(xi - yi)²)
 */
export class L2Distance<T extends VectorizableContext> implements DifferenceDistanceMetric<T> {
  
  /**
   * 期待パターンと実際パターン間のL2距離を計算
   * 
   * @param expected - 期待パターン
   * @param actual - 実際パターン
   * @returns L2距離値（0以上の実数）
   * @throws Error ベクトルが無効な場合
   */
  distance(expected: ExpectedPatternV2<T>, actual: ActualPatternV2<T>): number {
    const expectedVector = expected.body.toVector();
    const actualVector = actual.body.toVector();
    
    // 事前チェック
    this.validateVectors(expectedVector, actualVector);
    
    // L2距離の計算: √(Σ(xi - yi)²)
    let sumSquared = 0;
    for (let i = 0; i < expectedVector.length; i++) {
      const diff = expectedVector[i] - actualVector[i];
      sumSquared += diff * diff;
    }
    
    return Math.sqrt(sumSquared);
  }
  
  /**
   * メトリクス名を取得
   * @returns "L2"
   */
  getName(): string {
    return 'L2';
  }
  
  /**
   * 距離値が有効範囲内かチェック
   * @param distance - チェック対象の距離値
   * @returns 有効な場合true（0以上の有限数）
   */
  isValidDistance(distance: number): boolean {
    return typeof distance === 'number' && 
           distance >= 0 && 
           isFinite(distance) && 
           !isNaN(distance);
  }
  
  /**
   * ベクトルの有効性を検証
   * @param expectedVector - 期待ベクトル
   * @param actualVector - 実際ベクトル
   * @throws Error ベクトルが無効な場合
   */
  private validateVectors(expectedVector: number[], actualVector: number[]): void {
    // 空ベクトルチェック
    if (expectedVector.length === 0 || actualVector.length === 0) {
      throw new Error('Empty vector cannot be processed');
    }
    
    // 次元数チェック
    if (expectedVector.length !== actualVector.length) {
      throw new Error(`Dimension mismatch: expected ${expectedVector.length}, actual ${actualVector.length}`);
    }
    
    // 無効値チェック
    this.checkVectorValues(expectedVector, 'expected');
    this.checkVectorValues(actualVector, 'actual');
  }
  
  /**
   * ベクトルの値が有効かチェック
   * @param vector - チェック対象ベクトル
   * @param name - ベクトル名（エラー表示用）
   * @throws Error 無効な値が含まれている場合
   */
  private checkVectorValues(vector: number[], name: string): void {
    for (let i = 0; i < vector.length; i++) {
      const value = vector[i];
      if (!isFinite(value) || isNaN(value)) {
        throw new Error(`Invalid vector values: ${name} vector contains invalid value at index ${i}: ${value}`);
      }
    }
  }
}