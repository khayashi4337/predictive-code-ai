import { DevelopOption } from '../../debug/DevelopOption';

// 層リズム設定の定義
interface LayerRhythmConfig {
  layerId: string;
  cycleMs: number;
  phase: number; // 0-1の範囲でのフェーズオフセット
  enabled: boolean;
}

// モック用の簡易クラス定義
class MockLayerRhythmConfiguration {
  private rhythmConfigs = new Map<string, LayerRhythmConfig>();
  
  constructor(public id: string) {
    // デフォルト設定を追加
    this.rhythmConfigs.set('sense-layer', {
      layerId: 'sense-layer',
      cycleMs: 16, // 60FPS
      phase: 0.0,
      enabled: true
    });
    
    this.rhythmConfigs.set('pattern-layer', {
      layerId: 'pattern-layer',
      cycleMs: 33, // 30FPS
      phase: 0.25, // 25%のフェーズオフセット
      enabled: true
    });
  }
  
  getConfig(layerId: string): LayerRhythmConfig | undefined {
    return this.rhythmConfigs.get(layerId);
  }
  
  setConfig(config: LayerRhythmConfig): void {
    this.rhythmConfigs.set(config.layerId, config);
  }
  
  getAllConfigs(): Map<string, LayerRhythmConfig> {
    return new Map(this.rhythmConfigs);
  }
  
  isLayerEnabled(layerId: string): boolean {
    const config = this.rhythmConfigs.get(layerId);
    return config ? config.enabled : false;
  }
}

class MockSensoryAutonomousLayer {
  private frameProcessingCount = 0;
  private lastTickTimestamp: Date | null = null;
  
  constructor(public id: string) {}
  
  tick(): void {
    this.lastTickTimestamp = new Date();
    this.performFrameProcessing();
  }
  
  private performFrameProcessing(): void {
    this.frameProcessingCount++;
    // 感覚層特有のフレーム処理をシミュレート
  }
  
  getFrameProcessingCount(): number {
    return this.frameProcessingCount;
  }
  
  getLastTickTimestamp(): Date | null {
    return this.lastTickTimestamp;
  }
  
  reset(): void {
    this.frameProcessingCount = 0;
    this.lastTickTimestamp = null;
  }
}

class MockPatternAutonomousLayer {
  private frameProcessingCount = 0;
  private lastTickTimestamp: Date | null = null;
  
  constructor(public id: string) {}
  
  tick(): void {
    this.lastTickTimestamp = new Date();
    this.performFrameProcessing();
  }
  
  private performFrameProcessing(): void {
    this.frameProcessingCount++;
    // パターン層特有のフレーム処理をシミュレート
  }
  
  getFrameProcessingCount(): number {
    return this.frameProcessingCount;
  }
  
  getLastTickTimestamp(): Date | null {
    return this.lastTickTimestamp;
  }
  
  reset(): void {
    this.frameProcessingCount = 0;
    this.lastTickTimestamp = null;
  }
}

class MockControlFrameTimer {
  private intervalId: NodeJS.Timeout | null = null;
  private tickCount = 0;
  private startTime: Date | null = null;
  private isRunning = false;
  
  constructor(
    public id: string,
    private rhythmConfig: MockLayerRhythmConfiguration,
    private baseIntervalMs: number = 8 // 125FPS base timer for fine-grained control
  ) {}
  
  start(
    senseLayer: MockSensoryAutonomousLayer,
    patternLayer: MockPatternAutonomousLayer
  ): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startTime = new Date();
    
    this.intervalId = setInterval(() => {
      this.tick(senseLayer, patternLayer);
    }, this.baseIntervalMs);
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }
  
  private tick(
    senseLayer: MockSensoryAutonomousLayer,
    patternLayer: MockPatternAutonomousLayer
  ): void {
    this.tickCount++;
    
    if (!this.startTime) return;
    
    const elapsedMs = Date.now() - this.startTime.getTime();
    
    // 各層の設定を参照してtickを送信
    const senseConfig = this.rhythmConfig.getConfig('sense-layer');
    const patternConfig = this.rhythmConfig.getConfig('pattern-layer');
    
    // 感覚層のタイミングチェック
    if (senseConfig && senseConfig.enabled) {
      const sensePhaseOffset = senseConfig.cycleMs * senseConfig.phase;
      const senseNextTick = Math.floor((elapsedMs - sensePhaseOffset) / senseConfig.cycleMs);
      const sensePrevTick = Math.floor((elapsedMs - sensePhaseOffset - this.baseIntervalMs) / senseConfig.cycleMs);
      
      if (senseNextTick > sensePrevTick) {
        senseLayer.tick();
      }
    }
    
    // パターン層のタイミングチェック
    if (patternConfig && patternConfig.enabled) {
      const patternPhaseOffset = patternConfig.cycleMs * patternConfig.phase;
      const patternNextTick = Math.floor((elapsedMs - patternPhaseOffset) / patternConfig.cycleMs);
      const patternPrevTick = Math.floor((elapsedMs - patternPhaseOffset - this.baseIntervalMs) / patternConfig.cycleMs);
      
      if (patternNextTick > patternPrevTick) {
        patternLayer.tick();
      }
    }
  }
  
  getTickCount(): number {
    return this.tickCount;
  }
  
  getElapsedTime(): number {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime.getTime();
  }
  
  isRunning_(): boolean {
    return this.isRunning;
  }
  
  reset(): void {
    this.stop();
    this.tickCount = 0;
    this.startTime = null;
  }
}

describe('SD-24: フェーズ同期（層ごとの位相合わせ）', () => {
  let rhythmConfig: MockLayerRhythmConfiguration;
  let frameTimer: MockControlFrameTimer;
  let senseLayer: MockSensoryAutonomousLayer;
  let patternLayer: MockPatternAutonomousLayer;

  beforeEach(() => {
    rhythmConfig = new MockLayerRhythmConfiguration('rhythm-config-01');
    frameTimer = new MockControlFrameTimer('frame-timer-01', rhythmConfig, 10);
    senseLayer = new MockSensoryAutonomousLayer('sense-layer-01');
    patternLayer = new MockPatternAutonomousLayer('pattern-layer-01');
  });

  afterEach(() => {
    frameTimer.stop();
    senseLayer.reset();
    patternLayer.reset();
  });

  // === SD-24シーケンス図対応テストケース ===

  describe('リズム設定参照処理', () => {
    (DevelopOption.isExecute_SD_24_rhythm_configuration ? test : test.skip)('正常系：制御フレームタイマーによる層リズム設定の参照', () => {
      // シーケンス図 20行目: Timer -> RhythmConfig: 参照
      
      const senseConfig = rhythmConfig.getConfig('sense-layer');
      const patternConfig = rhythmConfig.getConfig('pattern-layer');
      
      expect(senseConfig).toBeDefined();
      expect(patternConfig).toBeDefined();
      
      expect(senseConfig?.cycleMs).toBe(16); // 60FPS
      expect(patternConfig?.cycleMs).toBe(33); // 30FPS
      
      expect(senseConfig?.phase).toBe(0.0);
      expect(patternConfig?.phase).toBe(0.25); // 25%オフセット
      
      expect(rhythmConfig.isLayerEnabled('sense-layer')).toBe(true);
      expect(rhythmConfig.isLayerEnabled('pattern-layer')).toBe(true);
    });
  });

  describe('層同期処理', () => {
    (DevelopOption.isExecute_SD_24_layer_synchronization ? test : test.skip)('正常系：各層の周期に応じたtick送信とフレーム処理実行', async () => {
      // シーケンス図 27-40行目: Timer -> SenseLayer/PatternLayer: tick() -> フレーム処理
      
      expect(senseLayer.getFrameProcessingCount()).toBe(0);
      expect(patternLayer.getFrameProcessingCount()).toBe(0);
      
      frameTimer.start(senseLayer, patternLayer);
      
      // 短時間待ってフレーム処理が実行されることを確認
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(senseLayer.getFrameProcessingCount()).toBeGreaterThan(0);
          expect(patternLayer.getFrameProcessingCount()).toBeGreaterThan(0);
          
          expect(senseLayer.getLastTickTimestamp()).not.toBeNull();
          expect(patternLayer.getLastTickTimestamp()).not.toBeNull();
          resolve();
        }, 100);
      });
      
      expect(frameTimer.isRunning_()).toBe(true);
    });
  });

  describe('フェーズ調整処理', () => {
    (DevelopOption.isExecute_SD_24_phase_coordination ? test : test.skip)('正常系：層間のフェーズオフセットによる位相合わせ', () => {
      // シーケンス図 23-41行目: 周期的実行でのフェーズ調整による緩やかな同期
      
      // フェーズ設定を更新してテスト
      rhythmConfig.setConfig({
        layerId: 'test-layer',
        cycleMs: 50,
        phase: 0.5, // 50%オフセット
        enabled: true
      });
      
      const testConfig = rhythmConfig.getConfig('test-layer');
      expect(testConfig?.phase).toBe(0.5);
      
      frameTimer.start(senseLayer, patternLayer);
      
      // 異なる層のフェーズ設定を確認
      const allConfigs = rhythmConfig.getAllConfigs();
      expect(allConfigs.size).toBeGreaterThan(2);
      
      const senseConfig = allConfigs.get('sense-layer');
      const patternConfig = allConfigs.get('pattern-layer');
      
      expect(senseConfig?.phase).toBe(0.0);
      expect(patternConfig?.phase).toBe(0.25);
      expect(senseConfig?.cycleMs).not.toBe(patternConfig?.cycleMs);
    });
  });
});