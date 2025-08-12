import { DevelopOption } from '../../debug/DevelopOption';

// 負荷と精度の統計情報
interface LoadAccuracyStats {
  layerId: string;
  currentLoad: number; // 0-1の範囲
  averageAccuracy: number; // 0-1の範囲
  processingLatency: number; // ms
  queueSize: number;
  timestamp: Date;
}

// チューニング結果
interface TuningResult {
  layerId: string;
  oldCycleMs: number;
  newCycleMs: number;
  reason: string;
  confidenceLevel: number; // 0-1の範囲
}

// モック用の簡易クラス定義
class MockBackpressureControl {
  private loadThreshold = 0.75;
  private currentLoad = 0.3;
  private isHighLoadDetected = false;
  
  constructor(public id: string) {}
  
  detectHighLoad(stats: LoadAccuracyStats): boolean {
    this.currentLoad = stats.currentLoad;
    this.isHighLoadDetected = stats.currentLoad > this.loadThreshold;
    return this.isHighLoadDetected;
  }
  
  notifyScheduler(
    scheduler: MockLayerExecutionScheduler,
    layerId: string,
    loadStats: LoadAccuracyStats
  ): void {
    if (this.detectHighLoad(loadStats)) {
      scheduler.receiveHighLoadNotification(layerId, loadStats);
    }
  }
  
  getCurrentLoad(): number {
    return this.currentLoad;
  }
  
  isHighLoad(): boolean {
    return this.isHighLoadDetected;
  }
  
  setLoadThreshold(threshold: number): void {
    this.loadThreshold = Math.max(0, Math.min(1, threshold));
  }
}

class MockLayerExecutionScheduler {
  private highLoadNotifications: { layerId: string; stats: LoadAccuracyStats; timestamp: Date }[] = [];
  
  constructor(public id: string) {}
  
  receiveHighLoadNotification(layerId: string, stats: LoadAccuracyStats): void {
    this.highLoadNotifications.push({
      layerId,
      stats,
      timestamp: new Date()
    });
  }
  
  calculateOptimalCycle(
    layerId: string,
    currentStats: LoadAccuracyStats,
    currentCycleMs: number
  ): TuningResult {
    // 負荷と精度を考慮した最適周期計算
    const loadFactor = currentStats.currentLoad;
    const accuracyFactor = currentStats.averageAccuracy;
    const latencyFactor = currentStats.processingLatency / 100; // normalize to 0-1 range roughly
    
    let newCycleMs = currentCycleMs;
    let reason = 'no_change';
    let confidenceLevel = 0.5;
    
    // 高負荷の場合：周期を伸ばして負荷軽減
    if (loadFactor > 0.8) {
      const loadMultiplier = 1 + (loadFactor - 0.8) * 2; // 1.0 - 1.4
      newCycleMs = Math.floor(currentCycleMs * loadMultiplier);
      reason = 'high_load_detected';
      confidenceLevel = 0.8;
    }
    // 低負荷かつ低精度の場合：周期を縮めて精度向上
    else if (loadFactor < 0.4 && accuracyFactor < 0.6) {
      const accuracyMultiplier = 0.5 + accuracyFactor * 0.5; // 0.5 - 1.0
      newCycleMs = Math.floor(currentCycleMs * accuracyMultiplier);
      reason = 'low_load_low_accuracy';
      confidenceLevel = 0.7;
    }
    // レイテンシが高い場合：適度に周期調整
    else if (latencyFactor > 0.5) {
      newCycleMs = Math.floor(currentCycleMs * 1.2);
      reason = 'high_latency';
      confidenceLevel = 0.6;
    }
    
    // 最小値・最大値の制限
    newCycleMs = Math.max(8, Math.min(1000, newCycleMs));
    
    return {
      layerId,
      oldCycleMs: currentCycleMs,
      newCycleMs,
      reason,
      confidenceLevel
    };
  }
  
  getNotificationCount(): number {
    return this.highLoadNotifications.length;
  }
  
  getLastNotification(): { layerId: string; stats: LoadAccuracyStats; timestamp: Date } | null {
    return this.highLoadNotifications.length > 0 
      ? this.highLoadNotifications[this.highLoadNotifications.length - 1]
      : null;
  }
  
  clearNotifications(): void {
    this.highLoadNotifications = [];
  }
}

class MockLayerRhythmConfiguration {
  private rhythmSettings = new Map<string, { cycleMs: number; lastUpdated: Date }>();
  
  constructor(public id: string) {
    // デフォルト設定
    this.rhythmSettings.set('layer-a', { cycleMs: 16, lastUpdated: new Date() });
    this.rhythmSettings.set('layer-b', { cycleMs: 33, lastUpdated: new Date() });
  }
  
  updateCycle(layerId: string, newCycleMs: number): boolean {
    if (newCycleMs < 1 || newCycleMs > 10000) {
      return false; // 無効な値
    }
    
    this.rhythmSettings.set(layerId, {
      cycleMs: newCycleMs,
      lastUpdated: new Date()
    });
    return true;
  }
  
  getCycle(layerId: string): number | undefined {
    const setting = this.rhythmSettings.get(layerId);
    return setting?.cycleMs;
  }
  
  getLastUpdated(layerId: string): Date | undefined {
    const setting = this.rhythmSettings.get(layerId);
    return setting?.lastUpdated;
  }
  
  getAllSettings(): Map<string, { cycleMs: number; lastUpdated: Date }> {
    return new Map(this.rhythmSettings);
  }
}

// オートチューニング制御クラス
class MockAutoTuningController {
  constructor(
    private backpressure: MockBackpressureControl,
    private scheduler: MockLayerExecutionScheduler,
    private rhythmConfig: MockLayerRhythmConfiguration
  ) {}
  
  performAutoTuning(layerId: string, stats: LoadAccuracyStats): TuningResult | null {
    // 1. バックプレッシャ制御に負荷状況を通知
    this.backpressure.notifyScheduler(this.scheduler, layerId, stats);
    
    // 2. スケジューラで最適周期を計算
    const currentCycle = this.rhythmConfig.getCycle(layerId) || 16;
    const tuningResult = this.scheduler.calculateOptimalCycle(layerId, stats, currentCycle);
    
    // 3. 信頼度が十分高い場合のみ設定を更新
    if (tuningResult.confidenceLevel > 0.6) {
      const updateSuccess = this.rhythmConfig.updateCycle(layerId, tuningResult.newCycleMs);
      if (!updateSuccess) {
        return null;
      }
    }
    
    return tuningResult;
  }
}

describe('SD-25: 周期オートチューニング', () => {
  let backpressureControl: MockBackpressureControl;
  let scheduler: MockLayerExecutionScheduler;
  let rhythmConfig: MockLayerRhythmConfiguration;
  let autoTuningController: MockAutoTuningController;

  beforeEach(() => {
    backpressureControl = new MockBackpressureControl('backpressure-01');
    scheduler = new MockLayerExecutionScheduler('scheduler-01');
    rhythmConfig = new MockLayerRhythmConfiguration('rhythm-config-01');
    autoTuningController = new MockAutoTuningController(backpressureControl, scheduler, rhythmConfig);
  });

  afterEach(() => {
    scheduler.clearNotifications();
  });

  // === SD-25シーケンス図対応テストケース ===

  describe('負荷検出処理', () => {
    (DevelopOption.isExecute_SD_25_load_detection ? test : test.skip)('正常系：バックプレッシャ制御による高負荷状態検出と通知', () => {
      // シーケンス図 19-21行目: Backpressure -> Scheduler: 高負荷状態を通知
      
      const highLoadStats: LoadAccuracyStats = {
        layerId: 'test-layer',
        currentLoad: 0.85, // 高負荷
        averageAccuracy: 0.6,
        processingLatency: 120,
        queueSize: 50,
        timestamp: new Date()
      };
      
      expect(backpressureControl.getCurrentLoad()).toBe(0.3); // 初期値
      expect(backpressureControl.isHighLoad()).toBe(false);
      expect(scheduler.getNotificationCount()).toBe(0);
      
      const isHighLoad = backpressureControl.detectHighLoad(highLoadStats);
      backpressureControl.notifyScheduler(scheduler, 'test-layer', highLoadStats);
      
      expect(isHighLoad).toBe(true);
      expect(backpressureControl.getCurrentLoad()).toBe(0.85);
      expect(backpressureControl.isHighLoad()).toBe(true);
      expect(scheduler.getNotificationCount()).toBe(1);
      
      const lastNotification = scheduler.getLastNotification();
      expect(lastNotification?.layerId).toBe('test-layer');
      expect(lastNotification?.stats.currentLoad).toBe(0.85);
    });
  });

  describe('周期最適化処理', () => {
    (DevelopOption.isExecute_SD_25_cycle_optimization ? test : test.skip)('正常系：負荷情報と処理精度に基づく最適周期の計算', () => {
      // シーケンス図 24-25行目: Scheduler -> Scheduler: 最適な周期を計算
      
      const highLoadStats: LoadAccuracyStats = {
        layerId: 'layer-a',
        currentLoad: 0.9, // 非常に高い負荷
        averageAccuracy: 0.7,
        processingLatency: 150,
        queueSize: 80,
        timestamp: new Date()
      };
      
      const currentCycle = rhythmConfig.getCycle('layer-a') || 16;
      const tuningResult = scheduler.calculateOptimalCycle('layer-a', highLoadStats, currentCycle);
      
      expect(tuningResult.layerId).toBe('layer-a');
      expect(tuningResult.oldCycleMs).toBe(currentCycle);
      expect(tuningResult.newCycleMs).toBeGreaterThan(currentCycle); // 高負荷なので周期が伸びる
      expect(tuningResult.reason).toBe('high_load_detected');
      expect(tuningResult.confidenceLevel).toBeGreaterThan(0.6);
      
      // 低負荷・低精度の場合
      const lowLoadStats: LoadAccuracyStats = {
        layerId: 'layer-b',
        currentLoad: 0.3,
        averageAccuracy: 0.4, // 低精度
        processingLatency: 50,
        queueSize: 10,
        timestamp: new Date()
      };
      
      const lowLoadTuning = scheduler.calculateOptimalCycle('layer-b', lowLoadStats, 33);
      expect(lowLoadTuning.newCycleMs).toBeLessThan(33); // 低負荷なので周期が縮む
      expect(lowLoadTuning.reason).toBe('low_load_low_accuracy');
    });
  });

  describe('リズム更新処理', () => {
    (DevelopOption.isExecute_SD_25_rhythm_update ? test : test.skip)('正常系：計算された最適周期での層リズム設定更新', () => {
      // シーケンス図 27-30行目: Scheduler -> RhythmConfig: 周期更新 -> 設定値を更新
      
      const testStats: LoadAccuracyStats = {
        layerId: 'layer-a',
        currentLoad: 0.8,
        averageAccuracy: 0.75,
        processingLatency: 100,
        queueSize: 30,
        timestamp: new Date()
      };
      
      const initialCycle = rhythmConfig.getCycle('layer-a') || 16;
      const initialUpdateTime = rhythmConfig.getLastUpdated('layer-a');
      
      // オートチューニングを実行
      const tuningResult = autoTuningController.performAutoTuning('layer-a', testStats);
      
      expect(tuningResult).not.toBeNull();
      expect(tuningResult?.layerId).toBe('layer-a');
      
      if (tuningResult && tuningResult.confidenceLevel > 0.6) {
        const updatedCycle = rhythmConfig.getCycle('layer-a');
        const updatedTime = rhythmConfig.getLastUpdated('layer-a');
        
        expect(updatedCycle).toBe(tuningResult.newCycleMs);
        expect(updatedTime?.getTime()).toBeGreaterThan(initialUpdateTime?.getTime() || 0);
        
        // 高負荷なので周期が伸びるはず
        expect(updatedCycle).toBeGreaterThan(initialCycle);
      }
      
      // 設定範囲のチェック
      const allSettings = rhythmConfig.getAllSettings();
      allSettings.forEach((setting) => {
        expect(setting.cycleMs).toBeGreaterThanOrEqual(8);
        expect(setting.cycleMs).toBeLessThanOrEqual(1000);
      });
    });
  });
});