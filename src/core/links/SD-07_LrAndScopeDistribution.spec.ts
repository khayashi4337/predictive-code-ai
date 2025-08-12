import { InterLayerRelativeJudgementLink } from './InterLayerRelativeJudgementLink';
import { LearningRatePolicy, UpdateScopePolicy, SkipPolicy } from './PolicyInterfaces';
import { DifferenceDistanceMetric } from '../metrics/interfaces';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { ContextInfo } from '../tag/ContextInfo';
import { VectorizableContext } from '../tag/VectorizableContext';
import { AdaptiveLearningRate, LearningRateOrigin } from '../learning/AdaptiveLearningRate';
import { UpdateScope } from '../learning/UpdateScope';
import { SkipEnum } from './SkipEnum';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { LearningSignal } from '../learning/LearningSignalV2';
import { DevelopOption } from '../../debug/DevelopOption';
import { Tag } from '../tag/Tag';

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

// テスト用のモック実装
class MockDistanceMetric implements DifferenceDistanceMetric<MockContext> {
  constructor(private returnValue: number = 0.5) {}
  
  distance(_expected: ExpectedPatternV2<MockContext>, _actual: ActualPatternV2<MockContext>): number {
    return this.returnValue;
  }
  isValidDistance(): boolean { return true; }
  getName(): string { return 'MockDistanceMetric'; }
  
  setReturnValue(value: number): void {
    this.returnValue = value;
  }
}

describe('SD-07: 学習率動的調整＋更新スコープ配布', () => {
  let link: InterLayerRelativeJudgementLink<MockContext>;
  let mockDistanceMetric: MockDistanceMetric;
  let mockLearningRatePolicy: jest.Mocked<LearningRatePolicy<MockContext>>;
  let mockUpdateScopePolicy: jest.Mocked<UpdateScopePolicy<MockContext>>;
  let mockSkipPolicy: jest.Mocked<SkipPolicy<MockContext>>;

  beforeEach(() => {
    mockDistanceMetric = new MockDistanceMetric();
    
    mockLearningRatePolicy = {
      learningRate: jest.fn((_difference: RelativeDifference<MockContext>, _context: ContextInfo<MockContext>) => 
        new AdaptiveLearningRate(0.1, LearningRateOrigin.ADAPTIVE)
      ),
      isValid: jest.fn(() => true),
      getPolicyName: jest.fn(() => 'MockLearningRatePolicy')
    };

    mockUpdateScopePolicy = {
      scope: jest.fn((_difference: RelativeDifference<MockContext>, _context: ContextInfo<MockContext>) => 
        new UpdateScope(new Set(['param1', 'param2']))
      ),
      isValid: jest.fn(() => true),
      getPolicyName: jest.fn(() => 'MockUpdateScopePolicy')
    };

    mockSkipPolicy = {
      judgeSkip: jest.fn((_difference: RelativeDifference<MockContext>) => SkipEnum.PartialUpdate),
      isValid: jest.fn(() => true),
      getPolicyName: jest.fn(() => 'MockSkipPolicy')
    };

    link = new InterLayerRelativeJudgementLink<MockContext>(
      'upper-layer',
      'lower-layer',
      mockDistanceMetric,
      mockLearningRatePolicy,
      mockUpdateScopePolicy,
      mockSkipPolicy
    );
  });

  // === SD-07シーケンス図対応テストケース ===

  describe('学習率動的調整処理', () => {
    (DevelopOption.isExecute_SD_07_learning_rate_adjust ? test : test.skip)('正常系：差分に基づく適応学習率計算', () => {
      // シーケンス図 28-33行目: Link -> LrPolicy: 学習率(差分, 文脈)
      
      // 差分の大きさに応じて動的に学習率を調整するモック設定
      mockLearningRatePolicy.learningRate.mockImplementation(
        (difference: RelativeDifference<MockContext>, context: ContextInfo<MockContext>) => {
          // η=f(Δ): 差分の大きさに比例した学習率調整
          const dynamicRate = Math.min(0.1 + (difference.magnitude * 0.5), 1.0);
          return new AdaptiveLearningRate(dynamicRate, LearningRateOrigin.ADAPTIVE);
        }
      );

      const expectedPattern = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.5, 0.5]), new Set([Tag.create('test')]), new Map())
      );
      const actualPattern = new ActualPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.8, 0.3]), new Set([Tag.create('test')]), new Map())
      );

      const result = link.performComprehensiveJudgement(expectedPattern, actualPattern);

      // 学習率ポリシーが呼ばれたことを確認
      expect(mockLearningRatePolicy.learningRate).toHaveBeenCalledWith(
        result.referenceDifference,
        result.referenceDifference.contextInfo
      );

      // 動的調整された学習率を確認
      expect(result.learningRate.value).toBeGreaterThan(0.1);
      expect(result.learningRate.origin).toBe(LearningRateOrigin.ADAPTIVE);
    });
  });

  describe('更新スコープ配布処理', () => {
    (DevelopOption.isExecute_SD_07_scope_distribution ? test : test.skip)('正常系：差分と文脈に基づくスコープ生成', () => {
      // シーケンス図 35-40行目: Link -> ScopePolicy: 範囲(差分, 文脈)
      
      // 差分と文脈に基づいて動的にスコープを決定するモック設定
      mockUpdateScopePolicy.scope.mockImplementation(
        (difference: RelativeDifference<MockContext>, context: ContextInfo<MockContext>) => {
          // 差分の大きさに応じてスコープを調整
          const baseParams = ['param1', 'param2'];
          const additionalParams = difference.magnitude > 0.7 
            ? ['param3', 'param4', 'param5'] 
            : ['param3'];
          
          const allParams = [...baseParams, ...additionalParams];
          return new UpdateScope(new Set(allParams));
        }
      );

      const expectedPattern = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.2, 0.8]), new Set([Tag.create('scope_test')]), new Map())
      );
      const actualPattern = new ActualPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.9, 0.1]), new Set([Tag.create('scope_test')]), new Map())
      );

      const result = link.performComprehensiveJudgement(expectedPattern, actualPattern);

      // 更新スコープポリシーが呼ばれたことを確認
      expect(mockUpdateScopePolicy.scope).toHaveBeenCalledWith(
        result.referenceDifference,
        result.referenceDifference.contextInfo
      );

      // 差分の大きさに応じてスコープが決定されることを確認
      expect(result.updateScope.parameterIds.size).toBeGreaterThanOrEqual(3);
      expect(result.updateScope.parameterIds.has('param1')).toBe(true);
      expect(result.updateScope.parameterIds.has('param2')).toBe(true);
    });
  });

  describe('学習信号通知処理', () => {
    (DevelopOption.isExecute_SD_07_signal_notification ? test : test.skip)('正常系：適応学習率とスコープを統合した学習信号生成', () => {
      // シーケンス図 42-45行目: Link -> LearnSignal: new(...) -> 学習信号を通知
      
      // 動的学習率とスコープ配布の統合テスト
      mockLearningRatePolicy.learningRate.mockImplementation(
        (difference: RelativeDifference<MockContext>) => {
          const dynamicRate = 0.2 + (difference.magnitude * 0.3);
          return new AdaptiveLearningRate(dynamicRate, LearningRateOrigin.ADAPTIVE);
        }
      );

      mockUpdateScopePolicy.scope.mockImplementation(
        (difference: RelativeDifference<MockContext>) => {
          const paramCount = Math.min(Math.floor(difference.magnitude * 10) + 2, 8);
          const params = Array.from({length: paramCount}, (_, i) => `dynamic_param_${i + 1}`);
          return new UpdateScope(new Set(params));
        }
      );

      const expectedPattern = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.1, 0.4]), new Set([Tag.create('signal_test')]), new Map())
      );
      const actualPattern = new ActualPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.7, 0.9]), new Set([Tag.create('signal_test')]), new Map())
      );

      const result = link.performComprehensiveJudgement(expectedPattern, actualPattern);

      // 学習信号を生成（シーケンス図 42-43行目）
      const learningSignal = new LearningSignal<MockContext>(
        result.learningRate,
        result.referenceDifference,
        result.updateScope
      );

      // 学習信号の統合が正しく行われることを確認
      expect(learningSignal.adaptiveLearningRate).toBe(result.learningRate);
      expect(learningSignal.referenceDifference).toBe(result.referenceDifference);
      expect(learningSignal.updateTarget).toBe(result.updateScope);

      // 動的調整された値が統合されていることを確認
      expect(learningSignal.adaptiveLearningRate.value).toBeGreaterThan(0.2);
      expect(learningSignal.updateTarget.parameterIds.size).toBeGreaterThan(2);

      // 学習信号の通知可能性を確認（シーケンス図 45行目）
      expect(learningSignal).toBeInstanceOf(LearningSignal);
      expect(() => {
        // 学習信号を通知する処理のシミュレーション
        const notification = {
          signal: learningSignal,
          timestamp: Date.now(),
          source: 'SD-07_test'
        };
        expect(notification.signal).toBe(learningSignal);
      }).not.toThrow();
    });
  });
});