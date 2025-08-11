import { Tag } from './Tag';
import { Context } from './Context';

/**
 * コンテキスト情報クラス
 * クラス図P2_Context.ContextInfo<T extends Context>に対応
 * 
 * タグ集合、統計情報、本体を持つ
 * 
 * @template T - Context インターフェースを継承する型
 */
export class ContextInfo<T extends Context> {
  private readonly _tags: Set<Tag>;
  private readonly _statistics: Map<string, number>;
  private readonly _body: T;

  /**
   * コンストラクタ
   * 
   * @param body - 本体データ
   * @param tags - タグの集合（省略時は空のSet）
   * @param statistics - 統計情報（省略時は空のMap）
   */
  constructor(
    body: T,
    tags: Set<Tag> = new Set(),
    statistics: Map<string, number> = new Map()
  ) {
    this._body = body;
    this._tags = new Set(tags);
    this._statistics = new Map(statistics);
  }

  /**
   * 本体データを取得
   */
  get body(): T {
    return this._body;
  }

  /**
   * タグ集合を取得（読み取り専用）
   */
  get tags(): ReadonlySet<Tag> {
    return this._tags;
  }

  /**
   * 統計情報を取得（読み取り専用）
   */
  get statistics(): ReadonlyMap<string, number> {
    return this._statistics;
  }

  /**
   * タグを追加した新しいContextInfoを生成
   * 
   * @param tag - 追加するタグ
   * @returns 新しい ContextInfo インスタンス
   */
  addTag(tag: Tag): ContextInfo<T> {
    const newTags = new Set(this._tags);
    newTags.add(tag);
    
    return new ContextInfo(
      this._body,
      newTags,
      this._statistics
    );
  }

  /**
   * 統計情報を更新した新しいContextInfoを生成
   * 
   * @param key - 統計キー
   * @param value - 統計値
   * @returns 新しい ContextInfo インスタンス
   */
  updateStatistic(key: string, value: number): ContextInfo<T> {
    const newStatistics = new Map(this._statistics);
    newStatistics.set(key, value);
    
    return new ContextInfo(
      this._body,
      this._tags,
      newStatistics
    );
  }

  /**
   * 指定されたキーの統計値を取得
   * 
   * @param key - 統計キー
   * @returns 統計値（存在しない場合は undefined）
   */
  getStatistic(key: string): number | undefined {
    return this._statistics.get(key);
  }

  /**
   * 指定されたキーのタグを持つかどうか判定
   * 
   * @param key - タグのキー
   * @returns タグが存在する場合 true
   */
  hasTagWithKey(key: string): boolean {
    for (const tag of this._tags) {
      if (tag.key === key) {
        return true;
      }
    }
    return false;
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    return `ContextInfo[tags=${this._tags.size}, statistics=${this._statistics.size}]`;
  }
}