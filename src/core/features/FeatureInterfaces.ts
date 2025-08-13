import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';

/**
 * 基本特徴量インターフェース
 * すべての特徴量が実装すべき共通項目
 */
export interface Feature {
  /** 特徴量の名前（識別子） */
  readonly name: string;
  
  /** 特徴量の値 */
  readonly value: number;
  
  /** 特徴量の信頼度 [0.0, 1.0] */
  readonly confidence: number;
  
  /** 特徴量の由来・ソース */
  readonly source: string;
  
  /** 特徴量のタイプ識別子 */
  readonly type: string;
  
  /**
   * 特徴量が有効かどうかを判定
   * @returns 有効な場合true
   */
  isValid(): boolean;
}

/**
 * ベクトル特徴量インターフェース
 * 多次元ベクトルとして表現される特徴
 */
export interface VectorFeature extends Feature {
  /** ベクトルの次元数 */
  readonly dimension: number;
  
  /**
   * 数値ベクトルとして取得
   * @returns 数値配列
   */
  toVector(): number[];
  
  /**
   * 正規化されたベクトルを取得
   * @returns 正規化された数値配列
   */
  toNormalizedVector(): number[];
}

/**
 * 統計特徴量インターフェース
 * 統計的な情報を表現する特徴
 */
export interface StatisticalFeature extends Feature {
  /** 平均値 */
  readonly mean: number;
  
  /** 分散（オプション） */
  readonly variance?: number;
  
  /** 標準偏差（オプション） */
  readonly standardDeviation?: number;
  
  /** 範囲（最小-最大） */
  readonly range?: [number, number];
}

/**
 * タグ特徴量インターフェース
 * タグ情報に基づく特徴
 */
export interface TagFeature extends Feature {
  /** タグの数 */
  readonly tagCount: number;
  
  /** タグの種類一覧 */
  readonly tagTypes: string[];
  
  /** タグの重み付け */
  readonly tagWeights: Map<string, number>;
}

/**
 * 時系列特徴量インターフェース
 * 時間的変化を表現する特徴
 */
export interface TemporalFeature extends Feature {
  /** タイムスタンプ */
  readonly timestamp: number;
  
  /** 変化率 */
  readonly changeRate: number;
  
  /** トレンド方向 (-1: 下降, 0: 平坦, 1: 上昇) */
  readonly trendDirection: -1 | 0 | 1;
}

/**
 * 特徴抽出器インターフェース
 * コンテキストから特徴量を抽出する責務
 * 
 * @template T - Context インターフェースを継承する型
 */
export interface FeatureExtractor<T extends Context> {
  /**
   * コンテキストから特徴量を抽出
   * @param context - 入力コンテキスト
   * @returns 抽出された特徴量のリスト
   */
  extract(context: ContextInfo<T>): Feature[];
  
  /**
   * サポートされている特徴量タイプを取得
   * @returns 特徴量タイプの配列
   */
  getSupportedFeatureTypes(): string[];
  
  /**
   * 抽出器の名前を取得
   * @returns 抽出器名
   */
  getExtractorName(): string;
  
  /**
   * 抽出器が有効かどうかを判定
   * @returns 有効な場合true
   */
  isValid(): boolean;
}

/**
 * 特徴コレクションインターフェース
 * 複数の特徴量を管理する責務
 */
export interface FeatureCollection {
  /**
   * 特徴量を追加
   * @param feature - 追加する特徴量
   */
  addFeature(feature: Feature): void;
  
  /**
   * 名前で特徴量を取得
   * @param name - 特徴量名
   * @returns 特徴量、存在しない場合undefined
   */
  getFeature(name: string): Feature | undefined;
  
  /**
   * タイプで特徴量を取得
   * @param type - 特徴量タイプ
   * @returns 該当する特徴量の配列
   */
  getFeaturesByType(type: string): Feature[];
  
  /**
   * 型安全なタイプ別特徴量取得
   * @param constructor - 特徴量のコンストラクタ関数
   * @returns 該当する特徴量の配列
   */
  getFeaturesByConstructor<F extends Feature>(constructor: new(...args: any[]) => F): F[];
  
  /**
   * すべての特徴量を取得
   * @returns 特徴量の配列
   */
  getAllFeatures(): Feature[];
  
  /**
   * 特徴量をベクトル形式で取得
   * @returns 数値配列（全特徴量の値を連結）
   */
  toVector(): number[];
  
  /**
   * 全特徴量の次元数を取得
   * @returns 次元数
   */
  getDimension(): number;
  
  /**
   * 特徴量の数を取得
   * @returns 特徴量数
   */
  getFeatureCount(): number;
  
  /**
   * 特徴量名の一覧を取得
   * @returns 特徴量名の配列
   */
  getFeatureNames(): string[];
  
  /**
   * コレクションをクリア
   */
  clear(): void;
  
  /**
   * コレクションが空かどうかを判定
   * @returns 空の場合true
   */
  isEmpty(): boolean;
}

/**
 * 層固有の特徴抽出器インターフェース
 * 各層が独自の特徴抽出ロジックを実装するためのベース
 * 
 * @template T - Context インターフェースを継承する型
 */
export interface LayerSpecificFeatureExtractor<T extends Context> extends FeatureExtractor<T> {
  /**
   * 層のタイプを取得
   * @returns 層タイプ（'concept', 'pattern', 'sensory', 'action'）
   */
  getLayerType(): 'concept' | 'pattern' | 'sensory' | 'action';
  
  /**
   * 層固有の設定パラメータを取得
   * @returns 設定パラメータのオブジェクト
   */
  getLayerConfiguration(): Record<string, any>;
}

/**
 * 特徴変換器インターフェース
 * 特徴量の変換・加工を行う責務
 */
export interface FeatureTransformer {
  /**
   * 特徴量を変換
   * @param input - 入力特徴量
   * @returns 変換された特徴量
   */
  transform(input: Feature): Feature;
  
  /**
   * 複数の特徴量を変換
   * @param inputs - 入力特徴量の配列
   * @returns 変換された特徴量の配列
   */
  transformBatch(inputs: Feature[]): Feature[];
  
  /**
   * 変換器の名前を取得
   * @returns 変換器名
   */
  getTransformerName(): string;
}