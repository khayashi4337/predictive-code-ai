import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';

/**
 * 相対差分クラス（クラス図準拠版）
 * クラス図P2_PatternDelta.RelativeDifferenceに対応
 * 
 * 期待パターンと実際パターンの相対的な差分を表現する値オブジェクト
 * 差分の大きさ（magnitude）と付帯情報（contextInfo）を保持し、
 * 学習信号の生成や予測精度の評価、スキップ判定に使用される
 * 
 * @template T - Context インターフェースを継承する型
 */
export class RelativeDifference<T extends Context> {
  
  /** 差分の大きさ（0以上の実数、0=完全一致） */
  public readonly magnitude: number;
  
  /** 差分に関する付帯情報 */
  public readonly contextInfo: ContextInfo<T>;
  
  /** 差分計算時の追加メタデータ */
  private readonly _metadata: Map<string, any> = new Map();
  
  /** 差分が計算された時刻 */
  private readonly _computedAt: Date;
  
  /**
   * コンストラクタ
   * 
   * @param magnitude - 差分の大きさ（0以上の実数）
   * @param contextInfo - 付帯情報
   * @param metadata - 追加メタデータ（省略可）
   * @throws Error 差分の大きさが負の場合
   */
  constructor(
    magnitude: number,
    contextInfo: ContextInfo<T>,
    metadata: Map<string, any> = new Map()
  ) {
    // 入力検証
    if (magnitude < 0) {
      throw new Error(`Magnitude must be non-negative: ${magnitude}`);
    }
    
    if (!Number.isFinite(magnitude) || Number.isNaN(magnitude)) {
      throw new Error(`Magnitude must be finite: ${magnitude}`);
    }
    
    if (!contextInfo) {
      throw new Error('ContextInfo is required');
    }
    
    this.magnitude = magnitude;
    this.contextInfo = contextInfo;
    this._metadata = new Map(metadata);
    this._computedAt = new Date();
  }
  
  /**
   * ファクトリーメソッド：ゼロ差分（完全一致）を作成
   * @param contextInfo - 付帯情報
   * @returns 差分なしのRelativeDifferenceインスタンス
   */
  public static zero<T extends Context>(contextInfo: ContextInfo<T>): RelativeDifference<T> {
    const metadata = new Map([['type', 'perfect_match']]);
    return new RelativeDifference(0, contextInfo, metadata);
  }
  
  /**
   * ファクトリーメソッド：最大差分（完全不一致）を作成
   * @param contextInfo - 付帯情報
   * @param maxMagnitude - 最大差分値（デフォルト: 1.0）
   * @returns 最大差分のRelativeDifferenceインスタンス
   */
  public static maximum<T extends Context>(
    contextInfo: ContextInfo<T>, 
    maxMagnitude: number = 1.0
  ): RelativeDifference<T> {
    const metadata = new Map([['type', 'complete_mismatch']]);
    return new RelativeDifference(maxMagnitude, contextInfo, metadata);
  }
  
  /**
   * 差分の重要度を判定
   * @param threshold - 重要度の閾値（デフォルト: 0.3）
   * @returns 重要な差分の場合true
   */
  public isSignificant(threshold: number = 0.3): boolean {
    if (threshold < 0) {
      throw new Error(`Threshold must be non-negative: ${threshold}`);
    }
    return this.magnitude >= threshold;
  }
  
  /**
   * 差分が無視できるほど小さいかを判定
   * @param epsilon - 無視できる差分の上限（デフォルト: 1e-6）
   * @returns 無視できる場合true
   */
  public isNegligible(epsilon: number = 1e-6): boolean {
    if (epsilon < 0) {
      throw new Error(`Epsilon must be non-negative: ${epsilon}`);
    }
    return this.magnitude <= epsilon;
  }
  
  /**
   * 差分が完全一致（ゼロ差分）かを判定
   * @returns 完全一致の場合true
   */
  public isPerfectMatch(): boolean {
    return this.magnitude === 0;
  }
  
  /**
   * 指定されたキーのメタデータを取得
   * @param key - メタデータのキー
   * @returns メタデータの値、存在しない場合undefined
   */
  public getMetadata<V = any>(key: string): V | undefined {
    return this._metadata.get(key);
  }
  
  /**
   * メタデータの存在確認
   * @param key - チェックするキー
   * @returns 存在する場合true
   */
  public hasMetadata(key: string): boolean {
    return this._metadata.has(key);
  }
  
  /**
   * 全メタデータのキー一覧を取得
   * @returns メタデータキーの配列
   */
  public getMetadataKeys(): string[] {
    return Array.from(this._metadata.keys());
  }
  
  /**
   * 差分が計算された時刻を取得
   * @returns 計算時刻（新しいDateインスタンス）
   */
  public getComputedAt(): Date {
    return new Date(this._computedAt.getTime());
  }
  
  /**
   * 差分の年齢（現在時刻からの経過ミリ秒）を取得
   * @returns 経過ミリ秒
   */
  public getAge(): number {
    return Date.now() - this._computedAt.getTime();
  }
  
  /**
   * 別の相対差分と比較
   * @param other - 比較対象の相対差分
   * @returns この差分の方が大きい場合は正の数、小さい場合は負の数、同じ場合は0
   */
  public compare(other: RelativeDifference<T>): number {
    return this.magnitude - other.magnitude;
  }
  
  /**
   * 差分の正規化（0-1の範囲にクリップ）
   * @param maxValue - 正規化の最大値（デフォルト: 1.0）
   * @returns 正規化された新しいRelativeDifferenceインスタンス
   */
  public normalize(maxValue: number = 1.0): RelativeDifference<T> {
    if (maxValue <= 0) {
      throw new Error(`Max value must be positive: ${maxValue}`);
    }
    
    const normalizedMagnitude = Math.min(this.magnitude / maxValue, 1.0);
    const newMetadata = new Map(this._metadata);
    newMetadata.set('normalized', true);
    newMetadata.set('original_magnitude', this.magnitude);
    
    return new RelativeDifference(normalizedMagnitude, this.contextInfo, newMetadata);
  }
  
  /**
   * 差分に重みを適用した新しいインスタンスを作成
   * @param weight - 適用する重み（0以上）
   * @returns 重み付きの新しいRelativeDifferenceインスタンス
   */
  public applyWeight(weight: number): RelativeDifference<T> {
    if (weight < 0) {
      throw new Error(`Weight must be non-negative: ${weight}`);
    }
    
    if (!Number.isFinite(weight) || Number.isNaN(weight)) {
      throw new Error(`Weight must be finite: ${weight}`);
    }
    
    const weightedMagnitude = this.magnitude * weight;
    const newMetadata = new Map(this._metadata);
    newMetadata.set('weighted', true);
    newMetadata.set('original_magnitude', this.magnitude);
    newMetadata.set('weight', weight);
    
    return new RelativeDifference(weightedMagnitude, this.contextInfo, newMetadata);
  }
  
  /**
   * JSON表現への変換
   * @returns JSON オブジェクト
   */
  public toJSON(): object {
    return {
      magnitude: this.magnitude,
      contextInfo: {
        tags: Array.from(this.contextInfo.tags),
        statistics: Object.fromEntries(this.contextInfo.statistics),
        bodyType: typeof this.contextInfo.body
      },
      metadata: Object.fromEntries(this._metadata),
      computedAt: this._computedAt.toISOString(),
      age: this.getAge()
    };
  }
  
  /**
   * 文字列表現への変換
   * @returns 文字列表現
   */
  public toString(): string {
    const significantFlag = this.isSignificant() ? '[重要]' : '';
    const metadataCount = this._metadata.size;
    
    return `RelativeDifference${significantFlag}(magnitude=${this.magnitude.toFixed(6)}, tags=${this.contextInfo.tags.size}, metadata=${metadataCount})`;
  }
  
  /**
   * デバッグ用詳細文字列
   * @returns 詳細な文字列表現
   */
  public toDetailString(): string {
    const lines = [
      `RelativeDifference {`,
      `  magnitude: ${this.magnitude}`,
      `  computedAt: ${this._computedAt.toISOString()}`,
      `  age: ${this.getAge()}ms`,
      `  tags: [${Array.from(this.contextInfo.tags).map(t => t.key).join(', ')}]`,
      `  statistics: ${Object.keys(Object.fromEntries(this.contextInfo.statistics)).length} entries`,
      `  metadata: [${this.getMetadataKeys().join(', ')}]`,
      `}`
    ];
    return lines.join('\n');
  }
}