import { DifferenceDistanceMetric } from './interfaces';
import { VectorizableContext } from '../tag/VectorizableContext';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';

/**
 * コサイン距離メトリクス実装（クラス図準拠版）
 * クラス図P1_Metrics.CosineDistanceに対応
 * 
 * コサイン距離は以下の式で計算される：
 * d(x, y) = 1 - cos(θ) = 1 - (x·y) / (|x||y|)
 * where cos(θ) = (x·y) / (|x||y|) はコサイン類似度
 */
export class CosineDistance<T extends VectorizableContext> implements DifferenceDistanceMetric<T> {
  
  /**
   * 期待パターンと実際パターン間のコサイン距離を計算
   * 
   * @param expected - 期待パターン
   * @param actual - 実際パターン
   * @returns コサイン距離値（0-2の範囲）
   * @throws Error ベクトルが無効な場合
   */
  distance(expected: ExpectedPatternV2<T>, actual: ActualPatternV2<T>): number {
    const expectedVector = expected.body.toVector();
    const actualVector = actual.body.toVector();
    
    // 事前チェック
    this.validateVectors(expectedVector, actualVector);
    
    // コサイン類似度を計算
    const cosineSimilarity = this.calculateCosineSimilarity(expectedVector, actualVector);
    
    // コサイン距離 = 1 - コサイン類似度
    return 1 - cosineSimilarity;
  }
  
  /**
   * メトリクス名を取得
   * @returns "Cosine"
   */
  getName(): string {
    return 'Cosine';
  }
  
  /**
   * 距離値が有効範囲内かチェック
   * @param distance - チェック対象の距離値
   * @returns 有効な場合true（0-2の範囲の有限数）
   */
  isValidDistance(distance: number): boolean {
    return typeof distance === 'number' && 
           distance >= 0 && 
           distance <= 2 && 
           isFinite(distance) && 
           !isNaN(distance);
  }
  
  /**
   * コサイン類似度を計算
   * @param vectorA - ベクトルA
   * @param vectorB - ベクトルB
   * @returns コサイン類似度（-1から1の範囲）
   */
  private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    // ゼロベクトルの場合の処理
    if (normA === 0 || normB === 0) {
      if (normA === 0 && normB === 0) {
        return 1; // 両方ゼロベクトルの場合は類似度1（距離0）
      } else {
        return 0; // 片方のみゼロベクトルの場合は類似度0（距離1）
      }
    }
    
    return dotProduct / (normA * normB);
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