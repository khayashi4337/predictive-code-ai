import { Tag, TagType, Experience } from '../tag';

/**
 * リンクインデックス
 * タグ種別（時刻、文字列、数値）による3つのMapでインデックス管理
 * 
 * @template T 付帯文脈の型（Experience を継承）- 将来の拡張のため保持
 * @template TLink 層間相対判定リンクの型
 */
export class LinkIndex<T extends Experience, TLink> {
  private readonly byTime: Map<number, TLink[]> = new Map();
  private readonly byString: Map<string, TLink[]> = new Map();
  private readonly byNumber: Map<number, TLink[]> = new Map();

  /**
   * タグとリンクを登録
   * @param tag 登録するタグ
   * @param link 登録するリンク
   * @throws {Error} サポートされていないタグ種別の場合
   */
  register(tag: Tag, link: TLink): void {
    switch (tag.type) {
      case TagType.TIMESTAMP:
        this.addToTimeIndex(tag.timestampValue!.getTime(), link);
        break;
      case TagType.STRING:
        this.addToStringIndex(tag.stringValue!, link);
        break;
      case TagType.NUMBER:
        this.addToNumberIndex(tag.numberValue!, link);
        break;
      default:
        throw new Error(`Unsupported tag type: ${tag.type}`);
    }
  }

  /**
   * タグに関連するリンクを取得
   * @param tag 検索するタグ
   * @returns リンクの配列（見つからない場合は空配列）
   * @throws {Error} サポートされていないタグ種別の場合
   */
  get(tag: Tag): TLink[] {
    switch (tag.type) {
      case TagType.TIMESTAMP:
        return this.getFromTimeIndex(tag.timestampValue!.getTime());
      case TagType.STRING:
        return this.getFromStringIndex(tag.stringValue!);
      case TagType.NUMBER:
        return this.getFromNumberIndex(tag.numberValue!);
      default:
        throw new Error(`Unsupported tag type: ${tag.type}`);
    }
  }

  /**
   * タグに関連するリンクを削除
   * @param tag 削除対象のタグ
   * @param link 削除するリンク（指定しない場合はタグに関連するすべてのリンクを削除）
   * @returns 削除されたかどうか
   * @throws {Error} サポートされていないタグ種別の場合
   */
  remove(tag: Tag, link?: TLink): boolean {
    switch (tag.type) {
      case TagType.TIMESTAMP:
        return this.removeFromTimeIndex(tag.timestampValue!.getTime(), link);
      case TagType.STRING:
        return this.removeFromStringIndex(tag.stringValue!, link);
      case TagType.NUMBER:
        return this.removeFromNumberIndex(tag.numberValue!, link);
      default:
        throw new Error(`Unsupported tag type: ${tag.type}`);
    }
  }

  /**
   * 指定した時刻範囲のリンクを取得
   * @param startTime 開始時刻（ミリ秒）
   * @param endTime 終了時刻（ミリ秒）
   * @returns リンクの配列
   */
  getByTimeRange(startTime: number, endTime: number): TLink[] {
    const result: TLink[] = [];
    for (const [time, links] of this.byTime) {
      if (time >= startTime && time <= endTime) {
        result.push(...links);
      }
    }
    return result;
  }

  /**
   * 指定した数値範囲のリンクを取得
   * @param minValue 最小値
   * @param maxValue 最大値
   * @returns リンクの配列
   */
  getByNumberRange(minValue: number, maxValue: number): TLink[] {
    const result: TLink[] = [];
    for (const [number, links] of this.byNumber) {
      if (number >= minValue && number <= maxValue) {
        result.push(...links);
      }
    }
    return result;
  }

  /**
   * 文字列の部分マッチでリンクを取得
   * @param pattern 検索パターン
   * @param ignoreCase 大文字小文字を無視するか
   * @returns リンクの配列
   */
  getByStringPattern(pattern: string, ignoreCase: boolean = false): TLink[] {
    const result: TLink[] = [];
    const searchPattern = ignoreCase ? pattern.toLowerCase() : pattern;
    
    for (const [str, links] of this.byString) {
      const searchTarget = ignoreCase ? str.toLowerCase() : str;
      if (searchTarget.includes(searchPattern)) {
        result.push(...links);
      }
    }
    return result;
  }

  /**
   * インデックスをクリア
   */
  clear(): void {
    this.byTime.clear();
    this.byString.clear();
    this.byNumber.clear();
  }

  /**
   * 型情報を取得（デバッグ用）
   * @returns 型名の情報
   */
  getTypeInfo(): string {
    return `LinkIndex<T extends Experience, TLink>`;
  }

  /**
   * Experience の型制約をチェック（将来の拡張用）
   * @param experience チェックする Experience
   * @returns 常に true（型制約により保証）
   */
  validateExperience(experience: T): boolean {
    return experience !== null && typeof experience === 'object';
  }

  /**
   * インデックスのサイズを取得
   */
  size(): { time: number; string: number; number: number; total: number } {
    const timeEntries = Array.from(this.byTime.values()).reduce((sum, links) => sum + links.length, 0);
    const stringEntries = Array.from(this.byString.values()).reduce((sum, links) => sum + links.length, 0);
    const numberEntries = Array.from(this.byNumber.values()).reduce((sum, links) => sum + links.length, 0);
    
    return {
      time: timeEntries,
      string: stringEntries,
      number: numberEntries,
      total: timeEntries + stringEntries + numberEntries
    };
  }

  // プライベートヘルパーメソッド

  private addToTimeIndex(time: number, link: TLink): void {
    if (!this.byTime.has(time)) {
      this.byTime.set(time, []);
    }
    this.byTime.get(time)!.push(link);
  }

  private addToStringIndex(str: string, link: TLink): void {
    if (!this.byString.has(str)) {
      this.byString.set(str, []);
    }
    this.byString.get(str)!.push(link);
  }

  private addToNumberIndex(num: number, link: TLink): void {
    if (!this.byNumber.has(num)) {
      this.byNumber.set(num, []);
    }
    this.byNumber.get(num)!.push(link);
  }

  private getFromTimeIndex(time: number): TLink[] {
    return this.byTime.get(time) || [];
  }

  private getFromStringIndex(str: string): TLink[] {
    return this.byString.get(str) || [];
  }

  private getFromNumberIndex(num: number): TLink[] {
    return this.byNumber.get(num) || [];
  }

  private removeFromTimeIndex(time: number, link?: TLink): boolean {
    const links = this.byTime.get(time);
    if (!links) return false;

    if (link === undefined) {
      // すべてのリンクを削除
      this.byTime.delete(time);
      return true;
    } else {
      // 特定のリンクを削除
      const index = links.indexOf(link);
      if (index === -1) return false;
      
      links.splice(index, 1);
      if (links.length === 0) {
        this.byTime.delete(time);
      }
      return true;
    }
  }

  private removeFromStringIndex(str: string, link?: TLink): boolean {
    const links = this.byString.get(str);
    if (!links) return false;

    if (link === undefined) {
      // すべてのリンクを削除
      this.byString.delete(str);
      return true;
    } else {
      // 特定のリンクを削除
      const index = links.indexOf(link);
      if (index === -1) return false;
      
      links.splice(index, 1);
      if (links.length === 0) {
        this.byString.delete(str);
      }
      return true;
    }
  }

  private removeFromNumberIndex(num: number, link?: TLink): boolean {
    const links = this.byNumber.get(num);
    if (!links) return false;

    if (link === undefined) {
      // すべてのリンクを削除
      this.byNumber.delete(num);
      return true;
    } else {
      // 特定のリンクを削除
      const index = links.indexOf(link);
      if (index === -1) return false;
      
      links.splice(index, 1);
      if (links.length === 0) {
        this.byNumber.delete(num);
      }
      return true;
    }
  }
}