import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { ContextInfo } from '../tag/ContextInfo';
import { VectorizableContext } from '../tag/VectorizableContext';
import { Tag } from '../tag/Tag';
import { DevelopOption } from '../../debug/DevelopOption';

// モック用のコンテキスト定義
class MockContext implements VectorizableContext {
  constructor(public vector: number[]) {}
  toVector(): number[] {
    return this.vector;
  }
  getDimension(): number {
    return this.vector.length;
  }
}

// モック用の簡易クラス定義
class MockUpperAutonomousLayer {
  private propagatedExpectations: ExpectedPatternV2<MockContext>[] = [];
  
  constructor(public id: string) {}
  
  propagateExpectation(
    expectation: ExpectedPatternV2<MockContext>,
    targetLayers: MockLowerAutonomousLayer[]
  ): void {
    this.propagatedExpectations.push(expectation);
    
    targetLayers.forEach(layer => {
      layer.receiveExpectation(expectation);
    });
  }
  
  receiveUnifiedDelta(unifiedDelta: RelativeDifference<MockContext>): void {
    // 統合されたデルタに基づいて更新
  }
  
  updateBasedOnUnifiedDelta(unifiedDelta: RelativeDifference<MockContext>): void {
    // 統合差分に基づいた層の更新処理
  }
  
  getPropagatedCount(): number {
    return this.propagatedExpectations.length;
  }
}

class MockLowerAutonomousLayer {
  private receivedExpectations: ExpectedPatternV2<MockContext>[] = [];
  private computedDeltas: RelativeDifference<MockContext>[] = [];
  
  constructor(public id: string, public layerType: string) {}
  
  receiveExpectation(expectation: ExpectedPatternV2<MockContext>): void {
    this.receivedExpectations.push(expectation);
    
    // 自動的にデルタを計算してアグリゲータに送信
    const delta = this.computeDelta(expectation);
    this.computedDeltas.push(delta);
  }
  
  private computeDelta(expectation: ExpectedPatternV2<MockContext>): RelativeDifference<MockContext> {
    // 簡略化されたデルタ計算
    const magnitude = Math.random() * 0.8 + 0.1; // 0.1-0.9の範囲
    
    return new RelativeDifference<MockContext>(
      magnitude,
      new ContextInfo(
        expectation.body,
        new Set([Tag.create(`${this.layerType}_layer`)]),
        new Map()
      )
    );
  }
  
  getLastComputedDelta(): RelativeDifference<MockContext> | null {
    return this.computedDeltas.length > 0 
      ? this.computedDeltas[this.computedDeltas.length - 1] 
      : null;
  }
  
  getReceivedExpectationsCount(): number {
    return this.receivedExpectations.length;
  }
}

class MockDeltaIntegrationPolicy {
  constructor(public id: string) {}
  
  integrate(deltas: RelativeDifference<MockContext>[]): RelativeDifference<MockContext> {
    if (deltas.length === 0) {
      return new RelativeDifference<MockContext>(
        0,
        new ContextInfo(new MockContext([0]), new Set(), new Map())
      );
    }
    
    // 加重平均による統合（簡略版）
    let totalMagnitude = 0;
    let totalWeight = 0;
    
    deltas.forEach(delta => {
      const weight = this.calculateWeight(delta);
      totalMagnitude += delta.magnitude * weight;
      totalWeight += weight;
    });
    
    const integratedMagnitude = totalWeight > 0 ? totalMagnitude / totalWeight : 0;
    
    // 統合されたコンテキストを作成
    const averageVector = this.calculateAverageVector(deltas);
    const allTags = this.collectAllTags(deltas);
    
    return new RelativeDifference<MockContext>(
      integratedMagnitude,
      new ContextInfo(
        new MockContext(averageVector),
        allTags,
        new Map([['integration_count', deltas.length]])
      )
    );
  }
  
  private calculateWeight(delta: RelativeDifference<MockContext>): number {
    // タグに基づく重み計算
    if (Array.from(delta.contextInfo.tags).some(tag => tag.key.includes('important'))) {
      return 2.0;
    }
    return 1.0;
  }
  
  private calculateAverageVector(deltas: RelativeDifference<MockContext>[]): number[] {
    if (deltas.length === 0) return [0];
    
    const firstVector = deltas[0].contextInfo.body.toVector();
    const result = new Array(firstVector.length).fill(0);
    
    deltas.forEach(delta => {
      const vector = delta.contextInfo.body.toVector();
      for (let i = 0; i < Math.min(result.length, vector.length); i++) {
        result[i] += vector[i] / deltas.length;
      }
    });
    
    return result;
  }
  
  private collectAllTags(deltas: RelativeDifference<MockContext>[]): Set<Tag> {
    const allTags = new Set<Tag>();
    deltas.forEach(delta => {
      delta.contextInfo.tags.forEach(tag => allTags.add(tag));
    });
    allTags.add(Tag.create('integrated'));
    return allTags;
  }
}

class MockLinkAggregator {
  private receivedDeltas: RelativeDifference<MockContext>[] = [];
  
  constructor(
    public id: string,
    private integrationPolicy: MockDeltaIntegrationPolicy
  ) {}
  
  receiveDelta(delta: RelativeDifference<MockContext>, sourceLayer: string): void {
    // メタデータに送信元レイヤー情報を追加
    const enhancedDelta = new RelativeDifference<MockContext>(
      delta.magnitude,
      new ContextInfo(
        delta.contextInfo.body,
        delta.contextInfo.tags,
        new Map(delta.contextInfo.statistics)
      )
    );
    
    this.receivedDeltas.push(enhancedDelta);
  }
  
  integrateAndSend(upperLayer: MockUpperAutonomousLayer): RelativeDifference<MockContext> {
    const unifiedDelta = this.integrationPolicy.integrate(this.receivedDeltas);
    upperLayer.receiveUnifiedDelta(unifiedDelta);
    
    // デルタリストをクリア
    this.receivedDeltas = [];
    
    return unifiedDelta;
  }
  
  getReceivedDeltaCount(): number {
    return this.receivedDeltas.length;
  }
}

describe('SD-19: 上位1：下位N のΔ統合', () => {
  let upperLayer: MockUpperAutonomousLayer;
  let lowerLayerA: MockLowerAutonomousLayer;
  let lowerLayerB: MockLowerAutonomousLayer;
  let aggregator: MockLinkAggregator;
  let integrationPolicy: MockDeltaIntegrationPolicy;

  beforeEach(() => {
    integrationPolicy = new MockDeltaIntegrationPolicy('integration-policy-01');
    aggregator = new MockLinkAggregator('aggregator-01', integrationPolicy);
    upperLayer = new MockUpperAutonomousLayer('upper-layer-01');
    lowerLayerA = new MockLowerAutonomousLayer('lower-layer-a', 'sensory');
    lowerLayerB = new MockLowerAutonomousLayer('lower-layer-b', 'motor');
  });

  // === SD-19シーケンス図対応テストケース ===

  describe('期待伝播処理', () => {
    (DevelopOption.isExecute_SD_19_expectation_propagation ? test : test.skip)('正常系：上位層から複数下位層への期待伝播', () => {
      // シーケンス図 25-26行目: UpperLayer -> LowerA: 期待を伝播, UpperLayer -> LowerB: 期待を伝播
      
      const expectation = new ExpectedPatternV2<MockContext>(
        new ContextInfo(
          new MockContext([0.5, 0.7, 0.9]),
          new Set([Tag.create('test_expectation')]),
          new Map()
        )
      );
      
      expect(upperLayer.getPropagatedCount()).toBe(0);
      expect(lowerLayerA.getReceivedExpectationsCount()).toBe(0);
      expect(lowerLayerB.getReceivedExpectationsCount()).toBe(0);
      
      upperLayer.propagateExpectation(expectation, [lowerLayerA, lowerLayerB]);
      
      expect(upperLayer.getPropagatedCount()).toBe(1);
      expect(lowerLayerA.getReceivedExpectationsCount()).toBe(1);
      expect(lowerLayerB.getReceivedExpectationsCount()).toBe(1);
    });
  });

  describe('デルタ集約処理', () => {
    (DevelopOption.isExecute_SD_19_delta_aggregation ? test : test.skip)('正常系：各下位層からの差分収集と統合ポリシーによる統合', () => {
      // シーケンス図 30-36行目: LowerA -> Aggregator: 差分A, LowerB -> Aggregator: 差分B -> Policy: 統合(差分リスト)
      
      // まず期待を伝播してデルタを生成
      const expectation = new ExpectedPatternV2<MockContext>(
        new ContextInfo(
          new MockContext([0.5, 0.7]),
          new Set([Tag.create('integration_test')]),
          new Map()
        )
      );
      
      upperLayer.propagateExpectation(expectation, [lowerLayerA, lowerLayerB]);
      
      // 各層からデルタを取得してアグリゲータに送信
      const deltaA = lowerLayerA.getLastComputedDelta();
      const deltaB = lowerLayerB.getLastComputedDelta();
      
      expect(deltaA).not.toBeNull();
      expect(deltaB).not.toBeNull();
      
      if (deltaA && deltaB) {
        aggregator.receiveDelta(deltaA, lowerLayerA.id);
        aggregator.receiveDelta(deltaB, lowerLayerB.id);
        
        expect(aggregator.getReceivedDeltaCount()).toBe(2);
        
        // 統合処理をテスト
        const unifiedDelta = aggregator.integrateAndSend(upperLayer);
        
        expect(unifiedDelta).toBeInstanceOf(RelativeDifference);
        expect(unifiedDelta.magnitude).toBeGreaterThan(0);
        expect(aggregator.getReceivedDeltaCount()).toBe(0); // クリアされる
      }
    });
  });

  describe('統合更新処理', () => {
    (DevelopOption.isExecute_SD_19_unified_update ? test : test.skip)('正常系：統合済み差分による上位層の更新', () => {
      // シーケンス図 39-43行目: Aggregator -> UpperLayer: 統合済み差分 -> UpperLayer: 統合差分に基づき更新
      
      // 完全なフローをテスト
      const expectation = new ExpectedPatternV2<MockContext>(
        new ContextInfo(
          new MockContext([0.2, 0.4, 0.6]),
          new Set([Tag.create('unified_test')]),
          new Map()
        )
      );
      
      // 1. 期待伝播
      upperLayer.propagateExpectation(expectation, [lowerLayerA, lowerLayerB]);
      
      // 2. 各下位層でデルタ計算
      const deltaA = lowerLayerA.getLastComputedDelta();
      const deltaB = lowerLayerB.getLastComputedDelta();
      
      // 3. アグリゲータでの統合
      if (deltaA && deltaB) {
        aggregator.receiveDelta(deltaA, lowerLayerA.id);
        aggregator.receiveDelta(deltaB, lowerLayerB.id);
        
        // 4. 統合と上位層への送信
        const unifiedDelta = aggregator.integrateAndSend(upperLayer);
        
        // 5. 上位層での更新
        upperLayer.updateBasedOnUnifiedDelta(unifiedDelta);
        
        // 統合されたデルタの特性を検証
        expect(unifiedDelta.magnitude).toBeGreaterThan(0);
        expect(Array.from(unifiedDelta.contextInfo.tags).some(tag => tag.key === 'integrated')).toBe(true);
        
        // メタデータの確認
        const integrationCount = unifiedDelta.contextInfo.statistics.get('integration_count');
        expect(integrationCount).toBe(2);
      }
    });
  });
});