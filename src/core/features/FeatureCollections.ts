import { Feature, VectorFeature, StatisticalFeature, TagFeature, TemporalFeature } from './FeatureInterfaces';

/**
 * 特徴量リスト（ArrayList<Feature>相当）
 * 順序付きの特徴量コレクション
 */
export class FeatureList {
  private features: Feature[] = [];

  /**
   * 特徴量を末尾に追加
   * @param feature - 追加する特徴量
   */
  add(feature: Feature): void {
    this.features.push(feature);
  }

  /**
   * 指定位置に特徴量を挿入
   * @param index - 挿入位置
   * @param feature - 挿入する特徴量
   */
  insert(index: number, feature: Feature): void {
    if (index < 0 || index > this.features.length) {
      throw new Error(`Index ${index} is out of bounds`);
    }
    this.features.splice(index, 0, feature);
  }

  /**
   * 指定位置の特徴量を取得
   * @param index - インデックス
   * @returns 特徴量、範囲外の場合undefined
   */
  get(index: number): Feature | undefined {
    return this.features[index];
  }

  /**
   * 指定位置の特徴量を削除
   * @param index - 削除位置
   * @returns 削除された特徴量、範囲外の場合undefined
   */
  removeAt(index: number): Feature | undefined {
    if (index < 0 || index >= this.features.length) {
      return undefined;
    }
    return this.features.splice(index, 1)[0];
  }

  /**
   * 名前で特徴量を削除
   * @param name - 削除する特徴量名
   * @returns 削除された場合true
   */
  removeByName(name: string): boolean {
    const index = this.features.findIndex(f => f.name === name);
    if (index >= 0) {
      this.features.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 名前で特徴量を検索
   * @param name - 検索する特徴量名
   * @returns 特徴量、見つからない場合undefined
   */
  findByName(name: string): Feature | undefined {
    return this.features.find(f => f.name === name);
  }

  /**
   * タイプで特徴量を検索
   * @param type - 検索する特徴量タイプ
   * @returns 該当する特徴量の配列
   */
  findByType(type: string): Feature[] {
    return this.features.filter(f => f.type === type);
  }

  /**
   * 型安全なタイプ検索
   * @param constructor - 特徴量のコンストラクタ
   * @returns 該当する特徴量の配列
   */
  findByConstructor<T extends Feature>(constructor: new(...args: any[]) => T): T[] {
    return this.features.filter(f => f instanceof constructor) as T[];
  }

  /**
   * 条件に一致する特徴量を検索
   * @param predicate - 検索条件
   * @returns 該当する特徴量の配列
   */
  filter(predicate: (feature: Feature) => boolean): Feature[] {
    return this.features.filter(predicate);
  }

  /**
   * 各特徴量に対して処理を実行
   * @param callback - コールバック関数
   */
  forEach(callback: (feature: Feature, index: number) => void): void {
    this.features.forEach(callback);
  }

  /**
   * 特徴量を変換
   * @param mapper - 変換関数
   * @returns 変換結果の配列
   */
  map<T>(mapper: (feature: Feature, index: number) => T): T[] {
    return this.features.map(mapper);
  }

  /**
   * 特徴量をソート
   * @param compareFn - 比較関数（省略時は名前でソート）
   */
  sort(compareFn?: (a: Feature, b: Feature) => number): void {
    if (compareFn) {
      this.features.sort(compareFn);
    } else {
      this.features.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  /**
   * 特徴量数を取得
   * @returns 特徴量数
   */
  size(): number {
    return this.features.length;
  }

  /**
   * 空かどうかを判定
   * @returns 空の場合true
   */
  isEmpty(): boolean {
    return this.features.length === 0;
  }

  /**
   * すべての特徴量をクリア
   */
  clear(): void {
    this.features = [];
  }

  /**
   * 特徴量をベクトル形式に変換
   * @returns 特徴量の値を結合したベクトル
   */
  toVector(): number[] {
    const vector: number[] = [];
    for (const feature of this.features) {
      if ('toVector' in feature && typeof feature.toVector === 'function') {
        // VectorFeatureの場合、ベクトルを展開
        vector.push(...feature.toVector());
      } else {
        // その他の特徴量は値をそのまま追加
        vector.push(feature.value);
      }
    }
    return vector;
  }

  /**
   * 特徴量が含まれているかチェック
   * @param feature - チェックする特徴量
   * @returns 含まれている場合true
   */
  contains(feature: Feature): boolean {
    return this.features.includes(feature);
  }

  /**
   * 名前で特徴量が含まれているかチェック
   * @param name - チェックする特徴量名
   * @returns 含まれている場合true
   */
  containsByName(name: string): boolean {
    return this.features.some(f => f.name === name);
  }

  /**
   * 配列として取得
   * @returns 特徴量の配列（コピー）
   */
  toArray(): Feature[] {
    return [...this.features];
  }

  /**
   * 数値配列として取得（値のみ）
   * @returns 各特徴量の値の配列
   */
  toValueArray(): number[] {
    return this.features.map(f => f.value);
  }

  /**
   * Iterator対応
   */
  [Symbol.iterator](): Iterator<Feature> {
    return this.features[Symbol.iterator]();
  }
}

/**
 * 特徴量マップ（HashMap<String,Feature>相当）
 * キーベースの特徴量コレクション
 */
export class FeatureMap {
  private features = new Map<string, Feature>();

  /**
   * 特徴量を追加
   * @param key - キー
   * @param feature - 特徴量
   */
  put(key: string, feature: Feature): void {
    this.features.set(key, feature);
  }

  /**
   * 特徴量を名前をキーとして追加
   * @param feature - 特徴量（名前がキーになる）
   */
  putByName(feature: Feature): void {
    this.features.set(feature.name, feature);
  }

  /**
   * キーで特徴量を取得
   * @param key - キー
   * @returns 特徴量、見つからない場合undefined
   */
  get(key: string): Feature | undefined {
    return this.features.get(key);
  }

  /**
   * キーで特徴量を削除
   * @param key - キー
   * @returns 削除された場合true
   */
  remove(key: string): boolean {
    return this.features.delete(key);
  }

  /**
   * キーが存在するかチェック
   * @param key - キー
   * @returns 存在する場合true
   */
  containsKey(key: string): boolean {
    return this.features.has(key);
  }

  /**
   * 特徴量が含まれているかチェック
   * @param feature - チェックする特徴量
   * @returns 含まれている場合true
   */
  containsValue(feature: Feature): boolean {
    for (const f of this.features.values()) {
      if (f === feature) {
        return true;
      }
    }
    return false;
  }

  /**
   * すべてのキーを取得
   * @returns キーの配列
   */
  keySet(): string[] {
    return Array.from(this.features.keys());
  }

  /**
   * すべての特徴量を取得
   * @returns 特徴量の配列
   */
  values(): Feature[] {
    return Array.from(this.features.values());
  }

  /**
   * すべてのエントリを取得
   * @returns [key, feature]のペアの配列
   */
  entries(): [string, Feature][] {
    return Array.from(this.features.entries());
  }

  /**
   * タイプで特徴量を検索
   * @param type - 検索する特徴量タイプ
   * @returns 該当する特徴量のマップ
   */
  filterByType(type: string): FeatureMap {
    const filtered = new FeatureMap();
    for (const [key, feature] of this.features.entries()) {
      if (feature.type === type) {
        filtered.put(key, feature);
      }
    }
    return filtered;
  }

  /**
   * 各特徴量に対して処理を実行
   * @param callback - コールバック関数
   */
  forEach(callback: (key: string, feature: Feature) => void): void {
    for (const [key, feature] of this.features.entries()) {
      callback(key, feature);
    }
  }

  /**
   * 特徴量数を取得
   * @returns 特徴量数
   */
  size(): number {
    return this.features.size;
  }

  /**
   * 空かどうかを判定
   * @returns 空の場合true
   */
  isEmpty(): boolean {
    return this.features.size === 0;
  }

  /**
   * すべての特徴量をクリア
   */
  clear(): void {
    this.features.clear();
  }

  /**
   * 他のFeatureMapとマージ
   * @param other - マージするFeatureMap
   * @param overwrite - 重複キーを上書きするか
   */
  merge(other: FeatureMap, overwrite: boolean = false): void {
    for (const [key, feature] of other.entries()) {
      if (!this.containsKey(key) || overwrite) {
        this.put(key, feature);
      }
    }
  }

  /**
   * 条件に一致する特徴量をフィルタ
   * @param predicate - 検索条件
   * @returns フィルタ結果のFeatureMap
   */
  filter(predicate: (key: string, feature: Feature) => boolean): FeatureMap {
    const filtered = new FeatureMap();
    for (const [key, feature] of this.features.entries()) {
      if (predicate(key, feature)) {
        filtered.put(key, feature);
      }
    }
    return filtered;
  }

  /**
   * FeatureMapをオブジェクトに変換
   * @returns プレーンオブジェクト
   */
  toObject(): Record<string, Feature> {
    const obj: Record<string, Feature> = {};
    for (const [key, feature] of this.features.entries()) {
      obj[key] = feature;
    }
    return obj;
  }

  /**
   * Iterator対応（キーのイテレート）
   */
  [Symbol.iterator](): Iterator<[string, Feature]> {
    return this.features[Symbol.iterator]();
  }
}

/**
 * 特徴量の多重マップ（HashMap<String,List<Feature>>相当）
 * 1つのキーに対して複数の特徴量を格納
 */
export class FeatureMultiMap {
  private features = new Map<string, FeatureList>();

  /**
   * キーに特徴量を追加
   * @param key - キー
   * @param feature - 特徴量
   */
  put(key: string, feature: Feature): void {
    if (!this.features.has(key)) {
      this.features.set(key, new FeatureList());
    }
    this.features.get(key)!.add(feature);
  }

  /**
   * キーの特徴量リストを取得
   * @param key - キー
   * @returns 特徴量リスト、見つからない場合は空のリスト
   */
  get(key: string): FeatureList {
    return this.features.get(key) || new FeatureList();
  }

  /**
   * キーの最初の特徴量を取得
   * @param key - キー
   * @returns 特徴量、見つからない場合undefined
   */
  getFirst(key: string): Feature | undefined {
    const list = this.features.get(key);
    return list ? list.get(0) : undefined;
  }

  /**
   * キーのすべての特徴量を削除
   * @param key - キー
   * @returns 削除された場合true
   */
  removeAll(key: string): boolean {
    return this.features.delete(key);
  }

  /**
   * キーから特定の特徴量を削除
   * @param key - キー
   * @param feature - 削除する特徴量
   * @returns 削除された場合true
   */
  remove(key: string, feature: Feature): boolean {
    const list = this.features.get(key);
    if (list) {
      return list.removeByName(feature.name);
    }
    return false;
  }

  /**
   * キーが存在するかチェック
   * @param key - キー
   * @returns 存在する場合true
   */
  containsKey(key: string): boolean {
    return this.features.has(key);
  }

  /**
   * すべてのキーを取得
   * @returns キーの配列
   */
  keySet(): string[] {
    return Array.from(this.features.keys());
  }

  /**
   * すべての特徴量リストを取得
   * @returns 特徴量リストの配列
   */
  values(): FeatureList[] {
    return Array.from(this.features.values());
  }

  /**
   * すべての特徴量を平坦化して取得
   * @returns 全特徴量の配列
   */
  allFeatures(): Feature[] {
    const all: Feature[] = [];
    for (const list of this.features.values()) {
      all.push(...list.toArray());
    }
    return all;
  }

  /**
   * 特徴量の総数を取得
   * @returns 総特徴量数
   */
  totalSize(): number {
    let total = 0;
    for (const list of this.features.values()) {
      total += list.size();
    }
    return total;
  }

  /**
   * キー数を取得
   * @returns キー数
   */
  keySize(): number {
    return this.features.size;
  }

  /**
   * 空かどうかを判定
   * @returns 空の場合true
   */
  isEmpty(): boolean {
    return this.features.size === 0;
  }

  /**
   * すべてをクリア
   */
  clear(): void {
    this.features.clear();
  }

  /**
   * 各キーと特徴量リストに対して処理を実行
   * @param callback - コールバック関数
   */
  forEach(callback: (key: string, features: FeatureList) => void): void {
    for (const [key, features] of this.features.entries()) {
      callback(key, features);
    }
  }
}

/**
 * 型安全な特徴量リスト
 * 特定の特徴量タイプに特化したリスト
 */
export class TypedFeatureList<T extends Feature> {
  private features: T[] = [];
  private readonly typeName: string;

  constructor(typeName: string) {
    this.typeName = typeName;
  }

  /**
   * 特徴量を追加（型チェック付き）
   * @param feature - 追加する特徴量
   */
  add(feature: T): void {
    if (feature.type !== this.typeName) {
      throw new Error(`Expected feature type '${this.typeName}', got '${feature.type}'`);
    }
    this.features.push(feature);
  }

  /**
   * 特徴量を取得
   * @param index - インデックス
   * @returns 特徴量
   */
  get(index: number): T | undefined {
    return this.features[index];
  }

  /**
   * 名前で検索
   * @param name - 特徴量名
   * @returns 特徴量
   */
  findByName(name: string): T | undefined {
    return this.features.find(f => f.name === name);
  }

  /**
   * すべての特徴量を取得
   * @returns 特徴量の配列
   */
  getAll(): T[] {
    return [...this.features];
  }

  /**
   * 特徴量数を取得
   * @returns 特徴量数
   */
  size(): number {
    return this.features.length;
  }

  /**
   * 空かどうかを判定
   * @returns 空の場合true
   */
  isEmpty(): boolean {
    return this.features.length === 0;
  }

  /**
   * Iterator対応
   */
  [Symbol.iterator](): Iterator<T> {
    return this.features[Symbol.iterator]();
  }
}

// 具体的な型安全リストの例
export type VectorFeatureList = TypedFeatureList<VectorFeature>;
export type StatisticalFeatureList = TypedFeatureList<StatisticalFeature>;
export type TagFeatureList = TypedFeatureList<TagFeature>;
export type TemporalFeatureList = TypedFeatureList<TemporalFeature>;