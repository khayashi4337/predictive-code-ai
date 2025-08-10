import { Experience } from '../tag/Experience';
import { AttachedInfo } from '../tag/AttachedInfo';

/**
 * 期待パターンクラス
 * 
 * 予測システムが期待する動作やパターンを表現する。
 * 学習データから抽出された期待される結果や動作を格納し、
 * 実際の結果と比較するための基準として機能する。
 * 
 * @template T - Experience インターフェースを継承する型
 */
export class ExpectedPattern<T extends Experience> {
  private readonly _patternId: string;
  private readonly _patternData: AttachedInfo<T>;
  private readonly _confidence: number;
  private readonly _priority: number;
  private readonly _createdAt: Date;

  /**
   * コンストラクタ
   * 
   * @param patternId - パターンの一意識別子
   * @param patternData - パターンの付帯情報を含むデータ
   * @param confidence - パターンの信頼度（0-1の範囲）
   * @param priority - パターンの優先度（高い値ほど優先度が高い）
   */
  constructor(
    patternId: string,
    patternData: AttachedInfo<T>,
    confidence: number = 0.5,
    priority: number = 1
  ) {
    if (confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    if (priority < 0) {
      throw new Error('Priority must be non-negative');
    }

    this._patternId = patternId;
    this._patternData = patternData;
    this._confidence = confidence;
    this._priority = priority;
    this._createdAt = new Date();
  }

  /**
   * パターンIDを取得
   */
  get patternId(): string {
    return this._patternId;
  }

  /**
   * パターンデータを取得
   */
  get patternData(): AttachedInfo<T> {
    return this._patternData;
  }

  /**
   * 信頼度を取得
   */
  get confidence(): number {
    return this._confidence;
  }

  /**
   * 優先度を取得
   */
  get priority(): number {
    return this._priority;
  }

  /**
   * 作成日時を取得
   */
  get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  /**
   * パターンの本体データを取得
   */
  get body(): T {
    return this._patternData.body;
  }

  /**
   * 信頼度を更新した新しいインスタンスを作成
   * 
   * @param newConfidence - 新しい信頼度
   * @returns 更新されたExpectedPatternインスタンス
   */
  updateConfidence(newConfidence: number): ExpectedPattern<T> {
    return new ExpectedPattern(
      this._patternId,
      this._patternData,
      newConfidence,
      this._priority
    );
  }

  /**
   * 優先度を更新した新しいインスタンスを作成
   * 
   * @param newPriority - 新しい優先度
   * @returns 更新されたExpectedPatternインスタンス
   */
  updatePriority(newPriority: number): ExpectedPattern<T> {
    return new ExpectedPattern(
      this._patternId,
      this._patternData,
      this._confidence,
      newPriority
    );
  }

  /**
   * パターンデータを更新した新しいインスタンスを作成
   * 
   * @param newPatternData - 新しいパターンデータ
   * @returns 更新されたExpectedPatternインスタンス
   */
  updatePatternData(newPatternData: AttachedInfo<T>): ExpectedPattern<T> {
    return new ExpectedPattern(
      this._patternId,
      newPatternData,
      this._confidence,
      this._priority
    );
  }

  /**
   * パターンが有効かどうかを判定
   * 信頼度が閾値以上の場合に有効とみなす
   * 
   * @param threshold - 信頼度の閾値（デフォルト: 0.3）
   * @returns 有効な場合true
   */
  isValid(threshold: number = 0.3): boolean {
    return this._confidence >= threshold;
  }

  /**
   * 他のパターンと比較して優先度が高いかどうかを判定
   * 
   * @param other - 比較対象のパターン
   * @returns 優先度が高い場合true
   */
  hasHigherPriorityThan(other: ExpectedPattern<T>): boolean {
    if (this._priority !== other._priority) {
      return this._priority > other._priority;
    }
    
    // 優先度が同じ場合は信頼度で比較
    return this._confidence > other._confidence;
  }

  /**
   * JSON表現を取得
   */
  toJSON(): object {
    return {
      patternId: this._patternId,
      confidence: this._confidence,
      priority: this._priority,
      createdAt: this._createdAt.toISOString(),
      // patternDataは循環参照を避けるため、要約情報のみ
      patternData: {
        tagsCount: this._patternData.tags.size,
        confidence: this._patternData.statistics.confidenceScore
      }
    };
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    return `ExpectedPattern[${this._patternId}](confidence=${this._confidence}, priority=${this._priority})`;
  }
}