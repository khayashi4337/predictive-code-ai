import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { ContextInfo } from '../tag/ContextInfo';
import { VectorizableContext } from '../tag/VectorizableContext';
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
class MockDeltaHistoryBuffer {
  private history: RelativeDifference<MockContext>[] = [];
  
  constructor(public id: string) {}
  
  add(delta: RelativeDifference<MockContext>): void {
    this.history.push(delta);
  }
  
  getHistory(): ReadonlyArray<RelativeDifference<MockContext>> {
    return this.history;
  }
  
  size(): number {
    return this.history.length;
  }
  
  clear(): void {
    this.history = [];
  }
}

class MockLearningRateMetaLearner {
  constructor(public id: string) {}
  
  analyzeHistory(history: ReadonlyArray<RelativeDifference<MockContext>>): {
    averageMagnitude: number;
    volatility: number;
    recommendation: string;
  } {
    if (history.length === 0) {
      return {
        averageMagnitude: 0,
        volatility: 0,
        recommendation: 'maintain'
      };
    }
    
    const magnitudes = history.map(delta => delta.magnitude);
    const average = magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length;
    const variance = magnitudes.reduce((sum, mag) => sum + Math.pow(mag - average, 2), 0) / magnitudes.length;
    const volatility = Math.sqrt(variance);
    
    return {
      averageMagnitude: average,
      volatility,
      recommendation: average > 0.5 ? 'increase' : 'decrease'
    };
  }
}

class MockAdaptivePolicy {
  private parameters: Map<string, number> = new Map([
    ['base_rate', 0.01],
    ['adaptation_factor', 1.0],
    ['momentum', 0.9]
  ]);
  
  constructor(public id: string) {}
  
  updatePolicy(analysis: { averageMagnitude: number; volatility: number; recommendation: string }): void {
    switch (analysis.recommendation) {
      case 'increase':
        this.parameters.set('base_rate', Math.min(0.1, this.parameters.get('base_rate')! * 1.2));
        break;
      case 'decrease':
        this.parameters.set('base_rate', Math.max(0.001, this.parameters.get('base_rate')! * 0.8));
        break;
      default:
        // maintain current parameters
        break;
    }
  }
  
  getLearningRate(delta: RelativeDifference<MockContext>): number {
    const baseRate = this.parameters.get('base_rate')!;
    const adaptationFactor = this.parameters.get('adaptation_factor')!;
    return baseRate * adaptationFactor * (1 + delta.magnitude);
  }
  
  getParameter(key: string): number | undefined {
    return this.parameters.get(key);
  }
}

class MockInterLayerJudgementLink {
  constructor(
    public id: string,
    private historyBuffer: MockDeltaHistoryBuffer,
    private adaptivePolicy: MockAdaptivePolicy
  ) {}
  
  calculateRelativeDifference(
    expected: ExpectedPatternV2<MockContext>,
    actual: ExpectedPatternV2<MockContext>
  ): RelativeDifference<MockContext> {
    // 簡易的な差分計算
    const expectedVector = expected.body.toVector();
    const actualVector = actual.body.toVector();
    
    let magnitude = 0;
    for (let i = 0; i < Math.min(expectedVector.length, actualVector.length); i++) {
      magnitude += Math.pow(expectedVector[i] - actualVector[i], 2);
    }
    magnitude = Math.sqrt(magnitude);
    
    const delta = new RelativeDifference<MockContext>(
      magnitude,
      new ContextInfo(expected.body, new Set(), new Map())
    );
    
    // 履歴に追加
    this.historyBuffer.add(delta);
    
    return delta;
  }
  
  getLearningRate(delta: RelativeDifference<MockContext>): number {
    return this.adaptivePolicy.getLearningRate(delta);
  }
}

describe('SD-16: メタ学習ループ（ポリシー更新）', () => {
  let historyBuffer: MockDeltaHistoryBuffer;
  let metaLearner: MockLearningRateMetaLearner;
  let adaptivePolicy: MockAdaptivePolicy;
  let judgementLink: MockInterLayerJudgementLink;

  beforeEach(() => {
    historyBuffer = new MockDeltaHistoryBuffer('history-buffer-01');
    metaLearner = new MockLearningRateMetaLearner('meta-learner-01');
    adaptivePolicy = new MockAdaptivePolicy('adaptive-policy-01');
    judgementLink = new MockInterLayerJudgementLink('link-01', historyBuffer, adaptivePolicy);
  });

  // === SD-16シーケンス図対応テストケース ===

  describe('差分履歴収集処理', () => {
    (DevelopOption.isExecute_SD_16_delta_history_collection ? test : test.skip)('正常系：相対差分計算と履歴バッファへの蓄積', () => {
      // シーケンス図 26-29行目: Link -> Link: 相対差分計算 -> HistoryBuffer: add(差分)
      
      const expectedPattern = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.3, 0.5, 0.7]), new Set(), new Map())
      );
      const actualPattern = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.4, 0.6, 0.8]), new Set(), new Map())
      );
      
      expect(historyBuffer.size()).toBe(0);
      
      const delta = judgementLink.calculateRelativeDifference(expectedPattern, actualPattern);
      const learningRate = judgementLink.getLearningRate(delta);
      
      expect(historyBuffer.size()).toBe(1);
      expect(delta.magnitude).toBeGreaterThan(0);
      expect(learningRate).toBeGreaterThan(0);
    });
  });

  describe('メタ学習処理', () => {
    (DevelopOption.isExecute_SD_16_meta_learning_process ? test : test.skip)('正常系：履歴取得とメタ学習器による分析', () => {
      // シーケンス図 38-41行目: MetaLearner -> HistoryBuffer: getHistory() -> 差分履歴
      
      // 履歴にテストデータを追加
      const testDeltas = [
        new RelativeDifference<MockContext>(0.7, new ContextInfo(new MockContext([0.1, 0.2]), new Set(), new Map())),
        new RelativeDifference<MockContext>(0.3, new ContextInfo(new MockContext([0.3, 0.4]), new Set(), new Map())),
        new RelativeDifference<MockContext>(0.8, new ContextInfo(new MockContext([0.5, 0.6]), new Set(), new Map()))
      ];
      
      testDeltas.forEach(delta => historyBuffer.add(delta));
      
      const history = historyBuffer.getHistory();
      const analysis = metaLearner.analyzeHistory(history);
      
      expect(history).toHaveLength(3);
      expect(analysis.averageMagnitude).toBeCloseTo(0.6, 1);
      expect(analysis.volatility).toBeGreaterThan(0);
      expect(['increase', 'decrease', 'maintain']).toContain(analysis.recommendation);
    });
  });

  describe('ポリシー適応処理', () => {
    (DevelopOption.isExecute_SD_16_policy_adaptation ? test : test.skip)('正常系：適応可能ポリシーの内部パラメータ調整', () => {
      // シーケンス図 43-45行目: MetaLearner -> AdaptivePolicy: ポリシー更新(差分履歴) -> 内部パラメータを調整
      
      const initialBaseRate = adaptivePolicy.getParameter('base_rate');
      
      // 高いmagnitudeの履歴でポリシー更新をテスト
      const highMagnitudeAnalysis = {
        averageMagnitude: 0.8,
        volatility: 0.2,
        recommendation: 'increase' as const
      };
      
      adaptivePolicy.updatePolicy(highMagnitudeAnalysis);
      const updatedBaseRate = adaptivePolicy.getParameter('base_rate');
      
      expect(initialBaseRate).toBe(0.01);
      expect(updatedBaseRate).toBeGreaterThan(initialBaseRate!);
      
      // テスト用差分でlearning rateを計算
      const testDelta = new RelativeDifference<MockContext>(
        0.5,
        new ContextInfo(new MockContext([0.1, 0.2]), new Set(), new Map())
      );
      
      const learningRate = adaptivePolicy.getLearningRate(testDelta);
      expect(learningRate).toBeGreaterThan(0);
    });
  });
});