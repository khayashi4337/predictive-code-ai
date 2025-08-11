/**
 * メトリクス関連のエクスポート
 * クラス図P1_Metricsパッケージに対応
 */

// インターフェースとenum
export { DifferenceDistanceMetric, DistanceMetricFactory } from './interfaces';
export { DistanceMetricType } from './interfaces';

// 距離メトリクス実装
export { L2Distance } from './L2Distance';
export { CosineDistance } from './CosineDistance';
export { KLDivergence } from './KLDivergence';
export { EMDDistance } from './EMDDistance';

// ファクトリー
export { DistanceMetricFactoryImpl } from './DistanceMetricFactory';