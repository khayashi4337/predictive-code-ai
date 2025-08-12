import { VectorizableContext } from '../tag/VectorizableContext';
import { ContextInfo } from '../tag/ContextInfo';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { Tag } from '../tag/Tag';

/**
 * 感覚器官（クラス図P3_Input.SensoryOrganに対応）
 */
export class SensoryOrgan {
  private readonly organId: string;
  
  constructor(organId: string) {
    this.organId = organId;
  }
  
  public captureRawData(): any {
    // TODO: 実際のセンサーデータキャプチャ
    return { data: Math.random(), timestamp: Date.now() };
  }
  
  public getOrganId(): string {
    return this.organId;
  }
}

/**
 * 入力正規化器（クラス図P3_Input.InputNormalizerに対応）
 */
export class InputNormalizer<T extends VectorizableContext> {
  public normalize(rawData: any): ActualPatternV2<T> {
    // TODO: 実際の正規化処理
    const normalizedVector = Array.isArray(rawData.data) 
      ? rawData.data 
      : [rawData.data, rawData.data, rawData.data];
    
    const context = {
      toVector: () => normalizedVector
    } as T;
    
    const contextInfo = new ContextInfo<T>(
      context,
      new Set([Tag.createString('input', 'normalized')]),
      new Map([['normalization_timestamp', Date.now()]])
    );
    
    return new ActualPatternV2<T>(contextInfo);
  }
}

/**
 * 視床ゲート（クラス図P3_Gate.ThalamusGateに対応）
 */
export class ThalamusGate {
  private gatePolicy: GatePolicy;
  private currentThresholds: Map<string, number> = new Map();
  private currentGains: Map<string, number> = new Map();
  
  constructor(gatePolicy: GatePolicy) {
    this.gatePolicy = gatePolicy;
  }
  
  public adjustThreshold(newThreshold: number, tags: ReadonlySet<Tag>): void {
    for (const tag of tags) {
      this.currentThresholds.set(tag.key, newThreshold);
    }
  }
  
  public adjustGain(newGain: number, tags: ReadonlySet<Tag>): void {
    for (const tag of tags) {
      this.currentGains.set(tag.key, newGain);
    }
  }
  
  public filter<T extends VectorizableContext>(pattern: ActualPatternV2<T>): ActualPatternV2<T> {
    const threshold = this.gatePolicy.threshold(pattern.contextInfo.tags);
    const gain = this.gatePolicy.gain(pattern.contextInfo.tags);
    
    // フィルタリング処理
    const filteredVector = pattern.body.toVector().map(value => {
      if (Math.abs(value) < threshold) {
        return 0; // 閾値未満は除去
      }
      return value * gain; // ゲイン調整
    });
    
    const filteredContext = {
      toVector: () => filteredVector
    } as T;
    
    const newContextInfo = new ContextInfo<T>(
      filteredContext,
      pattern.contextInfo.tags,
      new Map([
        ...pattern.contextInfo.statistics,
        ['thalamus_filter_applied', 1],
        ['threshold_used', threshold],
        ['gain_used', gain]
      ])
    );
    
    return new ActualPatternV2<T>(newContextInfo);
  }
}

/**
 * ゲートポリシー（クラス図P3_Gate.GatePolicyに対応）
 */
export interface GatePolicy {
  threshold(tags: ReadonlySet<Tag>): number;
  gain(tags: ReadonlySet<Tag>): number;
}

/**
 * デフォルトゲートポリシー
 */
export class DefaultGatePolicy implements GatePolicy {
  private defaultThreshold: number = 0.1;
  private defaultGain: number = 1.0;
  
  threshold(_tags: ReadonlySet<Tag>): number {
    return this.defaultThreshold;
  }
  
  gain(_tags: ReadonlySet<Tag>): number {
    return this.defaultGain;
  }
}