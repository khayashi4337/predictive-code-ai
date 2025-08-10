import { TagType } from './TagType';

/**
 * タグクラス
 * 種別、キー、各型の値を持つ
 * 検索高速化のため、種別に応じて1つの値のみ保持する
 */
export class Tag {
  private readonly _type: TagType;
  private readonly _key: string;
  private readonly _timestampValue?: Date;
  private readonly _stringValue?: string;
  private readonly _numberValue?: number;

  /**
   * 時刻型タグのコンストラクタ
   */
  static createTimestamp(key: string, value: Date): Tag {
    return new Tag(TagType.TIMESTAMP, key, value, undefined, undefined);
  }

  /**
   * 文字列型タグのコンストラクタ
   */
  static createString(key: string, value: string): Tag {
    return new Tag(TagType.STRING, key, undefined, value, undefined);
  }

  /**
   * 数値型タグのコンストラクタ
   */
  static createNumber(key: string, value: number): Tag {
    return new Tag(TagType.NUMBER, key, undefined, undefined, value);
  }

  private constructor(
    type: TagType,
    key: string,
    timestampValue?: Date,
    stringValue?: string,
    numberValue?: number
  ) {
    this._type = type;
    this._key = key;
    this._timestampValue = timestampValue;
    this._stringValue = stringValue;
    this._numberValue = numberValue;
  }

  /**
   * タグの種別を取得
   */
  get type(): TagType {
    return this._type;
  }

  /**
   * タグのキーを取得
   */
  get key(): string {
    return this._key;
  }

  /**
   * 時刻値を取得（時刻型タグの場合のみ）
   */
  get timestampValue(): Date | undefined {
    return this._timestampValue;
  }

  /**
   * 文字列値を取得（文字列型タグの場合のみ）
   */
  get stringValue(): string | undefined {
    return this._stringValue;
  }

  /**
   * 数値を取得（数値型タグの場合のみ）
   */
  get numberValue(): number | undefined {
    return this._numberValue;
  }

  /**
   * タグの値を型に応じて取得
   */
  getValue(): Date | string | number {
    switch (this._type) {
      case TagType.TIMESTAMP:
        return this._timestampValue!;
      case TagType.STRING:
        return this._stringValue!;
      case TagType.NUMBER:
        return this._numberValue!;
      default:
        throw new Error(`Unknown tag type: ${this._type}`);
    }
  }

  /**
   * タグが等しいかどうか判定
   */
  equals(other: Tag): boolean {
    if (this._type !== other._type || this._key !== other._key) {
      return false;
    }

    switch (this._type) {
      case TagType.TIMESTAMP:
        return this._timestampValue?.getTime() === other._timestampValue?.getTime();
      case TagType.STRING:
        return this._stringValue === other._stringValue;
      case TagType.NUMBER:
        return this._numberValue === other._numberValue;
      default:
        return false;
    }
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    const value = this.getValue();
    return `Tag[${this._type}:${this._key}=${value}]`;
  }
}