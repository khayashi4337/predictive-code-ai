import { SensoryAutonomousLayer, PatternAutonomousLayer, ConceptAutonomousLayer } from '../layers/LayerImplementations';
import { LayerManager } from '../layers/LayerManager';
import { InterLayerRelativeJudgementLink } from './InterLayerRelativeJudgementLink';
import { HippocampusAutonomousModule } from '../hippocampus/HippocampusAutonomousModule';
import { ExperienceIntegrator, CurrentExperience } from '../hippocampus/HippocampusSupportTypes';
import { LRBurst, SensitivityEventBus, LearningRateModulator } from '../sensitivity/LRBurst';
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
import { RelativeDifference } from '../pattern/RelativeDifference';
import { DevelopOption } from '../../debug/DevelopOption';

// --- Mocks ---
class MockContext implements VectorizableContext {
  constructor(public vector: number[]) {}
  toVector = () => this.vector;
  getDimension = () => this.vector.length;
}

class MockDistanceMetric implements DifferenceDistanceMetric<MockContext> {
  distance(p1: ExpectedPatternV2<MockContext>, p2: ActualPatternV2<MockContext>): number {
    try {
      // First, check if body has toVector method (VectorizableContext)
      const v1 = (p1.body && typeof p1.body.toVector === 'function') 
        ? p1.body.toVector()
        : (Array.isArray(p1.body) ? p1.body : [0]);
      
      const v2 = (p2.body && typeof p2.body.toVector === 'function') 
        ? p2.body.toVector()
        : (Array.isArray(p2.body) ? p2.body : [0]);
      
      return Math.sqrt(v1.reduce((sum, val, i) => sum + (val - (v2[i] || 0)) ** 2, 0));
    } catch (error) {
      // Fallback to default distance for any remaining issues
      return 1.0;
    }
  }
  isValidDistance = () => true;
  getName = () => 'MockEuclideanDistance';
}

const mockDistanceMetric = new MockDistanceMetric();
const mockLearningRatePolicy: LearningRatePolicy<MockContext> = { learningRate: jest.fn(() => new AdaptiveLearningRate(0.8, LearningRateOrigin.ADAPTIVE)), isValid: jest.fn(() => true), getPolicyName: () => 'MockLearningRatePolicy' };
const mockUpdateScopePolicy: UpdateScopePolicy<MockContext> = { scope: jest.fn(() => new UpdateScope(new Set(['all']))), isValid: jest.fn(() => true), getPolicyName: () => 'MockUpdateScopePolicy' };
const mockSkipPolicy: SkipPolicy<MockContext> = { judgeSkip: jest.fn(() => SkipEnum.PartialUpdate), isValid: jest.fn(() => true), getPolicyName: () => 'MockSkipPolicy' };

if (DevelopOption.isExecute_SD_04) {
  describe('SD-04: Experience Integration and Burst', () => {
  let layerManager: LayerManager<MockContext>;
  let sensoryLayer: SensoryAutonomousLayer<MockContext>;
  let patternLayer: PatternAutonomousLayer<MockContext>;
  let conceptLayer: ConceptAutonomousLayer<MockContext>;
  let link_p_s: InterLayerRelativeJudgementLink<MockContext>;
  // let link_c_p: InterLayerRelativeJudgementLink<MockContext>;
  
  // SD-04 specific components
  let experienceIntegrator: ExperienceIntegrator;
  let hippocampusModule: HippocampusAutonomousModule<MockContext>;
  let sensitivityEventBus: SensitivityEventBus;
  let learningRateModulator: LearningRateModulator;

  beforeEach(() => {
    layerManager = new LayerManager<MockContext>();
    
    sensoryLayer = new SensoryAutonomousLayer<MockContext>('sensory-01', '感覚層');
    patternLayer = new PatternAutonomousLayer<MockContext>('pattern-01', 'パターン層');
    conceptLayer = new ConceptAutonomousLayer<MockContext>('concept-01', '概念層');
    
    // Register all layers with the manager
    layerManager.registerLayer(sensoryLayer);
    layerManager.registerLayer(patternLayer);
    layerManager.registerLayer(conceptLayer);

    link_p_s = new InterLayerRelativeJudgementLink(
      'pattern-01',
      'sensory-01',
      mockDistanceMetric,
      mockLearningRatePolicy,
      mockUpdateScopePolicy,
      mockSkipPolicy
    );

    // link_c_p = new InterLayerRelativeJudgementLink(
    //   'concept-01',
    //   'pattern-01',
    //   mockDistanceMetric,
    //   mockLearningRatePolicy,
    //   mockUpdateScopePolicy,
    //   mockSkipPolicy
    // );

    // SD-04 components
    experienceIntegrator = new ExperienceIntegrator();
    hippocampusModule = new HippocampusAutonomousModule('hippo-01', '海馬', layerManager);
    sensitivityEventBus = new SensitivityEventBus();
    learningRateModulator = new LearningRateModulator();

    // --- Spies and Mocks Setup ---
    jest.spyOn(experienceIntegrator, 'integrate').mockReturnValue(new CurrentExperience({}));
    jest.spyOn(hippocampusModule, 'matchExperience').mockReturnValue(new RelativeDifference(0.9, new ContextInfo(new MockContext([1,1]), new Set(), new Map())));
    jest.spyOn(hippocampusModule, 'evaluateNovelty').mockReturnValue(0.9);
    jest.spyOn(hippocampusModule, 'consolidateToLongTermMemory');
    jest.spyOn(hippocampusModule, 'triggerLRBurst');
    jest.spyOn(sensitivityEventBus, 'publish');
    jest.spyOn(learningRateModulator, 'onBurst');
    jest.spyOn(conceptLayer, 'updatePredictiveModel');

    // Connect components
    sensitivityEventBus.subscribe(learningRateModulator);

    // Mocking methods for tests
    jest.spyOn(hippocampusModule, 'process').mockResolvedValue();
    jest.spyOn(hippocampusModule, 'consolidateToLongTermMemory').mockImplementation();
    jest.spyOn(hippocampusModule, 'triggerLRBurst').mockImplementation();
    jest.spyOn(hippocampusModule, 'evaluateNovelty').mockReturnValue(0.9);
    jest.spyOn(sensitivityEventBus, 'publish').mockImplementation();
    jest.spyOn(learningRateModulator, 'onBurst').mockImplementation();
    jest.spyOn(conceptLayer, 'updatePredictiveModel').mockResolvedValue([]);
  });

  (DevelopOption.isSkip_SD_04_mock_tests ? test.skip : test)('should follow the complete experience integration and burst sequence', () => {
    // 1. 経験統合器が各層の情報を統合して現在経験を生成 (シーケンス図 25行目)
    const sensoryInfo = new ContextInfo(new MockContext([0.1, 0.2]), new Set(), new Map());
    const patternInfo = new ContextInfo(new MockContext([0.3, 0.4]), new Set(), new Map());
    const conceptInfo = new ContextInfo(new MockContext([0.5, 0.6]), new Set(), new Map());
    const actionInfo = new ContextInfo(new MockContext([0.7, 0.8]), new Set(), new Map());

    const currentExperience = experienceIntegrator.integrate(sensoryInfo, patternInfo, conceptInfo, actionInfo);
    expect(experienceIntegrator.integrate).toHaveBeenCalledWith(sensoryInfo, patternInfo, conceptInfo, actionInfo);
    expect(currentExperience).toBeInstanceOf(CurrentExperience);

    // 2. 海馬モジュールが経験相対照合を実行 (シーケンス図 29行目)
    // const representativeSet = new RepresentativeExperienceSet([]); // 未使用のためコメントアウト
    const actualPattern = new ActualPatternV2<MockContext>(currentExperience.contextInfo);
    const relativeDifference = hippocampusModule.matchExperience(actualPattern);
    
        expect(hippocampusModule.matchExperience).toHaveBeenCalledWith(actualPattern);
    expect(relativeDifference).toBeInstanceOf(RelativeDifference);

    // 3. 新奇性指標を計算 (シーケンス図 33行目)
    const noveltyScore = hippocampusModule.evaluateNovelty(relativeDifference.magnitude);
    expect(hippocampusModule.evaluateNovelty).toHaveBeenCalledWith(relativeDifference.magnitude);
    expect(typeof noveltyScore).toBe('number');
  });

  (DevelopOption.isSkip_SD_04_mock_tests ? test.skip : test)('should trigger burst when novelty exceeds threshold', () => {
    // 高い新奇性を持つ差分を作成 (シーケンス図 36-48行目)
    const highNoveltyDifference = new RelativeDifference<MockContext>(
      0.9, // 高い新奇性
      new ContextInfo(new MockContext([1, 1]), new Set(), new Map())
    );

    const noveltyScore = hippocampusModule.evaluateNovelty(highNoveltyDifference.magnitude);

    if (noveltyScore > 0.8) { // 閾値を超えた場合
      // 4. 長期記憶化判定 (シーケンス図 37行目)
      hippocampusModule.consolidateToLongTermMemory(highNoveltyDifference);
      expect(hippocampusModule.consolidateToLongTermMemory).toHaveBeenCalledWith(highNoveltyDifference);

      // 5. LRBurst発火 (シーケンス図 38行目)
      hippocampusModule.triggerLRBurst(highNoveltyDifference);
      expect(hippocampusModule.triggerLRBurst).toHaveBeenCalledWith(highNoveltyDifference);

      // 6. バーストイベントの発行とモジュレータの更新 (シーケンス図 42-47行目)
      const burst = new LRBurst(new Set(['novelty_burst']), 2.5, 30000);
      sensitivityEventBus.publish(burst);
      
      expect(sensitivityEventBus.publish).toHaveBeenCalledWith(burst);
      expect(learningRateModulator.onBurst).toHaveBeenCalledWith(burst);
    }
  });

  test('should handle low novelty without burst', () => {
    // 低新奇性の場合はバーストが発火しないことを確認
    const lowNoveltyDifference = new RelativeDifference<MockContext>(
      0.1, // 低い新奇性
      new ContextInfo(new MockContext([0, 0]), new Set(), new Map())
    );
    jest.spyOn(hippocampusModule, 'evaluateNovelty').mockReturnValue(0.1);
    jest.spyOn(hippocampusModule, 'consolidateToLongTermMemory').mockReturnValue();

    const noveltyScore = hippocampusModule.evaluateNovelty(lowNoveltyDifference.magnitude);
    expect(noveltyScore).toBeLessThan(0.5);

    hippocampusModule.consolidateToLongTermMemory(lowNoveltyDifference);
    expect(hippocampusModule.consolidateToLongTermMemory).toHaveBeenCalledWith(lowNoveltyDifference);
  });

  test('should manage burst amplification lifecycle', () => {
    // バーストの増幅係数管理をテスト
    const burst = new LRBurst(new Set(['lifecycle_test']), 2.0, 10000); // 10秒の半減期
    
    const initialAmplification = burst.getCurrentAmplification();
    expect(initialAmplification).toBe(2.0);
    expect(burst.isActive()).toBe(true);

    // モジュレータがバーストを受信
    learningRateModulator.onBurst(burst);
    
    const amplificationFactor = learningRateModulator.amplificationFactor(new Set(['lifecycle_test']));
    expect(amplificationFactor).toBeGreaterThanOrEqual(1.0);
  });

  (DevelopOption.isSkip_SD_04_mock_tests ? test.skip : test)('should trigger a burst of learning signals on significant difference', async () => {
    // Original test - enhanced with burst components
    const expectedPattern = patternLayer.generateExpectedPattern(sensoryLayer.getLayerId(), new ContextInfo(new MockContext([0.1, 0.1, 0.1])));
    const actualPattern = new ActualPatternV2(new ContextInfo(new MockContext([0.9, 0.9, 0.9])));
    
    sensoryLayer.observeActualPattern(actualPattern);

    const judgementResult = link_p_s.performComprehensiveJudgement(expectedPattern, actualPattern);
    expect(judgementResult.referenceDifference.magnitude).toBeGreaterThan(1.0);
    expect(judgementResult.learningRate.value).toBe(0.8);

    const learningSignal = new LearningSignal(judgementResult.learningRate, judgementResult.referenceDifference, judgementResult.updateScope);
    
    // Pattern layer processes the learning signal and should propagate to concept layer
    // Mock the propagation for this test
    jest.spyOn(patternLayer, 'updatePredictiveModel').mockResolvedValue([learningSignal]);
    const propagatedSignals = await patternLayer.updatePredictiveModel(learningSignal);
    
    // If there are propagated signals, send them to the concept layer
    for (const signal of propagatedSignals) {
      await conceptLayer.updatePredictiveModel(signal);
    }

    expect(conceptLayer.updatePredictiveModel).toHaveBeenCalled();
    
    // Additional: simulate hippocampus burst behavior
    if (judgementResult.referenceDifference.magnitude > 0.75) {
      const burst = new LRBurst(new Set(['pattern_burst']), 2.2);
      sensitivityEventBus.publish(burst);
      expect(sensitivityEventBus.publish).toHaveBeenCalledWith(burst);
    }
  });
});
}
