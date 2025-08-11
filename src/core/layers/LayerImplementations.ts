import { VectorizableContext } from '../tag/VectorizableContext';
import { ContextInfo } from '../tag/ContextInfo';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { LearningSignal } from '../learning/LearningSignalV2';
import { BaseAutonomousLayer } from './AutonomousLayer';

/**
 * 感覚自律層の実装（クラス図準拠版）
 * クラス図P1_Layers.SensoryAutonomousLayerに対応
 * 
 * 外部入力（感覚器官からの情報）を処理し、パターンを抽出する役割を担う。
 * 視覚、聴覚、触覚などの感覚モダリティを統合し、上位層に情報を送信する。
 */
export class SensoryAutonomousLayer<T extends VectorizableContext> extends BaseAutonomousLayer<T> {
  
  /** 感覚データのバッファ */
  private readonly sensoryBuffer: ActualPatternV2<T>[] = [];
  
  /** 予測モデル（簡易実装） */
  private predictionWeights: number[] = [];
  
  /** バッファの最大サイズ */
  private readonly maxBufferSize: number = 100;
  
  /**
   * コンストラクタ
   * @param layerId - 層の識別子
   * @param layerName - 層の名前（デフォルト: "感覚層"）
   */
  constructor(layerId: string, layerName: string = "感覚層") {
    super(layerId, layerName, "sensory");
    
    // 初期の予測重みを設定
    this.predictionWeights = new Array(10).fill(0).map(() => Math.random() * 0.1);
  }
  
  /**
   * 期待パターンを生成
   * 過去の感覚データの傾向から次の感覚入力を予測
   */
  public generateExpectedPattern(_destinationID: string, context: ContextInfo<T>): ExpectedPatternV2<T> {
    const startTime = Date.now();
    
    try {
      // 最近の感覚データから予測を生成
      const prediction = this.generateSensoryPrediction(context);
      
      const contextInfo = new ContextInfo<T>(
        prediction,
        new Set(context.tags),
        new Map([
          ['prediction_confidence', this.calculatePredictionConfidence()],
          ['buffer_size', this.sensoryBuffer.length]
        ])
      );
      
      const expectedPattern = new ExpectedPatternV2<T>(contextInfo);
      
      this.updateStatistics('generate', Date.now() - startTime);
      return expectedPattern;
      
    } catch (error) {
      this.handleError('generateExpectedPattern', error as Error);
      throw error;
    }
  }
  
  /**
   * 実際パターンを観測
   * 感覚データをバッファに追加し、パターン学習を行う
   */
  protected doObserveActualPattern(actual: ActualPatternV2<T>): void {
    // バッファに追加
    this.sensoryBuffer.push(actual);
    
    // バッファサイズの制限
    if (this.sensoryBuffer.length > this.maxBufferSize) {
      this.sensoryBuffer.shift();
    }
    
    // 感覚データの統計的特徴を更新
    this.updateSensoryStatistics(actual);
  }
  
  /**
   * 予測モデルを更新
   * 学習信号に基づいて感覚予測の重みを調整
   */
  protected doUpdatePredictiveModel(signal: LearningSignal<T>): void {
    const learningRate = signal.adaptiveLearningRate.value;
    const magnitude = signal.referenceDifference.magnitude;
    
    // 予測重みの調整
    for (let i = 0; i < this.predictionWeights.length; i++) {
      const adjustment = (Math.random() - 0.5) * learningRate * magnitude;
      this.predictionWeights[i] += adjustment;
      
      // 重みの範囲制限
      this.predictionWeights[i] = Math.max(-1, Math.min(1, this.predictionWeights[i]));
    }
  }
  
  /**
   * 感覚予測を生成
   * @param context - 文脈情報
   * @returns 予測されたパターン
   */
  private generateSensoryPrediction(_context: ContextInfo<T>): T {
    if (this.sensoryBuffer.length === 0) {
      // バッファが空の場合はデフォルトパターンを返す
      return this.createDefaultPattern();
    }
    
    // 最新の感覚データを基に予測を生成
    const latestPattern = this.sensoryBuffer[this.sensoryBuffer.length - 1];
    return this.applyPredictionTransform(latestPattern.body);
  }
  
  /**
   * デフォルトパターンを作成
   * @returns デフォルトのパターン
   */
  private createDefaultPattern(): T {
    // VectorizableContextの仮想的な実装
    const defaultVector = new Array(10).fill(0);
    return {
      toVector: () => defaultVector
    } as T;
  }
  
  /**
   * 予測変換を適用
   * @param pattern - 基となるパターン
   * @returns 変換されたパターン
   */
  private applyPredictionTransform(pattern: T): T {
    const inputVector = pattern.toVector();
    const transformedVector = inputVector.map((value, index) => {
      const weight = this.predictionWeights[index % this.predictionWeights.length];
      return value * (1 + weight);
    });
    
    return {
      toVector: () => transformedVector
    } as T;
  }
  
  /**
   * 予測信頼度を計算
   * @returns 信頼度（0-1）
   */
  private calculatePredictionConfidence(): number {
    const bufferRatio = this.sensoryBuffer.length / this.maxBufferSize;
    const weightVariance = this.calculateWeightVariance();
    
    // 多くのデータがあり、重みが安定している場合は信頼度が高い
    return Math.min(bufferRatio * (1 - weightVariance), 1);
  }
  
  /**
   * 予測重みの分散を計算
   * @returns 重みの分散
   */
  private calculateWeightVariance(): number {
    if (this.predictionWeights.length === 0) return 1;
    
    const mean = this.predictionWeights.reduce((sum, w) => sum + w, 0) / this.predictionWeights.length;
    const variance = this.predictionWeights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / this.predictionWeights.length;
    
    return variance;
  }
  
  /**
   * 感覚データの統計を更新
   * @param actual - 観測された実際パターン
   */
  private updateSensoryStatistics(actual: ActualPatternV2<T>): void {
    // const vector = actual.body.toVector();
    
    // 簡単な統計指標の計算と記録
    // const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    const contextInfo = actual.contextInfo;
    
    if (contextInfo.statistics.has('input_magnitude')) {
      // const existingMagnitude = contextInfo.statistics.get('input_magnitude') || 0;
      // ContextInfoは読み取り専用なので、新しいインスタンスは作成しない
      // 実際の実装では、統計管理システムが別途必要
    } else {
      // ContextInfoは読み取り専用なので、新しいインスタンスは作成しない  
      // 実際の実装では、統計管理システムが別途必要
    }
  }
}

/**
 * パターン自律層の実装（クラス図準拠版）
 * クラス図P1_Layers.PatternAutonomousLayerに対応
 * 
 * 感覚層から受け取った低レベル特徴を組み合わせ、中レベルのパターンを抽出する。
 * エッジ、テクスチャ、色彩などの視覚的パターンや、音響的パターンを識別する。
 */
export class PatternAutonomousLayer<T extends VectorizableContext> extends BaseAutonomousLayer<T> {
  
  /** パターンテンプレート */
  private patternTemplates: Map<string, number[]> = new Map();
  
  /** パターン出現履歴 */
  private patternHistory: string[] = [];
  
  /** 最大履歴サイズ */
  private readonly maxHistorySize: number = 200;
  
  /**
   * コンストラクタ
   * @param layerId - 層の識別子
   * @param layerName - 層の名前（デフォルト: "パターン層"）
   */
  constructor(layerId: string, layerName: string = "パターン層") {
    super(layerId, layerName, "pattern");
    
    // 基本的なパターンテンプレートを初期化
    this.initializePatternTemplates();
  }
  
  /**
   * 期待パターンを生成
   * パターン履歴と確率的推移に基づいて次のパターンを予測
   */
  public generateExpectedPattern(_destinationID: string, context: ContextInfo<T>): ExpectedPatternV2<T> {
    const startTime = Date.now();
    
    try {
      const predictedPattern = this.predictNextPattern(context);
      
      const contextInfo = new ContextInfo<T>(
        predictedPattern,
        new Set(context.tags),
        new Map([
          ['pattern_template_count', this.patternTemplates.size],
          ['history_length', this.patternHistory.length]
        ])
      );
      
      const expectedPattern = new ExpectedPatternV2<T>(contextInfo);
      
      this.updateStatistics('generate', Date.now() - startTime);
      return expectedPattern;
      
    } catch (error) {
      this.handleError('generateExpectedPattern', error as Error);
      throw error;
    }
  }
  
  /**
   * 実際パターンを観測
   * パターンを解析し、テンプレートを更新
   */
  protected doObserveActualPattern(actual: ActualPatternV2<T>): void {
    const patternId = this.analyzePattern(actual.body);
    
    // パターン履歴を更新
    this.patternHistory.push(patternId);
    if (this.patternHistory.length > this.maxHistorySize) {
      this.patternHistory.shift();
    }
    
    // テンプレートを更新
    this.updatePatternTemplate(patternId, actual.body.toVector());
  }
  
  /**
   * 予測モデルを更新
   * パターンテンプレートと推移確率を調整
   */
  protected doUpdatePredictiveModel(signal: LearningSignal<T>): void {
    const learningRate = signal.adaptiveLearningRate.value;
    const magnitude = signal.referenceDifference.magnitude;
    
    // パターンテンプレートの適応的調整
    this.adaptPatternTemplates(learningRate, magnitude);
  }
  
  /**
   * パターンテンプレートを初期化
   */
  private initializePatternTemplates(): void {
    // 基本的なパターンテンプレート（例）
    this.patternTemplates.set('horizontal', [1, 1, 1, 0, 0, 0, 1, 1, 1, 0]);
    this.patternTemplates.set('vertical', [1, 0, 1, 1, 0, 1, 1, 0, 1, 0]);
    this.patternTemplates.set('diagonal', [1, 0, 0, 0, 1, 0, 0, 0, 1, 0]);
    this.patternTemplates.set('center', [0, 0, 0, 0, 1, 1, 0, 0, 0, 0]);
    this.patternTemplates.set('edge', [1, 1, 1, 1, 0, 0, 1, 1, 1, 1]);
  }
  
  /**
   * パターンを解析してIDを返す
   * @param pattern - 解析対象のパターン
   * @returns パターンID
   */
  private analyzePattern(pattern: T): string {
    const vector = pattern.toVector();
    let bestMatch = 'unknown';
    let bestScore = -1;
    
    // 各テンプレートとの類似度を計算
    for (const [templateId, template] of this.patternTemplates) {
      const score = this.calculateSimilarity(vector, template);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = templateId;
      }
    }
    
    // 閾値未満の場合は新しいパターンとして登録
    if (bestScore < 0.7) {
      const newPatternId = `pattern_${Date.now()}`;
      this.patternTemplates.set(newPatternId, vector.slice(0, 10));
      return newPatternId;
    }
    
    return bestMatch;
  }
  
  /**
   * ベクトル間の類似度を計算
   * @param vec1 - ベクトル1
   * @param vec2 - ベクトル2
   * @returns 類似度（0-1）
   */
  private calculateSimilarity(vec1: number[], vec2: number[]): number {
    const minLength = Math.min(vec1.length, vec2.length);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < minLength; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    const magnitude1 = Math.sqrt(norm1);
    const magnitude2 = Math.sqrt(norm2);
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    return dotProduct / (magnitude1 * magnitude2);
  }
  
  /**
   * 次のパターンを予測
   * @param context - 文脈情報
   * @returns 予測されたパターン
   */
  private predictNextPattern(_context: ContextInfo<T>): T {
    if (this.patternHistory.length < 2) {
      return this.createDefaultPattern();
    }
    
    // 最近のパターン履歴から推移確率を計算
    const recentPatterns = this.patternHistory.slice(-5);
    const mostLikelyNext = this.findMostLikelyTransition(recentPatterns);
    
    // 予測パターンを生成
    const template = this.patternTemplates.get(mostLikelyNext);
    if (template) {
      return {
        toVector: () => template.slice()
      } as T;
    }
    
    return this.createDefaultPattern();
  }
  
  /**
   * デフォルトパターンを作成
   * @returns デフォルトのパターン
   */
  private createDefaultPattern(): T {
    return {
      toVector: () => new Array(10).fill(0.5)
    } as T;
  }
  
  /**
   * 最も可能性の高い推移を見つける
   * @param recentPatterns - 最近のパターン履歴
   * @returns 次のパターンID
   */
  private findMostLikelyTransition(recentPatterns: string[]): string {
    if (recentPatterns.length === 0) {
      return Array.from(this.patternTemplates.keys())[0];
    }
    
    // 簡単な頻度ベースの予測
    const patternCounts = new Map<string, number>();
    
    for (const pattern of recentPatterns) {
      const count = patternCounts.get(pattern) || 0;
      patternCounts.set(pattern, count + 1);
    }
    
    let maxCount = 0;
    let mostFrequent = recentPatterns[recentPatterns.length - 1];
    
    for (const [pattern, count] of patternCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = pattern;
      }
    }
    
    return mostFrequent;
  }
  
  /**
   * パターンテンプレートを更新
   * @param patternId - パターンID
   * @param vector - 新しいベクトルデータ
   */
  private updatePatternTemplate(patternId: string, vector: number[]): void {
    const existingTemplate = this.patternTemplates.get(patternId);
    if (existingTemplate) {
      // 既存テンプレートとの平均を取る
      const updatedTemplate = existingTemplate.map((value, index) => {
        const newValue = index < vector.length ? vector[index] : value;
        return (value + newValue) / 2;
      });
      this.patternTemplates.set(patternId, updatedTemplate);
    } else {
      // 新規テンプレートとして登録
      this.patternTemplates.set(patternId, vector.slice(0, 10));
    }
  }
  
  /**
   * パターンテンプレートの適応的調整
   * @param learningRate - 学習率
   * @param magnitude - 差分の大きさ
   */
  private adaptPatternTemplates(learningRate: number, magnitude: number): void {
    // 全テンプレートに小さな摂動を加える
    for (const [patternId, template] of this.patternTemplates) {
      const adaptedTemplate = template.map(value => {
        const noise = (Math.random() - 0.5) * learningRate * magnitude * 0.1;
        return Math.max(-1, Math.min(1, value + noise));
      });
      this.patternTemplates.set(patternId, adaptedTemplate);
    }
  }
}

/**
 * 概念自律層の実装（クラス図準拠版）
 * クラス図P1_Layers.ConceptAutonomousLayerに対応
 * 
 * パターン層からの中レベル特徴を統合し、高レベルの概念を形成する。
 * オブジェクト、シーン、状況などの抽象的概念を扱う。
 */
export class ConceptAutonomousLayer<T extends VectorizableContext> extends BaseAutonomousLayer<T> {
  
  /** 概念の階層構造 */
  private conceptHierarchy: Map<string, { parent?: string; children: Set<string>; vector: number[]; confidence: number }> = new Map();
  
  /** 概念の活性化履歴 */
  private conceptActivations: Map<string, number[]> = new Map();
  
  /**
   * コンストラクタ
   * @param layerId - 層の識別子
   * @param layerName - 層の名前（デフォルト: "概念層"）
   */
  constructor(layerId: string, layerName: string = "概念層") {
    super(layerId, layerName, "concept");
    
    this.initializeBaseConcepts();
  }
  
  /**
   * 期待パターンを生成
   * 概念の階層関係と活性化履歴に基づいて予測
   */
  public generateExpectedPattern(_destinationID: string, context: ContextInfo<T>): ExpectedPatternV2<T> {
    const startTime = Date.now();
    
    try {
      const predictedConcept = this.predictActiveConcept(context);
      
      const contextInfo = new ContextInfo<T>(
        predictedConcept.pattern,
        new Set(context.tags),
        new Map([
          ['concept_count', this.conceptHierarchy.size]
        ])
      );
      
      const expectedPattern = new ExpectedPatternV2<T>(contextInfo);
      
      this.updateStatistics('generate', Date.now() - startTime);
      return expectedPattern;
      
    } catch (error) {
      this.handleError('generateExpectedPattern', error as Error);
      throw error;
    }
  }
  
  /**
   * 実際パターンを観測
   * 概念を認識し、階層構造を更新
   */
  protected doObserveActualPattern(actual: ActualPatternV2<T>): void {
    const recognizedConcept = this.recognizeConcept(actual.body);
    this.updateConceptActivation(recognizedConcept.id, recognizedConcept.confidence);
  }
  
  /**
   * 予測モデルを更新
   * 概念階層と活性化パターンを調整
   */
  protected doUpdatePredictiveModel(signal: LearningSignal<T>): void {
    const learningRate = signal.adaptiveLearningRate.value;
    const magnitude = signal.referenceDifference.magnitude;
    
    this.adaptConceptHierarchy(learningRate, magnitude);
  }
  
  /**
   * 活性化する概念を予測
   * @param context - 文脈情報
   * @returns 予測された概念
   */
  private predictActiveConcept(_context: ContextInfo<T>): { pattern: T } {
    // TODO: 現在は最も活性化が高い概念を単純に返すが、将来的には文脈を考慮した予測を行う
    let bestConcept = { id: 'object', activation: -1 };
    
    for (const [conceptId, history] of this.conceptActivations) {
      if (history.length > 0) {
        const recentActivation = history.slice(-5).reduce((sum, val) => sum + val, 0) / Math.min(5, history.length);
        if (recentActivation > bestConcept.activation) {
          bestConcept = { id: conceptId, activation: recentActivation };
        }
      }
    }
    
    const concept = this.conceptHierarchy.get(bestConcept.id);
    // 概念が見つからない場合は、デフォルトのベクトルを返す
    const conceptVector = concept ? concept.vector : new Array(10).fill(0.1);
    
    return {
      pattern: {
        toVector: () => conceptVector.slice()
      } as T
    };
  }
  
  /**
   * 基本概念を初期化
   */
  private initializeBaseConcepts(): void {
    // 基本的な概念を定義
    this.conceptHierarchy.set('object', {
      children: new Set(['animate', 'inanimate']),
      vector: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      confidence: 0.8
    });
    
    this.conceptHierarchy.set('animate', {
      parent: 'object',
      children: new Set(['human', 'animal']),
      vector: [0.8, 0.6, 0, 0, 0, 0, 0, 0, 0, 0],
      confidence: 0.7
    });
    
    this.conceptHierarchy.set('inanimate', {
      parent: 'object',
      children: new Set(['tool', 'furniture']),
      vector: [0.8, 0, 0.6, 0, 0, 0, 0, 0, 0, 0],
      confidence: 0.7
    });
  }
  
  /**
   * 概念を認識
   * @param pattern - 入力パターン
   * @returns 認識された概念
   */
  private recognizeConcept(pattern: T): { id: string; confidence: number } {
    const inputVector = pattern.toVector();
    let bestMatch = { id: 'unknown', confidence: 0 };
    
    for (const [conceptId, concept] of this.conceptHierarchy) {
      const similarity = this.calculateSimilarity(inputVector, concept.vector);
      const confidence = similarity * concept.confidence;
      
      if (confidence > bestMatch.confidence) {
        bestMatch = { id: conceptId, confidence };
      }
    }
    
    return bestMatch;
  }
  
  /**
   * 概念の活性化を更新
   * @param conceptId - 概念ID
   * @param activation - 活性化レベル
   */
  private updateConceptActivation(conceptId: string, activation: number): void {
    const history = this.conceptActivations.get(conceptId) || [];
    history.push(activation);
    
    // 履歴サイズの制限
    if (history.length > 50) {
      history.shift();
    }
    
    this.conceptActivations.set(conceptId, history);
  }
  
  /**
   * 概念階層を適応的に調整
   * @param learningRate - 学習率
   * @param magnitude - 差分の大きさ
   */
  private adaptConceptHierarchy(learningRate: number, magnitude: number): void {
    // 概念ベクトルの微調整
    for (const [_conceptId, concept] of this.conceptHierarchy) {
      concept.vector = concept.vector.map(value => {
        const adjustment = (Math.random() - 0.5) * learningRate * magnitude * 0.1;
        return Math.max(0, Math.min(1, value + adjustment));
      });
    }
  }
  
  /**
   * ベクトル間の類似度を計算（コサイン類似度）
   * @param vec1 - ベクトル1
   * @param vec2 - ベクトル2
   * @returns 類似度
   */
  private calculateSimilarity(vec1: number[], vec2: number[]): number {
    const minLength = Math.min(vec1.length, vec2.length);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < minLength; i++) {
      dotProduct += (vec1[i] || 0) * (vec2[i] || 0);
      norm1 += (vec1[i] || 0) ** 2;
      norm2 += (vec2[i] || 0) ** 2;
    }
    
    const magnitude1 = Math.sqrt(norm1);
    const magnitude2 = Math.sqrt(norm2);
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    
    return dotProduct / (magnitude1 * magnitude2);
  }
}

/**
 * 行動自律層の実装（クラス図準拠版）
 * クラス図P1_Layers.ActionAutonomousLayerに対応
 * 
 * 概念層からの高レベル情報を基に行動計画を立て、具体的な行動を実行する。
 * モーター制御、意思決定、戦略的思考を担当する。
 */
export class ActionAutonomousLayer<T extends VectorizableContext> extends BaseAutonomousLayer<T> {
  
  /** 行動レパートリー */
  private actionRepertoire: Map<string, { vector: number[]; success_rate: number; energy_cost: number }> = new Map();
  
  /** 行動実行履歴 */
  private actionHistory: Array<{ actionId: string; timestamp: Date; result: 'success' | 'failure' | 'pending' }> = [];
  
  /**
   * コンストラクタ
   * @param layerId - 層の識別子
   * @param layerName - 層の名前（デフォルト: "行動層"）
   */
  constructor(layerId: string, layerName: string = "行動層") {
    super(layerId, layerName, "action");
    
    this.initializeActionRepertoire();
  }
  
  /**
   * 期待パターンを生成
   * 行動計画に基づいて次の行動を予測
   */
  public generateExpectedPattern(_destinationID: string, context: ContextInfo<T>): ExpectedPatternV2<T> {
    const startTime = Date.now();
    
    try {
      const plannedAction = this.planNextAction(context);
      
      const contextInfo = new ContextInfo<T>(
        plannedAction.pattern,
        new Set(context.tags),
        new Map([
          ['action_repertoire_size', this.actionRepertoire.size]
        ])
      );
      
      const expectedPattern = new ExpectedPatternV2<T>(contextInfo);
      
      this.updateStatistics('generate', Date.now() - startTime);
      return expectedPattern;
      
    } catch (error) {
      this.handleError('generateExpectedPattern', error as Error);
      throw error;
    }
  }
  
  /**
   * 実際パターンを観測
   * 行動の結果を観測し、成功率を更新
   */
  protected doObserveActualPattern(actual: ActualPatternV2<T>): void {
    const executedAction = this.recognizeExecutedAction(actual.body);
    this.recordActionResult(executedAction.id, executedAction.success);
  }
  
  /**
   * 予測モデルを更新
   * 行動成功率と戦略を調整
   */
  protected doUpdatePredictiveModel(signal: LearningSignal<T>): void {
    const learningRate = signal.adaptiveLearningRate.value;
    const magnitude = signal.referenceDifference.magnitude;
    
    this.adaptActionStrategies(learningRate, magnitude);
  }
  
  /**
   * 行動レパートリーを初期化
   */
  private initializeActionRepertoire(): void {
    // 基本的な行動パターンを定義
    this.actionRepertoire.set('move_forward', {
      vector: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      success_rate: 0.8,
      energy_cost: 0.3
    });
    
    this.actionRepertoire.set('turn_left', {
      vector: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      success_rate: 0.9,
      energy_cost: 0.2
    });
    
    this.actionRepertoire.set('turn_right', {
      vector: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      success_rate: 0.9,
      energy_cost: 0.2
    });
    
    this.actionRepertoire.set('stop', {
      vector: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      success_rate: 1.0,
      energy_cost: 0.1
    });
    
    this.actionRepertoire.set('explore', {
      vector: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      success_rate: 0.6,
      energy_cost: 0.5
    });
  }
  
  /**
   * 次の行動を計画
   * @param context - 文脈情報
   * @returns 計画された行動
   */
  private planNextAction(_context: ContextInfo<T>): { id: string; pattern: T } {
    // 行動選択のスコアリング
    let bestAction = { id: 'stop', score: 0, pattern: this.createDefaultActionPattern() };
    
    for (const [actionId, action] of this.actionRepertoire) {
      // 成功率とエネルギー効率を考慮したスコア
      const score = action.success_rate * (1 - action.energy_cost) + Math.random() * 0.1;
      
      if (score > bestAction.score) {
        bestAction = {
          id: actionId,
          score,
          pattern: {
            toVector: () => action.vector.slice()
          } as T
        };
      }
    }
    
    return bestAction;
  }
  
  /**
   * 実行された行動を認識
   * @param pattern - 観測されたパターン
   * @returns 認識された行動
   */
  private recognizeExecutedAction(pattern: T): { id: string; success: boolean } {
    const inputVector = pattern.toVector();
    let bestMatch = { id: 'unknown', similarity: 0 };
    
    for (const [actionId, action] of this.actionRepertoire) {
      const similarity = this.calculateSimilarity(inputVector, action.vector);
      if (similarity > bestMatch.similarity) {
        bestMatch = { id: actionId, similarity };
      }
    }
    
    // 成功判定（簡易的な実装）
    const success = bestMatch.similarity > 0.7;
    
    return { id: bestMatch.id, success };
  }
  
  /**
   * 行動結果を記録
   * @param actionId - 行動ID
   * @param success - 成功フラグ
   */
  private recordActionResult(actionId: string, success: boolean): void {
    // 履歴に記録
    this.actionHistory.push({
      actionId,
      timestamp: new Date(),
      result: success ? 'success' : 'failure'
    });
    
    // 履歴サイズの制限
    if (this.actionHistory.length > 100) {
      this.actionHistory.shift();
    }
    
    // 成功率の更新
    const action = this.actionRepertoire.get(actionId);
    if (action) {
      const alpha = 0.1; // 学習率
      action.success_rate = action.success_rate * (1 - alpha) + (success ? 1 : 0) * alpha;
    }
  }
  
  /**
   * デフォルトの行動パターンを作成
   * @returns デフォルトの行動パターン
   */
  private createDefaultActionPattern(): T {
    return {
      toVector: () => [0, 0, 0, 1, 0, 0, 0, 0, 0, 0] // 停止行動
    } as T;
  }
  
  /**
   * ベクトル間の類似度を計算
   */
  private calculateSimilarity(vec1: number[], vec2: number[]): number {
    const minLength = Math.min(vec1.length, vec2.length);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < minLength; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    const magnitude1 = Math.sqrt(norm1);
    const magnitude2 = Math.sqrt(norm2);
    
    return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
  }
  
  /**
   * 行動戦略を適応的に調整
   * @param learningRate - 学習率
   * @param magnitude - 差分の大きさ
   */
  private adaptActionStrategies(learningRate: number, magnitude: number): void {
    // 行動ベクトルとコストの微調整
    for (const [_actionId, action] of this.actionRepertoire) {
      // ベクトルの調整
      action.vector = action.vector.map(value => {
        const adjustment = (Math.random() - 0.5) * learningRate * magnitude * 0.1;
        return Math.max(0, Math.min(1, value + adjustment));
      });
      
      // エネルギーコストの調整
      const costAdjustment = (Math.random() - 0.5) * learningRate * 0.05;
      action.energy_cost = Math.max(0.1, Math.min(1, action.energy_cost + costAdjustment));
    }
  }
}