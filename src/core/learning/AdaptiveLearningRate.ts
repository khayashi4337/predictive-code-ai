/**
 * 学習率の由来を表すenum
 */
export enum LearningRateOrigin {
  /** 初期設定値 */
  INITIAL = 'initial',
  
  /** 自動調整による値 */
  ADAPTIVE = 'adaptive',
  
  /** 手動設定による値 */
  MANUAL = 'manual',
  
  /** 実験的調整による値 */
  EXPERIMENTAL = 'experimental',
  
  /** 最適化アルゴリズムによる値 */
  OPTIMIZED = 'optimized'
}

/**
 * 適応学習率クラス
 * 
 * 学習率の値とその由来を保持し、
 * 学習過程での動的な調整を可能にする。
 * 学習効率の最適化と学習過程の追跡に使用される。
 */
export class AdaptiveLearningRate {
  private readonly _value: number;
  private readonly _origin: LearningRateOrigin;
  private readonly _createdAt: Date;
  private readonly _metadata: Map<string, any>;
  private readonly _history: Array<{ value: number; origin: LearningRateOrigin; timestamp: Date }>;

  /**
   * コンストラクタ
   * 
   * @param value - 学習率の値（0より大きい値）
   * @param origin - 学習率の由来
   * @param metadata - 追加のメタデータ
   * @param history - 学習率変更履歴（省略時は空配列）
   */
  constructor(
    value: number,
    origin: LearningRateOrigin,
    metadata: Map<string, any> = new Map(),
    history: Array<{ value: number; origin: LearningRateOrigin; timestamp: Date }> = []
  ) {
    if (value <= 0) {
      throw new Error('Learning rate value must be positive');
    }

    if (!Number.isFinite(value)) {
      throw new Error('Learning rate value must be finite');
    }

    this._value = value;
    this._origin = origin;
    this._createdAt = new Date();
    this._metadata = new Map(metadata);
    this._history = [...history];
  }

  /**
   * 初期学習率を作成
   * 
   * @param value - 学習率の値
   * @param metadata - 追加のメタデータ
   * @returns AdaptiveLearningRateインスタンス
   */
  static createInitial(value: number, metadata?: Map<string, any>): AdaptiveLearningRate {
    return new AdaptiveLearningRate(value, LearningRateOrigin.INITIAL, metadata);
  }

  /**
   * 自動調整学習率を作成
   * 
   * @param value - 学習率の値
   * @param adjustmentReason - 調整理由
   * @param metadata - 追加のメタデータ
   * @returns AdaptiveLearningRateインスタンス
   */
  static createAdaptive(
    value: number,
    adjustmentReason: string,
    metadata?: Map<string, any>
  ): AdaptiveLearningRate {
    const enrichedMetadata = new Map(metadata);
    enrichedMetadata.set('adjustmentReason', adjustmentReason);
    
    return new AdaptiveLearningRate(value, LearningRateOrigin.ADAPTIVE, enrichedMetadata);
  }

  /**
   * 手動設定学習率を作成
   * 
   * @param value - 学習率の値
   * @param setBy - 設定者
   * @param metadata - 追加のメタデータ
   * @returns AdaptiveLearningRateインスタンス
   */
  static createManual(
    value: number,
    setBy: string,
    metadata?: Map<string, any>
  ): AdaptiveLearningRate {
    const enrichedMetadata = new Map(metadata);
    enrichedMetadata.set('setBy', setBy);
    
    return new AdaptiveLearningRate(value, LearningRateOrigin.MANUAL, enrichedMetadata);
  }

  /**
   * 学習率の値を取得
   */
  get value(): number {
    return this._value;
  }

  /**
   * 学習率の由来を取得
   */
  get origin(): LearningRateOrigin {
    return this._origin;
  }

  /**
   * 作成日時を取得
   */
  get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  /**
   * メタデータを取得（読み取り専用）
   */
  get metadata(): ReadonlyMap<string, any> {
    return this._metadata;
  }

  /**
   * 変更履歴を取得（読み取り専用）
   */
  get history(): ReadonlyArray<{ value: number; origin: LearningRateOrigin; timestamp: Date }> {
    return this._history;
  }

  /**
   * 学習率を調整した新しいインスタンスを作成
   * 
   * @param newValue - 新しい学習率の値
   * @param newOrigin - 新しい由来
   * @param additionalMetadata - 追加するメタデータ
   * @returns 調整されたAdaptiveLearningRateインスタンス
   */
  adjust(
    newValue: number,
    newOrigin: LearningRateOrigin,
    additionalMetadata: Map<string, any> = new Map()
  ): AdaptiveLearningRate {
    const newMetadata = new Map(this._metadata);
    for (const [key, value] of additionalMetadata) {
      newMetadata.set(key, value);
    }

    const newHistory = [
      ...this._history,
      {
        value: this._value,
        origin: this._origin,
        timestamp: this._createdAt
      }
    ];

    return new AdaptiveLearningRate(newValue, newOrigin, newMetadata, newHistory);
  }

  /**
   * 指数的減衰で学習率を調整
   * 
   * @param decayFactor - 減衰係数（0-1の範囲）
   * @param reason - 調整理由
   * @returns 調整されたAdaptiveLearningRateインスタンス
   */
  exponentialDecay(decayFactor: number, reason: string = 'Exponential decay'): AdaptiveLearningRate {
    if (decayFactor <= 0 || decayFactor > 1) {
      throw new Error('Decay factor must be between 0 and 1');
    }

    const newValue = this._value * decayFactor;
    const metadata = new Map<string, any>([
      ['decayFactor', decayFactor],
      ['adjustmentReason', reason],
      ['previousValue', this._value]
    ]);

    return this.adjust(newValue, LearningRateOrigin.ADAPTIVE, metadata);
  }

  /**
   * ステップベースで学習率を調整
   * 
   * @param stepSize - ステップサイズ
   * @param gamma - 乗数（デフォルト: 0.1）
   * @param reason - 調整理由
   * @returns 調整されたAdaptiveLearningRateインスタンス
   */
  stepDecay(stepSize: number, gamma: number = 0.1, reason: string = 'Step decay'): AdaptiveLearningRate {
    const newValue = this._value * Math.pow(gamma, Math.floor(stepSize));
    const metadata = new Map<string, any>([
      ['stepSize', stepSize],
      ['gamma', gamma],
      ['adjustmentReason', reason],
      ['previousValue', this._value]
    ]);

    return this.adjust(newValue, LearningRateOrigin.ADAPTIVE, metadata);
  }

  /**
   * 学習率が有効な範囲内かどうかを判定
   * 
   * @param minValue - 最小値（デフォルト: 1e-8）
   * @param maxValue - 最大値（デフォルト: 1.0）
   * @returns 有効な場合true
   */
  isValid(minValue: number = 1e-8, maxValue: number = 1.0): boolean {
    return this._value >= minValue && this._value <= maxValue && Number.isFinite(this._value);
  }

  /**
   * 学習率が安定しているかどうかを判定
   * 過去の変更履歴を参考に判定
   * 
   * @param stabilityThreshold - 安定性の閾値（デフォルト: 0.1）
   * @param lookbackCount - 参照する履歴数（デフォルト: 5）
   * @returns 安定している場合true
   */
  isStable(stabilityThreshold: number = 0.1, lookbackCount: number = 5): boolean {
    if (this._history.length < 2) {
      return true; // 履歴が少ない場合は安定とみなす
    }

    const recentHistory = this._history.slice(-lookbackCount);
    if (recentHistory.length < 2) {
      return true;
    }

    // 最近の変更での最大変動率を計算
    let maxChange = 0;
    for (let i = 1; i < recentHistory.length; i++) {
      const change = Math.abs(recentHistory[i].value - recentHistory[i - 1].value) / recentHistory[i - 1].value;
      maxChange = Math.max(maxChange, change);
    }

    return maxChange <= stabilityThreshold;
  }

  /**
   * メタデータ値を取得
   * 
   * @param key - メタデータのキー
   * @returns メタデータ値（存在しない場合undefined）
   */
  getMetadata(key: string): any {
    return this._metadata.get(key);
  }

  /**
   * メタデータが存在するかチェック
   * 
   * @param key - チェックするキー
   * @returns 存在する場合true
   */
  hasMetadata(key: string): boolean {
    return this._metadata.has(key);
  }

  /**
   * JSON表現を取得
   */
  toJSON(): object {
    return {
      value: this._value,
      origin: this._origin,
      createdAt: this._createdAt.toISOString(),
      metadata: Object.fromEntries(this._metadata),
      historyLength: this._history.length
    };
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    return `AdaptiveLearningRate[${this._origin}](value=${this._value}, history=${this._history.length})`;
  }
}