import { DifferenceDistanceMetric } from './interfaces';
import { VectorizableContext } from '../tag/VectorizableContext';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';

/**
 * Earth Mover's Distance（EMD、Wasserstein距離）メトリクス実装（クラス図準拠版）
 * クラス図P1_Metrics.EMDDistanceに対応
 * 
 * EMDは2つの分布間の最適輸送コストを計算する指標
 * この実装では1次元の場合の効率的な計算法を使用
 * 高次元の場合は近似解法を採用
 */
export class EMDDistance<T extends VectorizableContext> implements DifferenceDistanceMetric<T> {
  
  /** 最適輸送の最大反復回数 */
  private static readonly MAX_ITERATIONS = 1000;
  
  /** 収束判定の閾値 */
  private static readonly CONVERGENCE_THRESHOLD = 1e-8;
  
  /**
   * 期待パターンと実際パターン間のEMD距離を計算
   * 
   * @param expected - 期待パターン（分布P）
   * @param actual - 実際パターン（分布Q）
   * @returns EMD距離値（0以上の実数）
   * @throws Error ベクトルが無効な場合
   */
  distance(expected: ExpectedPatternV2<T>, actual: ActualPatternV2<T>): number {
    const expectedVector = expected.body.toVector();
    const actualVector = actual.body.toVector();
    
    // 事前チェック
    this.validateVectors(expectedVector, actualVector);
    
    // 分布として正規化
    const expectedDist = this.normalizeToDistribution(expectedVector);
    const actualDist = this.normalizeToDistribution(actualVector);
    
    // 1次元の場合は効率的な計算、そうでなければ近似計算
    if (expectedDist.length <= 2) {
      return this.calculateEMD1D(expectedDist, actualDist);
    } else {
      return this.calculateEMDApprox(expectedDist, actualDist);
    }
  }
  
  /**
   * メトリクス名を取得
   * @returns "EMD"
   */
  getName(): string {
    return 'EMD';
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
   * 1次元の場合のEMD計算（累積分布関数の差の積分）
   * @param p - 分布P
   * @param q - 分布Q
   * @returns EMD距離
   */
  private calculateEMD1D(p: number[], q: number[]): number {
    let emd = 0;
    let cumP = 0;
    let cumQ = 0;
    
    for (let i = 0; i < p.length; i++) {
      cumP += p[i];
      cumQ += q[i];
      emd += Math.abs(cumP - cumQ);
    }
    
    return emd;
  }
  
  /**
   * 高次元の場合のEMD近似計算（Sinkhorn-Knopp反復）
   * @param p - 分布P
   * @param q - 分布Q
   * @returns 近似EMD距離
   */
  private calculateEMDApprox(p: number[], q: number[]): number {
    const n = p.length;
    
    // コスト行列を生成（位置の違いに基づく）
    const costMatrix = this.generateCostMatrix(n);
    
    // Sinkhorn-Knopp反復による近似解法
    return this.sinkhornKnopp(p, q, costMatrix);
  }
  
  /**
   * コスト行列を生成（インデックス間の距離）
   * @param size - 行列のサイズ
   * @returns コスト行列
   */
  private generateCostMatrix(size: number): number[][] {
    const matrix: number[][] = [];
    
    for (let i = 0; i < size; i++) {
      matrix[i] = [];
      for (let j = 0; j < size; j++) {
        // インデックス間のL1距離をコストとする
        matrix[i][j] = Math.abs(i - j);
      }
    }
    
    return matrix;
  }
  
  /**
   * Sinkhorn-Knopp反復による最適輸送計算
   * @param p - 分布P
   * @param q - 分布Q  
   * @param costMatrix - コスト行列
   * @returns 最適輸送コスト
   */
  private sinkhornKnopp(p: number[], q: number[], costMatrix: number[][]): number {
    const n = p.length;
    const lambda = 10; // 正則化パラメータ
    
    // Gibbs kernelの計算: K[i][j] = exp(-lambda * C[i][j])
    const K: number[][] = [];
    for (let i = 0; i < n; i++) {
      K[i] = [];
      for (let j = 0; j < n; j++) {
        K[i][j] = Math.exp(-lambda * costMatrix[i][j]);
      }
    }
    
    // 初期化
    let u = new Array(n).fill(1);
    let v = new Array(n).fill(1);
    
    // Sinkhorn反復
    for (let iter = 0; iter < EMDDistance.MAX_ITERATIONS; iter++) {
      const uOld = [...u];
      
      // uの更新
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
          sum += K[i][j] * v[j];
        }
        u[i] = p[i] / (sum + 1e-15);
      }
      
      // vの更新
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let i = 0; i < n; i++) {
          sum += K[i][j] * u[i];
        }
        v[j] = q[j] / (sum + 1e-15);
      }
      
      // 収束判定
      let maxDiff = 0;
      for (let i = 0; i < n; i++) {
        maxDiff = Math.max(maxDiff, Math.abs(u[i] - uOld[i]));
      }
      
      if (maxDiff < EMDDistance.CONVERGENCE_THRESHOLD) {
        break;
      }
    }
    
    // 最終的な輸送コストを計算
    let totalCost = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const transport = u[i] * K[i][j] * v[j];
        totalCost += transport * costMatrix[i][j];
      }
    }
    
    return totalCost;
  }
  
  /**
   * ベクトルを分布として正規化
   * @param vector - 入力ベクトル
   * @returns 正規化された分布（合計が1）
   */
  private normalizeToDistribution(vector: number[]): number[] {
    // 負の値を0に切り詰め
    const clampedVector = vector.map(value => Math.max(0, value));
    
    // 合計を計算
    const sum = clampedVector.reduce((acc, value) => acc + value, 0);
    
    // ゼロベクトルの場合は等確率分布を返す
    if (sum === 0 || !isFinite(sum)) {
      const uniformProb = 1 / vector.length;
      return new Array(vector.length).fill(uniformProb);
    }
    
    // 正規化
    return clampedVector.map(value => value / sum);
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
      throw new Error('Empty vector cannot be processed for EMD');
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