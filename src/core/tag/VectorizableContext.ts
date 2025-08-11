import { Context } from './Context';

/**
 * 数値ベクトル表現可能なContextインターフェース
 * 距離メトリクス計算のため数値ベクトルに変換可能なコンテキストデータ
 * クラス図のContextを継承し、ベクトル化機能を追加
 */
export interface VectorizableContext extends Context {
  /**
   * 数値ベクトルに変換
   * @returns 正規化された数値ベクトル配列
   */
  toVector(): number[];
  
  /**
   * ベクトルの次元数を取得
   * @returns ベクトルの次元数
   */
  getDimension(): number;
}