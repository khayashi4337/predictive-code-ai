import { Experience } from '../tag/Experience';
import { AttachedInfo } from '../tag/AttachedInfo';

/**
 * 実際パターンクラス
 * 
 * システムが実際に観測した動作やパターンを表現する。
 * 実行時に収集されたデータや結果を格納し、
 * 期待パターンとの比較や学習信号の生成に使用される。
 * 
 * @template T - Experience インターフェースを継承する型
 */
export class ActualPattern<T extends Experience> {
  private readonly _patternId: string;
  private readonly _patternData: AttachedInfo<T>;
  private readonly _observedAt: Date;
  private readonly _executionContext: string;
  private readonly _accuracy: number;
  private readonly _metadata: Map<string, any>;

  /**
   * コンストラクタ
   * 
   * @param patternId - パターンの一意識別子
   * @param patternData - パターンの付帯情報を含むデータ
   * @param executionContext - 実行コンテキスト（どこで観測されたか）
   * @param accuracy - パターンの正確性（0-1の範囲）
   * @param metadata - 追加のメタデータ
   */
  constructor(
    patternId: string,
    patternData: AttachedInfo<T>,
    executionContext: string,
    accuracy: number = 1.0,
    metadata: Map<string, any> = new Map()
  ) {
    if (accuracy < 0 || accuracy > 1) {
      throw new Error('Accuracy must be between 0 and 1');
    }

    this._patternId = patternId;
    this._patternData = patternData;
    this._observedAt = new Date();
    this._executionContext = executionContext;
    this._accuracy = accuracy;
    this._metadata = new Map(metadata);
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
   * 観測日時を取得
   */
  get observedAt(): Date {
    return new Date(this._observedAt.getTime());
  }

  /**
   * 実行コンテキストを取得
   */
  get executionContext(): string {
    return this._executionContext;
  }

  /**
   * 正確性を取得
   */
  get accuracy(): number {
    return this._accuracy;
  }

  /**
   * メタデータを取得（読み取り専用）
   */
  get metadata(): ReadonlyMap<string, any> {
    return this._metadata;
  }

  /**
   * パターンの本体データを取得
   */
  get body(): T {
    return this._patternData.body;
  }

  /**
   * 正確性を更新した新しいインスタンスを作成
   * 
   * @param newAccuracy - 新しい正確性
   * @returns 更新されたActualPatternインスタンス
   */
  updateAccuracy(newAccuracy: number): ActualPattern<T> {
    if (newAccuracy < 0 || newAccuracy > 1) {
      throw new Error('Accuracy must be between 0 and 1');
    }

    return new ActualPattern(
      this._patternId,
      this._patternData,
      this._executionContext,
      newAccuracy,
      this._metadata
    );
  }

  /**
   * メタデータを追加/更新した新しいインスタンスを作成
   * 
   * @param key - メタデータのキー
   * @param value - メタデータの値
   * @returns 更新されたActualPatternインスタンス
   */
  addMetadata(key: string, value: any): ActualPattern<T> {
    const newMetadata = new Map(this._metadata);
    newMetadata.set(key, value);

    return new ActualPattern(
      this._patternId,
      this._patternData,
      this._executionContext,
      this._accuracy,
      newMetadata
    );
  }

  /**
   * メタデータを削除した新しいインスタンスを作成
   * 
   * @param key - 削除するメタデータのキー
   * @returns 更新されたActualPatternインスタンス
   */
  removeMetadata(key: string): ActualPattern<T> {
    const newMetadata = new Map(this._metadata);
    newMetadata.delete(key);

    return new ActualPattern(
      this._patternId,
      this._patternData,
      this._executionContext,
      this._accuracy,
      newMetadata
    );
  }

  /**
   * 指定されたメタデータキーが存在するかチェック
   * 
   * @param key - チェックするキー
   * @returns 存在する場合true
   */
  hasMetadata(key: string): boolean {
    return this._metadata.has(key);
  }

  /**
   * 指定されたメタデータ値を取得
   * 
   * @param key - 取得するキー
   * @returns メタデータ値（存在しない場合undefined）
   */
  getMetadata(key: string): any {
    return this._metadata.get(key);
  }

  /**
   * パターンが信頼できるかどうかを判定
   * 正確性が閾値以上の場合に信頼できるとみなす
   * 
   * @param threshold - 正確性の閾値（デフォルト: 0.7）
   * @returns 信頼できる場合true
   */
  isReliable(threshold: number = 0.7): boolean {
    return this._accuracy >= threshold;
  }

  /**
   * パターンがフレッシュかどうかを判定
   * 指定された時間内に観測されたものをフレッシュとみなす
   * 
   * @param maxAgeMs - 最大経過時間（ミリ秒、デフォルト: 1時間）
   * @returns フレッシュな場合true
   */
  isFresh(maxAgeMs: number = 3600000): boolean {
    const now = new Date();
    const age = now.getTime() - this._observedAt.getTime();
    return age <= maxAgeMs;
  }

  /**
   * JSON表現を取得
   */
  toJSON(): object {
    return {
      patternId: this._patternId,
      observedAt: this._observedAt.toISOString(),
      executionContext: this._executionContext,
      accuracy: this._accuracy,
      metadata: Object.fromEntries(this._metadata),
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
    return `ActualPattern[${this._patternId}](accuracy=${this._accuracy}, context=${this._executionContext})`;
  }
}