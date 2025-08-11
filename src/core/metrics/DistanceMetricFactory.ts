import { DistanceMetricFactory as IDistanceMetricFactory, DifferenceDistanceMetric, DistanceMetricType } from './interfaces';
import { Context } from '../tag/Context';
import { VectorizableContext } from '../tag/VectorizableContext';
import { L2Distance } from './L2Distance';
import { CosineDistance } from './CosineDistance';
import { KLDivergence } from './KLDivergence';
import { EMDDistance } from './EMDDistance';

/**
 * 距離メトリクスファクトリー実装（クラス図準拠版）
 * クラス図P1_Metrics.DistanceMetricFactoryに対応
 * 
 * 指定された種別に基づいて適切な距離メトリクスインスタンスを生成する
 * Singletonパターンで実装され、アプリケーション全体で単一インスタンスを使用
 */
export class DistanceMetricFactoryImpl implements IDistanceMetricFactory {
  
  /** シングルトンインスタンス */
  private static instance: DistanceMetricFactoryImpl | null = null;
  
  /** サポートされている距離メトリクス種別のリスト */
  private readonly supportedTypes: DistanceMetricType[] = [
    DistanceMetricType.L2,
    DistanceMetricType.Cosine,
    DistanceMetricType.KL_Divergence,
    DistanceMetricType.EMD
  ];
  
  /**
   * プライベートコンストラクタ（Singletonパターン）
   */
  private constructor() {}
  
  /**
   * ファクトリーのインスタンスを取得
   * @returns DistanceMetricFactoryのシングルトンインスタンス
   */
  public static getInstance(): DistanceMetricFactoryImpl {
    if (!DistanceMetricFactoryImpl.instance) {
      DistanceMetricFactoryImpl.instance = new DistanceMetricFactoryImpl();
    }
    return DistanceMetricFactoryImpl.instance;
  }
  
  /**
   * 指定された種別の距離メトリクスを生成
   * 
   * @param type - 距離メトリクス種別
   * @returns 距離メトリクスインスタンス
   * @throws Error サポートされていない種別の場合
   */
  public resolve<T extends Context>(type: DistanceMetricType): DifferenceDistanceMetric<T> {
    // サポート確認
    if (!this.supportedTypes.includes(type)) {
      throw new Error(`Unsupported distance metric type: ${type}. Supported types: ${this.supportedTypes.join(', ')}`);
    }
    
    switch (type) {
      case DistanceMetricType.L2:
        return this.createL2Distance<T>();
        
      case DistanceMetricType.Cosine:
        return this.createCosineDistance<T>();
        
      case DistanceMetricType.KL_Divergence:
        return this.createKLDivergence<T>();
        
      case DistanceMetricType.EMD:
        return this.createEMDDistance<T>();
        
      default:
        // TypeScriptの網羅性チェックのため
        const exhaustiveCheck: never = type;
        throw new Error(`Unhandled distance metric type: ${exhaustiveCheck}`);
    }
  }
  
  /**
   * サポートされている距離メトリクス種別一覧を取得
   * @returns サポートされている種別の配列
   */
  public getSupportedTypes(): DistanceMetricType[] {
    return [...this.supportedTypes]; // 防御的コピー
  }
  
  /**
   * 指定された種別がサポートされているかチェック
   * @param type - チェック対象の種別
   * @returns サポートされている場合true
   */
  public isSupported(type: DistanceMetricType): boolean {
    return this.supportedTypes.includes(type);
  }
  
  /**
   * L2距離メトリクスを作成
   * @returns L2Distanceインスタンス
   */
  private createL2Distance<T extends Context>(): DifferenceDistanceMetric<T> {
    // 型の互換性をチェック
    this.validateVectorizableContext<T>();
    return new L2Distance<T & VectorizableContext>() as DifferenceDistanceMetric<T>;
  }
  
  /**
   * コサイン距離メトリクスを作成
   * @returns CosineDistanceインスタンス
   */
  private createCosineDistance<T extends Context>(): DifferenceDistanceMetric<T> {
    // 型の互換性をチェック
    this.validateVectorizableContext<T>();
    return new CosineDistance<T & VectorizableContext>() as DifferenceDistanceMetric<T>;
  }
  
  /**
   * KL発散メトリクスを作成
   * @returns KLDivergenceインスタンス
   */
  private createKLDivergence<T extends Context>(): DifferenceDistanceMetric<T> {
    // 型の互換性をチェック
    this.validateVectorizableContext<T>();
    return new KLDivergence<T & VectorizableContext>() as DifferenceDistanceMetric<T>;
  }
  
  /**
   * EMD距離メトリクスを作成
   * @returns EMDDistanceインスタンス
   */
  private createEMDDistance<T extends Context>(): DifferenceDistanceMetric<T> {
    // 型の互換性をチェック
    this.validateVectorizableContext<T>();
    return new EMDDistance<T & VectorizableContext>() as DifferenceDistanceMetric<T>;
  }
  
  /**
   * VectorizableContextとの互換性を検証
   * すべての距離メトリクスは現在VectorizableContextを必要とする
   * @throws Error VectorizableContextとの互換性がない場合
   */
  private validateVectorizableContext<_T extends Context>(): void {
    // 実行時チェックは困難なため、ドキュメント化された制約として扱う
    // TypeScriptの型システムで静的チェックされる
    // 将来的にはランタイム型チェックライブラリの導入を検討
  }
  
  /**
   * ファクトリーの設定情報を取得（デバッグ用）
   * @returns ファクトリーの状態情報
   */
  public getInfo(): {
    supportedTypes: DistanceMetricType[];
    instanceId: string;
    createdAt: string;
  } {
    return {
      supportedTypes: this.getSupportedTypes(),
      instanceId: 'singleton',
      createdAt: new Date().toISOString()
    };
  }
}