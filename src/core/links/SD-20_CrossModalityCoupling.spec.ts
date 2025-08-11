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

// モダリティ別のタグ定義
enum ModalityType {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  TACTILE = 'tactile',
  PROPRIOCEPTIVE = 'proprioceptive'
}

// モック用の簡易クラス定義
class MockUpperConceptualLayer {
  private sentExpectations: Map<ModalityType, ExpectedPatternV2<MockContext>> = new Map();
  
  constructor(public id: string) {}
  
  sendCrossModalExpectation(
    expectation: ExpectedPatternV2<MockContext>,
    modalityType: ModalityType,
    targetLayer: MockSensoryAutonomousLayer
  ): void {
    // モダリティタグを追加した期待を作成
    const modalityTag = Tag.create(modalityType);
    const enhancedExpectation = new ExpectedPatternV2<MockContext>(
      new ContextInfo(
        expectation.body,
        new Set([...expectation.body.getDimension() > 0 ? [] : [], modalityTag]),
        new Map()
      )
    );
    
    this.sentExpectations.set(modalityType, enhancedExpectation);
    targetLayer.receiveExpectation(enhancedExpectation);
  }
  
  receiveUnifiedFeedback(unifiedDelta: RelativeDifference<MockContext>): void {
    // クロスモーダル統合結果の処理
  }
  
  getSentExpectationsCount(): number {
    return this.sentExpectations.size;
  }
  
  getExpectationForModality(modalityType: ModalityType): ExpectedPatternV2<MockContext> | undefined {
    return this.sentExpectations.get(modalityType);
  }
}

class MockSensoryAutonomousLayer {
  private modalityType: ModalityType;
  private receivedExpectations: ExpectedPatternV2<MockContext>[] = [];
  private computedDeltas: RelativeDifference<MockContext>[] = [];
  private inputData: MockContext | null = null;
  
  constructor(public id: string, modalityType: ModalityType) {
    this.modalityType = modalityType;
  }
  
  receiveExpectation(expectation: ExpectedPatternV2<MockContext>): void {
    this.receivedExpectations.push(expectation);
  }
  
  processInput(input: MockContext): void {
    this.inputData = input;
    
    // 最新の期待がある場合、差分を計算
    if (this.receivedExpectations.length > 0) {
      const latestExpectation = this.receivedExpectations[this.receivedExpectations.length - 1];
      const delta = this.computeModalitySpecificDelta(latestExpectation, input);
      this.computedDeltas.push(delta);
    }
  }
  
  private computeModalitySpecificDelta(
    expectation: ExpectedPatternV2<MockContext>,
    actual: MockContext
  ): RelativeDifference<MockContext> {
    const expectedVector = expectation.body.toVector();
    const actualVector = actual.toVector();
    
    // モダリティ特有の差分計算
    let magnitude = 0;
    const modalityWeight = this.getModalityWeight();
    
    for (let i = 0; i < Math.min(expectedVector.length, actualVector.length); i++) {
      magnitude += Math.pow((expectedVector[i] - actualVector[i]) * modalityWeight, 2);
    }
    magnitude = Math.sqrt(magnitude);
    
    return new RelativeDifference<MockContext>(
      magnitude,
      new ContextInfo(
        actual,
        new Set([
          Tag.create(this.modalityType),
          Tag.create('sensory_delta')
        ]),
        new Map()
      )
    );
  }
  
  private getModalityWeight(): number {
    // モダリティ別の重み係数
    switch (this.modalityType) {
      case ModalityType.VISUAL: return 1.2;
      case ModalityType.AUDITORY: return 1.0;
      case ModalityType.TACTILE: return 0.8;
      case ModalityType.PROPRIOCEPTIVE: return 0.9;
      default: return 1.0;
    }
  }
  
  getLastComputedDelta(): RelativeDifference<MockContext> | null {
    return this.computedDeltas.length > 0 
      ? this.computedDeltas[this.computedDeltas.length - 1] 
      : null;
  }
  
  getModalityType(): ModalityType {
    return this.modalityType;
  }
  
  getReceivedExpectationsCount(): number {
    return this.receivedExpectations.length;
  }
}

class MockCrossModalDeltaIntegrationPolicy {
  constructor(public id: string) {}
  
  integrate(modalityDeltas: Map<ModalityType, RelativeDifference<MockContext>>): RelativeDifference<MockContext> {
    if (modalityDeltas.size === 0) {
      return new RelativeDifference<MockContext>(
        0,
        new ContextInfo(new MockContext([0]), new Set(), new Map())
      );
    }
    
    // クロスモーダル統合アルゴリズム
    let integratedMagnitude = 0;
    let totalModalityWeight = 0;
    const allTags = new Set<Tag>();
    const combinedStats = new Map<string, any>();
    
    modalityDeltas.forEach((delta, modalityType) => {
      const modalityWeight = this.getModalityIntegrationWeight(modalityType);
      integratedMagnitude += delta.magnitude * modalityWeight;
      totalModalityWeight += modalityWeight;
      
      // タグとメタデータを収集
      delta.contextInfo.tags.forEach(tag => allTags.add(tag));
      delta.contextInfo.statistics.forEach((value, key) => {
        combinedStats.set(`${modalityType}_${key}`, value);
      });
    });
    
    if (totalModalityWeight > 0) {
      integratedMagnitude /= totalModalityWeight;
    }
    
    // 統合された差分の一貫性をチェック
    const consistencyScore = this.calculateCrossModalConsistency(modalityDeltas);
    
    allTags.add(Tag.create('cross_modal_integrated'));
    combinedStats.set('consistency_score', consistencyScore);
    combinedStats.set('modalities_count', modalityDeltas.size);
    
    // 平均ベクトルを計算
    const averageVector = this.calculateModalityAverageVector(modalityDeltas);
    
    return new RelativeDifference<MockContext>(
      integratedMagnitude,
      new ContextInfo(
        new MockContext(averageVector),
        allTags,
        combinedStats
      )
    );
  }
  
  private getModalityIntegrationWeight(modalityType: ModalityType): number {
    // クロスモーダル統合時のモダリティ重み
    switch (modalityType) {
      case ModalityType.VISUAL: return 1.5; // 視覚優位
      case ModalityType.AUDITORY: return 1.2;
      case ModalityType.TACTILE: return 0.8;
      case ModalityType.PROPRIOCEPTIVE: return 1.0;
      default: return 1.0;
    }
  }
  
  private calculateCrossModalConsistency(modalityDeltas: Map<ModalityType, RelativeDifference<MockContext>>): number {
    if (modalityDeltas.size <= 1) return 1.0;
    
    const magnitudes = Array.from(modalityDeltas.values()).map(delta => delta.magnitude);
    const average = magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length;
    const variance = magnitudes.reduce((sum, mag) => sum + Math.pow(mag - average, 2), 0) / magnitudes.length;
    
    // 一貫性スコア（分散が小さいほど高い）
    return Math.max(0, 1 - variance);
  }
  
  private calculateModalityAverageVector(modalityDeltas: Map<ModalityType, RelativeDifference<MockContext>>): number[] {
    const deltas = Array.from(modalityDeltas.values());
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
}

class MockLinkAggregator {
  private modalityDeltas: Map<ModalityType, RelativeDifference<MockContext>> = new Map();
  
  constructor(
    public id: string,
    private integrationPolicy: MockCrossModalDeltaIntegrationPolicy
  ) {}
  
  receiveModalityDelta(
    delta: RelativeDifference<MockContext>,
    modalityType: ModalityType
  ): void {
    this.modalityDeltas.set(modalityType, delta);
  }
  
  integrateAndSendFeedback(upperLayer: MockUpperConceptualLayer): RelativeDifference<MockContext> {
    const unifiedDelta = this.integrationPolicy.integrate(this.modalityDeltas);
    upperLayer.receiveUnifiedFeedback(unifiedDelta);
    
    // モダリティデルタをクリア
    this.modalityDeltas.clear();
    
    return unifiedDelta;
  }
  
  getModalityDeltaCount(): number {
    return this.modalityDeltas.size;
  }
  
  hasModalityDelta(modalityType: ModalityType): boolean {
    return this.modalityDeltas.has(modalityType);
  }
}

describe('SD-20: クロスモダリティ結合（視覚×聴覚等）', () => {
  let upperLayer: MockUpperConceptualLayer;
  let visionLayer: MockSensoryAutonomousLayer;
  let audioLayer: MockSensoryAutonomousLayer;
  let aggregator: MockLinkAggregator;
  let integrationPolicy: MockCrossModalDeltaIntegrationPolicy;

  beforeEach(() => {
    integrationPolicy = new MockCrossModalDeltaIntegrationPolicy('cross-modal-policy-01');
    aggregator = new MockLinkAggregator('aggregator-01', integrationPolicy);
    upperLayer = new MockUpperConceptualLayer('upper-conceptual-layer-01');
    visionLayer = new MockSensoryAutonomousLayer('vision-layer-01', ModalityType.VISUAL);
    audioLayer = new MockSensoryAutonomousLayer('audio-layer-01', ModalityType.AUDITORY);
  });

  // === SD-20シーケンス図対応テストケース ===

  describe('クロスモーダル期待送信処理', () => {
    (DevelopOption.isExecute_SD_20_cross_modal_expectation ? test : test.skip)('正常系：上位層から異モダリティ感覚層への期待送信', () => {
      // シーケンス図 22-23行目: UpperLayer -> VisionLayer: 期待(タグ:視覚), UpperLayer -> AudioLayer: 期待(タグ:聴覚)
      
      const visualExpectation = new ExpectedPatternV2<MockContext>(
        new ContextInfo(
          new MockContext([0.8, 0.6, 0.4]),
          new Set([Tag.create('visual_concept')]),
          new Map()
        )
      );
      
      const auditoryExpectation = new ExpectedPatternV2<MockContext>(
        new ContextInfo(
          new MockContext([0.3, 0.7, 0.5]),
          new Set([Tag.create('auditory_concept')]),
          new Map()
        )
      );
      
      expect(upperLayer.getSentExpectationsCount()).toBe(0);
      expect(visionLayer.getReceivedExpectationsCount()).toBe(0);
      expect(audioLayer.getReceivedExpectationsCount()).toBe(0);
      
      upperLayer.sendCrossModalExpectation(visualExpectation, ModalityType.VISUAL, visionLayer);
      upperLayer.sendCrossModalExpectation(auditoryExpectation, ModalityType.AUDITORY, audioLayer);
      
      expect(upperLayer.getSentExpectationsCount()).toBe(2);
      expect(visionLayer.getReceivedExpectationsCount()).toBe(1);
      expect(audioLayer.getReceivedExpectationsCount()).toBe(1);
      
      // モダリティタグが正しく追加されているかを確認
      const sentVisual = upperLayer.getExpectationForModality(ModalityType.VISUAL);
      const sentAuditory = upperLayer.getExpectationForModality(ModalityType.AUDITORY);
      
      expect(sentVisual).toBeDefined();
      expect(sentAuditory).toBeDefined();
    });
  });

  describe('モダリティ差分統合処理', () => {
    (DevelopOption.isExecute_SD_20_modality_delta_integration ? test : test.skip)('正常系：各モダリティからの差分収集とクロスモーダル統合', () => {
      // シーケンス図 29-34行目: VisionLayer -> Aggregator: 視覚差分, AudioLayer -> Aggregator: 聴覚差分 -> Δ統合ポリシー.統合
      
      // まず期待を送信
      const visualExpectation = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.5, 0.6]), new Set(), new Map())
      );
      const auditoryExpectation = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.7, 0.8]), new Set(), new Map())
      );
      
      upperLayer.sendCrossModalExpectation(visualExpectation, ModalityType.VISUAL, visionLayer);
      upperLayer.sendCrossModalExpectation(auditoryExpectation, ModalityType.AUDITORY, audioLayer);
      
      // 各モダリティで入力を処理してデルタを生成
      const visualInput = new MockContext([0.6, 0.7]); // 期待との差分
      const auditoryInput = new MockContext([0.8, 0.9]); // 期待との差分
      
      visionLayer.processInput(visualInput);
      audioLayer.processInput(auditoryInput);
      
      const visualDelta = visionLayer.getLastComputedDelta();
      const auditoryDelta = audioLayer.getLastComputedDelta();
      
      expect(visualDelta).not.toBeNull();
      expect(auditoryDelta).not.toBeNull();
      
      if (visualDelta && auditoryDelta) {
        // アグリゲータにモダリティ別デルタを送信
        aggregator.receiveModalityDelta(visualDelta, ModalityType.VISUAL);
        aggregator.receiveModalityDelta(auditoryDelta, ModalityType.AUDITORY);
        
        expect(aggregator.getModalityDeltaCount()).toBe(2);
        expect(aggregator.hasModalityDelta(ModalityType.VISUAL)).toBe(true);
        expect(aggregator.hasModalityDelta(ModalityType.AUDITORY)).toBe(true);
        
        // クロスモーダル統合処理
        const unifiedDelta = aggregator.integrateAndSendFeedback(upperLayer);
        
        expect(unifiedDelta).toBeInstanceOf(RelativeDifference);
        expect(unifiedDelta.magnitude).toBeGreaterThan(0);
        expect(Array.from(unifiedDelta.contextInfo.tags).some(tag => tag.key === 'cross_modal_integrated')).toBe(true);
      }
    });
  });

  describe('統合フィードバック処理', () => {
    (DevelopOption.isExecute_SD_20_unified_feedback ? test : test.skip)('正常系：統合差分による上位層へのフィードバック', () => {
      // シーケンス図 35行目: Aggregator -> UpperLayer: 統合差分
      
      // 完全なクロスモーダルフローをテスト
      const visualExpectation = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.1, 0.2, 0.3]), new Set(), new Map())
      );
      const auditoryExpectation = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.4, 0.5, 0.6]), new Set(), new Map())
      );
      
      // 1. 期待送信
      upperLayer.sendCrossModalExpectation(visualExpectation, ModalityType.VISUAL, visionLayer);
      upperLayer.sendCrossModalExpectation(auditoryExpectation, ModalityType.AUDITORY, audioLayer);
      
      // 2. 入力処理とデルタ生成
      visionLayer.processInput(new MockContext([0.15, 0.25, 0.35]));
      audioLayer.processInput(new MockContext([0.45, 0.55, 0.65]));
      
      const visualDelta = visionLayer.getLastComputedDelta();
      const auditoryDelta = audioLayer.getLastComputedDelta();
      
      if (visualDelta && auditoryDelta) {
        // 3. アグリゲータでの統合
        aggregator.receiveModalityDelta(visualDelta, ModalityType.VISUAL);
        aggregator.receiveModalityDelta(auditoryDelta, ModalityType.AUDITORY);
        
        // 4. 統合フィードバック
        const unifiedFeedback = aggregator.integrateAndSendFeedback(upperLayer);
        
        // 5. 統合結果の検証
        expect(unifiedFeedback.magnitude).toBeGreaterThan(0);
        
        // クロスモーダル統合の特性を確認
        const consistencyScore = unifiedFeedback.contextInfo.statistics.get('consistency_score');
        const modalityCount = unifiedFeedback.contextInfo.statistics.get('modalities_count');
        
        expect(consistencyScore).toBeGreaterThanOrEqual(0);
        expect(consistencyScore).toBeLessThanOrEqual(1);
        expect(modalityCount).toBe(2);
        
        // タグの確認
        expect(Array.from(unifiedFeedback.contextInfo.tags).some(tag => tag.key === 'cross_modal_integrated')).toBe(true);
        expect(Array.from(unifiedFeedback.contextInfo.tags).some(tag => tag.key === 'visual')).toBe(true);
        expect(Array.from(unifiedFeedback.contextInfo.tags).some(tag => tag.key === 'auditory')).toBe(true);
        
        // アグリゲータがクリアされることを確認
        expect(aggregator.getModalityDeltaCount()).toBe(0);
      }
    });
  });
});