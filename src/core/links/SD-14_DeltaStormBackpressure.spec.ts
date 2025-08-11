import { DevelopOption } from '../../debug/DevelopOption';

// モック用の更新イベント定義
interface UpdateEvent {
  id: string;
  priority: number;
  timestamp: Date;
  data: any;
  size: number;
}

// モック用の簡易クラス定義
class MockEventQueue {
  private events: UpdateEvent[] = [];
  private maxSize = 100;
  
  constructor(public id: string) {}
  
  push(event: UpdateEvent): boolean {
    if (this.events.length >= this.maxSize) {
      return false; // キューフル
    }
    this.events.push(event);
    this.events.sort((a, b) => b.priority - a.priority); // 優先度順
    return true;
  }
  
  pull(): UpdateEvent | null {
    return this.events.shift() || null;
  }
  
  size(): number {
    return this.events.length;
  }
  
  clear(): void {
    this.events = [];
  }
  
  getEvents(): ReadonlyArray<UpdateEvent> {
    return this.events;
  }
}

class MockBackpressureControl {
  private readonly threshold = 80; // キューサイズ閾値
  private isBackpressureActive = false;
  
  constructor(public id: string) {}
  
  monitorAndControl(queue: MockEventQueue): {
    shouldApplyBackpressure: boolean;
    droppedEvents: number;
    degradedEvents: number;
  } {
    const currentSize = queue.size();
    
    if (currentSize > this.threshold) {
      this.isBackpressureActive = true;
      return this.applyBackpressure(queue);
    }
    
    this.isBackpressureActive = false;
    return {
      shouldApplyBackpressure: false,
      droppedEvents: 0,
      degradedEvents: 0
    };
  }
  
  private applyBackpressure(queue: MockEventQueue): {
    shouldApplyBackpressure: boolean;
    droppedEvents: number;
    degradedEvents: number;
  } {
    const events = queue.getEvents();
    let droppedCount = 0;
    let degradedCount = 0;
    
    // 低優先度イベントの破棄と劣化処理（シミュレート）
    events.forEach(event => {
      if (event.priority < 0.3) {
        droppedCount++;
      } else if (event.priority < 0.6) {
        degradedCount++;
      }
    });
    
    return {
      shouldApplyBackpressure: true,
      droppedEvents: droppedCount,
      degradedEvents: degradedCount
    };
  }
  
  notifySourceToPressure(): void {
    // 生成元への圧力通知（生成抑制）
  }
  
  isActive(): boolean {
    return this.isBackpressureActive;
  }
}

class MockLayerExecutionScheduler {
  private processingQueue: UpdateEvent[] = [];
  
  constructor(public id: string) {}
  
  processEvents(queue: MockEventQueue, batchSize: number = 10): {
    processedCount: number;
    remainingCount: number;
  } {
    let processedCount = 0;
    
    for (let i = 0; i < batchSize; i++) {
      const event = queue.pull();
      if (!event) break;
      
      this.processEvent(event);
      processedCount++;
    }
    
    return {
      processedCount,
      remainingCount: queue.size()
    };
  }
  
  private processEvent(_event: UpdateEvent): void {
    // イベント処理のシミュレート
  }
}

describe('SD-14: Δストーム時のバックプレッシャ制御', () => {
  let eventQueue: MockEventQueue;
  let backpressureControl: MockBackpressureControl;
  let scheduler: MockLayerExecutionScheduler;

  beforeEach(() => {
    eventQueue = new MockEventQueue('event-queue-01');
    backpressureControl = new MockBackpressureControl('backpressure-01');
    scheduler = new MockLayerExecutionScheduler('scheduler-01');
  });

  // === SD-14シーケンス図対応テストケース ===

  describe('イベントキュー監視処理', () => {
    (DevelopOption.isExecute_SD_14_event_queue_monitoring ? test : test.skip)('正常系：キューサイズ監視と閾値超過検出', () => {
      // シーケンス図 24-27行目: Backpressure -> Queue: サイズ() -> 現在のキューサイズ
      
      // キューに大量のイベントを追加してサイズ監視をテスト
      for (let i = 0; i < 90; i++) {
        const event: UpdateEvent = {
          id: `event-${i}`,
          priority: Math.random(),
          timestamp: new Date(),
          data: `data-${i}`,
          size: 1
        };
        eventQueue.push(event);
      }
      
      const queueSize = eventQueue.size();
      const monitorResult = backpressureControl.monitorAndControl(eventQueue);
      
      expect(queueSize).toBeGreaterThan(80);
      expect(monitorResult.shouldApplyBackpressure).toBe(true);
    });
  });

  describe('バックプレッシャ制御処理', () => {
    (DevelopOption.isExecute_SD_14_backpressure_control ? test : test.skip)('正常系：水位監視とドロップ/劣化処理、生成抑制通知', () => {
      // シーケンス図 29-33行目: キューサイズ > 閾値 -> 水位監視＆ドロップ/劣化処理 -> 圧力を通知
      
      // 各優先度のイベントを追加
      const lowPriorityEvents = Array.from({length: 30}, (_, i) => ({
        id: `low-${i}`,
        priority: 0.2,
        timestamp: new Date(),
        data: `low-data-${i}`,
        size: 1
      }));
      
      const mediumPriorityEvents = Array.from({length: 30}, (_, i) => ({
        id: `med-${i}`,
        priority: 0.5,
        timestamp: new Date(),
        data: `med-data-${i}`,
        size: 1
      }));
      
      const highPriorityEvents = Array.from({length: 30}, (_, i) => ({
        id: `high-${i}`,
        priority: 0.9,
        timestamp: new Date(),
        data: `high-data-${i}`,
        size: 1
      }));
      
      [...lowPriorityEvents, ...mediumPriorityEvents, ...highPriorityEvents].forEach(event => {
        eventQueue.push(event);
      });
      
      const controlResult = backpressureControl.monitorAndControl(eventQueue);
      backpressureControl.notifySourceToPressure();
      
      expect(eventQueue.size()).toBeGreaterThan(80);
      expect(controlResult.shouldApplyBackpressure).toBe(true);
      expect(controlResult.droppedEvents).toBeGreaterThan(0);
      expect(controlResult.degradedEvents).toBeGreaterThan(0);
      expect(backpressureControl.isActive()).toBe(true);
    });
  });

  describe('優先度処理処理', () => {
    (DevelopOption.isExecute_SD_14_priority_processing ? test : test.skip)('正常系：スケジューラによるイベント取得と処理', () => {
      // シーケンス図 37-42行目: Scheduler -> Queue: pull() -> 更新イベント -> イベント処理
      
      // テスト用イベントを追加
      const testEvents: UpdateEvent[] = [
        { id: 'evt-1', priority: 0.9, timestamp: new Date(), data: 'high', size: 1 },
        { id: 'evt-2', priority: 0.7, timestamp: new Date(), data: 'med', size: 1 },
        { id: 'evt-3', priority: 0.5, timestamp: new Date(), data: 'low', size: 1 },
        { id: 'evt-4', priority: 0.8, timestamp: new Date(), data: 'high2', size: 1 },
        { id: 'evt-5', priority: 0.3, timestamp: new Date(), data: 'low2', size: 1 }
      ];
      
      testEvents.forEach(event => eventQueue.push(event));
      
      const initialSize = eventQueue.size();
      const processingResult = scheduler.processEvents(eventQueue, 3);
      
      expect(initialSize).toBe(5);
      expect(processingResult.processedCount).toBe(3);
      expect(processingResult.remainingCount).toBe(2);
      expect(eventQueue.size()).toBe(2);
    });
  });
});