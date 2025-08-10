import { Experience } from '../tag/Experience';
import { RelativeDelta } from '../pattern/RelativeDelta';
import { AdaptiveLearningRate } from './AdaptiveLearningRate';
import { UpdateScope } from './UpdateScope';

/**
 * 学習信号の種別を定義するenum
 */
export enum SignalType {
  /** 強化信号 - 良い結果を強化 */
  REINFORCEMENT = 'reinforcement',
  
  /** 修正信号 - 悪い結果を修正 */
  CORRECTION = 'correction',
  
  /** 探索信号 - 新しいパターンを探索 */
  EXPLORATION = 'exploration',
  
  /** 安定化信号 - 学習を安定化 */
  STABILIZATION = 'stabilization',
  
  /** 無視信号 - 更新を行わない */
  IGNORE = 'ignore'
}

/**
 * 信号の強度レベルを定義するenum
 */
export enum SignalIntensity {
  /** 非常に弱い */
  VERY_LOW = 'very_low',
  
  /** 弱い */
  LOW = 'low',
  
  /** 普通 */
  MEDIUM = 'medium',
  
  /** 強い */
  HIGH = 'high',
  
  /** 非常に強い */
  VERY_HIGH = 'very_high'
}

/**
 * 学習信号クラス
 * 
 * パターン差分から生成される学習信号を表現し、
 * 適応学習率と更新スコープと組み合わせて
 * 予測モデルの学習を制御する。
 * 
 * @template T - Experience インターフェースを継承する型
 */
export class LearningSignal<T extends Experience> {
  private readonly _signalId: string;
  private readonly _signalType: SignalType;
  private readonly _intensity: SignalIntensity;
  private readonly _delta: RelativeDelta<T>;
  private readonly _learningRate: AdaptiveLearningRate;
  private readonly _updateScope: UpdateScope;
  private readonly _createdAt: Date;
  private readonly _priority: number;
  private readonly _metadata: Map<string, any>;

  /**
   * コンストラクタ
   * 
   * @param delta - 元となる相対差分
   * @param learningRate - 適応学習率
   * @param updateScope - 更新スコープ
   * @param signalType - 信号の種別（省略時は自動判定）
   * @param intensity - 信号の強度（省略時は自動判定）
   * @param priority - 信号の優先度（デフォルト: 1）
   * @param signalId - 信号の識別子（省略時は自動生成）
   * @param metadata - 追加のメタデータ
   */
  constructor(
    delta: RelativeDelta<T>,
    learningRate: AdaptiveLearningRate,
    updateScope: UpdateScope,
    signalType?: SignalType,
    intensity?: SignalIntensity,
    priority: number = 1,
    signalId?: string,
    metadata: Map<string, any> = new Map()
  ) {
    this._delta = delta;
    this._learningRate = learningRate;
    this._updateScope = updateScope;
    this._createdAt = new Date();
    this._priority = priority;
    this._metadata = new Map(metadata);
    this._signalId = signalId ?? this.generateSignalId();
    
    // 信号種別と強度の自動判定
    this._signalType = signalType ?? this.determineSignalType();
    this._intensity = intensity ?? this.determineIntensity();
  }

  /**
   * パターン差分から学習信号を作成
   * 
   * @param delta - 相対差分
   * @param learningRate - 適応学習率
   * @param updateScope - 更新スコープ
   * @param options - 追加オプション
   * @returns LearningSignalインスタンス
   */
  static fromDelta<T extends Experience>(
    delta: RelativeDelta<T>,
    learningRate: AdaptiveLearningRate,
    updateScope: UpdateScope,
    options: {
      signalType?: SignalType;
      intensity?: SignalIntensity;
      priority?: number;
      signalId?: string;
      metadata?: Map<string, any>;
    } = {}
  ): LearningSignal<T> {
    return new LearningSignal(
      delta,
      learningRate,
      updateScope,
      options.signalType,
      options.intensity,
      options.priority,
      options.signalId,
      options.metadata
    );
  }

  /**
   * 強化信号を作成
   * 
   * @param delta - 相対差分
   * @param learningRate - 適応学習率
   * @param updateScope - 更新スコープ
   * @param intensity - 信号強度（デフォルト: HIGH）
   * @returns LearningSignalインスタンス
   */
  static createReinforcement<T extends Experience>(
    delta: RelativeDelta<T>,
    learningRate: AdaptiveLearningRate,
    updateScope: UpdateScope,
    intensity: SignalIntensity = SignalIntensity.HIGH
  ): LearningSignal<T> {
    return new LearningSignal(
      delta,
      learningRate,
      updateScope,
      SignalType.REINFORCEMENT,
      intensity,
      2 // 高優先度
    );
  }

  /**
   * 修正信号を作成
   * 
   * @param delta - 相対差分
   * @param learningRate - 適応学習率
   * @param updateScope - 更新スコープ
   * @param intensity - 信号強度（デフォルト: MEDIUM）
   * @returns LearningSignalインスタンス
   */
  static createCorrection<T extends Experience>(
    delta: RelativeDelta<T>,
    learningRate: AdaptiveLearningRate,
    updateScope: UpdateScope,
    intensity: SignalIntensity = SignalIntensity.MEDIUM
  ): LearningSignal<T> {
    return new LearningSignal(
      delta,
      learningRate,
      updateScope,
      SignalType.CORRECTION,
      intensity,
      1.5 // 中高優先度
    );
  }

  /**
   * 信号IDを取得
   */
  get signalId(): string {
    return this._signalId;
  }

  /**
   * 信号種別を取得
   */
  get signalType(): SignalType {
    return this._signalType;
  }

  /**
   * 信号強度を取得
   */
  get intensity(): SignalIntensity {
    return this._intensity;
  }

  /**
   * 相対差分を取得
   */
  get delta(): RelativeDelta<T> {
    return this._delta;
  }

  /**
   * 適応学習率を取得
   */
  get learningRate(): AdaptiveLearningRate {
    return this._learningRate;
  }

  /**
   * 更新スコープを取得
   */
  get updateScope(): UpdateScope {
    return this._updateScope;
  }

  /**
   * 作成日時を取得
   */
  get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  /**
   * 優先度を取得
   */
  get priority(): number {
    return this._priority;
  }

  /**
   * メタデータを取得（読み取り専用）
   */
  get metadata(): ReadonlyMap<string, any> {
    return this._metadata;
  }

  /**
   * 信号が有効かどうか判定
   * 
   * @returns 有効な場合true
   */
  isValid(): boolean {
    return (
      this._learningRate.isValid() &&
      !this._updateScope.isEmpty() &&
      this._signalType !== SignalType.IGNORE
    );
  }

  /**
   * 信号が即座に処理すべきかどうか判定
   * 
   * @param urgencyThreshold - 緊急度の閾値（デフォルト: 1.5）
   * @returns 緊急の場合true
   */
  isUrgent(urgencyThreshold: number = 1.5): boolean {
    return (
      this._priority >= urgencyThreshold &&
      (this._intensity === SignalIntensity.HIGH || this._intensity === SignalIntensity.VERY_HIGH) &&
      this._delta.isSignificant()
    );
  }

  /**
   * 信号が学習に大きな影響を与えるかどうか判定
   * 
   * @returns 影響が大きい場合true
   */
  hasHighImpact(): boolean {
    return (
      this._delta.magnitude > 0.5 &&
      this._learningRate.value > 0.01 &&
      this._updateScope.getAffectedParameterCount() > 10
    );
  }

  /**
   * 他の学習信号と優先度を比較
   * 
   * @param other - 比較対象の学習信号
   * @returns 優先度が高い場合true
   */
  hasHigherPriorityThan(other: LearningSignal<T>): boolean {
    if (this._priority !== other._priority) {
      return this._priority > other._priority;
    }

    // 優先度が同じ場合は強度で比較
    const intensityOrder = {
      [SignalIntensity.VERY_LOW]: 1,
      [SignalIntensity.LOW]: 2,
      [SignalIntensity.MEDIUM]: 3,
      [SignalIntensity.HIGH]: 4,
      [SignalIntensity.VERY_HIGH]: 5
    };

    const thisIntensityValue = intensityOrder[this._intensity];
    const otherIntensityValue = intensityOrder[other._intensity];

    if (thisIntensityValue !== otherIntensityValue) {
      return thisIntensityValue > otherIntensityValue;
    }

    // 強度も同じ場合は差分の大きさで比較
    return this._delta.magnitude > other._delta.magnitude;
  }

  /**
   * 学習率を調整した新しい信号を作成
   * 
   * @param newLearningRate - 新しい学習率
   * @returns 新しいLearningSignalインスタンス
   */
  withLearningRate(newLearningRate: AdaptiveLearningRate): LearningSignal<T> {
    return new LearningSignal(
      this._delta,
      newLearningRate,
      this._updateScope,
      this._signalType,
      this._intensity,
      this._priority,
      this._signalId,
      this._metadata
    );
  }

  /**
   * 更新スコープを変更した新しい信号を作成
   * 
   * @param newUpdateScope - 新しい更新スコープ
   * @returns 新しいLearningSignalインスタンス
   */
  withUpdateScope(newUpdateScope: UpdateScope): LearningSignal<T> {
    return new LearningSignal(
      this._delta,
      this._learningRate,
      newUpdateScope,
      this._signalType,
      this._intensity,
      this._priority,
      this._signalId,
      this._metadata
    );
  }

  /**
   * 優先度を変更した新しい信号を作成
   * 
   * @param newPriority - 新しい優先度
   * @returns 新しいLearningSignalインスタンス
   */
  withPriority(newPriority: number): LearningSignal<T> {
    return new LearningSignal(
      this._delta,
      this._learningRate,
      this._updateScope,
      this._signalType,
      this._intensity,
      newPriority,
      this._signalId,
      this._metadata
    );
  }

  /**
   * 信号種別を自動判定
   */
  private determineSignalType(): SignalType {
    if (this._delta.isImprovement()) {
      return SignalType.REINFORCEMENT;
    }

    if (this._delta.isDegradation()) {
      return SignalType.CORRECTION;
    }

    if (this._delta.magnitude < 0.1) {
      return SignalType.STABILIZATION;
    }

    if (this._delta.isSignificant()) {
      return SignalType.EXPLORATION;
    }

    return SignalType.IGNORE;
  }

  /**
   * 信号強度を自動判定
   */
  private determineIntensity(): SignalIntensity {
    const magnitude = this._delta.magnitude;
    
    if (magnitude < 0.1) {
      return SignalIntensity.VERY_LOW;
    } else if (magnitude < 0.3) {
      return SignalIntensity.LOW;
    } else if (magnitude < 0.6) {
      return SignalIntensity.MEDIUM;
    } else if (magnitude < 0.8) {
      return SignalIntensity.HIGH;
    } else {
      return SignalIntensity.VERY_HIGH;
    }
  }

  /**
   * 信号IDを自動生成
   */
  private generateSignalId(): string {
    const timestamp = this._createdAt.getTime().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `signal_${timestamp}_${random}`;
  }

  /**
   * JSON表現を取得
   */
  toJSON(): object {
    return {
      signalId: this._signalId,
      signalType: this._signalType,
      intensity: this._intensity,
      priority: this._priority,
      createdAt: this._createdAt.toISOString(),
      deltaType: this._delta.deltaType,
      deltaMagnitude: this._delta.magnitude,
      learningRateValue: this._learningRate.value,
      updateScopeId: this._updateScope.scopeId,
      metadata: Object.fromEntries(this._metadata)
    };
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    return `LearningSignal[${this._signalId}](${this._signalType}/${this._intensity}, priority=${this._priority})`;
  }
}