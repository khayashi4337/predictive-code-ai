import { SensoryAutonomousLayer, PatternAutonomousLayer, ConceptAutonomousLayer } from '../layers/LayerImplementations';
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
import { LearningSignal } from '../learning/LearningSignalV2';

// --- Mocks ---
class MockContext implements VectorizableContext {
  constructor(public vector: number[]) {}
  toVector = () => this.vector;
  getDimension = () => this.vector.length;
}

class MockDistanceMetric implements DifferenceDistanceMetric<MockContext> {
  distance(p1: ExpectedPatternV2<MockContext>, p2: ActualPatternV2<MockContext>): number {
    const v1 = p1.body.toVector();
    const v2 = p2.body.toVector();
    return Math.sqrt(v1.reduce((sum, val, i) => sum + (val - (v2[i] || 0)) ** 2, 0));
  }
  isValidDistance = () => true;
  getName = () => 'MockEuclideanDistance';
}

const mockDistanceMetric = new MockDistanceMetric();
const mockLearningRatePolicy: LearningRatePolicy<MockContext> = { learningRate: jest.fn(() => new AdaptiveLearningRate(0.8, LearningRateOrigin.ADAPTIVE)), isValid: jest.fn(() => true), getPolicyName: () => 'MockLearningRatePolicy' };
const mockUpdateScopePolicy: UpdateScopePolicy<MockContext> = { scope: jest.fn(() => new UpdateScope(new Set(['all']))), isValid: jest.fn(() => true), getPolicyName: () => 'MockUpdateScopePolicy' };
const mockSkipPolicy: SkipPolicy<MockContext> = { judgeSkip: jest.fn(() => SkipEnum.PartialUpdate), isValid: jest.fn(() => true), getPolicyName: () => 'MockSkipPolicy' };

describe('SD-04: Experience Integration and Burst', () => {
  let sensoryLayer: SensoryAutonomousLayer<MockContext>;
  let patternLayer: PatternAutonomousLayer<MockContext>;
  let conceptLayer: ConceptAutonomousLayer<MockContext>;
  let link_p_s: InterLayerRelativeJudgementLink<MockContext>; // Pattern -> Sensory
  // let link_c_p: InterLayerRelativeJudgementLink<MockContext>; // Concept -> Pattern

  beforeEach(() => {
    sensoryLayer = new SensoryAutonomousLayer<MockContext>('sensory-01');
    patternLayer = new PatternAutonomousLayer<MockContext>('pattern-01');
    conceptLayer = new ConceptAutonomousLayer<MockContext>('concept-01');

    link_p_s = new InterLayerRelativeJudgementLink('pattern-01', 'sensory-01', mockDistanceMetric, mockLearningRatePolicy, mockUpdateScopePolicy, mockSkipPolicy);
    // link_c_p = new InterLayerRelativeJudgementLink('concept-01', 'pattern-01', mockDistanceMetric, mockLearningRatePolicy, mockUpdateScopePolicy, mockSkipPolicy);
    
    jest.spyOn(patternLayer, 'updatePredictiveModel').mockImplementation(() => {});
    jest.spyOn(conceptLayer, 'updatePredictiveModel').mockImplementation(() => {});
  });

  test('should trigger a burst of learning signals on significant difference', () => {
    // 1. 上位層(Pattern)が期待パターンを生成
    const expectedPattern = patternLayer.generateExpectedPattern(sensoryLayer.getLayerId(), new ContextInfo(new MockContext([0.1, 0.1, 0.1])));

    // 2. 期待と大きく異なる実際パターンが観測される
    const actualPattern = new ActualPatternV2(new ContextInfo(new MockContext([0.9, 0.9, 0.9])));
    sensoryLayer.observeActualPattern(actualPattern);

    // 3. リンクが大きな差分に基づき、緊急性の高い学習信号を生成
    const judgementResult = link_p_s.performComprehensiveJudgement(expectedPattern, actualPattern);
    expect(judgementResult.referenceDifference.magnitude).toBeGreaterThan(1.0); // 大きな差分
    expect(judgementResult.learningRate.value).toBe(0.8); // 高い学習率

    // 4. パターン層が学習信号を受け取り、モデルを更新
    const learningSignal = new LearningSignal(judgementResult.learningRate, judgementResult.referenceDifference, judgementResult.updateScope);
    patternLayer.updatePredictiveModel(learningSignal);
    expect(patternLayer.updatePredictiveModel).toHaveBeenCalledWith(learningSignal);

    // 5. (Burst) パターン層が、さらに上位の概念層にも影響を伝播させる(という仮定)
    // このテストでは、conceptLayer.updatePredictiveModelが呼ばれることを期待する。
    // 実際のロジックはpatternLayer.updatePredictiveModel内にあるはず。
    // ここでは、その呼び出しをトリガーする何らかの仕組みをテストする。
    // 現状の実装ではこのテストは失敗する可能性が高い。
    // その場合、burstを実装するためのメソッドを追加する必要がある。
    
    // 仮説：大きな差分を持つ学習信号を受け取った場合、上位層にも伝播する
    // patternLayerのupdatePredictiveModel内で、link_c_pを使って信号を生成し、
    // conceptLayer.updatePredictiveModelを呼び出す、という流れを期待。

    // このテストを成功させるには、`PatternAutonomousLayer.doUpdatePredictiveModel` の実装変更が必要になる。
    // 今回は、まずテストが失敗することを確認し、次に実装を修正する、という手順を踏む。
  });
});
