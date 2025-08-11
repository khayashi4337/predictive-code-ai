import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';

/**
 * 期待パターンクラス（クラス図準拠版）
 * クラス図P2_PatternDelta.ExpectedPattern<T extends Context>に対応
 * 
 * @template T - Context インターフェースを継承する型
 */
export class ExpectedPatternV2<T extends Context> {
  private readonly _contextInfo: ContextInfo<T>;

  /**
   * コンストラクタ
   * 
   * @param contextInfo - コンテキスト情報
   */
  constructor(contextInfo: ContextInfo<T>) {
    this._contextInfo = contextInfo;
  }

  /**
   * コンテキスト情報を取得
   */
  get contextInfo(): ContextInfo<T> {
    return this._contextInfo;
  }

  /**
   * 本体データを取得
   */
  get body(): T {
    return this._contextInfo.body;
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    return `ExpectedPattern[${this._contextInfo.toString()}]`;
  }
}