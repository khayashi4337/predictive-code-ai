import { Experience } from '../tag/Experience';
import { ExpectedPattern } from './ExpectedPattern';
import { ActualPattern } from './ActualPattern';
import { AttachedInfo } from '../tag/AttachedInfo';

/**
 * 差分の種別を定義するenum
 */
export enum DeltaType {
  /** 一致 - 期待と実際が一致 */
  MATCH = 'match',
  
  /** 部分一致 - 期待と実際が部分的に一致 */
  PARTIAL_MATCH = 'partial_match',
  
  /** 不一致 - 期待と実際が不一致 */
  MISMATCH = 'mismatch',
  
  /** 期待値なし - 実際のみ存在 */
  UNEXPECTED = 'unexpected',
  
  /** 実際値なし - 期待のみ存在 */
  MISSING = 'missing'
}

/**
 * 相対差分クラス
 * 
 * 期待パターンと実際パターンの差分を表現し、
 * その大きさと付帯情報を保持する。
 * 学習信号の生成や予測精度の評価に使用される。
 * 
 * @template T - Experience インターフェースを継承する型
 */
export class RelativeDelta<T extends Experience> {
  private readonly _expectedPattern?: ExpectedPattern<T>;
  private readonly _actualPattern?: ActualPattern<T>;
  private readonly _deltaType: DeltaType;
  private readonly _magnitude: number;
  private readonly _attachedInfo: AttachedInfo<T>;
  private readonly _computedAt: Date;
  private readonly _notes: string[];

  /**
   * コンストラクタ
   * 
   * @param expectedPattern - 期待パターン（省略可）
   * @param actualPattern - 実際パターン（省略可）
   * @param deltaType - 差分の種別
   * @param magnitude - 差分の大きさ（0-1の範囲、0=完全一致、1=完全不一致）
   * @param attachedInfo - 付帯情報
   * @param notes - 差分に関する追加メモ
   */
  constructor(
    expectedPattern: ExpectedPattern<T> | undefined,
    actualPattern: ActualPattern<T> | undefined,
    deltaType: DeltaType,
    magnitude: number,
    attachedInfo: AttachedInfo<T>,
    notes: string[] = []
  ) {
    if (!expectedPattern && !actualPattern) {
      throw new Error('At least one pattern (expected or actual) must be provided');
    }

    if (magnitude < 0 || magnitude > 1) {
      throw new Error('Magnitude must be between 0 and 1');
    }

    this._expectedPattern = expectedPattern;
    this._actualPattern = actualPattern;
    this._deltaType = deltaType;
    this._magnitude = magnitude;
    this._attachedInfo = attachedInfo;
    this._computedAt = new Date();
    this._notes = [...notes];
  }

  /**
   * 期待パターンと実際パターンから差分を計算して作成
   * 
   * @param expected - 期待パターン
   * @param actual - 実際パターン
   * @param attachedInfo - 付帯情報
   * @returns 計算された差分
   */
  static computeFromPatterns<T extends Experience>(
    expected: ExpectedPattern<T>,
    actual: ActualPattern<T>,
    attachedInfo: AttachedInfo<T>
  ): RelativeDelta<T> {
    // パターンIDが一致するかチェック
    const idsMatch = expected.patternId === actual.patternId;
    
    // 信頼度と正確性の差分を計算
    const confidenceDiff = Math.abs(expected.confidence - actual.accuracy);
    
    // 差分の種別と大きさを決定
    let deltaType: DeltaType;
    let magnitude: number;
    
    if (idsMatch && confidenceDiff < 0.1) {
      deltaType = DeltaType.MATCH;
      magnitude = confidenceDiff;
    } else if (idsMatch && confidenceDiff < 0.3) {
      deltaType = DeltaType.PARTIAL_MATCH;
      magnitude = confidenceDiff;
    } else {
      deltaType = DeltaType.MISMATCH;
      magnitude = Math.min(1.0, confidenceDiff + (idsMatch ? 0 : 0.5));
    }

    const notes = [
      `Pattern ID match: ${idsMatch}`,
      `Confidence difference: ${confidenceDiff.toFixed(3)}`
    ];

    return new RelativeDelta(
      expected,
      actual,
      deltaType,
      magnitude,
      attachedInfo,
      notes
    );
  }

  /**
   * 期待パターンのみから作成（実際パターンが存在しない場合）
   * 
   * @param expected - 期待パターン
   * @param attachedInfo - 付帯情報
   * @returns 差分インスタンス
   */
  static fromMissingActual<T extends Experience>(
    expected: ExpectedPattern<T>,
    attachedInfo: AttachedInfo<T>
  ): RelativeDelta<T> {
    return new RelativeDelta(
      expected,
      undefined,
      DeltaType.MISSING,
      expected.confidence, // 期待値の信頼度を大きさとする
      attachedInfo,
      ['Missing actual pattern']
    );
  }

  /**
   * 実際パターンのみから作成（期待パターンが存在しない場合）
   * 
   * @param actual - 実際パターン
   * @param attachedInfo - 付帯情報
   * @returns 差分インスタンス
   */
  static fromUnexpectedActual<T extends Experience>(
    actual: ActualPattern<T>,
    attachedInfo: AttachedInfo<T>
  ): RelativeDelta<T> {
    return new RelativeDelta(
      undefined,
      actual,
      DeltaType.UNEXPECTED,
      1.0 - actual.accuracy, // 正確性の逆を大きさとする
      attachedInfo,
      ['Unexpected actual pattern']
    );
  }

  /**
   * 期待パターンを取得
   */
  get expectedPattern(): ExpectedPattern<T> | undefined {
    return this._expectedPattern;
  }

  /**
   * 実際パターンを取得
   */
  get actualPattern(): ActualPattern<T> | undefined {
    return this._actualPattern;
  }

  /**
   * 差分種別を取得
   */
  get deltaType(): DeltaType {
    return this._deltaType;
  }

  /**
   * 差分の大きさを取得
   */
  get magnitude(): number {
    return this._magnitude;
  }

  /**
   * 付帯情報を取得
   */
  get attachedInfo(): AttachedInfo<T> {
    return this._attachedInfo;
  }

  /**
   * 計算日時を取得
   */
  get computedAt(): Date {
    return new Date(this._computedAt.getTime());
  }

  /**
   * メモを取得（読み取り専用）
   */
  get notes(): ReadonlyArray<string> {
    return this._notes;
  }

  /**
   * 差分が重要かどうかを判定
   * 大きさが閾値以上の場合に重要とみなす
   * 
   * @param threshold - 重要度の閾値（デフォルト: 0.3）
   * @returns 重要な場合true
   */
  isSignificant(threshold: number = 0.3): boolean {
    return this._magnitude >= threshold;
  }

  /**
   * 差分が改善を示すかどうかを判定
   * 
   * @returns 改善の場合true
   */
  isImprovement(): boolean {
    if (!this._expectedPattern || !this._actualPattern) {
      return false;
    }

    // 実際の正確性が期待の信頼度を上回る場合は改善
    return this._actualPattern.accuracy > this._expectedPattern.confidence;
  }

  /**
   * 差分が劣化を示すかどうかを判定
   * 
   * @returns 劣化の場合true
   */
  isDegradation(): boolean {
    if (!this._expectedPattern || !this._actualPattern) {
      return this._deltaType === DeltaType.MISSING || this._deltaType === DeltaType.UNEXPECTED;
    }

    // 実際の正確性が期待の信頼度を大きく下回る場合は劣化
    return this._actualPattern.accuracy < this._expectedPattern.confidence - 0.2;
  }

  /**
   * メモを追加した新しいインスタンスを作成
   * 
   * @param note - 追加するメモ
   * @returns 更新されたRelativeDeltaインスタンス
   */
  addNote(note: string): RelativeDelta<T> {
    return new RelativeDelta(
      this._expectedPattern,
      this._actualPattern,
      this._deltaType,
      this._magnitude,
      this._attachedInfo,
      [...this._notes, note]
    );
  }

  /**
   * JSON表現を取得
   */
  toJSON(): object {
    return {
      deltaType: this._deltaType,
      magnitude: this._magnitude,
      computedAt: this._computedAt.toISOString(),
      notes: this._notes,
      hasExpectedPattern: !!this._expectedPattern,
      hasActualPattern: !!this._actualPattern,
      expectedPatternId: this._expectedPattern?.patternId,
      actualPatternId: this._actualPattern?.patternId
    };
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    const hasExpected = !!this._expectedPattern;
    const hasActual = !!this._actualPattern;
    
    return `RelativeDelta[${this._deltaType}](magnitude=${this._magnitude.toFixed(3)}, expected=${hasExpected}, actual=${hasActual})`;
  }
}