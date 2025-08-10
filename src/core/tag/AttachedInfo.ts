import { Tag } from './Tag';
import { Experience } from './Experience';

/**
 * 統計情報インターフェース
 * 付帯情報の統計的な属性を表現
 */
export interface StatisticalInfo {
  /** データポイント数 */
  count: number;
  
  /** 最初に記録された時刻 */
  firstRecorded: Date;
  
  /** 最後に更新された時刻 */
  lastUpdated: Date;
  
  /** 信頼度スコア（0-1の範囲） */
  confidenceScore: number;
  
  /** 使用頻度 */
  usageFrequency: number;
}

/**
 * 付帯情報クラス
 * タグ集合、統計情報、本体を持つ
 * 
 * @template T - Experience インターフェースを継承する型
 */
export class AttachedInfo<T extends Experience> {
  private readonly _tags: Set<Tag>;
  private readonly _statistics: StatisticalInfo;
  private readonly _body: T;

  /**
   * コンストラクタ
   * 
   * @param body - 本体データ
   * @param tags - タグの集合（省略時は空のSet）
   * @param statistics - 統計情報（省略時はデフォルト値）
   */
  constructor(
    body: T,
    tags: Set<Tag> = new Set(),
    statistics?: Partial<StatisticalInfo>
  ) {
    this._body = body;
    this._tags = new Set(tags);
    
    const now = new Date();
    this._statistics = {
      count: statistics?.count ?? 1,
      firstRecorded: statistics?.firstRecorded ?? now,
      lastUpdated: statistics?.lastUpdated ?? now,
      confidenceScore: statistics?.confidenceScore ?? 0.5,
      usageFrequency: statistics?.usageFrequency ?? 0,
      ...statistics
    };
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
   * 統計情報を取得
   */
  get statistics(): Readonly<StatisticalInfo> {
    return { ...this._statistics };
  }

  /**
   * タグを追加
   * 
   * @param tag - 追加するタグ
   * @returns 新しい AttachedInfo インスタンス
   */
  addTag(tag: Tag): AttachedInfo<T> {
    const newTags = new Set(this._tags);
    newTags.add(tag);
    
    return new AttachedInfo(
      this._body,
      newTags,
      {
        ...this._statistics,
        lastUpdated: new Date()
      }
    );
  }

  /**
   * タグを削除
   * 
   * @param tag - 削除するタグ
   * @returns 新しい AttachedInfo インスタンス
   */
  removeTag(tag: Tag): AttachedInfo<T> {
    const newTags = new Set(this._tags);
    for (const existingTag of newTags) {
      if (existingTag.equals(tag)) {
        newTags.delete(existingTag);
        break;
      }
    }
    
    return new AttachedInfo(
      this._body,
      newTags,
      {
        ...this._statistics,
        lastUpdated: new Date()
      }
    );
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
   * 指定されたキーのタグを取得
   * 
   * @param key - タグのキー
   * @returns 該当するタグの配列
   */
  getTagsByKey(key: string): Tag[] {
    return Array.from(this._tags).filter(tag => tag.key === key);
  }

  /**
   * 統計情報を更新
   * 
   * @param updates - 更新する統計情報
   * @returns 新しい AttachedInfo インスタンス
   */
  updateStatistics(updates: Partial<StatisticalInfo>): AttachedInfo<T> {
    return new AttachedInfo(
      this._body,
      this._tags,
      {
        ...this._statistics,
        ...updates,
        lastUpdated: new Date()
      }
    );
  }

  /**
   * 使用頻度を増加
   * 
   * @param increment - 増加量（デフォルト: 1）
   * @returns 新しい AttachedInfo インスタンス
   */
  incrementUsage(increment: number = 1): AttachedInfo<T> {
    return this.updateStatistics({
      usageFrequency: this._statistics.usageFrequency + increment,
      count: this._statistics.count + 1
    });
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    return `AttachedInfo[tags=${this._tags.size}, confidence=${this._statistics.confidenceScore}]`;
  }
}