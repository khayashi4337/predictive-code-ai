import { VectorizableContext } from '../tag/VectorizableContext';
import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { LearningSignal } from '../learning/LearningSignalV2';
import { DevelopOption } from '../../debug/DevelopOption';
import { BaseAutonomousLayer } from './AutonomousLayer';
import { ConceptualFeatureExtractor } from '../features/ConceptualFeatureExtractor';
import { FeatureList } from '../features/FeatureCollections';
import { Tag } from '../tag/Tag';
import { Statistics } from '../tag/Statistics';
// import { ConfigLoader, PatternAutonomousLayerConfig, PatternType, PatternRecognitionResult } from '../config/ConfigLoader';

// 一時的な型定義（js-yamlの問題回避）
export type PatternType = 'uniform' | 'random' | 'sequential' | 'spatial' | 'frequency' | 'complex';

export interface PatternRecognitionResult {
  type: PatternType;
  similarity: number;
  intensity: number;
  confidence: number;
  features: number[];
}

interface PatternAutonomousLayerConfig {
  fallback: {
    default_vector_size: number;
    default_vector_value: number;
    decay_factor: number;
  };
  pattern_recognition: {
    similarity_calculation: {
      magnitude_scaling: number;
      dimension_adjustment: boolean;
    };
    classification: {
      variance_threshold_uniform: number;
      entropy_threshold_random: number;
      sequential_correlation_threshold: number;
      spatial_gradient_variance_threshold: number;
      frequency_correlation_threshold: number;
    };
    intensity: {
      mean_abs_scaling: boolean;
      intensity_bounds: [number, number];
    };
    confidence: {
      similarity_weight: number;
      intensity_weight: number;
      conservative_factor: number;
    };
  };
  pattern_transformation: {
    sequential: {
      shift_modulo: number;
      sine_frequency_factor: number;
      sine_amplitude: number;
    };
    spatial: {
      decay_rate: number;
    };
    frequency: {
      frequency_scale: number;
      cosine_amplitude: number;
    };
    default: {
      base_factor: number;
      intensity_influence: number;
    };
  };
  pattern_enhancement: {
    feature_activation: {
      function: string;
      preserve_sign: boolean;
    };
    context_merging: {
      preserve_original_tags: boolean;
      add_enhancement_timestamp: boolean;
    };
  };
  debug: {
    log_level: number;
  };
}


/**
 * 感覚自律層の実装（クラス図準拠版）
 * 最小限の骨格実装 - コンパイルエラー回避のため詳細ロジックは削除
 */
export class SensoryAutonomousLayer<T extends VectorizableContext> extends BaseAutonomousLayer<T> {
  
  constructor(layerId: string, layerName: string = "感覚層") {
    super(layerId, layerName, "sensory");
  }
  
  public generateExpectedPattern(_destinationID: string, _context: ContextInfo<T>): ExpectedPatternV2<T> {
    const defaultPattern = { toVector: () => new Array(10).fill(0) } as T;
    const contextInfo = new ContextInfo<T>(defaultPattern, new Set(), new Statistics());
    return new ExpectedPatternV2<T>(contextInfo);
  }
  
  protected doObserveActualPattern(_actual: ActualPatternV2<T>): void {
    // 最小限の実装
  }
  
  public async doUpdatePredictiveModel(_signal: LearningSignal<T>): Promise<LearningSignal<T>[]> {
    return [];
  }
}

/**
 * パターン自律層の実装（クラス図準拠版）
 * 最小限の骨格実装 - コンパイルエラー回避のため詳細ロジックは削除
 */
export class PatternAutonomousLayer<T extends VectorizableContext> extends BaseAutonomousLayer<T> {
  
  private readonly BURST_THRESHOLD = 0.75;
  private readonly config: PatternAutonomousLayerConfig;
  
  constructor(layerId: string, layerName: string = "パターン層", configPath?: string) {
    super(layerId, layerName, "pattern");
    // 一時的なデフォルト設定（js-yamlの問題回避）
    this.config = this.getDefaultConfig();
    this.logInfo(`PatternAutonomousLayer initialized with default config`);
  }

  private getDefaultConfig(): PatternAutonomousLayerConfig {
    return {
      fallback: {
        default_vector_size: 10,
        default_vector_value: 0.1,
        decay_factor: 0.8
      },
      pattern_recognition: {
        similarity_calculation: {
          magnitude_scaling: 1.0,
          dimension_adjustment: true
        },
        classification: {
          variance_threshold_uniform: 0.1,
          entropy_threshold_random: 0.8,
          sequential_correlation_threshold: 0.7,
          spatial_gradient_variance_threshold: 0.05,
          frequency_correlation_threshold: 0.5
        },
        intensity: {
          mean_abs_scaling: true,
          intensity_bounds: [0, 1]
        },
        confidence: {
          similarity_weight: 0.6,
          intensity_weight: 0.4,
          conservative_factor: 0.9
        }
      },
      pattern_transformation: {
        sequential: {
          shift_modulo: 10,
          sine_frequency_factor: 0.1,
          sine_amplitude: 0.1
        },
        spatial: {
          decay_rate: 0.1
        },
        frequency: {
          frequency_scale: 20,
          cosine_amplitude: 0.05
        },
        default: {
          base_factor: 0.8,
          intensity_influence: 0.2
        }
      },
      pattern_enhancement: {
        feature_activation: {
          function: 'tanh',
          preserve_sign: true
        },
        context_merging: {
          preserve_original_tags: true,
          add_enhancement_timestamp: true
        }
      },
      debug: {
        log_level: 2
      }
    };
  }
  
  public generateExpectedPattern(destinationID: string, context: ContextInfo<T>): ExpectedPatternV2<T> {
    try {
      // パターン認識による期待パターン生成
      const recognizedPattern = this.recognizePattern(context);
      const transformedContext = this.applyPatternTransformation(recognizedPattern, destinationID);
      const enhancedContext = this.enhanceContextWithPatternInfo(transformedContext, context);
      
      return new ExpectedPatternV2<T>(enhancedContext);
      
    } catch (error) {
      this.logError('PatternAutonomousLayer.generateExpectedPattern failed', error);
      // フォールバック処理
      return this.createFallbackExpectedPattern(context);
    }
  }
  
  protected doObserveActualPattern(_actual: ActualPatternV2<T>): void {
    // 最小限の実装
  }

  public async doUpdatePredictiveModel(learningSignal: LearningSignal<T>): Promise<LearningSignal<T>[]> {
    const magnitude = learningSignal.referenceDifference.magnitude;
    const propagatedSignals: LearningSignal<T>[] = [];

    if (magnitude > this.BURST_THRESHOLD) {
      const sourceContextInfo = learningSignal.referenceDifference.contextInfo;
      const currentStatePattern = this.getCurrentStateAsPattern();
      const upstreamContextInfo = new ContextInfo<T>(currentStatePattern, new Set(sourceContextInfo.tags), sourceContextInfo.statistics.clone());
      const actualPatternForUpstream = new ActualPatternV2<T>(upstreamContextInfo);

      // for (const link of this.upstreamLinks) {
      //   // TODO: Re-implement inter-layer communication without circular dependency
      //   // This requires a mechanism to resolve layers without depending on LayerManager here.
      // }
    }
    return propagatedSignals;
  }
  
  /**
   * 現在の層の状態をパターンとして返す（バースト伝播用）
   */
  private getCurrentStateAsPattern(): T {
    const defaultSize = this.config.fallback.default_vector_size;
    const defaultValue = this.config.fallback.default_vector_value;
    return this.createVectorizableContext(new Array(defaultSize).fill(defaultValue));
  }

  /**
   * 型安全なベクトルコンテキスト作成
   * @param vector - ベクトル配列
   * @returns VectorizableContext準拠のT型オブジェクト
   */
  private createVectorizableContext(vector: number[]): T {
    return {
      toVector: () => [...vector],
      getDimension: () => vector.length
    } as T;
  }

  /**
   * コンテキストからパターンを認識する（型安全版）
   * @param context - 入力コンテキスト
   * @returns 認識されたパターン情報
   */
  private recognizePattern(context: ContextInfo<T>): PatternRecognitionResult {
    const inputContext = context.body;
    
    const similarity = this.calculatePatternSimilarity(inputContext);
    const patternType = this.classifyPattern(inputContext);
    const intensity = this.calculatePatternIntensity(inputContext);
    
    return {
      type: patternType,
      similarity: similarity,
      intensity: intensity,
      confidence: this.calculateConfidence(similarity, intensity),
      features: this.extractPatternFeatures(inputContext)
    };
  }

  /**
   * パターン変換を適用（型安全版）
   * @param pattern - 認識されたパターン
   * @param destinationID - 目的地ID
   * @returns 変換されたコンテキスト
   */
  private applyPatternTransformation(pattern: PatternRecognitionResult, destinationID: string): ContextInfo<T> {
    let transformedVector = pattern.features;
    
    switch (pattern.type) {
      case 'sequential':
        transformedVector = this.applySequentialTransformation(pattern.features, destinationID);
        break;
      case 'spatial':
        transformedVector = this.applySpatialTransformation(pattern.features, destinationID);
        break;
      case 'frequency':
        transformedVector = this.applyFrequencyTransformation(pattern.features, destinationID);
        break;
      default:
        transformedVector = this.applyDefaultTransformation(pattern.features, pattern.intensity);
        break;
    }
    
    const transformedPattern = this.createVectorizableContext(transformedVector);
    const tags = new Set([Tag.create(`pattern_${pattern.type}`), Tag.create(destinationID)]);
    const statistics = new Statistics();
    statistics.setNumber('similarity', pattern.similarity);
    statistics.setNumber('intensity', pattern.intensity);
    statistics.setNumber('confidence', pattern.confidence);
    
    return new ContextInfo<T>(transformedPattern, tags, statistics);
  }

  /**
   * コンテキストにパターン情報を付与（型安全版）
   * @param transformedContext - 変換されたコンテキスト
   * @param originalContext - 元のコンテキスト
   * @returns 強化されたコンテキスト
   */
  private enhanceContextWithPatternInfo(transformedContext: ContextInfo<T>, originalContext: ContextInfo<T>): ContextInfo<T> {
    const config = this.config.pattern_enhancement.context_merging;
    
    const combinedTags = config.preserve_original_tags 
      ? new Set([...originalContext.tags, ...transformedContext.tags])
      : new Set([...transformedContext.tags]);
    
    const combinedStats = originalContext.statistics.clone();
    combinedStats.merge(transformedContext.statistics);
    
    if (config.add_enhancement_timestamp) {
      combinedStats.setDate('enhancement_timestamp', new Date());
    }
    
    return new ContextInfo<T>(transformedContext.body, combinedTags, combinedStats);
  }

  /**
   * フォールバック期待パターンを作成（型安全版）
   * @param context - 元のコンテキスト
   * @returns フォールバック期待パターン
   */
  private createFallbackExpectedPattern(context: ContextInfo<T>): ExpectedPatternV2<T> {
    const originalVector = context.body.toVector();
    const fallbackVector = originalVector.map(v => v * this.config.fallback.decay_factor);
    const fallbackPattern = this.createVectorizableContext(fallbackVector);
    
    const fallbackStats = context.statistics.clone();
    fallbackStats.setBoolean('fallback', true);
    
    const fallbackContext = new ContextInfo<T>(
      fallbackPattern,
      new Set([Tag.create('fallback'), ...context.tags]),
      fallbackStats
    );
    
    return new ExpectedPatternV2<T>(fallbackContext);
  }

  // 型安全なパターン処理メソッド群

  /**
   * VectorizableContextから類似度を計算（型安全版）
   * @param context - VectorizableContext
   * @returns 類似度 [0, 1]
   */
  private calculatePatternSimilarity(context: T): number {
    const config = this.config.pattern_recognition.similarity_calculation;
    const vector = context.toVector();
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    
    let normalizedMagnitude = magnitude;
    if (config.dimension_adjustment) {
      normalizedMagnitude = magnitude / Math.sqrt(context.getDimension());
    }
    
    return Math.max(0, Math.min(1, normalizedMagnitude * config.magnitude_scaling));
  }

  /**
   * VectorizableContextからパターンタイプを分類（型安全版）
   * @param context - VectorizableContext
   * @returns パターンタイプ
   */
  private classifyPattern(context: T): PatternType {
    const config = this.config.pattern_recognition.classification;
    const vector = context.toVector();
    const variance = this.calculateVectorVariance(vector);
    const entropy = this.calculateVectorEntropy(vector);
    
    if (variance < config.variance_threshold_uniform) return 'uniform';
    if (entropy > config.entropy_threshold_random) return 'random';
    if (this.isSequentialPattern(vector)) return 'sequential';
    if (this.isSpatialPattern(vector)) return 'spatial';
    if (this.isFrequencyPattern(vector)) return 'frequency';
    return 'complex';
  }

  /**
   * VectorizableContextから強度を計算（型安全版）
   * @param context - VectorizableContext
   * @returns 強度 [0, 1]
   */
  private calculatePatternIntensity(context: T): number {
    const config = this.config.pattern_recognition.intensity;
    const vector = context.toVector();
    
    let intensity: number;
    if (config.mean_abs_scaling) {
      intensity = vector.reduce((sum, v) => sum + Math.abs(v), 0) / vector.length;
    } else {
      intensity = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) / vector.length;
    }
    
    const [min, max] = config.intensity_bounds;
    return Math.max(min, Math.min(max, intensity));
  }

  /**
   * 信頼度計算（設定駆動）
   * @param similarity - 類似度
   * @param intensity - 強度
   * @returns 信頼度
   */
  private calculateConfidence(similarity: number, intensity: number): number {
    const config = this.config.pattern_recognition.confidence;
    return (similarity * config.similarity_weight + intensity * config.intensity_weight) 
           * config.conservative_factor;
  }

  /**
   * VectorizableContextから特徴量を抽出（型安全版）
   * @param context - VectorizableContext
   * @returns 特徴量配列
   */
  private extractPatternFeatures(context: T): number[] {
    const activationConfig = this.config.pattern_enhancement.feature_activation;
    const vector = context.toVector();
    
    switch (activationConfig.function) {
      case 'tanh':
        return vector.map(v => Math.tanh(v));
      case 'sigmoid':
        return vector.map(v => 1 / (1 + Math.exp(-v)));
      case 'relu':
        return vector.map(v => Math.max(0, v));
      case 'linear':
      default:
        return activationConfig.preserve_sign ? [...vector] : vector.map(v => Math.abs(v));
    }
  }

  // 変換メソッド群（設定駆動）

  private applySequentialTransformation(features: number[], destinationID: string): number[] {
    const config = this.config.pattern_transformation.sequential;
    const shift = this.calculateShiftFromDestination(destinationID);
    return features.map((v, i) => 
      v + Math.sin((i + shift) * config.sine_frequency_factor) * config.sine_amplitude
    );
  }

  private applySpatialTransformation(features: number[], destinationID: string): number[] {
    const config = this.config.pattern_transformation.spatial;
    const spatialFactor = this.calculateSpatialFactor(destinationID);
    return features.map((v, i) => v * (1 + spatialFactor * Math.exp(-i * config.decay_rate)));
  }

  private applyFrequencyTransformation(features: number[], destinationID: string): number[] {
    const config = this.config.pattern_transformation.frequency;
    const frequency = this.calculateFrequencyFromDestination(destinationID);
    return features.map((v, i) => v + Math.cos(i * frequency) * config.cosine_amplitude);
  }

  private applyDefaultTransformation(features: number[], intensity: number): number[] {
    const config = this.config.pattern_transformation.default;
    return features.map(v => v * (config.base_factor + intensity * config.intensity_influence));
  }

  // ベクトル解析ヘルパーメソッド

  private calculateVectorVariance(vector: number[]): number {
    const mean = vector.reduce((sum, v) => sum + v, 0) / vector.length;
    return vector.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vector.length;
  }

  private calculateVectorEntropy(vector: number[]): number {
    const normalized = vector.map(v => Math.abs(v));
    const sum = normalized.reduce((s, v) => s + v, 0);
    if (sum === 0) return 0;
    const probs = normalized.map(v => v / sum);
    return -probs.reduce((entropy, p) => p > 0 ? entropy + p * Math.log2(p) : entropy, 0);
  }

  private isSequentialPattern(vector: number[]): boolean {
    const config = this.config.pattern_recognition.classification;
    let sequential = 0;
    for (let i = 1; i < vector.length; i++) {
      if (Math.abs(vector[i] - vector[i-1]) < 0.1) sequential++;
    }
    return sequential / (vector.length - 1) > config.sequential_correlation_threshold;
  }

  private isSpatialPattern(vector: number[]): boolean {
    const config = this.config.pattern_recognition.classification;
    const gradients = [];
    for (let i = 1; i < vector.length; i++) {
      gradients.push(vector[i] - vector[i-1]);
    }
    const gradientVariance = this.calculateVectorVariance(gradients);
    return gradientVariance < config.spatial_gradient_variance_threshold;
  }

  private isFrequencyPattern(vector: number[]): boolean {
    const config = this.config.pattern_recognition.classification;
    const half = Math.floor(vector.length / 2);
    let correlation = 0;
    for (let i = 0; i < half; i++) {
      correlation += vector[i] * vector[i + half];
    }
    return Math.abs(correlation) > config.frequency_correlation_threshold;
  }

  // ID変換ヘルパーメソッド

  private calculateShiftFromDestination(destinationID: string): number {
    const config = this.config.pattern_transformation.sequential;
    return destinationID.length % config.shift_modulo;
  }

  private calculateSpatialFactor(destinationID: string): number {
    const hash = destinationID.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return (hash % 100) / 100;
  }

  private calculateFrequencyFromDestination(destinationID: string): number {
    const config = this.config.pattern_transformation.frequency;
    const hash = destinationID.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return (hash % config.frequency_scale) / config.frequency_scale * Math.PI;
  }

  // ログ出力メソッド

  private logError(message: string, error?: any): void {
    if (this.config.debug.log_level >= 1) {
      console.error(`[PatternAutonomousLayer] ERROR: ${message}`, error);
    }
  }

  private logWarn(message: string): void {
    if (this.config.debug.log_level >= 2) {
      console.warn(`[PatternAutonomousLayer] WARN: ${message}`);
    }
  }

  private logInfo(message: string, data?: any): void {
    if (this.config.debug.log_level >= 3) {
      console.info(`[PatternAutonomousLayer] INFO: ${message}`, data);
    }
  }

  private logDebug(message: string): void {
    if (this.config.debug.log_level >= 4) {
      console.debug(`[PatternAutonomousLayer] DEBUG: ${message}`);
    }
  }
}

/**
 * 概念自律層の実装（クラス図準拠版）
 * 設定駆動の特徴抽出を使用した本格実装
 */
export class ConceptAutonomousLayer<T extends Context> extends BaseAutonomousLayer<T> {
  private readonly featureExtractor: ConceptualFeatureExtractor<T>;
  
  constructor(layerId: string, layerName: string = "概念層") {
    super(layerId, layerName, "concept");
    this.featureExtractor = new ConceptualFeatureExtractor<T>();
  }
  
  public generateExpectedPattern(destinationID: string, context: ContextInfo<T>): ExpectedPatternV2<T> {
    if (DevelopOption.isGenerateExpectedPatternMock) {
      // モック実装: 渡されたコンテキストをそのまま利用して期待パターンを生成
      return new ExpectedPatternV2<T>(context);
    } else {
      try {
        // 特徴量抽出 - 型安全なFeatureListを使用
        const extractedFeatures = this.featureExtractor.extract(context);
        const featureList = new FeatureList();
        extractedFeatures.forEach(feature => featureList.add(feature));
        
        // 特徴量から期待パターンを構築
        const prediction = this.buildPredictionFromFeatures(featureList, destinationID);
        const predictedContext = this.createPredictedContext(prediction, context);
        
        return new ExpectedPatternV2<T>(predictedContext);
        
      } catch (error) {
        console.error('ConceptAutonomousLayer.generateExpectedPattern failed:', error);
        // フォールバック処理
        return this.createFallbackPattern(context);
      }
    }
  }
  
  protected doObserveActualPattern(_actual: ActualPatternV2<T>): void {
    // 最小限の実装
  }
  
  public async doUpdatePredictiveModel(_signal: LearningSignal<T>): Promise<LearningSignal<T>[]> {
    return [];
  }

  /**
   * 特徴量から予測を構築
   * @param featureList - 抽出された特徴量
   * @param destinationID - 目的地ID
   * @returns 予測ベクトル
   */
  private buildPredictionFromFeatures(featureList: FeatureList, destinationID: string): number[] {
    // 特徴量をベクトルに変換
    const featureVector = featureList.toVector();
    
    // 目的地IDに基づく変換（概念レベルでの抽象化）
    const destinationHash = destinationID.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const transformationFactor = (destinationHash % 100) / 100;
    
    // 概念的変換を適用
    return featureVector.map((value: number, index: number) => {
      // 概念レベルでの抽象化
      const abstractionLevel = 0.8; // 概念層は抽象度が高い
      const transformedValue = value * abstractionLevel;
      
      // 目的地に基づく微調整
      const adjustment = Math.sin(index * transformationFactor) * 0.1;
      
      return transformedValue + adjustment;
    });
  }

  /**
   * 予測から予測コンテキストを作成
   * @param prediction - 予測ベクトル
   * @param originalContext - 元のコンテキスト
   * @returns 予測コンテキスト
   */
  private createPredictedContext(prediction: number[], originalContext: ContextInfo<T>): ContextInfo<T> {
    // 予測ベクトルからコンテキストを作成（型安全）
    const predictedBody = {
      ...originalContext.body,
      toVector: () => prediction,
      getDimension: () => prediction.length
    } as T;
    
    // 予測に関する統計情報を追加
    const predictedStats = originalContext.statistics.clone();
    predictedStats.setString('prediction_source', 'conceptual_feature_extraction');
    predictedStats.setDate('prediction_timestamp', new Date());
    predictedStats.setNumber('prediction_confidence', 0.7); // 概念層の予測信頼度
    
    // 予測タグを追加
    const predictedTags = new Set([...originalContext.tags, Tag.create('predicted'), Tag.create('conceptual')]);
    
    return new ContextInfo<T>(predictedBody, predictedTags, predictedStats);
  }

  /**
   * フォールバックパターンを作成
   * @param context - 元のコンテキスト
   * @returns フォールバック期待パターン
   */
  private createFallbackPattern(context: ContextInfo<T>): ExpectedPatternV2<T> {
    // 元のコンテキストをわずかに変更したフォールバック
    const fallbackStats = context.statistics.clone();
    fallbackStats.setBoolean('fallback', true);
    fallbackStats.setString('fallback_reason', 'feature_extraction_failed');
    
    const fallbackContext = new ContextInfo<T>(
      context.body,
      new Set([...context.tags, Tag.create('fallback')]),
      fallbackStats
    );
    
    return new ExpectedPatternV2<T>(fallbackContext);
  }
}

/**
 * 行動自律層の実装（クラス図準拠版）
 * 最小限の骨格実装 - コンパイルエラー回避のため詳細ロジックは削除
 */
export class ActionAutonomousLayer<T extends Context> extends BaseAutonomousLayer<T> {
  
  constructor(layerId: string, layerName: string = "行動層") {
    super(layerId, layerName, "action");
  }
  
  public generateExpectedPattern(_destinationID: string, _context: ContextInfo<T>): ExpectedPatternV2<T> {
    const defaultPattern = { actionId: 'default' } as unknown as T;
    const contextInfo = new ContextInfo<T>(defaultPattern, new Set(), new Statistics());
    return new ExpectedPatternV2<T>(contextInfo);
  }
  
  protected doObserveActualPattern(_actual: ActualPatternV2<T>): void {
    // 最小限の実装
  }
  
  public async doUpdatePredictiveModel(_signal: LearningSignal<T>): Promise<LearningSignal<T>[]> {
    return [];
  }
}