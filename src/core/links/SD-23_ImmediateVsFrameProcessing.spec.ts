import { DevelopOption } from '../../debug/DevelopOption';

// 更新イベントの定義
interface UpdateEvent {
  id: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  data: any;
  layerId?: string;
  magnitude?: number;
}

// モック用の簡易クラス定義
class MockEventQueue {
  private queue: UpdateEvent[] = [];
  
  constructor(public id: string) {}
  
  push(event: UpdateEvent): void {
    this.queue.push(event);
    // 優先度順にソート（高優先度が先頭）
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
  
  pull(): UpdateEvent | null {
    return this.queue.shift() || null;
  }
  
  peek(): UpdateEvent | null {
    return this.queue.length > 0 ? this.queue[0] : null;
  }
  
  size(): number {
    return this.queue.length;
  }
  
  clear(): void {
    this.queue = [];
  }
  
  getEventsByPriority(priority: 'high' | 'medium' | 'low'): UpdateEvent[] {
    return this.queue.filter(event => event.priority === priority);
  }
}

class MockLayerExecutionScheduler {
  private isProcessingImmediate = false;
  private frameProcessingCount = 0;
  private immediateProcessingCount = 0;
  
  constructor(public id: string) {}
  
  // 即時処理（高優先度イベント用）
  processImmediately(event: UpdateEvent): void {
    this.isProcessingImmediate = true;
    this.immediateProcessingCount++;
    
    // 割り込み処理のシミュレーション
    this.interruptCurrentExecution();
    this.executeEvent(event);
    
    this.isProcessingImmediate = false;
  }
  
  // フレーム処理（通常イベント用）
  processInFrame(layerId: string, event: UpdateEvent): void {
    this.frameProcessingCount++;
    this.executeEvent(event);
  }
  
  private interruptCurrentExecution(): void {
    // 現在の実行を中断して即時処理に切り替える
  }
  
  private executeEvent(event: UpdateEvent): void {
    // イベントの実際の処理をシミュレート
  }
  
  // 統計情報取得
  getImmediateProcessingCount(): number {
    return this.immediateProcessingCount;
  }
  
  getFrameProcessingCount(): number {
    return this.frameProcessingCount;
  }
  
  isCurrentlyProcessingImmediate(): boolean {
    return this.isProcessingImmediate;
  }
  
  reset(): void {
    this.frameProcessingCount = 0;
    this.immediateProcessingCount = 0;
    this.isProcessingImmediate = false;
  }
}

class MockControlFrameTimer {
  private intervalId: NodeJS.Timeout | null = null;
  private tickCount = 0;
  private isRunning = false;
  
  constructor(public id: string, private intervalMs: number = 16) {} // デフォルト60FPS
  
  start(scheduler: MockLayerExecutionScheduler, queue: MockEventQueue): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.tick(scheduler, queue);
    }, this.intervalMs);
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }
  
  tick(scheduler: MockLayerExecutionScheduler, queue: MockEventQueue): void {
    this.tickCount++;
    
    // キューから通常優先度のイベントを取得してフレーム処理
    const event = queue.pull();
    if (event && (event.priority === 'medium' || event.priority === 'low')) {
      scheduler.processInFrame(event.layerId || 'default', event);
    }
  }
  
  getTickCount(): number {
    return this.tickCount;
  }
  
  isRunning_(): boolean {
    return this.isRunning;
  }
  
  reset(): void {
    this.stop();
    this.tickCount = 0;
  }
}

class MockEventSource {
  constructor(public id: string) {}
  
  generateHighPriorityEvent(): UpdateEvent {
    return {
      id: `high-${Date.now()}`,
      priority: 'high',
      timestamp: new Date(),
      data: { type: 'urgent_update', magnitude: Math.random() * 0.9 + 0.8 },
      magnitude: Math.random() * 0.9 + 0.8
    };
  }
  
  generateNormalPriorityEvent(): UpdateEvent {
    return {
      id: `normal-${Date.now()}`,
      priority: Math.random() > 0.5 ? 'medium' : 'low',
      timestamp: new Date(),
      data: { type: 'normal_update', magnitude: Math.random() * 0.5 },
      magnitude: Math.random() * 0.5
    };
  }
}

describe('SD-23: 大差分の即時処理 vs 通常フレーム処理', () => {
  let eventSource: MockEventSource;
  let eventQueue: MockEventQueue;
  let scheduler: MockLayerExecutionScheduler;
  let frameTimer: MockControlFrameTimer;

  beforeEach(() => {
    eventSource = new MockEventSource('event-source-01');
    eventQueue = new MockEventQueue('event-queue-01');
    scheduler = new MockLayerExecutionScheduler('scheduler-01');
    frameTimer = new MockControlFrameTimer('frame-timer-01', 50); // 20FPS for testing
  });

  afterEach(() => {
    frameTimer.stop();
    scheduler.reset();
    eventQueue.clear();
  });

  // === SD-23シーケンス図対応テストケース ===

  describe('即時処理', () => {
    (DevelopOption.isExecute_SD_23_immediate_processing ? test : test.skip)('正常系：高優先度イベントの即時処理と割り込み実行', () => {
      // シーケンス図 21-28行目: Source -> Queue: push(高優先度イベント) -> Scheduler: (通知) -> 即時処理
      
      const highPriorityEvent = eventSource.generateHighPriorityEvent();
      
      expect(scheduler.getImmediateProcessingCount()).toBe(0);
      expect(scheduler.isCurrentlyProcessingImmediate()).toBe(false);
      
      eventQueue.push(highPriorityEvent);
      
      // 高優先度イベントは即座に処理される
      if (eventQueue.peek()?.priority === 'high') {
        scheduler.processImmediately(highPriorityEvent);
      }
      
      expect(scheduler.getImmediateProcessingCount()).toBe(1);
      expect(highPriorityEvent.priority).toBe('high');
      expect(highPriorityEvent.magnitude).toBeGreaterThan(0.8);
    });
  });

  describe('フレームベース処理', () => {
    (DevelopOption.isExecute_SD_23_frame_based_processing ? test : test.skip)('正常系：通常イベントのフレーム周期に基づく処理', async () => {
      // シーケンス図 32-46行目: Source -> Queue: push(通常イベント) -> Timer: tick -> フレーム処理
      
      const normalEvent = eventSource.generateNormalPriorityEvent();
      
      expect(scheduler.getFrameProcessingCount()).toBe(0);
      
      eventQueue.push(normalEvent);
      expect(['medium', 'low']).toContain(normalEvent.priority);
      
      // フレームタイマーを短時間起動してフレーム処理をテスト
      frameTimer.start(scheduler, eventQueue);
      
      // 少し待ってからフレーム処理が実行されることを確認
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(scheduler.getFrameProcessingCount()).toBeGreaterThan(0);
          resolve();
        }, 100);
      });
      
      expect(normalEvent.magnitude).toBeLessThan(0.5);
    });
  });

  describe('優先度スケジューリング', () => {
    (DevelopOption.isExecute_SD_23_priority_scheduling ? test : test.skip)('正常系：イベント優先度に基づく処理方式の分岐', () => {
      // シーケンス図全体: 優先度による即時処理 vs フレーム処理の分岐
      
      const highEvent = eventSource.generateHighPriorityEvent();
      const mediumEvent = eventSource.generateNormalPriorityEvent();
      const lowEvent = eventSource.generateNormalPriorityEvent();
      
      eventQueue.push(highEvent);
      eventQueue.push(mediumEvent);
      eventQueue.push(lowEvent);
      
      // 優先度順にソートされていることを確認
      const firstEvent = eventQueue.peek();
      expect(firstEvent?.priority).toBe('high');
      
      // 高優先度は即時処理
      if (firstEvent?.priority === 'high') {
        scheduler.processImmediately(firstEvent);
        expect(scheduler.getImmediateProcessingCount()).toBe(1);
      }
      
      // 残りはフレーム処理
      frameTimer.start(scheduler, eventQueue);
      
      expect(eventQueue.getEventsByPriority('high').length).toBe(1);
      expect(['medium', 'low']).toContain(mediumEvent.priority);
      expect(['medium', 'low']).toContain(lowEvent.priority);
    });
  });
});