import { DevelopOption } from '../../debug/DevelopOption';

// 状態データの定義
interface StateData {
  timestamp: Date;
  componentId: string;
  stateType: 'processing' | 'error' | 'success' | 'idle';
  payload: any;
  metrics?: {
    processingTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
}

// 変換済みデータの定義
interface ConvertedMonitorData {
  id: string;
  timestamp: number;
  type: string;
  data: any;
  metadata?: Record<string, any>;
}

// モック用の簡易クラス定義
class MockStateHookPoint {
  private listeners: ((data: StateData) => void)[] = [];
  private notificationCount = 0;
  
  constructor(public id: string) {}
  
  notify(stateData: StateData): void {
    this.notificationCount++;
    this.listeners.forEach(listener => listener(stateData));
  }
  
  addListener(listener: (data: StateData) => void): void {
    this.listeners.push(listener);
  }
  
  removeListener(listener: (data: StateData) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  getNotificationCount(): number {
    return this.notificationCount;
  }
  
  getListenerCount(): number {
    return this.listeners.length;
  }
  
  reset(): void {
    this.notificationCount = 0;
    this.listeners = [];
  }
}

class MockExternalMonitorAdapter {
  private convertedDataQueue: ConvertedMonitorData[] = [];
  private conversionCount = 0;
  private externalMonitors: MockExternalMonitor[] = [];
  private batchSize = 10;
  private flushIntervalMs = 1000;
  private batchTimer: NodeJS.Timeout | null = null;
  
  constructor(public id: string) {}
  
  addExternalMonitor(monitor: MockExternalMonitor): void {
    this.externalMonitors.push(monitor);
  }
  
  setBatchConfiguration(batchSize: number, flushIntervalMs: number): void {
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;
    this.restartBatchTimer();
  }
  
  private restartBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    this.batchTimer = setInterval(() => {
      this.flushBatch();
    }, this.flushIntervalMs);
  }
  
  send(stateData: StateData): void {
    this.conversionCount++;
    const convertedData = this.convertToMonitorFormat(stateData);
    this.convertedDataQueue.push(convertedData);
    
    // バッチサイズに達した場合は即座にフラッシュ
    if (this.convertedDataQueue.length >= this.batchSize) {
      this.flushBatch();
    }
  }
  
  private flushBatch(): void {
    if (this.convertedDataQueue.length === 0) return;
    
    const batch = [...this.convertedDataQueue];
    this.convertedDataQueue = [];
    
    // 各外部モニタに送信
    this.externalMonitors.forEach(monitor => {
      batch.forEach(data => monitor.push(data));
    });
  }
  
  private convertToMonitorFormat(stateData: StateData): ConvertedMonitorData {
    return {
      id: `monitor-${stateData.componentId}-${Date.now()}`,
      timestamp: stateData.timestamp.getTime(),
      type: this.mapStateTypeToMonitorType(stateData.stateType),
      data: stateData.payload,
      metadata: {
        originalComponent: stateData.componentId,
        metrics: stateData.metrics
      }
    };
  }
  
  private mapStateTypeToMonitorType(stateType: string): string {
    const typeMap: Record<string, string> = {
      'processing': 'PROC',
      'error': 'ERR',
      'success': 'OK',
      'idle': 'WAIT'
    };
    return typeMap[stateType] || 'UNKNOWN';
  }
  
  forceBatchFlush(): void {
    this.flushBatch();
  }
  
  stopBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }
  
  getConversionCount(): number {
    return this.conversionCount;
  }
  
  getQueueSize(): number {
    return this.convertedDataQueue.length;
  }
  
  getLastConvertedData(): ConvertedMonitorData | null {
    return this.convertedDataQueue.length > 0 
      ? this.convertedDataQueue[this.convertedDataQueue.length - 1]
      : null;
  }
  
  clear(): void {
    this.stopBatchTimer();
    this.convertedDataQueue = [];
    this.conversionCount = 0;
    this.externalMonitors = [];
  }
}

// 外部モニタのシミュレーション
class MockExternalMonitor {
  private receivedData: ConvertedMonitorData[] = [];
  private receiveCount = 0;
  private isConnected = true;
  private latencyMs = 0;
  
  constructor(public id: string, public monitorType: 'websocket' | 'http' | 'queue' = 'websocket') {}
  
  push(data: ConvertedMonitorData): void {
    if (!this.isConnected) {
      throw new Error(`Monitor ${this.id} is not connected`);
    }
    
    this.receiveCount++;
    
    // レイテンシをシミュレート
    if (this.latencyMs > 0) {
      setTimeout(() => {
        this.receivedData.push(data);
      }, this.latencyMs);
    } else {
      this.receivedData.push(data);
    }
  }
  
  setLatency(ms: number): void {
    this.latencyMs = ms;
  }
  
  disconnect(): void {
    this.isConnected = false;
  }
  
  reconnect(): void {
    this.isConnected = true;
  }
  
  isConnected_(): boolean {
    return this.isConnected;
  }
  
  getReceivedDataCount(): number {
    return this.receivedData.length;
  }
  
  getReceiveAttemptCount(): number {
    return this.receiveCount;
  }
  
  getLastReceivedData(): ConvertedMonitorData | null {
    return this.receivedData.length > 0 
      ? this.receivedData[this.receivedData.length - 1]
      : null;
  }
  
  getAllReceivedData(): readonly ConvertedMonitorData[] {
    return this.receivedData;
  }
  
  getDataByType(type: string): ConvertedMonitorData[] {
    return this.receivedData.filter(data => data.type === type);
  }
  
  clear(): void {
    this.receivedData = [];
    this.receiveCount = 0;
  }
}

class MockInternalProcess {
  private processCount = 0;
  
  constructor(
    public id: string,
    private hookPoint: MockStateHookPoint
  ) {}
  
  performProcessing(processData: any): void {
    this.processCount++;
    
    // 処理開始の状態を通知
    this.hookPoint.notify({
      timestamp: new Date(),
      componentId: this.id,
      stateType: 'processing',
      payload: { processId: this.processCount, data: processData },
      metrics: {
        processingTime: 0,
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 100
      }
    });
    
    // 実際の処理をシミュレート
    const success = Math.random() > 0.2; // 80%の成功率
    
    setTimeout(() => {
      // 処理完了の状態を通知
      this.hookPoint.notify({
        timestamp: new Date(),
        componentId: this.id,
        stateType: success ? 'success' : 'error',
        payload: { 
          processId: this.processCount, 
          result: success ? 'completed' : 'failed',
          data: processData 
        },
        metrics: {
          processingTime: Math.random() * 1000,
          memoryUsage: Math.random() * 100,
          cpuUsage: Math.random() * 100
        }
      });
    }, 10); // 非同期処理をシミュレート
  }
  
  getProcessCount(): number {
    return this.processCount;
  }
  
  reset(): void {
    this.processCount = 0;
  }
}

// 外部モニタの統合システム
class MockExternalMonitorIntegration {
  private monitors: MockExternalMonitor[] = [];
  private isEnabled = true;
  
  constructor(
    private hookPoint: MockStateHookPoint,
    private adapter: MockExternalMonitorAdapter
  ) {
    // フックポイントにアダプタを接続
    this.hookPoint.addListener((stateData) => {
      if (this.isEnabled) {
        this.adapter.send(stateData);
      }
    });
  }
  
  addMonitor(monitor: MockExternalMonitor): void {
    this.monitors.push(monitor);
    this.adapter.addExternalMonitor(monitor);
  }
  
  removeMonitor(monitorId: string): boolean {
    const index = this.monitors.findIndex(m => m.id === monitorId);
    if (index >= 0) {
      this.monitors.splice(index, 1);
      return true;
    }
    return false;
  }
  
  enableIntegration(): void {
    this.isEnabled = true;
  }
  
  disableIntegration(): void {
    this.isEnabled = false;
  }
  
  isIntegrationEnabled(): boolean {
    return this.isEnabled;
  }
  
  getMonitorCount(): number {
    return this.monitors.length;
  }
  
  getMonitorById(id: string): MockExternalMonitor | null {
    return this.monitors.find(m => m.id === id) || null;
  }
  
  getAllMonitors(): readonly MockExternalMonitor[] {
    return this.monitors;
  }
  
  getConnectedMonitors(): MockExternalMonitor[] {
    return this.monitors.filter(m => m.isConnected_());
  }
  
  getTotalReceivedDataCount(): number {
    return this.monitors.reduce((total, monitor) => total + monitor.getReceivedDataCount(), 0);
  }
  
  clear(): void {
    this.monitors.forEach(monitor => monitor.clear());
    this.monitors = [];
  }
}

describe('SD-26: 外部モニタへの状態フック', () => {
  let internalProcess: MockInternalProcess;
  let hookPoint: MockStateHookPoint;
  let adapter: MockExternalMonitorAdapter;
  let integration: MockExternalMonitorIntegration;
  let externalMonitor: MockExternalMonitor;

  beforeEach(() => {
    hookPoint = new MockStateHookPoint('hook-point-01');
    adapter = new MockExternalMonitorAdapter('adapter-01');
    internalProcess = new MockInternalProcess('process-01', hookPoint);
    integration = new MockExternalMonitorIntegration(hookPoint, adapter);
    
    // 外部モニタを追加
    externalMonitor = new MockExternalMonitor('monitor-01', 'websocket');
    integration.addMonitor(externalMonitor);
  });

  afterEach(() => {
    hookPoint.reset();
    adapter.clear();
    internalProcess.reset();
    integration.clear();
  });

  // === SD-26シーケンス図対応テストケース ===

  describe('状態フック処理', () => {
    (DevelopOption.isExecute_SD_26_state_hook ? test : test.skip)('正常系：内部処理からフックポイントへの状態データ通知', () => {
      // シーケンス図 22行目: InternalProcess -> HookPoint: notify(状態データ)
      
      const testData = { operation: 'test_process', value: 123 };
      
      expect(hookPoint.getNotificationCount()).toBe(0);
      expect(hookPoint.getListenerCount()).toBe(1); // integration が接続済み
      
      internalProcess.performProcessing(testData);
      
      expect(hookPoint.getNotificationCount()).toBe(1); // 処理開始時の通知
      expect(internalProcess.getProcessCount()).toBe(1);
    });
  });

  describe('アダプタ変換処理', () => {
    (DevelopOption.isExecute_SD_26_adapter_conversion ? test : test.skip)('正常系：状態データの外部モニタ形式への変換', () => {
      // シーケンス図 25-29行目: HookPoint -> Adapter: send(状態データ) -> 変換処理
      
      const stateData: StateData = {
        timestamp: new Date(),
        componentId: 'test-component',
        stateType: 'processing',
        payload: { task: 'conversion_test' },
        metrics: {
          processingTime: 500,
          memoryUsage: 75.5,
          cpuUsage: 45.2
        }
      };
      
      expect(adapter.getConversionCount()).toBe(0);
      
      adapter.send(stateData);
      
      expect(adapter.getConversionCount()).toBe(1);
      
      const convertedData = adapter.getLastConvertedData();
      expect(convertedData).not.toBeNull();
      expect(convertedData!.type).toBe('PROC'); // processing -> PROC
      expect(convertedData!.data).toEqual({ task: 'conversion_test' });
      expect(convertedData!.metadata?.originalComponent).toBe('test-component');
      expect(convertedData!.metadata?.metrics?.processingTime).toBe(500);
    });
  });

  describe('外部モニタ統合処理', () => {
    (DevelopOption.isExecute_SD_26_monitor_integration ? test : test.skip)('正常系：変換済みデータの外部モニタへの送信', async () => {
      // シーケンス図 29行目: Adapter -> Monitor: push(変換済みデータ)
      
      const testProcessData = { 
        operation: 'integration_test',
        parameters: { threshold: 0.8, iterations: 10 }
      };
      
      expect(integration.getTotalReceivedDataCount()).toBe(0);
      
      // 内部処理を実行（これにより一連のフローが動作）
      internalProcess.performProcessing(testProcessData);
      
      // 非同期処理完了を待つ
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          // アダプタで変換が実行されていることを確認
          expect(adapter.getConversionCount()).toBeGreaterThanOrEqual(1);
          
          // バッチをフラッシュして外部モニタに送信
          adapter.forceBatchFlush();
          
          // 外部モニタでデータが受信されていることを確認
          expect(externalMonitor.getReceivedDataCount()).toBeGreaterThanOrEqual(1);
          expect(integration.getTotalReceivedDataCount()).toBeGreaterThanOrEqual(1);
          
          const lastReceived = externalMonitor.getLastReceivedData();
          expect(lastReceived).not.toBeNull();
          expect(lastReceived!.data.data).toEqual(testProcessData);
          expect(['PROC', 'OK', 'ERR']).toContain(lastReceived!.type);
          
          // 複数モニタのテスト
          const monitor2 = new MockExternalMonitor('monitor-02', 'http');
          integration.addMonitor(monitor2);
          
          expect(integration.getMonitorCount()).toBe(2);
          expect(integration.getConnectedMonitors().length).toBe(2);
          
          resolve();
        }, 50);
      });
    });
  });
});