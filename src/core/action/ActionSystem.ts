import { VectorizableContext } from '../tag/VectorizableContext';
import { ContextInfo } from '../tag/ContextInfo';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { Tag } from '../tag/Tag';

/**
 * 行動実行器（クラス図P6_Action.ActionExecutorに対応）
 */
export class ActionExecutor<T extends VectorizableContext> {
  private readonly executorId: string;
  private executionHistory: Array<ExecutionRecord> = [];
  
  constructor(executorId: string) {
    this.executorId = executorId;
  }
  
  public execute(expected: ExpectedPatternV2<T>): void {
    const startTime = Date.now();
    
    // TODO: 実際の行動実行ロジック
    console.log(`Executing action with pattern: ${JSON.stringify(expected.body.toVector())}`);
    
    this.executionHistory.push({
      timestamp: new Date(startTime),
      expectedPattern: expected,
      success: Math.random() > 0.2 // 80%の成功率
    });
    
    // 履歴サイズの制限
    if (this.executionHistory.length > 100) {
      this.executionHistory.shift();
    }
  }
  
  public getExecutionHistory(): ReadonlyArray<ExecutionRecord> {
    return this.executionHistory;
  }
}

/**
 * 運動予測コピー送出器（クラス図P6_Action.EfferenceCopyEmitterに対応）
 */
export class EfferenceCopyEmitter<T extends VectorizableContext> {
  private thalmusGateReference: any; // TODO: 適切な型を設定
  
  public emit(expected: ExpectedPatternV2<T>, tags: Set<Tag>): void {
    // 運動コマンドのコピーを視床ゲートに送信
    console.log(`Emitting efference copy with tags: ${Array.from(tags).map(t => t.key).join(', ')}`);
    
    // TODO: 視床ゲートの予測的調整
    if (this.thalmusGateReference) {
      // 自己起因の感覚入力を抑制するための予測信号を送る
    }
  }
  
  public setThalamusGateReference(gateRef: any): void {
    this.thalmusGateReference = gateRef;
  }
}

/**
 * 外界（クラス図P6_Env.ExternalWorldに対応）
 */
export class ExternalWorld {
  private worldState: Map<string, any> = new Map();
  
  public updateState(actionVector: number[]): void {
    // TODO: 行動による外界の状態変化をシミュレート
    console.log(`World state updated by action: ${JSON.stringify(actionVector)}`);
  }
  
  public getCurrentState(): Map<string, any> {
    return new Map(this.worldState);
  }
}

/**
 * 実行結果パターン（クラス図P6_Env.ExecutionResultPatternに対応）
 */
export class ExecutionResultPattern<T extends VectorizableContext> extends ActualPatternV2<T> {
  public readonly executionId: string;
  
  constructor(contextInfo: ContextInfo<T>, executionId: string) {
    super(contextInfo);
    this.executionId = executionId;
  }
}

/**
 * 実行結果キャプチャ（クラス図P6_Env.ExecutionResultCaptureに対応）
 */
export class ExecutionResultCapture<T extends VectorizableContext> {
  private readonly captureId: string;
  private externalWorld: ExternalWorld;
  
  constructor(captureId: string, externalWorld: ExternalWorld) {
    this.captureId = captureId;
    this.externalWorld = externalWorld;
  }
  
  public get(): ExecutionResultPattern<T> {
    // 外界の現在状態をキャプチャしてパターンとして返す
    const worldState = this.externalWorld.getCurrentState();
    const resultVector = Array.from(worldState.values()).slice(0, 10).map(v => Number(v) || 0);
    
    const resultContext = {
      toVector: () => resultVector
    } as T;
    
    const contextInfo = new ContextInfo<T>(
      resultContext,
      new Set([Tag.createString('capture', 'execution_result')]),
      new Map([
        ['capture_timestamp', Date.now()],
        ['capture_id_hash', this.captureId.length]
      ])
    );
    
    return new ExecutionResultPattern<T>(contextInfo, `exec_${Date.now()}`);
  }
}

interface ExecutionRecord {
  timestamp: Date;
  expectedPattern: ExpectedPatternV2<any>;
  success: boolean;
}