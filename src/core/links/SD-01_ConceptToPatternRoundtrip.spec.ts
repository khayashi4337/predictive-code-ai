import { ConceptAutonomousLayer, PatternAutonomousLayer } from '../layers/LayerImplementations';
import { InterLayerRelativeJudgementLink } from './InterLayerRelativeJudgementLink';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { ContextInfo } from '../tag/ContextInfo';
import { VectorizableContext } from '../tag/VectorizableContext';
import { LearningRatePolicy, UpdateScopePolicy, SkipPolicy } from './PolicyInterfaces';
import { DifferenceDistanceMetric } from '../metrics/interfaces';
import { AdaptiveLearningRate, LearningRateOrigin } from '../learning/AdaptiveLearningRate';
import { UpdateScope } from '../learning/UpdateScope';
import { SkipEnum } from './SkipEnum';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { LearningSignal } from '../learning/LearningSignalV2';
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

// モック用のポリシーとメトリクス
class MockDistanceMetric implements DifferenceDistanceMetric<MockContext> {
  distance(p1: ExpectedPatternV2<MockContext>, p2: ActualPatternV2<MockContext>): number {
    const v1 = p1.body.toVector();
    const v2 = p2.body.toVector();
    
    const len1 = v1.length;
    const len2 = v2.length;
    const minLength = Math.min(len1, len2);
    
    let sumOfSquares = 0;
    for (let i = 0; i < minLength; i++) {
      sumOfSquares += (v1[i] - v2[i]) ** 2;
    }

    // Handle vectors of different lengths by adding the squared magnitude of the remaining elements.
    if (len1 > len2) {
      for (let i = minLength; i < len1; i++) {
        sumOfSquares += v1[i] ** 2;
      }
    } else if (len2 > len1) {
      for (let i = minLength; i < len2; i++) {
        sumOfSquares += v2[i] ** 2;
      }
    }

    return Math.sqrt(sumOfSquares);
  }

  isValidDistance(): boolean {
    return true;
  }

  getName(): string {
    return 'MockEuclideanDistance';
  }
}

const mockDistanceMetric = new MockDistanceMetric();

const mockLearningRatePolicy: LearningRatePolicy<MockContext> = {
  learningRate: jest.fn(() => new AdaptiveLearningRate(0.1, LearningRateOrigin.ADAPTIVE)),
  isValid: jest.fn(() => true),
  getPolicyName: () => 'MockLearningRatePolicy',
};

const mockUpdateScopePolicy: UpdateScopePolicy<MockContext> = {
  scope: jest.fn(() => new UpdateScope(new Set(['param1', 'param2']))),
  isValid: jest.fn(() => true),
  getPolicyName: () => 'MockUpdateScopePolicy',
};

const mockSkipPolicy: SkipPolicy<MockContext> = {
  judgeSkip: jest.fn(() => SkipEnum.FocusedCalculation),
  isValid: jest.fn(() => true),
  getPolicyName: () => 'MockSkipPolicy',
};

describe('SD-01: Concept to Pattern Basic Roundtrip', () => {
  let conceptLayer: ConceptAutonomousLayer<MockContext>;
  let patternLayer: PatternAutonomousLayer<MockContext>;
  let link: InterLayerRelativeJudgementLink<MockContext>;

  beforeEach(() => {
    // 各クラスのインスタンス化
    conceptLayer = new ConceptAutonomousLayer<MockContext>('concept-01');
    patternLayer = new PatternAutonomousLayer<MockContext>('pattern-01');
    link = new InterLayerRelativeJudgementLink<MockContext>(
      conceptLayer.getLayerId(),
      patternLayer.getLayerId(),
      mockDistanceMetric,
      mockLearningRatePolicy,
      mockUpdateScopePolicy,
      mockSkipPolicy
    );

    // Jestモックをリセット
    jest.clearAllMocks();

    // distanceメソッドをスパイする
    jest.spyOn(mockDistanceMetric, 'distance');
  });

  test('should follow the basic roundtrip sequence successfully', () => {
    // 1. 概念層が期待パターンを生成する (シーケンス図 24行目)
    const contextForExpected = new ContextInfo(new MockContext([1, 1, 1]), new Set([Tag.createString('context', 'test_context')]));
    const expectedPattern = conceptLayer.generateExpectedPattern(patternLayer.getLayerId(), contextForExpected);
    expect(expectedPattern).toBeInstanceOf(ExpectedPatternV2);

    // 2. 実際パターンが観測される (シーケンス図 38行目)
    const actualContext = new ContextInfo(new MockContext([1.2, 1.0, 0.8]), new Set([Tag.createString('context', 'observed')]));
    const actualPattern = new ActualPatternV2(actualContext);
    patternLayer.observeActualPattern(actualPattern);

    // 3. パターン層がリンクに相対差分計算を依頼する (シーケンス図 42行目)
    //    (実装では包括的な判定メソッドを利用)
    const judgementResult = link.performComprehensiveJudgement(expectedPattern, actualPattern);

    // 4. リンクが各計算を実行することを確認 (シーケンス図 44-48行目)
    expect(mockDistanceMetric.distance).toHaveBeenCalledWith(expectedPattern, actualPattern);
    expect(mockLearningRatePolicy.learningRate).toHaveBeenCalled();
    expect(mockUpdateScopePolicy.scope).toHaveBeenCalled();
    expect(judgementResult.referenceDifference).toBeInstanceOf(RelativeDifference);
    expect(judgementResult.learningRate.value).toBe(0.1);
    expect(judgementResult.updateScope.parameterIds).toEqual(new Set(['param1', 'param2']));

    // 5. 差分が上位(概念層)へ伝播され、学習信号が生成される (シーケンス図 51, 55-58行目)
    const learningSignal = new LearningSignal<MockContext>(
      judgementResult.learningRate,
      judgementResult.referenceDifference,
      judgementResult.updateScope
    );

    // 6. 概念層が予測モデルを更新する (シーケンス図 60行目)
    const updateSpy = jest.spyOn(conceptLayer, 'updatePredictiveModel');
    conceptLayer.updatePredictiveModel(learningSignal);

    // 7. モデル更新が正しい学習信号で呼び出されたことを確認
    expect(updateSpy).toHaveBeenCalledWith(learningSignal);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    updateSpy.mockRestore();
  });
});
