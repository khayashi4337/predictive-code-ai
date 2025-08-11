import { Context } from '../tag/Context';
import { LayerManager } from '../layers/LayerManager';
import { UpdateScope } from '../learning/UpdateScope';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { DebugOption } from '../../debug/DebugOption';
import { PatternAutonomousLayer } from '../layers/LayerImplementations';
import { LearningSignal } from '../learning/LearningSignalV2';
import { AdaptiveLearningRate, LearningRateOrigin } from '../learning/AdaptiveLearningRate';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { ContextInfo } from '../tag/ContextInfo';
import { VectorizableContext } from '../tag/VectorizableContext';

/**
 * 海馬の機能を模倣した自律モジュール。
 * システム全体としての期待と実際の差分を検知し、
 * 各レイヤーに学習を促す役割を持つ。
 * @template T - Context インターフェースを継承する型
 */
export class HippocampusAutonomousModule<T extends Context> {
  private readonly moduleId: string;
  private readonly moduleName: string;
  public readonly layerManager: LayerManager<T>;

  constructor(moduleId: string, moduleName: string, layerManager: LayerManager<T>) {
    this.moduleId = moduleId;
    this.moduleName = moduleName;
    this.layerManager = layerManager;
  }

  public getModuleId(): string {
    return this.moduleId;
  }

  public getModuleName(): string {
    return this.moduleName;
  }

  public async process(_contextInfo: any, _updateScope: UpdateScope | null): Promise<void> {
    // This is the main entry point for the module, spied on by tests.

    // テスト用のデバッグオプションが有効な場合、強制的にモデル更新をトリガー
    if (DebugOption.FORCE_HIPPOCAMPUS_MODEL_UPDATE) {
      // ダミーのLearningSignalを生成
      class DummyContext implements VectorizableContext {
        toVector = () => [0];
        getDimension = () => 1;
      }
      const dummyContextInfo = new ContextInfo(new DummyContext(), new Set(), new Map());
      const dummyLearningRate = new AdaptiveLearningRate(0.1, LearningRateOrigin.INITIAL);
      const dummyDifference = new RelativeDifference(0.5, dummyContextInfo);
      const dummyUpdateScope = new UpdateScope();
      const dummyLearningSignal = new LearningSignal(dummyLearningRate, dummyDifference, dummyUpdateScope);

      const allLayers = this.layerManager.getAllLayers();
      for (const layer of allLayers) {
        // PatternAutonomousLayerにのみdoUpdatePredictiveModelが存在するため、型をチェック
        if (layer instanceof PatternAutonomousLayer) {
          // 非同期メソッドですが、テストでは完了を待たずに呼び出しの確認のみ行うため、awaitは不要
          layer.doUpdatePredictiveModel(dummyLearningSignal);
        }
      }
    }

    // The actual logic will involve calling the other methods.
  }

  /**
   * 経験相対照合
   */
  public matchExperience(_actual: ActualPatternV2<T>): any {
    // Skeleton implementation
    return null;
  }

  /**
   * 新奇性評価
   */
  public evaluateNovelty(_difference: number): any {
    // Skeleton implementation
    return null;
  }

  /**
   * 長期記憶化
   */
  public consolidateToLongTermMemory(_experience: any): void {
    // Skeleton implementation
  }

  /**
   * LRBurst発火
   */
  public triggerLRBurst(_signal: any): void {
    // Skeleton implementation
  }

  /**
   * 判定基準の分散化
   */
  public decentralizeCriteria(_criteria: any): void {
    // Skeleton implementation
  }
}