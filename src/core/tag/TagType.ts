/**
 * タグの種別を定義するenum
 * 検索高速化のため、各タグは種別に応じて1つの値のみ保持する
 */
export enum TagType {
  /** 時刻型タグ */
  TIMESTAMP = 'timestamp',
  
  /** 文字列型タグ */
  STRING = 'string',
  
  /** 数値型タグ */
  NUMBER = 'number'
}