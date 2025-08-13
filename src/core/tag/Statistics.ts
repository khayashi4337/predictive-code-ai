/**
 * 統計情報の値型定義
 * コンテキストに付随する様々な統計データを型安全に管理
 */
export type StatisticValue = number | boolean | string | Date;

/**
 * 型安全な統計情報管理クラス
 * 各種統計データを型別に安全に格納・取得する機能を提供
 */
export class Statistics {
  private data = new Map<string, StatisticValue>();

  /**
   * 数値統計を設定
   * @param key - 統計名
   * @param value - 数値
   */
  setNumber(key: string, value: number): void {
    this.data.set(key, value);
  }

  /**
   * 真偽値統計を設定
   * @param key - 統計名
   * @param value - 真偽値
   */
  setBoolean(key: string, value: boolean): void {
    this.data.set(key, value);
  }

  /**
   * 文字列統計を設定
   * @param key - 統計名
   * @param value - 文字列
   */
  setString(key: string, value: string): void {
    this.data.set(key, value);
  }

  /**
   * 日時統計を設定
   * @param key - 統計名
   * @param value - 日時
   */
  setDate(key: string, value: Date): void {
    this.data.set(key, value);
  }

  /**
   * 数値統計を取得
   * @param key - 統計名
   * @returns 数値または undefined
   */
  getNumber(key: string): number | undefined {
    const value = this.data.get(key);
    return typeof value === 'number' ? value : undefined;
  }

  /**
   * 真偽値統計を取得
   * @param key - 統計名
   * @returns 真偽値または undefined
   */
  getBoolean(key: string): boolean | undefined {
    const value = this.data.get(key);
    return typeof value === 'boolean' ? value : undefined;
  }

  /**
   * 文字列統計を取得
   * @param key - 統計名
   * @returns 文字列または undefined
   */
  getString(key: string): string | undefined {
    const value = this.data.get(key);
    return typeof value === 'string' ? value : undefined;
  }

  /**
   * 日時統計を取得
   * @param key - 統計名
   * @returns 日時または undefined
   */
  getDate(key: string): Date | undefined {
    const value = this.data.get(key);
    return value instanceof Date ? value : undefined;
  }

  /**
   * 生の値を取得（型チェック無し）
   * @param key - 統計名
   * @returns 値または undefined
   */
  getValue(key: string): StatisticValue | undefined {
    return this.data.get(key);
  }

  /**
   * 統計が存在するかチェック
   * @param key - 統計名
   * @returns 存在する場合 true
   */
  has(key: string): boolean {
    return this.data.has(key);
  }

  /**
   * 統計を削除
   * @param key - 統計名
   * @returns 削除された場合 true
   */
  delete(key: string): boolean {
    return this.data.delete(key);
  }

  /**
   * すべての統計をクリア
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * 統計の数を取得
   * @returns 統計の数
   */
  size(): number {
    return this.data.size;
  }

  /**
   * すべてのキーを取得
   * @returns キーの配列
   */
  keys(): string[] {
    return Array.from(this.data.keys());
  }

  /**
   * すべての値を取得
   * @returns 値の配列
   */
  values(): StatisticValue[] {
    return Array.from(this.data.values());
  }

  /**
   * キーと値のペアを取得
   * @returns [キー, 値] の配列
   */
  entries(): [string, StatisticValue][] {
    return Array.from(this.data.entries());
  }

  /**
   * 別のStatisticsオブジェクトをマージ
   * @param other - マージする統計オブジェクト
   * @param overwrite - 既存の値を上書きするか（デフォルト: true）
   */
  merge(other: Statistics, overwrite: boolean = true): void {
    for (const [key, value] of other.entries()) {
      if (overwrite || !this.has(key)) {
        this.data.set(key, value);
      }
    }
  }

  /**
   * 複製を作成
   * @returns 新しいStatisticsオブジェクト
   */
  clone(): Statistics {
    const cloned = new Statistics();
    for (const [key, value] of this.data) {
      cloned.data.set(key, value);
    }
    return cloned;
  }

  /**
   * JSON形式でエクスポート
   * @returns JSON互換オブジェクト
   */
  toJSON(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.data) {
      if (value instanceof Date) {
        result[key] = { type: 'Date', value: value.toISOString() };
      } else {
        result[key] = { type: typeof value, value: value };
      }
    }
    return result;
  }

  /**
   * JSONからインポート
   * @param json - JSON互換オブジェクト
   * @returns 新しいStatisticsオブジェクト
   */
  static fromJSON(json: Record<string, any>): Statistics {
    const statistics = new Statistics();
    for (const [key, entry] of Object.entries(json)) {
      if (entry && typeof entry === 'object' && 'type' in entry && 'value' in entry) {
        switch (entry.type) {
          case 'Date':
            statistics.setDate(key, new Date(entry.value));
            break;
          case 'number':
            statistics.setNumber(key, entry.value);
            break;
          case 'boolean':
            statistics.setBoolean(key, entry.value);
            break;
          case 'string':
            statistics.setString(key, entry.value);
            break;
        }
      }
    }
    return statistics;
  }

  /**
   * デバッグ用文字列表現
   * @returns 文字列表現
   */
  toString(): string {
    const entries = Array.from(this.data.entries())
      .map(([key, value]) => `${key}: ${value} (${typeof value})`)
      .join(', ');
    return `Statistics{${entries}}`;
  }

  /**
   * Iterator実装 - Object.fromEntriesとの互換性のため
   * @returns イテレータ
   */
  [Symbol.iterator](): Iterator<[string, StatisticValue]> {
    return this.data.entries();
  }
}