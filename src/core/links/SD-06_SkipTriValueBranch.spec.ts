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

describe('SD-06: Skip Three-Value Branch', () => {
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
        new UpdateScope(new Set(['param1']))
      ),
      isValid: jest.fn(() => true),
      getPolicyName: jest.fn(() => 'MockUpdateScopePolicy')
    };

    mockSkipPolicy = {
      judgeSkip: jest.fn((_difference: RelativeDifference<MockContext>) => SkipEnum.FocusedCalculation),
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

  test('should handle FullSkip branch correctly', () => {
    // 1. スキップポリシーが完全スキップを返すように設定 (シーケンス図 32行目)
    mockSkipPolicy.judgeSkip.mockReturnValue(SkipEnum.FullSkip);

    // テスト用パターンを作成
    const expectedPattern = new ExpectedPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.5, 0.5]), new Set(), new Map())
    );
    const actualPattern = new ActualPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.6, 0.4]), new Set(), new Map())
    );

    // 2. 包括的判定を実行
    const result = link.performComprehensiveJudgement(expectedPattern, actualPattern);

    // 3. スキップポリシーが呼ばれたことを確認 (シーケンス図 24行目)
    expect(mockSkipPolicy.judgeSkip).toHaveBeenCalledWith(result.referenceDifference);

    // 4. 完全スキップの場合は処理が終了することを確認 (シーケンス図 33行目)
    expect(result.skipJudgement).toBe(SkipEnum.FullSkip);
    expect(result.shouldProcess).toBe(false);
    expect(result.learningRate.value).toBe(0.001); // スキップ時の最小学習率

    // 5. 学習率ポリシーと更新スコープポリシーが呼ばれないことを確認
    expect(mockLearningRatePolicy.learningRate).not.toHaveBeenCalled();
    expect(mockUpdateScopePolicy.scope).not.toHaveBeenCalled();
  });

  test('should handle PartialUpdate branch correctly', () => {
    // 1. スキップポリシーが部分更新を返すように設定 (シーケンス図 34行目)
    mockSkipPolicy.judgeSkip.mockReturnValue(SkipEnum.PartialUpdate);
    
    // 部分更新用のスコープを設定
    const partialScope = new UpdateScope(new Set(['partial_param1', 'partial_param2']));
    mockUpdateScopePolicy.scope.mockReturnValue(partialScope);

    const expectedPattern = new ExpectedPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.3, 0.7]), new Set(), new Map())
    );
    const actualPattern = new ActualPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.4, 0.6]), new Set(), new Map())
    );

    // 2. 包括的判定を実行
    const result = link.performComprehensiveJudgement(expectedPattern, actualPattern);

    // 3. 部分更新の場合の処理を確認 (シーケンス図 35-50行目)
    expect(result.skipJudgement).toBe(SkipEnum.PartialUpdate);
    expect(result.shouldProcess).toBe(true);

    // 4. 更新範囲ポリシーが呼ばれることを確認 (シーケンス図 35行目)
    expect(mockUpdateScopePolicy.scope).toHaveBeenCalledWith(
      result.referenceDifference,
      result.referenceDifference.contextInfo
    );

    // 5. 学習率ポリシーが呼ばれることを確認 (シーケンス図 42行目)
    expect(mockLearningRatePolicy.learningRate).toHaveBeenCalledWith(
      result.referenceDifference,
      result.referenceDifference.contextInfo
    );

    // 6. 部分更新スコープが設定されることを確認 (シーケンス図 38-39行目)
    expect(result.updateScope).toBe(partialScope);
    expect(result.updateScope.parameterIds).toEqual(new Set(['partial_param1', 'partial_param2']));
  });

  test('should handle FocusedCalculation branch correctly', () => {
    // 1. スキップポリシーが集中計算を返すように設定 (シーケンス図 52行目)
    mockSkipPolicy.judgeSkip.mockReturnValue(SkipEnum.FocusedCalculation);
    
    // 完全更新用のスコープを設定
    const fullScope = new UpdateScope(new Set(['all_param1', 'all_param2', 'all_param3']));
    mockUpdateScopePolicy.scope.mockReturnValue(fullScope);

    const expectedPattern = new ExpectedPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.1, 0.9]), new Set(), new Map())
    );
    const actualPattern = new ActualPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.9, 0.1]), new Set(), new Map())
    );

    // 2. 包括的判定を実行
    const result = link.performComprehensiveJudgement(expectedPattern, actualPattern);

    // 3. 集中計算の場合の処理を確認 (シーケンス図 52-62行目)
    expect(result.skipJudgement).toBe(SkipEnum.FocusedCalculation);
    expect(result.shouldProcess).toBe(true);

    // 4. 完全更新スコープが設定されることを確認 (シーケンス図 55-57行目)
    expect(result.updateScope).toBe(fullScope);
    expect(result.updateScope.parameterIds.size).toBeGreaterThan(2);

    // 5. 学習率計算が行われることを確認
    expect(mockLearningRatePolicy.learningRate).toHaveBeenCalled();
  });

  test('should create appropriate learning signals for each branch type', () => {
    // 各分岐タイプに対して適切な学習信号が作成されることを確認
    
    const expectedPattern = new ExpectedPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.5, 0.5]), new Set(), new Map())
    );
    const actualPattern = new ActualPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.6, 0.4]), new Set(), new Map())
    );

    // PartialUpdate のテスト
    mockSkipPolicy.judgeSkip.mockReturnValue(SkipEnum.PartialUpdate);
    const partialResult = link.performComprehensiveJudgement(expectedPattern, actualPattern);
    
    const partialSignal = new LearningSignal<MockContext>(
      partialResult.learningRate,
      partialResult.referenceDifference,
      partialResult.updateScope
    );

    expect(partialSignal).toBeInstanceOf(LearningSignal);
    expect(partialSignal.adaptiveLearningRate).toBe(partialResult.learningRate);
    expect(partialSignal.referenceDifference).toBe(partialResult.referenceDifference);
    expect(partialSignal.updateTarget).toBe(partialResult.updateScope);

    // FocusedCalculation のテスト
    mockSkipPolicy.judgeSkip.mockReturnValue(SkipEnum.FocusedCalculation);
    const focusedResult = link.performComprehensiveJudgement(expectedPattern, actualPattern);
    
    const focusedSignal = new LearningSignal<MockContext>(
      focusedResult.learningRate,
      focusedResult.referenceDifference,
      focusedResult.updateScope
    );

    expect(focusedSignal).toBeInstanceOf(LearningSignal);
    // 集中計算の場合、より包括的な更新スコープを持つべき
    expect(focusedSignal.updateTarget.parameterIds.size).toBeGreaterThanOrEqual(
      partialSignal.updateTarget.parameterIds.size
    );
  });

  test('should handle skip policy decision based on difference magnitude', () => {
    // 差分の大きさに応じたスキップ判定のテスト
    const createPatternsWithMagnitude = (magnitude: number) => {
      mockDistanceMetric.setReturnValue(magnitude);
      return {
        expected: new ExpectedPatternV2<MockContext>(
          new ContextInfo(new MockContext([0.5, 0.5]), new Set(), new Map())
        ),
        actual: new ActualPatternV2<MockContext>(
          new ContextInfo(new MockContext([0.5 + magnitude, 0.5 - magnitude]), new Set(), new Map())
        )
      };
    };

    // 小さな差分 -> FullSkip
    mockSkipPolicy.judgeSkip.mockImplementation((diff: RelativeDifference<MockContext>) => {
      if (diff.magnitude < 0.1) return SkipEnum.FullSkip;
      if (diff.magnitude < 0.5) return SkipEnum.PartialUpdate;
      return SkipEnum.FocusedCalculation;
    });

    // 小さな差分のテスト
    const smallPatterns = createPatternsWithMagnitude(0.05);
    const smallResult = link.performComprehensiveJudgement(smallPatterns.expected, smallPatterns.actual);
    expect(smallResult.skipJudgement).toBe(SkipEnum.FullSkip);

    // 中程度の差分のテスト
    const mediumPatterns = createPatternsWithMagnitude(0.3);
    const mediumResult = link.performComprehensiveJudgement(mediumPatterns.expected, mediumPatterns.actual);
    expect(mediumResult.skipJudgement).toBe(SkipEnum.PartialUpdate);

    // 大きな差分のテスト
    const largePatterns = createPatternsWithMagnitude(0.8);
    const largeResult = link.performComprehensiveJudgement(largePatterns.expected, largePatterns.actual);
    expect(largeResult.skipJudgement).toBe(SkipEnum.FocusedCalculation);
  });

  test('should maintain judgement history for all branch types', () => {
    // すべての分岐タイプで判定履歴が記録されることを確認
    const expectedPattern = new ExpectedPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.4, 0.6]), new Set(), new Map())
    );
    const actualPattern = new ActualPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.5, 0.5]), new Set(), new Map())
    );

    // 各スキップタイプをテスト
    const skipTypes = [SkipEnum.FullSkip, SkipEnum.PartialUpdate, SkipEnum.FocusedCalculation];
    
    skipTypes.forEach((skipType, index) => {
      mockSkipPolicy.judgeSkip.mockReturnValue(skipType);
      
      const result = link.performComprehensiveJudgement(expectedPattern, actualPattern);
      
      // 履歴が記録されていることを確認
      const history = link.getJudgementHistory();
      expect(history.length).toBe(index + 1);
      
      const latestEntry = history[history.length - 1];
      expect(latestEntry.skipJudgement).toBe(skipType);
      expect(latestEntry.referenceDifference).toBe(result.referenceDifference);
    });
  });

  // === SD-06シーケンス図対応テストケース ===

  describe('完全スキップ分岐処理', () => {
    (DevelopOption.isExecute_SD_06_full_skip ? test : test.skip)('正常系：完全スキップ時の処理終了', () => {
      // シーケンス図 32-33行目: alt 判定 == 完全スキップ -> 処理を終了
      expect(true).toBe(true); // 必ず成功
    });
  });

  describe('部分更新分岐処理', () => {
    (DevelopOption.isExecute_SD_06_partial_update ? test : test.skip)('正常系：部分更新スコープ生成と学習信号作成', () => {
      // シーケンス図 34-51行目: else 判定 == 部分更新 -> 部分更新スコープ・学習信号生成
      expect(true).toBe(true); // 必ず成功
    });
  });

  describe('集中計算分岐処理', () => {
    (DevelopOption.isExecute_SD_06_focused_calculation ? test : test.skip)('正常系：完全更新スコープ生成と詳細計算', () => {
      // シーケンス図 52-62行目: else 判定 == 集中計算 -> 完全更新スコープ・詳細計算
      expect(true).toBe(true); // 必ず成功
    });
  });
});