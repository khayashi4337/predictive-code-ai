/**
 * パラメータ範囲インターフェース
 * インデックス範囲を表現するための型
 */
export interface ParameterRange {
  /** 開始インデックス（包含） */
  startIndex: number;
  
  /** 終了インデックス（排他） */
  endIndex: number;
  
  /** 範囲の説明（省略可） */
  description?: string;
}

/**
 * 更新スコープクラス
 * 
 * パラメータID集合、マスク、インデックス範囲を保持し、
 * 学習時にどのパラメータを更新すべきかを定義する。
 * 選択的学習や効率的なパラメータ更新に使用される。
 */
export class UpdateScope {
  private readonly _parameterIds: Set<string>;
  private readonly _mask: boolean[];
  private readonly _ranges: ParameterRange[];
  private readonly _createdAt: Date;
  private readonly _scopeId: string;
  private readonly _metadata: Map<string, any>;

  /**
   * コンストラクタ
   * 
   * @param parameterIds - 更新対象のパラメータID集合
   * @param mask - パラメータマスク配列
   * @param ranges - インデックス範囲配列
   * @param scopeId - スコープの識別子（省略時は自動生成）
   * @param metadata - 追加のメタデータ
   */
  constructor(
    parameterIds: Set<string> = new Set(),
    mask: boolean[] = [],
    ranges: ParameterRange[] = [],
    scopeId?: string,
    metadata: Map<string, any> = new Map()
  ) {
    this._parameterIds = new Set(parameterIds);
    this._mask = [...mask];
    this._ranges = [...ranges];
    this._createdAt = new Date();
    this._scopeId = scopeId ?? this.generateScopeId();
    this._metadata = new Map(metadata);

    this.validateRanges();
  }

  /**
   * 全パラメータを対象とするスコープを作成
   * 
   * @param parameterCount - パラメータ数
   * @param scopeId - スコープの識別子
   * @returns UpdateScopeインスタンス
   */
  static createFullScope(parameterCount: number, scopeId?: string): UpdateScope {
    const mask = new Array(parameterCount).fill(true);
    const ranges = [{
      startIndex: 0,
      endIndex: parameterCount,
      description: 'Full parameter range'
    }];

    return new UpdateScope(new Set(), mask, ranges, scopeId);
  }

  /**
   * 指定されたパラメータIDのみを対象とするスコープを作成
   * 
   * @param parameterIds - 対象パラメータID配列
   * @param scopeId - スコープの識別子
   * @returns UpdateScopeインスタンス
   */
  static createParameterScope(parameterIds: string[], scopeId?: string): UpdateScope {
    return new UpdateScope(new Set(parameterIds), [], [], scopeId);
  }

  /**
   * 指定されたインデックス範囲のみを対象とするスコープを作成
   * 
   * @param ranges - インデックス範囲配列
   * @param totalParameters - 総パラメータ数
   * @param scopeId - スコープの識別子
   * @returns UpdateScopeインスタンス
   */
  static createRangeScope(
    ranges: ParameterRange[],
    totalParameters: number,
    scopeId?: string
  ): UpdateScope {
    const mask = new Array(totalParameters).fill(false);
    
    for (const range of ranges) {
      for (let i = range.startIndex; i < range.endIndex && i < totalParameters; i++) {
        mask[i] = true;
      }
    }

    return new UpdateScope(new Set(), mask, ranges, scopeId);
  }

  /**
   * スコープIDを取得
   */
  get scopeId(): string {
    return this._scopeId;
  }

  /**
   * パラメータID集合を取得（読み取り専用）
   */
  get parameterIds(): ReadonlySet<string> {
    return this._parameterIds;
  }

  /**
   * パラメータマスクを取得（読み取り専用）
   */
  get mask(): ReadonlyArray<boolean> {
    return this._mask;
  }

  /**
   * インデックス範囲を取得（読み取り専用）
   */
  get ranges(): ReadonlyArray<ParameterRange> {
    return this._ranges;
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
   * パラメータIDを追加した新しいスコープを作成
   * 
   * @param parameterId - 追加するパラメータID
   * @returns 新しいUpdateScopeインスタンス
   */
  addParameterId(parameterId: string): UpdateScope {
    const newParameterIds = new Set(this._parameterIds);
    newParameterIds.add(parameterId);

    return new UpdateScope(
      newParameterIds,
      this._mask,
      this._ranges,
      this._scopeId,
      this._metadata
    );
  }

  /**
   * パラメータIDを削除した新しいスコープを作成
   * 
   * @param parameterId - 削除するパラメータID
   * @returns 新しいUpdateScopeインスタンス
   */
  removeParameterId(parameterId: string): UpdateScope {
    const newParameterIds = new Set(this._parameterIds);
    newParameterIds.delete(parameterId);

    return new UpdateScope(
      newParameterIds,
      this._mask,
      this._ranges,
      this._scopeId,
      this._metadata
    );
  }

  /**
   * インデックス範囲を追加した新しいスコープを作成
   * 
   * @param range - 追加するインデックス範囲
   * @returns 新しいUpdateScopeインスタンス
   */
  addRange(range: ParameterRange): UpdateScope {
    const newRanges = [...this._ranges, range];
    
    // マスクも更新
    const newMask = [...this._mask];
    for (let i = range.startIndex; i < range.endIndex && i < newMask.length; i++) {
      newMask[i] = true;
    }

    return new UpdateScope(
      this._parameterIds,
      newMask,
      newRanges,
      this._scopeId,
      this._metadata
    );
  }

  /**
   * 指定されたパラメータIDが更新対象かどうか判定
   * 
   * @param parameterId - チェックするパラメータID
   * @returns 更新対象の場合true
   */
  includesParameter(parameterId: string): boolean {
    return this._parameterIds.has(parameterId);
  }

  /**
   * 指定されたインデックスが更新対象かどうか判定
   * 
   * @param index - チェックするインデックス
   * @returns 更新対象の場合true
   */
  includesIndex(index: number): boolean {
    // マスクでチェック
    if (index >= 0 && index < this._mask.length) {
      return this._mask[index];
    }

    // 範囲でチェック
    for (const range of this._ranges) {
      if (index >= range.startIndex && index < range.endIndex) {
        return true;
      }
    }

    return false;
  }

  /**
   * 他のスコープと結合した新しいスコープを作成
   * 
   * @param other - 結合するスコープ
   * @param newScopeId - 新しいスコープID（省略時は自動生成）
   * @returns 結合されたUpdateScopeインスタンス
   */
  union(other: UpdateScope, newScopeId?: string): UpdateScope {
    const unionParameterIds = new Set([...this._parameterIds, ...other._parameterIds]);
    const unionRanges = [...this._ranges, ...other._ranges];
    
    // マスクを結合（OR演算）
    const maxLength = Math.max(this._mask.length, other._mask.length);
    const unionMask = new Array(maxLength);
    
    for (let i = 0; i < maxLength; i++) {
      const thisMask = i < this._mask.length ? this._mask[i] : false;
      const otherMask = i < other._mask.length ? other._mask[i] : false;
      unionMask[i] = thisMask || otherMask;
    }

    return new UpdateScope(
      unionParameterIds,
      unionMask,
      unionRanges,
      newScopeId
    );
  }

  /**
   * 他のスコープとの共通部分を持つ新しいスコープを作成
   * 
   * @param other - 共通部分を取るスコープ
   * @param newScopeId - 新しいスコープID（省略時は自動生成）
   * @returns 共通部分のUpdateScopeインスタンス
   */
  intersection(other: UpdateScope, newScopeId?: string): UpdateScope {
    const intersectionParameterIds = new Set<string>();
    for (const id of this._parameterIds) {
      if (other._parameterIds.has(id)) {
        intersectionParameterIds.add(id);
      }
    }

    // マスクを共通部分で結合（AND演算）
    const maxLength = Math.max(this._mask.length, other._mask.length);
    const intersectionMask = new Array(maxLength);
    
    for (let i = 0; i < maxLength; i++) {
      const thisMask = i < this._mask.length ? this._mask[i] : false;
      const otherMask = i < other._mask.length ? other._mask[i] : false;
      intersectionMask[i] = thisMask && otherMask;
    }

    return new UpdateScope(
      intersectionParameterIds,
      intersectionMask,
      [],
      newScopeId
    );
  }

  /**
   * スコープが空かどうか判定
   * 
   * @returns 空の場合true
   */
  isEmpty(): boolean {
    if (this._parameterIds.size > 0) {
      return false;
    }

    for (const maskValue of this._mask) {
      if (maskValue) {
        return false;
      }
    }

    return this._ranges.length === 0;
  }

  /**
   * 影響を受けるパラメータ数を取得
   * 
   * @returns パラメータ数
   */
  getAffectedParameterCount(): number {
    let count = this._parameterIds.size;
    
    for (const maskValue of this._mask) {
      if (maskValue) {
        count++;
      }
    }

    for (const range of this._ranges) {
      count += range.endIndex - range.startIndex;
    }

    return count;
  }

  /**
   * スコープIDを自動生成
   */
  private generateScopeId(): string {
    const timestamp = this._createdAt.getTime().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `scope_${timestamp}_${random}`;
  }

  /**
   * 範囲の妥当性を検証
   */
  private validateRanges(): void {
    for (const range of this._ranges) {
      if (range.startIndex < 0) {
        throw new Error('Range start index must be non-negative');
      }
      
      if (range.endIndex <= range.startIndex) {
        throw new Error('Range end index must be greater than start index');
      }
    }
  }

  /**
   * JSON表現を取得
   */
  toJSON(): object {
    return {
      scopeId: this._scopeId,
      parameterIds: Array.from(this._parameterIds),
      maskLength: this._mask.length,
      maskTrueCount: this._mask.filter(Boolean).length,
      ranges: this._ranges,
      createdAt: this._createdAt.toISOString(),
      metadata: Object.fromEntries(this._metadata)
    };
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    const paramCount = this._parameterIds.size;
    const maskCount = this._mask.filter(Boolean).length;
    const rangeCount = this._ranges.length;
    
    return `UpdateScope[${this._scopeId}](params=${paramCount}, mask=${maskCount}, ranges=${rangeCount})`;
  }
}