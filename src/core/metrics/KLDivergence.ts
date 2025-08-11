import { DifferenceDistanceMetric } from './interfaces';
import { VectorizableContext } from '../tag/VectorizableContext';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';

/**
 * Kullback-Leibler発散（KL divergence）メトリクス実装（クラス図準拠版）
 * クラス図P1_Metrics.KLDivergenceに対応
 * 
 * KL発散は確率分布間の違いを測定する指標：
 * KL(P||Q) = Σ P(i) * log(P(i) / Q(i))
 * 
 * 注意: KL発散は非対称（KL(P||Q) ≠ KL(Q||P)）
 * この実装では期待パターンをP、実際パターンをQとして扱う
 */
export class KLDivergence<T extends VectorizableContext> implements DifferenceDistanceMetric<T> {
  
  /** 数値計算の安定性のための最小値（ゼロ除算とlog(0)の回避） */
  private static readonly EPSILON = 1e-10;
  
  /**
   * 期待パターンと実際パターン間のKL発散を計算
   * 
   * @param expected - 期待パターン（確率分布P）
   * @param actual - 実際パターン（確率分布Q）
   * @returns KL発散値（0以上の実数、完全一致時は0）
   * @throws Error ベクトルが無効な場合
   */
  distance(expected: ExpectedPatternV2<T>, actual: ActualPatternV2<T>): number {
    const expectedVector = expected.body.toVector();
    const actualVector = actual.body.toVector();
    
    // 事前チェック
    this.validateVectors(expectedVector, actualVector);
    
    // 確率分布として正規化
    const expectedProbs = this.normalizeToDistribution(expectedVector);
    const actualProbs = this.normalizeToDistribution(actualVector);
    
    // KL発散を計算
    return this.calculateKLDivergence(expectedProbs, actualProbs);
  }
  
  /**
   * メトリクス名を取得
   * @returns "KL_Divergence"
   */
  getName(): string {
    return 'KL_Divergence';
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
   * KL発散を計算
   * @param p - 確率分布P（期待パターン）
   * @param q - 確率分布Q（実際パターン）
   * @returns KL(P||Q)の値
   */
  private calculateKLDivergence(p: number[], q: number[]): number {
    let klDivergence = 0;
    
    for (let i = 0; i < p.length; i++) {
      const pValue = p[i];
      const qValue = q[i];
      
      // P(i) = 0 の場合、0 * log(0/Q(i)) = 0 として扱う
      if (pValue > 0) {
        klDivergence += pValue * Math.log(pValue / qValue);
      }
    }
    
    return klDivergence;
  }
  
  /**
   * ベクトルを確率分布として正規化
   * @param vector - 入力ベクトル
   * @returns 正規化された確率分布（合計が1）
   */
  private normalizeToDistribution(vector: number[]): number[] {
    // 負の値を0に切り詰め（確率は非負でなければならない）
    const clampedVector = vector.map(value => Math.max(0, value));
    
    // 合計を計算
    const sum = clampedVector.reduce((acc, value) => acc + value, 0);
    
    // ゼロベクトルの場合は等確率分布を返す
    if (sum === 0 || !isFinite(sum)) {
      const uniformProb = 1 / vector.length;
      return new Array(vector.length).fill(uniformProb);
    }
    
    // 正規化してepsilonで下限を設定（log(0)の回避）
    return clampedVector.map(value => {
      const normalized = value / sum;
      return Math.max(normalized, KLDivergence.EPSILON);
    });
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
      throw new Error('Empty vector cannot be processed for KL divergence');
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