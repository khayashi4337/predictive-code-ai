import { Context } from '../tag/Context';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { AdaptiveLearningRate } from './AdaptiveLearningRate';
import { UpdateScope } from './UpdateScope';

/**
 * 学習信号クラス（クラス図準拠版）
 * クラス図P2_LearnSignal.LearningSignalに対応
 * 
 * 相対差分から生成される学習信号を表現し、
 * 適応学習率と更新スコープを組み合わせて予測モデルの学習を制御する。
 * 
 * クラス図の仕様に従い、以下の主要プロパティを持つ：
 * - adaptiveLearningRate: 適応学習率
 * - referenceDifference: 参照差分（相対差分）
 * - updateTarget: 更新対象（更新スコープ）
 * 
 * @template T - Context インターフェースを継承する型
 */
export class LearningSignal<T extends Context> {
  
  /** 適応学習率 */
  public readonly adaptiveLearningRate: AdaptiveLearningRate;
  
  /** 参照差分（相対差分） */
  public readonly referenceDifference: RelativeDifference<T>;
  
  /** 更新対象（更新スコープ） */
  public readonly updateTarget: UpdateScope;
  
  /** 学習信号の識別子 */
  private readonly _signalId: string;
  
  /** 学習信号が生成された時刻 */
  private readonly _createdAt: Date;
  
  /** 学習信号の有効期限（ミリ秒） */
  private readonly _expirationMs: number;
  
  /** 追加メタデータ */
  private readonly _metadata: Map<string, any> = new Map();
  
  /**
   * コンストラクタ
   * 
   * @param adaptiveLearningRate - 適応学習率
   * @param referenceDifference - 参照差分（相対差分）
   * @param updateTarget - 更新対象（更新スコープ）
   * @param signalId - 学習信号の識別子（省略時は自動生成）
   * @param expirationMs - 有効期限（ミリ秒、デフォルト: 60000）
   * @param metadata - 追加メタデータ（省略可）
   */
  constructor(
    adaptiveLearningRate: AdaptiveLearningRate,
    referenceDifference: RelativeDifference<T>,
    updateTarget: UpdateScope,
    signalId?: string,
    expirationMs: number = 60000,
    metadata: Map<string, any> = new Map()
  ) {
    // 入力検証
    if (!adaptiveLearningRate) {
      throw new Error('AdaptiveLearningRate is required');
    }
    
    if (!referenceDifference) {
      throw new Error('ReferenceDifference is required');
    }
    
    if (!updateTarget) {
      throw new Error('UpdateTarget (UpdateScope) is required');
    }
    
    if (expirationMs <= 0) {
      throw new Error(`ExpirationMs must be positive: ${expirationMs}`);
    }
    
    this.adaptiveLearningRate = adaptiveLearningRate;
    this.referenceDifference = referenceDifference;
    this.updateTarget = updateTarget;
    this._signalId = signalId ?? this.generateSignalId();
    this._createdAt = new Date();
    this._expirationMs = expirationMs;
    this._metadata = new Map(metadata);
  }
  
  /**
   * ファクトリーメソッド：標準的な学習信号を作成
   * @param adaptiveLearningRate - 適応学習率
   * @param referenceDifference - 参照差分
   * @param updateTarget - 更新対象
   * @returns LearningSignalインスタンス
   */
  public static create<T extends Context>(
    adaptiveLearningRate: AdaptiveLearningRate,
    referenceDifference: RelativeDifference<T>,
    updateTarget: UpdateScope
  ): LearningSignal<T> {
    return new LearningSignal(adaptiveLearningRate, referenceDifference, updateTarget);
  }
  
  /**
   * ファクトリーメソッド：高優先度学習信号を作成
   * @param adaptiveLearningRate - 適応学習率
   * @param referenceDifference - 参照差分
   * @param updateTarget - 更新対象
   * @returns 高優先度のLearningSignalインスタンス
   */
  public static createHighPriority<T extends Context>(
    adaptiveLearningRate: AdaptiveLearningRate,
    referenceDifference: RelativeDifference<T>,
    updateTarget: UpdateScope
  ): LearningSignal<T> {
    const metadata = new Map([['priority', 'high'], ['urgent', 'true']]);
    return new LearningSignal(
      adaptiveLearningRate, 
      referenceDifference, 
      updateTarget, 
      undefined, 
      30000, // 短い有効期限
      metadata
    );
  }
  
  /**
   * ファクトリーメソッド：低優先度学習信号を作成
   * @param adaptiveLearningRate - 適応学習率
   * @param referenceDifference - 参照差分
   * @param updateTarget - 更新対象
   * @returns 低優先度のLearningSignalインスタンス
   */
  public static createLowPriority<T extends Context>(
    adaptiveLearningRate: AdaptiveLearningRate,
    referenceDifference: RelativeDifference<T>,
    updateTarget: UpdateScope
  ): LearningSignal<T> {
    const metadata = new Map([['priority', 'low'], ['background', 'true']]);
    return new LearningSignal(
      adaptiveLearningRate, 
      referenceDifference, 
      updateTarget, 
      undefined, 
      300000, // 長い有効期限
      metadata
    );
  }
  
  /**
   * 学習信号の識別子を取得
   * @returns 信号ID
   */
  public getSignalId(): string {
    return this._signalId;
  }
  
  /**
   * 学習信号が生成された時刻を取得
   * @returns 生成時刻（新しいDateインスタンス）
   */
  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }
  
  /**
   * 学習信号の年齢（現在時刻からの経過ミリ秒）を取得
   * @returns 経過ミリ秒
   */
  public getAge(): number {
    return Date.now() - this._createdAt.getTime();
  }
  
  /**
   * 学習信号が有効期限内かを判定
   * @returns 有効期限内の場合true
   */
  public isValid(): boolean {
    return this.getAge() < this._expirationMs;
  }
  
  /**
   * 学習信号が期限切れかを判定
   * @returns 期限切れの場合true
   */
  public isExpired(): boolean {
    return !this.isValid();
  }
  
  /**
   * 残り有効時間（ミリ秒）を取得
   * @returns 残り有効時間、期限切れの場合は0
   */
  public getRemainingLifetime(): number {
    const remaining = this._expirationMs - this.getAge();
    return Math.max(0, remaining);
  }
  
  /**
   * 学習信号が重要かを判定（差分の重要性に基づく）
   * @param significanceThreshold - 重要度閾値（デフォルト: 0.3）
   * @returns 重要な場合true
   */
  public isSignificant(significanceThreshold: number = 0.3): boolean {
    return this.referenceDifference.isSignificant(significanceThreshold);
  }
  
  /**
   * 学習信号が緊急かを判定（メタデータと差分に基づく）
   * @returns 緊急な場合true
   */
  public isUrgent(): boolean {
    // メタデータでの明示的な緊急指定をチェック
    if (this._metadata.get('urgent') === true) {
      return true;
    }
    
    // 高優先度かつ重要な差分の場合は緊急とみなす
    if (this._metadata.get('priority') === 'high' && this.isSignificant(0.5)) {
      return true;
    }
    
    // 学習率が高く、差分が大きい場合は緊急
    return this.adaptiveLearningRate.value > 0.1 && this.referenceDifference.magnitude > 0.7;
  }
  
  /**
   * 学習信号のインパクトを評価（学習率 × 差分の大きさ × 更新対象数）
   * @returns インパクト値
   */
  public getImpact(): number {
    const learningRateImpact = this.adaptiveLearningRate.value;
    const differenceImpact = this.referenceDifference.magnitude;
    const scopeImpact = Math.log10(this.updateTarget.getAffectedParameterCount() + 1);
    
    return learningRateImpact * differenceImpact * scopeImpact;
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
   * 他の学習信号との優先度比較
   * @param other - 比較対象の学習信号
   * @returns この信号の優先度が高い場合は正の数、低い場合は負の数、同じ場合は0
   */
  public comparePriority(other: LearningSignal<T>): number {
    // 緊急性での比較
    const thisUrgent = this.isUrgent() ? 1 : 0;
    const otherUrgent = other.isUrgent() ? 1 : 0;
    
    if (thisUrgent !== otherUrgent) {
      return thisUrgent - otherUrgent;
    }
    
    // インパクトでの比較
    const impactDiff = this.getImpact() - other.getImpact();
    if (Math.abs(impactDiff) > 1e-6) {
      return impactDiff;
    }
    
    // 生成時刻での比較（新しいものを優先）
    return other._createdAt.getTime() - this._createdAt.getTime();
  }
  
  /**
   * 学習信号のクローンを作成（一部プロパティの変更付き）
   * @param newAdaptiveLearningRate - 新しい適応学習率（省略時は元の値）
   * @param newUpdateTarget - 新しい更新対象（省略時は元の値）
   * @returns クローンされたLearningSignalインスタンス
   */
  public clone(
    newAdaptiveLearningRate?: AdaptiveLearningRate,
    newUpdateTarget?: UpdateScope
  ): LearningSignal<T> {
    return new LearningSignal(
      newAdaptiveLearningRate ?? this.adaptiveLearningRate,
      this.referenceDifference,
      newUpdateTarget ?? this.updateTarget,
      this._signalId + '_clone',
      this._expirationMs,
      new Map(this._metadata)
    );
  }
  
  /**
   * 信号IDを自動生成
   * @returns 生成された信号ID
   */
  private generateSignalId(): string {
    const timestamp = this._createdAt.getTime().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `lsignal_${timestamp}_${random}`;
  }
  
  /**
   * JSON表現への変換
   * @returns JSON オブジェクト
   */
  public toJSON(): object {
    return {
      signalId: this._signalId,
      adaptiveLearningRate: this.adaptiveLearningRate.toJSON(),
      referenceDifference: this.referenceDifference.toJSON(),
      updateTarget: this.updateTarget.toJSON(),
      createdAt: this._createdAt.toISOString(),
      expirationMs: this._expirationMs,
      age: this.getAge(),
      remainingLifetime: this.getRemainingLifetime(),
      isValid: this.isValid(),
      isSignificant: this.isSignificant(),
      isUrgent: this.isUrgent(),
      impact: this.getImpact(),
      metadata: Object.fromEntries(this._metadata)
    };
  }
  
  /**
   * 文字列表現への変換
   * @returns 文字列表現
   */
  public toString(): string {
    const urgentFlag = this.isUrgent() ? '[緊急]' : '';
    const validFlag = this.isValid() ? '[有効]' : '[期限切れ]';
    const impact = this.getImpact().toFixed(3);
    
    return `LearningSignal${urgentFlag}${validFlag}(id=${this._signalId.substring(0, 8)}..., impact=${impact})`;
  }
  
  /**
   * デバッグ用詳細文字列
   * @returns 詳細な文字列表現
   */
  public toDetailString(): string {
    const lines = [
      `LearningSignal {`,
      `  signalId: ${this._signalId}`,
      `  createdAt: ${this._createdAt.toISOString()}`,
      `  age: ${this.getAge()}ms`,
      `  expirationMs: ${this._expirationMs}`,
      `  isValid: ${this.isValid()}`,
      `  isUrgent: ${this.isUrgent()}`,
      `  impact: ${this.getImpact()}`,
      `  learningRate: ${this.adaptiveLearningRate.value} (${this.adaptiveLearningRate.origin})`,
      `  differenceMagnitude: ${this.referenceDifference.magnitude}`,
      `  updateTargetParams: ${this.updateTarget.getAffectedParameterCount()}`,
      `  metadata: [${this.getMetadataKeys().join(', ')}]`,
      `}`
    ];
    return lines.join('\n');
  }
}