import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
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
  constructor(public id: string, public layerName: string) {}
  
  sendExpectation(expectation: ExpectedPatternV2<MockContext>, aggregator: MockLinkAggregator): void {
    aggregator.receiveExpectation(expectation, this.id);
  }
  
  receiveIntegratedDelta(delta: RelativeDifference<MockContext>): void {
    // 統合されたデルタを受信して処理
  }
}

class MockLowerAutonomousLayer {
  constructor(public id: string, public layerName: string) {}
  
  sendActual(actual: ActualPatternV2<MockContext>, aggregator: MockLinkAggregator): void {
    aggregator.receiveActual(actual, this.id);
  }
}

class MockDeltaIntegrationPolicy {
  constructor(public id: string) {}
  
  integrate(
    expectations: Map<string, ExpectedPatternV2<MockContext>>,
    actuals: Map<string, ActualPatternV2<MockContext>>
  ): Map<string, RelativeDifference<MockContext>> {
    const results = new Map<string, RelativeDifference<MockContext>>();
    
    // 各上位層に対して統合されたデルタを計算
    expectations.forEach((expected, upperLayerId) => {
      // 全ての下位層の実際パターンと比較して統合デルタを作成
      const actualArray = Array.from(actuals.values());
      
      // 簡単な統合アルゴリズム：実際パターンの平均との差分
      let totalMagnitude = 0;
      let weightedSum = new Array(expected.body.getDimension()).fill(0);
      
      actualArray.forEach(actual => {
        const actualVector = actual.contextInfo.body.toVector();
        const expectedVector = expected.body.toVector();
        
        // 差分計算
        let magnitude = 0;
        for (let i = 0; i < Math.min(expectedVector.length, actualVector.length); i++) {
          const diff = expectedVector[i] - actualVector[i];
          magnitude += diff * diff;
          weightedSum[i] += actualVector[i] / actualArray.length;
        }
        totalMagnitude += Math.sqrt(magnitude) / actualArray.length;
      });
      
      // 統合されたデルタを作成
      const integratedDelta = new RelativeDifference<MockContext>(
        totalMagnitude,
        new ContextInfo(
          new MockContext(weightedSum),
          new Set([Tag.create('integrated'), Tag.create(`for_${upperLayerId}`)]),
          new Map()
        )
      );
      
      results.set(upperLayerId, integratedDelta);
    });
    
    return results;
  }
}

class MockLinkAggregator {
  private expectations = new Map<string, ExpectedPatternV2<MockContext>>();
  private actuals = new Map<string, ActualPatternV2<MockContext>>();
  
  constructor(public id: string, private integrationPolicy: MockDeltaIntegrationPolicy) {}
  
  receiveExpectation(expectation: ExpectedPatternV2<MockContext>, sourceLayerId: string): void {
    this.expectations.set(sourceLayerId, expectation);
  }
  
  receiveActual(actual: ActualPatternV2<MockContext>, sourceLayerId: string): void {
    this.actuals.set(sourceLayerId, actual);
  }
  
  performIntegration(upperLayers: Map<string, MockUpperAutonomousLayer>): Map<string, RelativeDifference<MockContext>> {
    const integratedDeltas = this.integrationPolicy.integrate(this.expectations, this.actuals);
    
    // 結果を各上位層に送信
    integratedDeltas.forEach((delta, upperLayerId) => {
      const upperLayer = upperLayers.get(upperLayerId);
      if (upperLayer) {
        upperLayer.receiveIntegratedDelta(delta);
      }
    });
    
    return integratedDeltas;
  }
  
  getReceivedExpectationsCount(): number {
    return this.expectations.size;
  }
  
  getReceivedActualsCount(): number {
    return this.actuals.size;
  }
  
  clear(): void {
    this.expectations.clear();
    this.actuals.clear();
  }
}

describe('SD-21: 上位N：下位M の混在統合', () => {
  let upperLayerA: MockUpperAutonomousLayer;
  let upperLayerB: MockUpperAutonomousLayer;
  let lowerLayerC: MockLowerAutonomousLayer;
  let lowerLayerD: MockLowerAutonomousLayer;
  let aggregator: MockLinkAggregator;
  let integrationPolicy: MockDeltaIntegrationPolicy;

  beforeEach(() => {
    integrationPolicy = new MockDeltaIntegrationPolicy('integration-policy-01');
    aggregator = new MockLinkAggregator('aggregator-01', integrationPolicy);
    
    upperLayerA = new MockUpperAutonomousLayer('upper-a', 'UpperA');
    upperLayerB = new MockUpperAutonomousLayer('upper-b', 'UpperB');
    lowerLayerC = new MockLowerAutonomousLayer('lower-c', 'LowerC');
    lowerLayerD = new MockLowerAutonomousLayer('lower-d', 'LowerD');
  });

  // === SD-21シーケンス図対応テストケース ===

  describe('複数期待集約処理', () => {
    (DevelopOption.isExecute_SD_21_multi_expectation_aggregation ? test : test.skip)('正常系：複数上位層からの期待パターン受信と集約', () => {
      // シーケンス図 25-26行目: UpperA -> Aggregator: 期待A, UpperB -> Aggregator: 期待B
      
      const expectationA = new ExpectedPatternV2<MockContext>(
        new ContextInfo(
          new MockContext([0.8, 0.6, 0.4]),
          new Set([Tag.create('upper_a_expectation')]),
          new Map()
        )
      );
      
      const expectationB = new ExpectedPatternV2<MockContext>(
        new ContextInfo(
          new MockContext([0.2, 0.7, 0.9]),
          new Set([Tag.create('upper_b_expectation')]),
          new Map()
        )
      );
      
      expect(aggregator.getReceivedExpectationsCount()).toBe(0);
      
      upperLayerA.sendExpectation(expectationA, aggregator);
      upperLayerB.sendExpectation(expectationB, aggregator);
      
      expect(aggregator.getReceivedExpectationsCount()).toBe(2);
    });
  });

  describe('統合差分配布処理', () => {
    (DevelopOption.isExecute_SD_21_integrated_delta_distribution ? test : test.skip)('正常系：統合ポリシーによる差分計算と各上位層への配布', () => {
      // シーケンス図 32-35行目: Aggregator: Δ統合ポリシー.統合 -> UpperA: 統合差分A, UpperB: 統合差分B
      
      // まず期待と実際を設定
      const expectationA = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.5, 0.5, 0.5]), new Set(), new Map())
      );
      const expectationB = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.7, 0.3, 0.8]), new Set(), new Map())
      );
      
      upperLayerA.sendExpectation(expectationA, aggregator);
      upperLayerB.sendExpectation(expectationB, aggregator);
      
      const actualC = new ActualPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.6, 0.4, 0.7]), new Set(), new Map())
      );
      const actualD = new ActualPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.4, 0.6, 0.3]), new Set(), new Map())
      );
      
      lowerLayerC.sendActual(actualC, aggregator);
      lowerLayerD.sendActual(actualD, aggregator);
      
      expect(aggregator.getReceivedExpectationsCount()).toBe(2);
      expect(aggregator.getReceivedActualsCount()).toBe(2);
      
      // 統合処理を実行
      const upperLayers = new Map([
        ['upper-a', upperLayerA],
        ['upper-b', upperLayerB]
      ]);
      
      const integratedDeltas = aggregator.performIntegration(upperLayers);
      
      expect(integratedDeltas.size).toBe(2);
      expect(integratedDeltas.has('upper-a')).toBe(true);
      expect(integratedDeltas.has('upper-b')).toBe(true);
      
      const deltaA = integratedDeltas.get('upper-a');
      const deltaB = integratedDeltas.get('upper-b');
      
      expect(deltaA).toBeDefined();
      expect(deltaB).toBeDefined();
      expect(deltaA!.magnitude).toBeGreaterThan(0);
      expect(deltaB!.magnitude).toBeGreaterThan(0);
    });
  });

  describe('層間同期処理', () => {
    (DevelopOption.isExecute_SD_21_cross_layer_synchronization ? test : test.skip)('正常系：複数下位層実際との相互整合による同期', () => {
      // シーケンス図 28-29行目: LowerC -> Aggregator: 実際C, LowerD -> Aggregator: 実際D
      
      const actualC = new ActualPatternV2<MockContext>(
        new ContextInfo(
          new MockContext([0.3, 0.7, 0.2]),
          new Set([Tag.create('lower_c_actual')]),
          new Map()
        )
      );
      
      const actualD = new ActualPatternV2<MockContext>(
        new ContextInfo(
          new MockContext([0.8, 0.1, 0.9]),
          new Set([Tag.create('lower_d_actual')]),
          new Map()
        )
      );
      
      expect(aggregator.getReceivedActualsCount()).toBe(0);
      
      lowerLayerC.sendActual(actualC, aggregator);
      lowerLayerD.sendActual(actualD, aggregator);
      
      expect(aggregator.getReceivedActualsCount()).toBe(2);
      
      // 完全な統合フローをテスト
      const expectationA = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.5, 0.4, 0.6]), new Set(), new Map())
      );
      upperLayerA.sendExpectation(expectationA, aggregator);
      
      const upperLayers = new Map([['upper-a', upperLayerA]]);
      const integratedDeltas = aggregator.performIntegration(upperLayers);
      
      expect(integratedDeltas.size).toBe(1);
      const delta = integratedDeltas.get('upper-a');
      expect(delta).toBeDefined();
      expect(Array.from(delta!.contextInfo.tags).some(tag => tag.key === 'integrated')).toBe(true);
    });
  });
});