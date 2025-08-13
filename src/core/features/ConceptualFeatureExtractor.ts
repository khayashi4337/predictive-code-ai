import { 
  Feature, 
  VectorFeature, 
  StatisticalFeature, 
  TagFeature, 
  LayerSpecificFeatureExtractor,
  FeatureCollection 
} from './FeatureInterfaces';
import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';
// import { ConfigLoader, ConceptualFeatureExtractorConfig } from '../config/ConfigLoader';

// 一時的な設定型定義（js-yamlの問題回避）
interface ConceptualFeatureExtractorConfig {
  confidence_scores: {
    vector_feature: number;
    statistical_feature: number;
    tag_feature: number;
    conceptual_feature: number;
    fallback_feature: number;
  };
  abstraction: {
    significance_threshold: number;
    abstraction_factor: number;
    emphasis_factor: number;
    smoothing_factor: number;
    neighbor_influence: number;
  };
  debug: {
    log_level: number;
    measure_performance: boolean;
    output_statistics: boolean;
  };
  abstraction_level: {
    info_scale_factor: number;
    max_level: number;
    min_level: number;
  };
  complexity_weights: {
    tag_weight: number;
    statistics_weight: number;
    dimension_weight: number;
    magnitude_weight: number;
  };
  vector_processing: {
    enable_normalization: boolean;
    zero_vector_threshold: number;
  };
  tag_processing: {
    min_diversity: number;
    rare_tag_boost: number;
    normalize_weights: boolean;
  };
  fallback: {
    default_dimension: number;
    default_value: number;
  };
}

/**
 * 概念層専用の特徴量実装
 */

/**
 * 概念ベクトル特徴量
 * 概念レベルでの抽象的なベクトル表現
 */
class ConceptualVectorFeature implements VectorFeature {
  readonly type = 'conceptual_vector';
  
  constructor(
    public readonly name: string,
    private readonly vector: number[],
    public readonly confidence: number,
    public readonly source: string
  ) {}

  get value(): number {
    return this.calculateMagnitude();
  }

  get dimension(): number {
    return this.vector.length;
  }

  toVector(): number[] {
    return [...this.vector];
  }

  toNormalizedVector(): number[] {
    const magnitude = this.calculateMagnitude();
    if (magnitude === 0) return new Array(this.vector.length).fill(0);
    return this.vector.map(v => v / magnitude);
  }

  isValid(): boolean {
    return this.vector.length > 0 && 
           this.vector.every(v => isFinite(v) && !isNaN(v)) &&
           this.confidence >= 0 && this.confidence <= 1;
  }

  private calculateMagnitude(): number {
    return Math.sqrt(this.vector.reduce((sum, v) => sum + v * v, 0));
  }
}

/**
 * 概念統計特徴量
 * 概念レベルでの統計的特徴
 */
class ConceptualStatisticalFeature implements StatisticalFeature {
  readonly type = 'conceptual_statistical';
  
  constructor(
    public readonly name: string,
    public readonly value: number,
    public readonly confidence: number,
    public readonly source: string,
    public readonly mean: number,
    public readonly variance?: number,
    public readonly standardDeviation?: number,
    public readonly range?: [number, number]
  ) {}

  isValid(): boolean {
    return isFinite(this.value) && !isNaN(this.value) &&
           isFinite(this.mean) && !isNaN(this.mean) &&
           this.confidence >= 0 && this.confidence <= 1;
  }
}

/**
 * 概念タグ特徴量
 * タグ情報に基づく概念的特徴
 */
class ConceptualTagFeature implements TagFeature {
  readonly type = 'conceptual_tag';
  
  constructor(
    public readonly name: string,
    public readonly value: number,
    public readonly confidence: number,
    public readonly source: string,
    public readonly tagCount: number,
    public readonly tagTypes: string[],
    public readonly tagWeights: Map<string, number>
  ) {}

  isValid(): boolean {
    return this.tagCount >= 0 &&
           this.tagTypes.length >= 0 &&
           this.confidence >= 0 && this.confidence <= 1;
  }
}

/**
 * 特徴コレクションの実装
 * 複数の特徴量を効率的に管理
 */
class FeatureCollectionImpl implements FeatureCollection {
  private features = new Map<string, Feature>();
  private featuresByType = new Map<string, Feature[]>();

  addFeature(feature: Feature): void {
    this.features.set(feature.name, feature);
    
    // タイプ別インデックスも更新
    if (!this.featuresByType.has(feature.type)) {
      this.featuresByType.set(feature.type, []);
    }
    this.featuresByType.get(feature.type)!.push(feature);
  }

  getFeature(name: string): Feature | undefined {
    return this.features.get(name);
  }

  getFeaturesByType(type: string): Feature[] {
    return this.featuresByType.get(type) || [];
  }

  getFeaturesByConstructor<F extends Feature>(constructor: new(...args: any[]) => F): F[] {
    const result: F[] = [];
    for (const feature of this.features.values()) {
      if (feature instanceof constructor) {
        result.push(feature as F);
      }
    }
    return result;
  }

  getAllFeatures(): Feature[] {
    return Array.from(this.features.values());
  }

  toVector(): number[] {
    const vector: number[] = [];
    for (const feature of this.features.values()) {
      if ('toVector' in feature && typeof feature.toVector === 'function') {
        vector.push(...feature.toVector());
      } else {
        vector.push(feature.value);
      }
    }
    return vector;
  }

  getDimension(): number {
    return this.toVector().length;
  }

  getFeatureCount(): number {
    return this.features.size;
  }

  getFeatureNames(): string[] {
    return Array.from(this.features.keys());
  }

  clear(): void {
    this.features.clear();
    this.featuresByType.clear();
  }

  isEmpty(): boolean {
    return this.features.size === 0;
  }
}

/**
 * 概念層専用特徴抽出器
 * YAML設定ファイルに基づく設定駆動の特徴抽出を行う
 * 
 * @template T - Context インターフェースを継承する型
 */
export class ConceptualFeatureExtractor<T extends Context> implements LayerSpecificFeatureExtractor<T> {
  private readonly layerType = 'concept' as const;
  private readonly extractorName = 'ConceptualFeatureExtractor';
  private readonly config: ConceptualFeatureExtractorConfig;
  private readonly performanceTracker: Map<string, number> = new Map();

  /**
   * コンストラクタ
   * @param configPath - 設定ファイルのパス（省略時はデフォルト）
   */
  constructor(configPath?: string) {
    // 一時的なデフォルト設定（js-yamlの問題回避）
    this.config = this.getDefaultConfig();
    this.logInfo(`ConceptualFeatureExtractor initialized with default config`);
  }

  private getDefaultConfig(): ConceptualFeatureExtractorConfig {
    return {
      confidence_scores: {
        vector_feature: 0.8,
        statistical_feature: 0.7,
        tag_feature: 0.6,
        conceptual_feature: 0.5,
        fallback_feature: 0.1
      },
      abstraction: {
        significance_threshold: 0.3,
        abstraction_factor: 0.9,
        emphasis_factor: 1.2,
        smoothing_factor: 0.9,
        neighbor_influence: 0.1
      },
      debug: {
        log_level: 2,
        measure_performance: false,
        output_statistics: false
      },
      abstraction_level: {
        info_scale_factor: 10.0,
        max_level: 1.0,
        min_level: 0.0
      },
      complexity_weights: {
        tag_weight: 0.1,
        statistics_weight: 0.05,
        dimension_weight: 0.1,
        magnitude_weight: 0.02
      },
      vector_processing: {
        enable_normalization: true,
        zero_vector_threshold: 1e-10
      },
      tag_processing: {
        min_diversity: 0.01,
        rare_tag_boost: 1.5,
        normalize_weights: true
      },
      fallback: {
        default_dimension: 5,
        default_value: 0.1
      }
    };
  }

  /**
   * コンテキストから概念レベルの特徴量を抽出
   * @param context - 入力コンテキスト
   * @returns 抽出された特徴量のリスト
   */
  extract(context: ContextInfo<T>): Feature[] {
    const startTime = this.config.debug.measure_performance ? performance.now() : 0;
    const collection = new FeatureCollectionImpl();
    
    try {
      // 1. ベクトル特徴の抽出
      const vectorFeatures = this.extractVectorFeatures(context);
      vectorFeatures.forEach(feature => collection.addFeature(feature));
      
      // 2. 統計特徴の抽出
      const statisticalFeatures = this.extractStatisticalFeatures(context);
      statisticalFeatures.forEach(feature => collection.addFeature(feature));
      
      // 3. タグ特徴の抽出
      const tagFeatures = this.extractTagFeatures(context);
      tagFeatures.forEach(feature => collection.addFeature(feature));
      
      // 4. 概念固有特徴の抽出
      const conceptualFeatures = this.extractConceptualFeatures(context);
      conceptualFeatures.forEach(feature => collection.addFeature(feature));
      
      // パフォーマンス測定
      if (this.config.debug.measure_performance) {
        const duration = performance.now() - startTime;
        this.performanceTracker.set('last_extraction_time', duration);
        this.logDebug(`Feature extraction completed in ${duration.toFixed(2)}ms`);
      }

      // 統計情報出力
      if (this.config.debug.output_statistics) {
        this.outputExtractionStatistics(collection);
      }
      
      return collection.getAllFeatures();
      
    } catch (error) {
      this.logError('Feature extraction failed', error);
      // フォールバック特徴を返す
      return [this.createFallbackFeature()];
    }
  }

  /**
   * ベクトル特徴の抽出
   * @param context - 入力コンテキスト
   * @returns ベクトル特徴の配列
   */
  private extractVectorFeatures(context: ContextInfo<T>): VectorFeature[] {
    const features: VectorFeature[] = [];
    
    try {
      // VectorizableContextの場合
      if (context.body && typeof (context.body as any).toVector === 'function') {
        const originalVector = (context.body as any).toVector();
        if (Array.isArray(originalVector) && originalVector.length > 0) {
          // 概念レベルでの抽象化処理
          const abstractedVector = this.abstractVector(originalVector);
          
          features.push(new ConceptualVectorFeature(
            'primary_concept_vector',
            abstractedVector,
            this.config.confidence_scores.vector_feature,
            'context_body'
          ));

          this.logDebug(`Extracted vector feature with dimension: ${abstractedVector.length}`);
        }
      }
    } catch (error) {
      this.logError('Vector feature extraction failed', error);
    }
    
    return features;
  }

  /**
   * 統計特徴の抽出
   * @param context - 入力コンテキスト
   * @returns 統計特徴の配列
   */
  private extractStatisticalFeatures(context: ContextInfo<T>): StatisticalFeature[] {
    const features: StatisticalFeature[] = [];
    
    try {
      // 統計情報からの特徴抽出
      const stats = context.statistics;
      if (stats.size() > 0) {
        const values = stats.values().filter(v => typeof v === 'number' && isFinite(v)) as number[];
        if (values.length > 0) {
          const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
          const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
          const standardDeviation = Math.sqrt(variance);
          
          features.push(new ConceptualStatisticalFeature(
            'context_statistics',
            mean,
            this.config.confidence_scores.statistical_feature,
            'context_statistics',
            mean,
            variance,
            standardDeviation,
            [Math.min(...values), Math.max(...values)]
          ));

          this.logDebug(`Extracted statistical feature from ${values.length} values, mean: ${mean.toFixed(3)}`);
        }
      }
    } catch (error) {
      this.logError('Statistical feature extraction failed', error);
    }
    
    return features;
  }

  /**
   * タグ特徴の抽出
   * @param context - 入力コンテキスト
   * @returns タグ特徴の配列
   */
  private extractTagFeatures(context: ContextInfo<T>): TagFeature[] {
    const features: TagFeature[] = [];
    
    try {
      const tags = context.tags;
      if (tags.size > 0) {
        const tagTypes = Array.from(tags).map(tag => tag.toString());
        const tagWeights = this.calculateTagWeights(tagTypes);
        const diversityScore = this.calculateTagDiversity(tagTypes);
        
        features.push(new ConceptualTagFeature(
          'tag_diversity',
          diversityScore,
          this.config.confidence_scores.tag_feature,
          'context_tags',
          tags.size,
          tagTypes,
          tagWeights
        ));

        this.logDebug(`Extracted tag feature with diversity: ${diversityScore.toFixed(3)} from ${tags.size} tags`);
      }
    } catch (error) {
      this.logError('Tag feature extraction failed', error);
    }
    
    return features;
  }

  /**
   * 概念固有特徴の抽出
   * @param context - 入力コンテキスト
   * @returns 概念固有特徴の配列
   */
  private extractConceptualFeatures(context: ContextInfo<T>): Feature[] {
    const features: Feature[] = [];
    
    try {
      // 抽象化度の計算
      const abstractionLevel = this.calculateAbstractionLevel(context);
      features.push(new ConceptualStatisticalFeature(
        'abstraction_level',
        abstractionLevel,
        this.config.confidence_scores.conceptual_feature,
        'conceptual_analysis',
        abstractionLevel
      ));
      
      // 概念的複雑度の計算
      const complexity = this.calculateConceptualComplexity(context);
      features.push(new ConceptualStatisticalFeature(
        'conceptual_complexity',
        complexity,
        this.config.confidence_scores.conceptual_feature,
        'conceptual_analysis',
        complexity
      ));

      this.logDebug(`Extracted conceptual features - abstraction: ${abstractionLevel.toFixed(3)}, complexity: ${complexity.toFixed(3)}`);
    } catch (error) {
      this.logError('Conceptual feature extraction failed', error);
    }
    
    return features;
  }

  /**
   * ベクトルを概念レベルで抽象化
   * 設定値に基づく抽象化処理を適用
   * @param vector - 入力ベクトル
   * @returns 抽象化されたベクトル
   */
  private abstractVector(vector: number[]): number[] {
    const config = this.config.abstraction;
    
    const abstracted = vector.map((v, index) => {
      // 基本的な抽象化（減衰）を適用
      let processed = v * config.abstraction_factor;
      
      // 重要な特徴の強調処理
      if (Math.abs(v) > config.significance_threshold) {
        processed *= config.emphasis_factor;
        this.logDebug(`Enhanced significant feature at index ${index}: ${v} -> ${processed}`);
      }
      
      // 隣接要素の影響を考慮（空間的相関）
      let neighborInfluence = 0;
      if (index > 0) {
        neighborInfluence += vector[index - 1] * config.neighbor_influence;
      }
      if (index < vector.length - 1) {
        neighborInfluence += vector[index + 1] * config.neighbor_influence;
      }
      processed += neighborInfluence;
      
      // スムージング処理
      processed *= config.smoothing_factor;
      
      return processed;
    });
    
    // 正規化処理（設定に応じて）
    if (this.config.vector_processing.enable_normalization) {
      return this.normalizeVector(abstracted);
    }
    
    return abstracted;
  }

  /**
   * ベクトルの正規化
   * @param vector - 入力ベクトル
   * @returns 正規化されたベクトル
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude < this.config.vector_processing.zero_vector_threshold) {
      return vector; // ゼロベクトルの場合はそのまま返す
    }
    return vector.map(v => v / magnitude);
  }

  /**
   * タグの重み付けを計算
   * @param tagTypes - タグタイプの配列
   * @returns タグの重み付けMap
   */
  private calculateTagWeights(tagTypes: string[]): Map<string, number> {
    const weights = new Map<string, number>();
    const config = this.config.tag_processing;
    
    // 出現頻度の計算
    const frequency = new Map<string, number>();
    tagTypes.forEach(tag => {
      frequency.set(tag, (frequency.get(tag) || 0) + 1);
    });
    
    const total = tagTypes.length;
    frequency.forEach((count, tag) => {
      let weight = count / total;
      
      // 希少タグの重み増幅
      if (count === 1 && tagTypes.length > 1) {
        weight *= config.rare_tag_boost;
      }
      
      weights.set(tag, weight);
    });
    
    // 正規化処理
    if (config.normalize_weights) {
      const sumWeights = Array.from(weights.values()).reduce((sum, w) => sum + w, 0);
      if (sumWeights > 0) {
        weights.forEach((weight, tag) => {
          weights.set(tag, weight / sumWeights);
        });
      }
    }
    
    return weights;
  }

  /**
   * タグの多様性を計算
   * @param tagTypes - タグタイプの配列
   * @returns 多様性スコア [0, 1]
   */
  private calculateTagDiversity(tagTypes: string[]): number {
    const uniqueTypes = new Set(tagTypes);
    const diversity = uniqueTypes.size / Math.max(tagTypes.length, 1);
    return Math.max(diversity, this.config.tag_processing.min_diversity);
  }

  /**
   * 抽象化レベルを計算
   * @param context - 入力コンテキスト
   * @returns 抽象化レベル [0, 1]
   */
  private calculateAbstractionLevel(context: ContextInfo<T>): number {
    const config = this.config.abstraction_level;
    
    // タグ数と統計情報数から抽象化レベルを推定
    const tagCount = context.tags.size;
    const statCount = context.statistics.size();
    
    // より多くの情報がある = より具体的 = 抽象化レベルが低い
    const infoScore = (tagCount + statCount) / config.info_scale_factor;
    const abstractionLevel = Math.max(config.min_level, Math.min(config.max_level, 1 - infoScore));
    
    return abstractionLevel;
  }

  /**
   * 概念的複雑度を計算
   * @param context - 入力コンテキスト
   * @returns 複雑度スコア [0, 1]
   */
  private calculateConceptualComplexity(context: ContextInfo<T>): number {
    const weights = this.config.complexity_weights;
    let complexity = 0;
    
    // タグベースの複雑度
    complexity += context.tags.size * weights.tag_weight;
    
    // 統計情報ベースの複雑度
    complexity += context.statistics.size() * weights.statistics_weight;
    
    // ベクトル次元ベースの複雑度
    if (context.body && typeof (context.body as any).getDimension === 'function') {
      const dim = (context.body as any).getDimension();
      complexity += Math.log(dim + 1) * weights.dimension_weight;
    }
    
    // ベクトル大きさベースの複雑度
    if (context.body && typeof (context.body as any).toVector === 'function') {
      const vector = (context.body as any).toVector();
      if (Array.isArray(vector)) {
        const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        complexity += magnitude * weights.magnitude_weight;
      }
    }
    
    return Math.min(1, complexity);
  }

  /**
   * フォールバック特徴を作成
   * @returns フォールバック特徴
   */
  private createFallbackFeature(): Feature {
    const config = this.config.fallback;
    const vector = new Array(config.default_dimension).fill(config.default_value);
    
    return new ConceptualVectorFeature(
      'fallback_feature',
      vector,
      this.config.confidence_scores.fallback_feature,
      'fallback'
    );
  }

  /**
   * 抽出統計情報を出力
   * @param collection - 特徴量コレクション
   */
  private outputExtractionStatistics(collection: FeatureCollection): void {
    const stats = {
      total_features: collection.getFeatureCount(),
      feature_types: Object.fromEntries(
        ['conceptual_vector', 'conceptual_statistical', 'conceptual_tag'].map(type => [
          type, collection.getFeaturesByType(type).length
        ])
      ),
      total_dimension: collection.getDimension(),
      feature_names: collection.getFeatureNames()
    };
    
    this.logInfo('Feature extraction statistics:', stats);
  }

  // LayerSpecificFeatureExtractor インターフェースの実装

  getSupportedFeatureTypes(): string[] {
    return ['conceptual_vector', 'conceptual_statistical', 'conceptual_tag'];
  }

  getExtractorName(): string {
    return this.extractorName;
  }

  getLayerType(): 'concept' {
    return this.layerType;
  }

  getLayerConfiguration(): Record<string, any> {
    return { 
      config: this.config,
      performance_tracker: Object.fromEntries(this.performanceTracker)
    };
  }

  isValid(): boolean {
    return this.config.abstraction.significance_threshold >= 0 &&
           this.config.abstraction.significance_threshold <= 1 &&
           this.config.abstraction.abstraction_factor > 0 &&
           this.config.abstraction.emphasis_factor > 0;
  }

  // ログ出力メソッド

  private logError(message: string, error?: any): void {
    if (this.config.debug.log_level >= 1) {
      console.error(`[ConceptualFeatureExtractor] ERROR: ${message}`, error);
    }
  }

  private logWarn(message: string): void {
    if (this.config.debug.log_level >= 2) {
      console.warn(`[ConceptualFeatureExtractor] WARN: ${message}`);
    }
  }

  private logInfo(message: string, data?: any): void {
    if (this.config.debug.log_level >= 3) {
      console.info(`[ConceptualFeatureExtractor] INFO: ${message}`, data);
    }
  }

  private logDebug(message: string): void {
    if (this.config.debug.log_level >= 4) {
      console.debug(`[ConceptualFeatureExtractor] DEBUG: ${message}`);
    }
  }
}