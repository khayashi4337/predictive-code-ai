import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * 設定ファイル読み込みエラー
 */
export class ConfigLoadError extends Error {
  constructor(message: string, public readonly filePath: string, public readonly cause?: Error) {
    super(`Config load error for ${filePath}: ${message}`);
    this.name = 'ConfigLoadError';
  }
}

/**
 * 概念層特徴抽出器設定の型定義
 */
export interface ConceptualFeatureExtractorConfig {
  meta: {
    version: string;
    description: string;
    last_updated: string;
    author: string;
  };
  
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
    denoise_strength: number;
    neighbor_influence: number;
  };
  
  complexity_weights: {
    tag_weight: number;
    statistics_weight: number;
    dimension_weight: number;
    magnitude_weight: number;
  };
  
  abstraction_level: {
    info_scale_factor: number;
    max_level: number;
    min_level: number;
  };
  
  tag_processing: {
    min_diversity: number;
    normalize_weights: boolean;
    rare_tag_boost: number;
  };
  
  vector_processing: {
    min_dimension: number;
    max_dimension: number;
    enable_normalization: boolean;
    zero_vector_threshold: number;
  };
  
  debug: {
    log_level: number;
    output_statistics: boolean;
    measure_performance: boolean;
  };
  
  fallback: {
    default_dimension: number;
    default_value: number;
    max_retry_attempts: number;
    error_tolerance: number;
  };
  
  performance: {
    extraction_timeout_ms: number;
    cache_size: number;
    batch_size: number;
    enable_parallel_processing: boolean;
  };
}

/**
 * パターン層自律モジュール設定の型定義
 */
export interface PatternAutonomousLayerConfig {
  meta: {
    version: string;
    description: string;
    last_updated: string;
    author: string;
  };
  
  pattern_recognition: {
    similarity_calculation: {
      normalization_method: string;
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
      function: string; // "tanh", "sigmoid", "relu"
      preserve_sign: boolean;
    };
    
    context_merging: {
      preserve_original_tags: boolean;
      add_enhancement_timestamp: boolean;
    };
  };
  
  fallback: {
    decay_factor: number;
    default_vector_size: number;
    default_vector_value: number;
  };
  
  debug: {
    log_level: number;
    output_statistics: boolean;
    measure_performance: boolean;
  };
  
  performance: {
    pattern_recognition_timeout_ms: number;
    transformation_timeout_ms: number;
    cache_size: number;
  };
}

/**
 * パターンタイプの列挙型
 */
export type PatternType = 'uniform' | 'random' | 'sequential' | 'spatial' | 'frequency' | 'complex';

/**
 * パターン認識結果の型定義
 */
export interface PatternRecognitionResult {
  type: PatternType;
  similarity: number;
  intensity: number;
  confidence: number;
  features: number[];
}

/**
 * 設定ファイルローダー
 * YAMLファイルから設定を読み込み、型安全なオブジェクトとして提供
 */
export class ConfigLoader {
  private static readonly configCache = new Map<string, any>();
  
  /**
   * パターン層自律モジュール設定を読み込み
   * @param configPath - 設定ファイルパス（未指定時はデフォルトパス）
   * @returns パターン層自律モジュール設定
   */
  static loadPatternAutonomousLayerConfig(
    configPath?: string
  ): PatternAutonomousLayerConfig {
    const defaultPath = path.join(
      process.cwd(),
      'config',
      'layers',
      'pattern-autonomous-layer.yaml'
    );
    
    const filePath = configPath || defaultPath;
    
    try {
      return this.loadYamlConfig<PatternAutonomousLayerConfig>(filePath);
    } catch (error) {
      console.error(`Failed to load pattern autonomous layer config: ${error}`);
      
      // フォールバック設定を返す
      return this.getDefaultPatternAutonomousLayerConfig();
    }
  }

  /**
   * 概念層特徴抽出器設定を読み込み
   * @param configPath - 設定ファイルパス（未指定時はデフォルトパス）
   * @returns 概念層特徴抽出器設定
   */
  static loadConceptualFeatureExtractorConfig(
    configPath?: string
  ): ConceptualFeatureExtractorConfig {
    const defaultPath = path.join(
      process.cwd(),
      'config',
      'features',
      'conceptual-feature-extractor.yaml'
    );
    
    const filePath = configPath || defaultPath;
    
    try {
      return this.loadYamlConfig<ConceptualFeatureExtractorConfig>(filePath);
    } catch (error) {
      console.error(`Failed to load conceptual feature extractor config: ${error}`);
      
      // フォールバック設定を返す
      return this.getDefaultConceptualFeatureExtractorConfig();
    }
  }
  
  /**
   * YAML設定ファイルを読み込み
   * @param filePath - YAMLファイルパス
   * @returns パースされた設定オブジェクト
   */
  private static loadYamlConfig<T>(filePath: string): T {
    // キャッシュから取得を試行
    if (this.configCache.has(filePath)) {
      return this.configCache.get(filePath) as T;
    }
    
    try {
      // ファイル存在確認
      if (!fs.existsSync(filePath)) {
        throw new ConfigLoadError(`File not found: ${filePath}`, filePath);
      }
      
      // ファイル読み込み
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // YAMLパース
      const config = yaml.load(fileContent) as T;
      
      if (!config) {
        throw new ConfigLoadError('Failed to parse YAML content', filePath);
      }
      
      // バリデーション
      this.validateConfig(config, filePath);
      
      // キャッシュに保存
      this.configCache.set(filePath, config);
      
      return config;
      
    } catch (error) {
      if (error instanceof ConfigLoadError) {
        throw error;
      }
      
      throw new ConfigLoadError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        filePath,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * 設定の基本バリデーション
   * @param config - 設定オブジェクト
   * @param filePath - 設定ファイルパス
   */
  private static validateConfig(config: any, filePath: string): void {
    if (typeof config !== 'object' || config === null) {
      throw new ConfigLoadError('Config must be an object', filePath);
    }
    
    // 基本的な構造チェック
    if (config.confidence_scores) {
      this.validateConfidenceScores(config.confidence_scores, filePath);
    }
    
    if (config.abstraction) {
      this.validateAbstractionConfig(config.abstraction, filePath);
    }
  }
  
  /**
   * 信頼度スコア設定のバリデーション
   * @param scores - 信頼度スコア設定
   * @param filePath - 設定ファイルパス
   */
  private static validateConfidenceScores(scores: any, filePath: string): void {
    const requiredFields = [
      'vector_feature',
      'statistical_feature', 
      'tag_feature',
      'conceptual_feature',
      'fallback_feature'
    ];
    
    for (const field of requiredFields) {
      const value = scores[field];
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new ConfigLoadError(
          `confidence_scores.${field} must be a number between 0 and 1, got: ${value}`,
          filePath
        );
      }
    }
  }
  
  /**
   * 抽象化設定のバリデーション
   * @param abstraction - 抽象化設定
   * @param filePath - 設定ファイルパス
   */
  private static validateAbstractionConfig(abstraction: any, filePath: string): void {
    const numericFields = [
      'significance_threshold',
      'abstraction_factor',
      'emphasis_factor',
      'smoothing_factor',
      'denoise_strength',
      'neighbor_influence'
    ];
    
    for (const field of numericFields) {
      const value = abstraction[field];
      if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        throw new ConfigLoadError(
          `abstraction.${field} must be a finite number, got: ${value}`,
          filePath
        );
      }
      
      // 特定フィールドの範囲チェック
      if (field === 'significance_threshold' && (value < 0 || value > 1)) {
        throw new ConfigLoadError(
          `abstraction.${field} must be between 0 and 1, got: ${value}`,
          filePath
        );
      }
    }
  }
  
  /**
   * デフォルトの概念層特徴抽出器設定を取得
   * @returns デフォルト設定
   */
  private static getDefaultConceptualFeatureExtractorConfig(): ConceptualFeatureExtractorConfig {
    return {
      meta: {
        version: '1.0.0',
        description: 'Default conceptual feature extractor configuration',
        last_updated: new Date().toISOString().split('T')[0],
        author: 'Predictive Code AI Team (Fallback)'
      },
      
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
        denoise_strength: 0.1,
        neighbor_influence: 0.1
      },
      
      complexity_weights: {
        tag_weight: 0.1,
        statistics_weight: 0.05,
        dimension_weight: 0.1,
        magnitude_weight: 0.02
      },
      
      abstraction_level: {
        info_scale_factor: 10.0,
        max_level: 1.0,
        min_level: 0.0
      },
      
      tag_processing: {
        min_diversity: 0.01,
        normalize_weights: true,
        rare_tag_boost: 1.5
      },
      
      vector_processing: {
        min_dimension: 5,
        max_dimension: 100,
        enable_normalization: true,
        zero_vector_threshold: 1e-10
      },
      
      debug: {
        log_level: 2,
        output_statistics: false,
        measure_performance: false
      },
      
      fallback: {
        default_dimension: 5,
        default_value: 0.1,
        max_retry_attempts: 2,
        error_tolerance: 5
      },
      
      performance: {
        extraction_timeout_ms: 1000,
        cache_size: 100,
        batch_size: 10,
        enable_parallel_processing: false
      }
    };
  }
  
  /**
   * デフォルトのパターン層自律モジュール設定を取得
   * @returns デフォルト設定
   */
  private static getDefaultPatternAutonomousLayerConfig(): PatternAutonomousLayerConfig {
    return {
      meta: {
        version: '1.0.0',
        description: 'Default pattern autonomous layer configuration',
        last_updated: new Date().toISOString().split('T')[0],
        author: 'Predictive Code AI Team (Fallback)'
      },
      
      pattern_recognition: {
        similarity_calculation: {
          normalization_method: 'magnitude',
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
      
      fallback: {
        decay_factor: 0.8,
        default_vector_size: 10,
        default_vector_value: 0.1
      },
      
      debug: {
        log_level: 2,
        output_statistics: false,
        measure_performance: false
      },
      
      performance: {
        pattern_recognition_timeout_ms: 500,
        transformation_timeout_ms: 300,
        cache_size: 50
      }
    };
  }

  /**
   * 設定キャッシュをクリア
   * @param filePath - クリア対象のファイルパス（未指定時は全クリア）
   */
  static clearCache(filePath?: string): void {
    if (filePath) {
      this.configCache.delete(filePath);
    } else {
      this.configCache.clear();
    }
  }
  
  /**
   * 設定ファイルの再読み込み
   * @param filePath - 再読み込み対象のファイルパス
   */
  static reloadConfig<T>(filePath: string): T {
    this.clearCache(filePath);
    return this.loadYamlConfig<T>(filePath);
  }
}