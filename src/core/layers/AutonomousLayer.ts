import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';
import { InterLayerRelativeJudgementLink } from '../links/InterLayerRelativeJudgementLink';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { LearningSignal } from '../learning/LearningSignalV2';
import { LayerManager } from './LayerManager';

/**
 * 自律層インターフェース（クラス図準拠版）
 * クラス図P1_Layers.AutonomousLayerに対応
 * 
 * 分散自律層ネットワークの各層が実装すべき基本的な機能を定義する。
 * 各層は独立して期待パターンを生成し、実際パターンを観測し、学習信号に基づいて
 * 予測モデルを更新する能力を持つ。
 * 
 * @template T - Context インターフェースを継承する型
 */
export interface AutonomousLayer<T extends Context> {
  /**
   * 期待パターンを生成
   * 
   * 指定された宛先IDと文脈情報に基づいて、この層が予測する期待パターンを生成する。
   * 生成されたパターンは下位層に送信され、相対判定の基準として使用される。
   * 
   * @param destinationID - 宛先となる層またはコンポーネントの識別子
   * @param context - 生成時の文脈情報
   * @returns 生成された期待パターン
   * @throws Error 生成に失敗した場合
   */
  generateExpectedPattern(destinationID: string, context: ContextInfo<T>): ExpectedPatternV2<T>;
  
  /**
   * 実際パターンを観測
   * 
   * 下位層から送信された実際パターンを受信し、内部状態を更新する。
   * この情報は後続の期待パターン生成や学習に利用される。
   * 
   * @param actual - 観測された実際パターン
   */
  observeActualPattern(actual: ActualPatternV2<T>): void;
  
  /**
   * 予測モデルを更新
   * 
   * 学習信号に基づいて内部の予測モデルを更新する。
   * 学習信号には適応学習率、参照差分、更新対象が含まれ、これらの情報を使用して
   * 効率的で精密なモデル更新を行う。
   * 
   * @param signal - モデル更新のための学習信号
   */
  updatePredictiveModel(signal: LearningSignal<T>): void;
  
  /**
   * 層の識別子を取得
   * @returns 層の一意識別子
   */
  getLayerId(): string;
  
  /**
   * 層の名前を取得
   * @returns 層の表示名
   */
  getLayerName(): string;
  
  /**
   * 層の種別を取得
   * @returns 層の種別（sensory, pattern, concept, action等）
   */
  getLayerType(): string;
  
  /**
   * 層が有効かどうかを判定
   * @returns 層が正常に機能している場合true
   */
  isActive(): boolean;
  
  /**
   * 層の統計情報を取得
   * @returns 層の動作統計情報
   */
  getStatistics(): {
    totalPatternsGenerated: number;
    totalPatternsObserved: number;
    totalModelUpdates: number;
    lastActivityTimestamp: Date | null;
    averageProcessingTime: number;
    isHealthy: boolean;
  };
}

/**
 * 自律層の基底抽象クラス
 * 共通機能の実装を提供し、各具体層での重複コードを削減する
 * 
 * @template T - Context インターフェースを継承する型
 */
export abstract class BaseAutonomousLayer<T extends Context> implements AutonomousLayer<T> {
  
  /** レイヤーマネージャー */
  protected layerManager?: LayerManager<T>;
  
  /** 層の識別子 */
  protected readonly layerId: string;
  
  /** 層の名前 */
  protected readonly layerName: string;
  
  /** 層の種別 */
  protected readonly layerType: string;
  
  /** 層の作成時刻 */
  protected readonly createdAt: Date;
  
  /** 層が有効かどうか */
  protected active: boolean = true;
  
  /** 統計情報 */
  protected statistics = {
    totalPatternsGenerated: 0,
    totalPatternsObserved: 0,
    totalModelUpdates: 0,
    lastActivityTimestamp: null as Date | null,
    processingTimes: [] as number[],
    errors: [] as Error[]
  };
  
  /** 最大統計履歴サイズ */
  protected readonly maxStatisticsHistory: number = 1000;
  
  /** 上位層へのリンク */
  protected readonly upstreamLinks: InterLayerRelativeJudgementLink<T>[] = [];
  
  /**
   * コンストラクタ
   * 
   * @param layerId - 層の識別子
   * @param layerName - 層の名前
   * @param layerType - 層の種別
   * @param layerManager - レイヤーマネージャー
   */
  protected constructor(
    layerId: string, 
    layerName: string, 
    layerType: string,
    layerManager?: LayerManager<T>
  ) {
    this.layerManager = layerManager;
    if (!layerId || !layerName || !layerType) {
      throw new Error('Layer ID, name, and type are required');
    }
    
    this.layerId = layerId;
    this.layerName = layerName;
    this.layerType = layerType;
    this.createdAt = new Date();
  }
  
  /**
   * 期待パターンを生成（抽象メソッド）
   * 各具体層で実装する必要がある
   */
  public abstract generateExpectedPattern(
    destinationID: string, 
    context: ContextInfo<T>
  ): ExpectedPatternV2<T>;
  
  /**
   * 実際パターンを観測
   * 基本的な統計更新を行い、具体的な処理は派生クラスに委譲
   */
  public observeActualPattern(actual: ActualPatternV2<T>): void {
    const startTime = Date.now();
    
    try {
      this.doObserveActualPattern(actual);
      this.updateStatistics('observe', Date.now() - startTime);
    } catch (error) {
      this.handleError('observeActualPattern', error as Error);
      throw error;
    }
  }
  
  /**
   * 予測モデルを更新
   * 基本的な統計更新を行い、具体的な処理は派生クラスに委譲
   */
  public async updatePredictiveModel(learningSignal: LearningSignal<T>): Promise<LearningSignal<T>[]> {
    const startTime = Date.now();
    
    try {
      const propagatedSignals = await this.doUpdatePredictiveModel(learningSignal);
      this.updateStatistics('update', Date.now() - startTime);
      return propagatedSignals;
    } catch (error) {
      this.handleError('updatePredictiveModel', error as Error);
      throw error;
    }
  }
  
  /**
   * 層の識別子を取得
   */
  public getLayerId(): string {
    return this.layerId;
  }
  
  /**
   * 層の名前を取得
   */
  public getLayerName(): string {
    return this.layerName;
  }
  
  /**
   * 層の種別を取得
   */
  public getLayerType(): string {
    return this.layerType;
  }

  /**
   * 上位層へのリンクを追加します。
   * @param link - 上位層へのリンク
   */
  public addUpstreamLink(link: InterLayerRelativeJudgementLink<T>): void {
    this.upstreamLinks.push(link);
  }
  
  /**
   * 層が有効かどうかを判定
   */
  public isActive(): boolean {
    return this.active;
  }
  
  /**
   * 層の統計情報を取得
   */
  public getStatistics(): {
    totalPatternsGenerated: number;
    totalPatternsObserved: number;
    totalModelUpdates: number;
    lastActivityTimestamp: Date | null;
    averageProcessingTime: number;
    isHealthy: boolean;
  } {
    const processingTimes = this.statistics.processingTimes;
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;
    
    // 健全性チェック（エラー率が10%未満かつ最近1時間以内に活動がある）
    const totalOperations = this.statistics.totalPatternsGenerated + 
                           this.statistics.totalPatternsObserved + 
                           this.statistics.totalModelUpdates;
    const errorRate = totalOperations > 0 ? this.statistics.errors.length / totalOperations : 0;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hasRecentActivity = this.statistics.lastActivityTimestamp 
      ? this.statistics.lastActivityTimestamp > oneHourAgo 
      : false;
    const isHealthy = errorRate < 0.1 && (totalOperations === 0 || hasRecentActivity);
    
    return {
      totalPatternsGenerated: this.statistics.totalPatternsGenerated,
      totalPatternsObserved: this.statistics.totalPatternsObserved,
      totalModelUpdates: this.statistics.totalModelUpdates,
      lastActivityTimestamp: this.statistics.lastActivityTimestamp,
      averageProcessingTime,
      isHealthy
    };
  }
  
  /**
   * 層を無効化
   */
  public deactivate(): void {
    this.active = false;
  }
  
  /**
   * 層を有効化
   */
  public activate(): void {
    this.active = true;
  }
  
  /**
   * 実際パターン観測の具体的な実装（サブクラスでオーバーライド）
   * @param actual - 観測された実際パターン
   */
  protected abstract doObserveActualPattern(actual: ActualPatternV2<T>): void;
  
  /**
   * 予測モデル更新の具体的な実装（サブクラスでオーバーライド）
   * @param signal - 学習信号
   */
  protected async doUpdatePredictiveModel(_learningSignal: LearningSignal<T>): Promise<LearningSignal<T>[]> {
    return []; // デフォルトでは伝播する信号はない
  }
  
  /**
   * 統計情報を更新
   * @param operation - 操作の種類
   * @param processingTime - 処理時間（ミリ秒）
   */
  protected updateStatistics(operation: string, processingTime: number): void {
    this.statistics.lastActivityTimestamp = new Date();
    
    // 処理時間を記録
    this.statistics.processingTimes.push(processingTime);
    if (this.statistics.processingTimes.length > this.maxStatisticsHistory) {
      this.statistics.processingTimes.shift();
    }
    
    // 操作別カウンタを更新
    switch (operation) {
      case 'generate':
        this.statistics.totalPatternsGenerated++;
        break;
      case 'observe':
        this.statistics.totalPatternsObserved++;
        break;
      case 'update':
        this.statistics.totalModelUpdates++;
        break;
    }
  }
  
  /**
   * エラーハンドリング
   * @param operation - エラーが発生した操作
   * @param error - エラーオブジェクト
   */
  protected handleError(_operation: string, error: Error): void {
    this.statistics.errors.push(error);
    if (this.statistics.errors.length > this.maxStatisticsHistory) {
      this.statistics.errors.shift();
    }
    
    // 重要なエラーの場合は層を無効化
    if (this.isCriticalError(error)) {
      this.deactivate();
    }
  }
  
  /**
   * 重大なエラーかどうかを判定
   * @param error - エラーオブジェクト
   * @returns 重大なエラーの場合true
   */
  protected isCriticalError(error: Error): boolean {
    // メモリ不足、システムエラーなど重大なエラーをチェック
    return error.message.includes('out of memory') || 
           error.message.includes('system error') ||
           error.name === 'SystemError';
  }
  
  /**
   * JSON表現への変換
   */
  public toJSON(): object {
    return {
      layerId: this.layerId,
      layerName: this.layerName,
      layerType: this.layerType,
      createdAt: this.createdAt.toISOString(),
      active: this.active,
      statistics: this.getStatistics()
    };
  }
  
  /**
   * 文字列表現への変換
   */
  public toString(): string {
    const stats = this.getStatistics();
    const healthFlag = stats.isHealthy ? '[正常]' : '[異常]';
    return `${this.layerType}Layer[${this.layerId}]${healthFlag}(${this.layerName})`;
  }
}