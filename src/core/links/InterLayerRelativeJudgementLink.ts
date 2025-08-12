import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { AdaptiveLearningRate } from '../learning/AdaptiveLearningRate';
import { UpdateScope } from '../learning/UpdateScope';
// import { LearningSignal } from '../learning/LearningSignalV2'; // Unused import
import { DifferenceDistanceMetric } from '../metrics/interfaces';
import { LearningRatePolicy, UpdateScopePolicy, SkipPolicy } from './PolicyInterfaces';
import { SkipEnum } from './SkipEnum';

/**
 * 層間相対判定リンククラス（クラス図準拠版）
 * クラス図P1_Links.InterLayerRelativeJudgementLinkに対応
 * 
 * 上位層と下位層の間の相対判定を担当し、期待パターンと実際パターンの
 * 差分計算、学習率調整、更新範囲決定、スキップ判定を行う。
 * 
 * 各層の独立的な判定を支援し、分散自律学習システムの中核を担う。
 * 
 * @template T - Context インターフェースを継承する型
 */
export class InterLayerRelativeJudgementLink<T extends Context> {
  
  /** リンクの一意識別子 */
  private readonly _linkId: string;
  
  /** 上位層の識別子 */
  private readonly _upperLayerId: string;
  
  /** 下位層の識別子 */
  private readonly _lowerLayerId: string;
  
  /** 距離メトリクス */
  private readonly _distanceMetric: DifferenceDistanceMetric<T>;
  
  /** 学習率ポリシー */
  private _learningRatePolicy: LearningRatePolicy<T>;
  
  /** 更新スコープポリシー */
  private _updateScopePolicy: UpdateScopePolicy<T>;
  
  /** スキップポリシー */
  private _skipPolicy: SkipPolicy<T>;
  
  /** リンク作成時刻 */
  private readonly _createdAt: Date;
  
  /** リンクのメタデータ */
  private readonly _metadata: Map<string, any> = new Map();
  
  /** 判定履歴（最新N件を保持） */
  private readonly _judgementHistory: Array<{
    timestamp: Date;
    referenceDifference: RelativeDifference<T>;
    learningRate: AdaptiveLearningRate;
    updateScope: UpdateScope;
    skipJudgement: SkipEnum;
  }> = [];
  
  /** 履歴保持上限数 */
  private readonly _maxHistorySize: number = 100;
  
  /**
   * コンストラクタ
   * 
   * @param upperLayerId - 上位層の識別子
   * @param lowerLayerId - 下位層の識別子
   * @param distanceMetric - 距離メトリクス
   * @param learningRatePolicy - 学習率ポリシー
   * @param updateScopePolicy - 更新スコープポリシー
   * @param skipPolicy - スキップポリシー
   * @param linkId - リンクの識別子（省略時は自動生成）
   * @param metadata - メタデータ（省略可）
   */
  constructor(
    upperLayerId: string,
    lowerLayerId: string,
    distanceMetric: DifferenceDistanceMetric<T>,
    learningRatePolicy: LearningRatePolicy<T>,
    updateScopePolicy: UpdateScopePolicy<T>,
    skipPolicy: SkipPolicy<T>,
    linkId?: string,
    metadata: Map<string, any> = new Map()
  ) {
    // 入力検証
    if (!upperLayerId || !lowerLayerId) {
      throw new Error('Layer IDs cannot be empty');
    }
    
    if (upperLayerId === lowerLayerId) {
      throw new Error('Upper and lower layer IDs must be different');
    }
    
    if (!distanceMetric || !learningRatePolicy || !updateScopePolicy || !skipPolicy) {
      throw new Error('All policies and distance metric are required');
    }
    
    this._upperLayerId = upperLayerId;
    this._lowerLayerId = lowerLayerId;
    this._distanceMetric = distanceMetric;
    this._learningRatePolicy = learningRatePolicy;
    this._updateScopePolicy = updateScopePolicy;
    this._skipPolicy = skipPolicy;
    this._createdAt = new Date();
    this._linkId = linkId ?? this.generateLinkId();
    this._metadata = new Map(metadata);
  }
  
  /**
   * 相対差分を計算
   * 
   * @param expected - 期待パターン
   * @param actual - 実際パターン
   * @returns 計算された相対差分
   * @throws Error パターンが無効な場合
   */
  public calculateRelativeDifference(
    expected: ExpectedPatternV2<T>, 
    actual: ActualPatternV2<T>
  ): RelativeDifference<T> {
    // 入力検証
    this.validatePatterns(expected, actual);
    
    // 距離メトリクスを使用して差分の大きさを計算
    const magnitude = this._distanceMetric.distance(expected, actual);
    
    // 文脈情報を構築（パターンから情報を統合）
    const contextInfo = this.buildContextInfo(expected, actual);
    
    // メタデータを追加
    const metadata = new Map([
      ['metric_type', this._distanceMetric.getName()],
      ['upper_layer', this._upperLayerId],
      ['lower_layer', this._lowerLayerId],
      ['link_id', this._linkId]
    ]);
    
    return new RelativeDifference<T>(magnitude, contextInfo, metadata);
  }
  
  /**
   * 学習率を調整
   * 
   * @param difference - 相対差分
   * @param context - 文脈情報
   * @returns 調整された適応学習率
   */
  public adjustLearningRate(
    difference: RelativeDifference<T>, 
    context: ContextInfo<T>
  ): AdaptiveLearningRate {
    if (!difference || !context) {
      throw new Error('Difference and context are required');
    }
    
    return this._learningRatePolicy.learningRate(difference, context);
  }
  
  /**
   * 更新範囲を決定
   * 
   * @param difference - 相対差分
   * @param context - 文脈情報
   * @returns 決定された更新スコープ
   */
  public determineUpdateScope(
    difference: RelativeDifference<T>, 
    context: ContextInfo<T>
  ): UpdateScope {
    if (!difference || !context) {
      throw new Error('Difference and context are required');
    }
    
    return this._updateScopePolicy.scope(difference, context);
  }
  
  /**
   * 計算スキップを判定
   * 
   * @param difference - 相対差分
   * @returns スキップ判定の結果
   */
  public judgeCalculationSkip(difference: RelativeDifference<T>): SkipEnum {
    if (!difference) {
      throw new Error('Difference is required');
    }
    
    return this._skipPolicy.judgeSkip(difference);
  }
  
  /**
   * 包括的な判定を実行（全ての判定を一度に行う）
   * 
   * @param expected - 期待パターン
   * @param actual - 実際パターン
   * @returns 判定結果のオブジェクト
   */
  public performComprehensiveJudgement(
    expected: ExpectedPatternV2<T>, 
    actual: ActualPatternV2<T>
  ): {
    referenceDifference: RelativeDifference<T>;
    learningRate: AdaptiveLearningRate;
    updateScope: UpdateScope;
    skipJudgement: SkipEnum;
    shouldProcess: boolean;
  } {
    // 相対差分を計算
    const referenceDifference = this.calculateRelativeDifference(expected, actual);
    
    // スキップ判定を最初に行う（効率化のため）
    const skipJudgement = this.judgeCalculationSkip(referenceDifference);
    
    // スキップの場合は簡易的な結果を返す
    if (skipJudgement === SkipEnum.FullSkip) {
      const judgementResult = {
        referenceDifference,
        learningRate: AdaptiveLearningRate.createInitial(0.001, new Map([['skipped', true]])),
        updateScope: new UpdateScope(),
        skipJudgement,
        shouldProcess: false
      };
      
      this.recordJudgement(judgementResult);
      return judgementResult;
    }
    
    // 文脈情報を構築
    const context = referenceDifference.contextInfo;
    
    // 学習率と更新スコープを決定
    const learningRate = this.adjustLearningRate(referenceDifference, context);
    const updateScope = this.determineUpdateScope(referenceDifference, context);
    
    const judgementResult = {
      referenceDifference,
      learningRate,
      updateScope,
      skipJudgement,
      shouldProcess: true
    };
    
    // 判定履歴に記録
    this.recordJudgement(judgementResult);
    
    return judgementResult;
  }
  
  /**
   * リンクIDを取得
   * @returns リンクID
   */
  public getLinkId(): string {
    return this._linkId;
  }
  
  /**
   * 上位層IDを取得
   * @returns 上位層ID
   */
  public getUpperLayerId(): string {
    return this._upperLayerId;
  }
  
  /**
   * 下位層IDを取得
   * @returns 下位層ID
   */
  public getLowerLayerId(): string {
    return this._lowerLayerId;
  }
  
  /**
   * 判定履歴を取得（読み取り専用）
   * @param maxCount - 取得する最大件数（デフォルト: 全件）
   * @returns 判定履歴の配列
   */
  public getJudgementHistory(maxCount?: number): ReadonlyArray<{
    timestamp: Date;
    referenceDifference: RelativeDifference<T>;
    learningRate: AdaptiveLearningRate;
    updateScope: UpdateScope;
    skipJudgement: SkipEnum;
  }> {
    if (maxCount && maxCount > 0) {
      return this._judgementHistory.slice(-maxCount);
    }
    return this._judgementHistory;
  }
  
  /**
   * 学習率ポリシーを更新
   * @param newPolicy - 新しい学習率ポリシー
   */
  public updateLearningRatePolicy(newPolicy: LearningRatePolicy<T>): void {
    if (!newPolicy) {
      throw new Error('Learning rate policy is required');
    }
    this._learningRatePolicy = newPolicy;
  }
  
  /**
   * 更新スコープポリシーを更新
   * @param newPolicy - 新しい更新スコープポリシー
   */
  public updateScopePolicy(newPolicy: UpdateScopePolicy<T>): void {
    if (!newPolicy) {
      throw new Error('Update scope policy is required');
    }
    this._updateScopePolicy = newPolicy;
  }
  
  /**
   * スキップポリシーを更新
   * @param newPolicy - 新しいスキップポリシー
   */
  public updateSkipPolicy(newPolicy: SkipPolicy<T>): void {
    if (!newPolicy) {
      throw new Error('Skip policy is required');
    }
    this._skipPolicy = newPolicy;
  }
  
  /**
   * リンクの統計情報を取得
   * @returns 統計情報オブジェクト
   */
  public getStatistics(): {
    totalJudgements: number;
    skipCounts: Map<SkipEnum, number>;
    averageDifferenceMagnitude: number;
    averageLearningRate: number;
    recentActivity: boolean;
  } {
    const totalJudgements = this._judgementHistory.length;
    const skipCounts = new Map<SkipEnum, number>();
    
    let totalMagnitude = 0;
    let totalLearningRate = 0;
    
    for (const record of this._judgementHistory) {
      // スキップ回数をカウント
      const currentCount = skipCounts.get(record.skipJudgement) ?? 0;
      skipCounts.set(record.skipJudgement, currentCount + 1);
      
      // 平均値計算用に累積
      totalMagnitude += record.referenceDifference.magnitude;
      totalLearningRate += record.learningRate.value;
    }
    
    const averageDifferenceMagnitude = totalJudgements > 0 ? totalMagnitude / totalJudgements : 0;
    const averageLearningRate = totalJudgements > 0 ? totalLearningRate / totalJudgements : 0;
    
    // 最近の活動（過去10分以内に判定があったか）
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentActivity = this._judgementHistory.some(record => record.timestamp > tenMinutesAgo);
    
    return {
      totalJudgements,
      skipCounts,
      averageDifferenceMagnitude,
      averageLearningRate,
      recentActivity
    };
  }
  
  /**
   * 判定結果を履歴に記録
   * @param judgementResult - 記録する判定結果
   */
  private recordJudgement(judgementResult: {
    referenceDifference: RelativeDifference<T>;
    learningRate: AdaptiveLearningRate;
    updateScope: UpdateScope;
    skipJudgement: SkipEnum;
  }): void {
    this._judgementHistory.push({
      timestamp: new Date(),
      ...judgementResult
    });
    
    // 履歴サイズの上限管理
    if (this._judgementHistory.length > this._maxHistorySize) {
      this._judgementHistory.shift();
    }
  }
  
  /**
   * パターンの妥当性を検証
   * @param expected - 期待パターン
   * @param actual - 実際パターン
   * @throws Error パターンが無効な場合
   */
  private validatePatterns(
    expected: ExpectedPatternV2<T>, 
    actual: ActualPatternV2<T>
  ): void {
    if (!expected || !actual) {
      throw new Error('Both expected and actual patterns are required');
    }
    
    if (!expected.body || !actual.body) {
      throw new Error('Pattern bodies are required');
    }
  }
  
  /**
   * パターンから文脈情報を構築
   * @param expected - 期待パターン
   * @param actual - 実際パターン
   * @returns 構築された文脈情報
   */
  private buildContextInfo(
    expected: ExpectedPatternV2<T>, 
    actual: ActualPatternV2<T>
  ): ContextInfo<T> {
    // タグを統合（重複除去）
    const combinedTags = new Set([
      ...expected.contextInfo.tags,
      ...actual.contextInfo.tags
    ]);
    
    // 統計情報を統合
    const combinedStats = new Map([
      ...expected.contextInfo.statistics,
      ...actual.contextInfo.statistics,
      ['pattern_comparison_timestamp', Date.now()]
    ]);
    
    return new ContextInfo<T>(
      expected.body, // 期待パターンの本体を使用
      combinedTags,
      combinedStats
    );
  }
  
  /**
   * リンクIDを自動生成
   * @returns 生成されたリンクID
   */
  private generateLinkId(): string {
    const timestamp = this._createdAt.getTime().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `link_${this._upperLayerId}_${this._lowerLayerId}_${timestamp}_${random}`;
  }
  
  /**
   * JSON表現への変換
   * @returns JSON オブジェクト
   */
  public toJSON(): object {
    const statistics = this.getStatistics();
    
    return {
      linkId: this._linkId,
      upperLayerId: this._upperLayerId,
      lowerLayerId: this._lowerLayerId,
      distanceMetric: this._distanceMetric.getName(),
      learningRatePolicy: this._learningRatePolicy.getPolicyName(),
      updateScopePolicy: this._updateScopePolicy.getPolicyName(),
      skipPolicy: this._skipPolicy.getPolicyName(),
      createdAt: this._createdAt.toISOString(),
      metadata: Object.fromEntries(this._metadata),
      statistics
    };
  }
  
  /**
   * 文字列表現への変換
   * @returns 文字列表現
   */
  public toString(): string {
    const stats = this.getStatistics();
    return `InterLayerLink[${this._linkId.substring(0, 8)}...](${this._upperLayerId}→${this._lowerLayerId}, judgements=${stats.totalJudgements})`;
  }


}