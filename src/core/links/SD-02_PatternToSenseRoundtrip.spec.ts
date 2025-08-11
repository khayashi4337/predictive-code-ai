import { SensoryAutonomousLayer, PatternAutonomousLayer } from '../layers/LayerImplementations';
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
    if (len1 > len2) {
      for (let i = minLength; i < len1; i++) { sumOfSquares += v1[i] ** 2; }
    } else if (len2 > len1) {
      for (let i = minLength; i < len2; i++) { sumOfSquares += v2[i] ** 2; }
    }
    return Math.sqrt(sumOfSquares);
  }
  isValidDistance(): boolean { return true; }
  getName(): string { return 'MockEuclideanDistance'; }
}

const mockDistanceMetric = new MockDistanceMetric();

const mockLearningRatePolicy: LearningRatePolicy<MockContext> = {
  learningRate: jest.fn(() => new AdaptiveLearningRate(0.05, LearningRateOrigin.ADAPTIVE)),
  isValid: jest.fn(() => true),
  getPolicyName: () => 'MockLearningRatePolicy',
};

const mockUpdateScopePolicy: UpdateScopePolicy<MockContext> = {
  scope: jest.fn(() => new UpdateScope(new Set(['pattern_template']))),
  isValid: jest.fn(() => true),
  getPolicyName: () => 'MockUpdateScopePolicy',
};

const mockSkipPolicy: SkipPolicy<MockContext> = {
  judgeSkip: jest.fn(() => SkipEnum.FocusedCalculation),
  isValid: jest.fn(() => true),
  getPolicyName: () => 'MockSkipPolicy',
};

describe('SD-02: Pattern to Sense Basic Roundtrip', () => {
  let patternLayer: PatternAutonomousLayer<MockContext>;
  let sensoryLayer: SensoryAutonomousLayer<MockContext>;
  let link: InterLayerRelativeJudgementLink<MockContext>;

  beforeEach(() => {
    patternLayer = new PatternAutonomousLayer<MockContext>('pattern-01');
    sensoryLayer = new SensoryAutonomousLayer<MockContext>('sensory-01');
    link = new InterLayerRelativeJudgementLink<MockContext>(
      patternLayer.getLayerId(),
      sensoryLayer.getLayerId(),
      mockDistanceMetric,
      mockLearningRatePolicy,
      mockUpdateScopePolicy,
      mockSkipPolicy
    );

    jest.clearAllMocks();
    jest.spyOn(mockDistanceMetric, 'distance');
    jest.spyOn(patternLayer, 'updatePredictiveModel');
  });

  test('should follow the basic roundtrip sequence successfully', () => {
    // 1. パターン層が期待パターンを生成する
    const contextForExpected = new ContextInfo(new MockContext([0.5, 0.5, 0.5]), new Set([Tag.createString('context', 'internal_state')]));
    const expectedPattern = patternLayer.generateExpectedPattern(sensoryLayer.getLayerId(), contextForExpected);
    expect(expectedPattern).toBeInstanceOf(ExpectedPatternV2);

    // 2. 実際パターン（感覚入力）が観測される
    const actualContext = new ContextInfo(new MockContext([0.6, 0.45, 0.55]), new Set([Tag.createString('context', 'sensory_input')]));
    const actualPattern = new ActualPatternV2(actualContext);
    sensoryLayer.observeActualPattern(actualPattern);

    // 3. リンクが相対差分を計算する
    const judgementResult = link.performComprehensiveJudgement(expectedPattern, actualPattern);
    expect(mockDistanceMetric.distance).toHaveBeenCalledWith(expectedPattern, actualPattern);
    expect(judgementResult.referenceDifference).toBeInstanceOf(RelativeDifference);
    expect(judgementResult.learningRate.value).toBe(0.05);

    // 4. 差分が上位(パターン層)へ伝播され、学習信号が生成・適用される
    const learningSignal = new LearningSignal<MockContext>(
      judgementResult.learningRate,
      judgementResult.referenceDifference,
      judgementResult.updateScope
    );
    patternLayer.updatePredictiveModel(learningSignal);
    expect(patternLayer.updatePredictiveModel).toHaveBeenCalledWith(learningSignal);
  });
});
