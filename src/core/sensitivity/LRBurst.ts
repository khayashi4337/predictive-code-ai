/**
 * LRBurst - 学習率バースト（クラス図P5_Burst.LRBurstに対応）
 * 
 * 差分駆動による一時的な学習率増幅を管理する。
 * 新奇性の高い状況で発火し、関連する学習率を一時的に増幅する。
 */
export class LRBurst {
  public readonly tags: Set<string>;
  public readonly initialAmplification: number;
  public readonly halfLifeMs: number;
  private readonly createdAt: Date;
  
  constructor(
    tags: Set<string>,
    initialAmplification: number = 2.0,
    halfLifeMs: number = 30000 // 30秒
  ) {
    this.tags = new Set(tags);
    this.initialAmplification = initialAmplification;
    this.halfLifeMs = halfLifeMs;
    this.createdAt = new Date();
  }
  
  /**
   * 現在の増幅係数を計算（時間減衰を考慮）
   */
  public getCurrentAmplification(): number {
    const elapsedMs = Date.now() - this.createdAt.getTime();
    const decayFactor = Math.exp(-Math.log(2) * elapsedMs / this.halfLifeMs);
    return 1 + (this.initialAmplification - 1) * decayFactor;
  }
  
  /**
   * バーストが有効かどうか
   */
  public isActive(): boolean {
    return this.getCurrentAmplification() > 1.1;
  }
}

/**
 * 感度イベントバス（クラス図P5_Burst.SensitivityEventBusに対応）
 */
export class SensitivityEventBus {
  private subscribers: Set<SensitivitySubscriber> = new Set();
  
  public publish(burst: LRBurst): void {
    this.subscribers.forEach(subscriber => {
      subscriber.onBurst(burst);
    });
  }
  
  public subscribe(subscriber: SensitivitySubscriber): void {
    this.subscribers.add(subscriber);
  }
  
  public unsubscribe(subscriber: SensitivitySubscriber): void {
    this.subscribers.delete(subscriber);
  }
}

/**
 * 感度状態（クラス図P5_State.SensitivityStateに対応）
 */
export class SensitivityState {
  public coefficientByTag: Map<string, number> = new Map();
  
  public updateTime(now: Date): void {
    // TODO: 時間経過による感度の減衰処理
  }
  
  public coefficient(tag: string): number {
    return this.coefficientByTag.get(tag) ?? 1.0;
  }
}

/**
 * 学習率モジュレータ（クラス図P5_State.LearningRateModulatorに対応）
 */
export class LearningRateModulator implements SensitivitySubscriber {
  private sensitivityState: SensitivityState = new SensitivityState();
  
  public amplificationFactor(tags: Set<string>): number {
    let maxFactor = 1.0;
    for (const tag of tags) {
      const factor = this.sensitivityState.coefficient(tag);
      maxFactor = Math.max(maxFactor, factor);
    }
    return maxFactor;
  }
  
  public onBurst(burst: LRBurst): void {
    const amplification = burst.getCurrentAmplification();
    for (const tag of burst.tags) {
      this.sensitivityState.coefficientByTag.set(tag, amplification);
    }
  }
}

export interface SensitivitySubscriber {
  onBurst(burst: LRBurst): void;
}