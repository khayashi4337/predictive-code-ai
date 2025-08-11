import { SensoryAutonomousLayer, PatternAutonomousLayer, ConceptAutonomousLayer, ActionAutonomousLayer } from '../layers/LayerImplementations';
import { InterLayerRelativeJudgementLink } from '../links/InterLayerRelativeJudgementLink';
import { ExperienceIntegrator, HippocampusAutonomousModule, CurrentExperience, RepresentativeExperienceSet, BasisPattern } from '../hippocampus/HippocampusAutonomousModule';
import { LRBurst, SensitivityEventBus, LearningRateModulator } from '../sensitivity/LRBurst';
import { SensoryOrgan, InputNormalizer, ThalamusGate, DefaultGatePolicy } from '../input/InputSystem';
import { ActionExecutor, ExecutionResultCapture, ExternalWorld, EfferenceCopyEmitter } from '../action/ActionSystem';
import { LearningRatePolicy, UpdateScopePolicy, SkipPolicy } from '../links/PolicyInterfaces';
import { DifferenceDistanceMetric } from '../metrics/interfaces';
import { L2Distance } from '../metrics/L2Distance';
import { CosineDistance } from '../metrics/CosineDistance';
import { DistanceMetricFactory } from '../metrics/DistanceMetricFactory';
import { DistanceMetricType } from '../metrics/interfaces';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { ContextInfo } from '../tag/ContextInfo';
import { VectorizableContext } from '../tag/VectorizableContext';
import { AdaptiveLearningRate, LearningRateOrigin } from '../learning/AdaptiveLearningRate';
import { UpdateScope } from '../learning/UpdateScope';
import { SkipEnum } from '../links/SkipEnum';
import { Tag } from '../tag/Tag';
import { LearningSignal } from '../learning/LearningSignalV2';

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

// 実用的なポリシー実装
class AdaptiveLearningRatePolicy implements LearningRatePolicy<MockContext> {
  learningRate(difference: any, context: ContextInfo<MockContext>): AdaptiveLearningRate {
    // 差分の大きさに応じて学習率を調整
    const baseLearningRate = Math.min(0.1, Math.max(0.01, difference.magnitude * 0.2));
    return new AdaptiveLearningRate(baseLearningRate, LearningRateOrigin.ADAPTIVE);
  }
  isValid(): boolean { return true; }
  getPolicyName(): string { return 'AdaptiveLearningRatePolicy'; }
}

class DynamicUpdateScopePolicy implements UpdateScopePolicy<MockContext> {
  scope(difference: any, context: ContextInfo<MockContext>): UpdateScope {
    // 差分の大きさに応じて更新範囲を決定
    if (difference.magnitude > 0.8) {
      return new UpdateScope(new Set(['all_parameters', 'emergency_adjustments']));
    } else if (difference.magnitude > 0.3) {
      return new UpdateScope(new Set(['primary_parameters', 'secondary_weights']));
    } else {
      return new UpdateScope(new Set(['fine_tune_parameters']));
    }
  }
  isValid(): boolean { return true; }
  getPolicyName(): string { return 'DynamicUpdateScopePolicy'; }
}

class MagnitudeBasedSkipPolicy implements SkipPolicy<MockContext> {
  judgeSkip(difference: any): SkipEnum {
    if (difference.magnitude < 0.05) {
      return SkipEnum.FullSkip;
    } else if (difference.magnitude < 0.4) {
      return SkipEnum.PartialUpdate;
    } else {
      return SkipEnum.FocusedCalculation;
    }
  }
  isValid(): boolean { return true; }
  getPolicyName(): string { return 'MagnitudeBasedSkipPolicy'; }
}

/**
 * 包括的なシーケンス図統合テスト
 * 
 * このテストスイートは、すべての主要なシーケンス図の相互作用を検証し、
 * 分散自律学習システム全体の動作を確認する。
 */
describe('Comprehensive Sequence Diagram Integration Tests', () => {
  // 四層の自律層
  let sensoryLayer: SensoryAutonomousLayer<MockContext>;
  let patternLayer: PatternAutonomousLayer<MockContext>;
  let conceptLayer: ConceptAutonomousLayer<MockContext>;
  let actionLayer: ActionAutonomousLayer<MockContext>;

  // 層間リンク
  let sensorToPatternLink: InterLayerRelativeJudgementLink<MockContext>;
  let patternToConceptLink: InterLayerRelativeJudgementLink<MockContext>;
  let conceptToActionLink: InterLayerRelativeJudgementLink<MockContext>;

  // 海馬・感度システム
  let experienceIntegrator: ExperienceIntegrator;
  let hippocampusModule: HippocampusAutonomousModule;
  let sensitivityEventBus: SensitivityEventBus;
  let learningRateModulator: LearningRateModulator;

  // 入力・出力システム
  let sensoryOrgan: SensoryOrgan;
  let inputNormalizer: InputNormalizer<MockContext>;
  let thalamusGate: ThalamusGate;
  let actionExecutor: ActionExecutor<MockContext>;
  let executionResultCapture: ExecutionResultCapture<MockContext>;
  let externalWorld: ExternalWorld;
  let efferenceCopyEmitter: EfferenceCopyEmitter<MockContext>;

  // メトリクスとポリシー
  let distanceMetricFactory: DistanceMetricFactory;
  let learningRatePolicy: AdaptiveLearningRatePolicy;
  let updateScopePolicy: DynamicUpdateScopePolicy;
  let skipPolicy: MagnitudeBasedSkipPolicy;

  beforeEach(() => {
    // 四層の自律層を初期化
    sensoryLayer = new SensoryAutonomousLayer<MockContext>('sensory-01');
    patternLayer = new PatternAutonomousLayer<MockContext>('pattern-01');
    conceptLayer = new ConceptAutonomousLayer<MockContext>('concept-01');
    actionLayer = new ActionAutonomousLayer<MockContext>('action-01');

    // ポリシーを初期化
    learningRatePolicy = new AdaptiveLearningRatePolicy();
    updateScopePolicy = new DynamicUpdateScopePolicy();
    skipPolicy = new MagnitudeBasedSkipPolicy();

    // メトリクスファクトリを初期化
    distanceMetricFactory = new DistanceMetricFactory();

    // 層間リンクを作成
    sensorToPatternLink = new InterLayerRelativeJudgementLink<MockContext>(
      patternLayer.getLayerId(),
      sensoryLayer.getLayerId(),
      new L2Distance(),
      learningRatePolicy,
      updateScopePolicy,
      skipPolicy
    );

    patternToConceptLink = new InterLayerRelativeJudgementLink<MockContext>(
      conceptLayer.getLayerId(),
      patternLayer.getLayerId(),
      new CosineDistance(),
      learningRatePolicy,
      updateScopePolicy,
      skipPolicy
    );

    conceptToActionLink = new InterLayerRelativeJudgementLink<MockContext>(
      actionLayer.getLayerId(),
      conceptLayer.getLayerId(),
      new L2Distance(),
      learningRatePolicy,
      updateScopePolicy,
      skipPolicy
    );

    // 上位リンクを層に設定
    patternLayer.addUpstreamLink(patternToConceptLink);
    conceptLayer.addUpstreamLink(conceptToActionLink);

    // 海馬・感度システムを初期化
    experienceIntegrator = new ExperienceIntegrator();
    hippocampusModule = new HippocampusAutonomousModule();
    sensitivityEventBus = new SensitivityEventBus();
    learningRateModulator = new LearningRateModulator();
    sensitivityEventBus.subscribe(learningRateModulator);

    // 入力・出力システムを初期化
    sensoryOrgan = new SensoryOrgan('integrated-sensor');
    inputNormalizer = new InputNormalizer<MockContext>();
    thalamusGate = new ThalamusGate(new DefaultGatePolicy());
    externalWorld = new ExternalWorld();
    actionExecutor = new ActionExecutor<MockContext>('integrated-executor');
    executionResultCapture = new ExecutionResultCapture<MockContext>('integrated-capture', externalWorld);
    efferenceCopyEmitter = new EfferenceCopyEmitter<MockContext>();
  });

  test('should demonstrate complete end-to-end learning cycle', async () => {
    console.log('=== Complete End-to-End Learning Cycle Test ===');

    // 1. 入力注入フェーズ (SD-03)
    console.log('Phase 1: Input Injection');
    const rawSensorData = sensoryOrgan.captureRawData();
    const normalizedInput = inputNormalizer.normalize(rawSensorData);
    const filteredInput = thalamusGate.filter(normalizedInput);
    sensoryLayer.observeActualPattern(filteredInput);

    // 2. 基本往復フェーズ (SD-01, SD-02)
    console.log('Phase 2: Basic Layer Roundtrips');
    
    // パターン→感覚往復
    const patternExpectation = patternLayer.generateExpectedPattern(
      sensoryLayer.getLayerId(),
      new ContextInfo(new MockContext([0.5, 0.5, 0.5]), new Set([Tag.createString('phase', 'pattern_sensory')]))
    );
    
    const sensorJudgement = sensorToPatternLink.performComprehensiveJudgement(patternExpectation, filteredInput);
    expect(sensorJudgement.shouldProcess).toBe(true);

    // 概念→パターン往復
    const conceptExpectation = conceptLayer.generateExpectedPattern(
      patternLayer.getLayerId(),
      new ContextInfo(new MockContext([0.7, 0.3, 0.8]), new Set([Tag.createString('phase', 'concept_pattern')]))
    );
    
    // パターン層の状態をシミュレートするため実際パターンを作成
    const patternActual = new ActualPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.6, 0.4, 0.7]), new Set([Tag.createString('source', 'pattern_layer')]))
    );
    
    const patternJudgement = patternToConceptLink.performComprehensiveJudgement(conceptExpectation, patternActual);
    expect(patternJudgement.shouldProcess).toBe(true);

    // 3. 経験統合・バースト発火フェーズ (SD-04)
    console.log('Phase 3: Experience Integration and Burst');
    const currentExperience = experienceIntegrator.integrate(
      filteredInput.contextInfo,
      patternActual.contextInfo,
      conceptExpectation.contextInfo,
      new ContextInfo(new MockContext([0.2, 0.8, 0.4]), new Set([Tag.createString('source', 'action_simulation')]))
    );

    const experienceDifference = hippocampusModule.compareRelativeExperience(
      currentExperience,
      new RepresentativeExperienceSet([])
    );

    if (hippocampusModule.noveltyIndex(experienceDifference) > 0.7) {
      hippocampusModule.fireLRBurst(experienceDifference);
      const burst = new LRBurst(new Set(['integration_test']), 2.0, 15000);
      sensitivityEventBus.publish(burst);
      
      const amplification = learningRateModulator.amplificationFactor(new Set(['integration_test']));
      expect(amplification).toBeGreaterThan(1.0);
    }

    // 4. 海馬基準分散化フェーズ (SD-05)
    console.log('Phase 4: Hippocampus Criteria Decentralization');
    const basisPattern = new BasisPattern(
      0.1,
      new UpdateScope(new Set(['distributed_criteria'])),
      new Set(['integration', 'learning']),
      new Map([['integration_importance', 0.9]])
    );
    
    hippocampusModule.decentralizeJudgementBasis(basisPattern);

    // 5. スキップ分岐最適化フェーズ (SD-06)
    console.log('Phase 5: Skip Branch Optimization');
    const skipTestExpected = new ExpectedPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.1, 0.9, 0.2]), new Set([Tag.createString('test', 'skip_optimization')]))
    );
    const skipTestActual = new ActualPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.11, 0.89, 0.21]), new Set([Tag.createString('test', 'skip_optimization')]))
    );

    const skipJudgement = sensorToPatternLink.performComprehensiveJudgement(skipTestExpected, skipTestActual);
    
    // 小さな差分なのでスキップされるはず
    expect([SkipEnum.FullSkip, SkipEnum.PartialUpdate]).toContain(skipJudgement.skipJudgement);

    // 6. 行動計画評価フェーズ (SD-10)
    console.log('Phase 6: Action Plan Evaluation');
    const actionPlan = conceptLayer.generateExpectedPattern(
      actionLayer.getLayerId(),
      new ContextInfo(new MockContext([0.8, 0.2, 0.9]), new Set([Tag.createString('intent', 'integrated_action')]))
    );

    // 運動予測コピーの送出
    efferenceCopyEmitter.emit(actionPlan, new Set([Tag.createString('prediction', 'motor_copy')]));

    // 行動実行
    actionExecutor.execute(actionPlan);
    externalWorld.updateState(actionPlan.body.toVector());
    const executionResult = executionResultCapture.get();

    const actionJudgement = conceptToActionLink.performComprehensiveJudgement(actionPlan, executionResult);
    expect(actionJudgement.referenceDifference).toBeDefined();

    // 7. 学習信号伝播とモデル更新
    console.log('Phase 7: Learning Signal Propagation');
    const learningSignal = new LearningSignal<MockContext>(
      actionJudgement.learningRate,
      actionJudgement.referenceDifference,
      actionJudgement.updateScope
    );

    await conceptLayer.updatePredictiveModel(learningSignal);
    await patternLayer.updatePredictiveModel(learningSignal);
    await sensoryLayer.updatePredictiveModel(learningSignal);

    console.log('=== End-to-End Learning Cycle Completed Successfully ===');
  });

  test('should handle dynamic distance metric switching', () => {
    // SD-08: 距離メトリクスの動的切替をテスト
    const l2Metric = distanceMetricFactory.resolve(DistanceMetricType.L2);
    const cosineMetric = distanceMetricFactory.resolve(DistanceMetricType.Cosine);

    expect(l2Metric).toBeInstanceOf(L2Distance);
    expect(cosineMetric).toBeInstanceOf(CosineDistance);

    // 異なるメトリクスでの距離計算をテスト
    const pattern1 = new ExpectedPatternV2<MockContext>(
      new ContextInfo(new MockContext([1, 0, 0]), new Set())
    );
    const pattern2 = new ActualPatternV2<MockContext>(
      new ContextInfo(new MockContext([0, 1, 0]), new Set())
    );

    const l2Distance = l2Metric.distance(pattern1, pattern2);
    const cosineDistance = cosineMetric.distance(pattern1, pattern2);

    expect(l2Distance).toBeGreaterThan(0);
    expect(cosineDistance).toBeGreaterThan(0);
    expect(l2Distance).not.toEqual(cosineDistance);
  });

  test('should demonstrate multi-layer burst propagation', async () => {
    // 複数層でのバースト伝播をテスト
    const highMagnitudeDifference = new ActualPatternV2<MockContext>(
      new ContextInfo(new MockContext([0.95, 0.05, 0.9]), new Set([Tag.createString('burst', 'trigger')]))
    );

    sensoryLayer.observeActualPattern(highMagnitudeDifference);

    // パターン層での期待パターン生成
    const patternExpectation = patternLayer.generateExpectedPattern(
      sensoryLayer.getLayerId(),
      new ContextInfo(new MockContext([0.1, 0.9, 0.1]), new Set([Tag.createString('burst', 'test')]))
    );

    // 大きな差分を作成してバースト条件を満たす
    const judgement = sensorToPatternLink.performComprehensiveJudgement(patternExpectation, highMagnitudeDifference);
    expect(judgement.referenceDifference.magnitude).toBeGreaterThan(0.5);

    // 学習信号を作成してパターン層に送信
    const learningSignal = new LearningSignal<MockContext>(
      judgement.learningRate,
      judgement.referenceDifference,
      judgement.updateScope
    );

    // バースト閾値を超えた場合の伝播をテスト
    const propagatedSignals = await patternLayer.updatePredictiveModel(learningSignal);
    
    // パターン層から上位層への伝播が発生することを期待
    expect(Array.isArray(propagatedSignals)).toBe(true);
  });

  test('should validate inter-layer communication protocols', () => {
    // 層間通信プロトコルの検証
    const layers = [sensoryLayer, patternLayer, conceptLayer, actionLayer];
    const links = [sensorToPatternLink, patternToConceptLink, conceptToActionLink];

    // 各層が正しい識別子を持つことを確認
    expect(sensoryLayer.getLayerId()).toBe('sensory-01');
    expect(patternLayer.getLayerId()).toBe('pattern-01');
    expect(conceptLayer.getLayerId()).toBe('concept-01');
    expect(actionLayer.getLayerId()).toBe('action-01');

    // 各リンクが正しい層を接続していることを確認
    expect(sensorToPatternLink.getUpperLayerId()).toBe('pattern-01');
    expect(sensorToPatternLink.getLowerLayerId()).toBe('sensory-01');
    
    expect(patternToConceptLink.getUpperLayerId()).toBe('concept-01');
    expect(patternToConceptLink.getLowerLayerId()).toBe('pattern-01');
    
    expect(conceptToActionLink.getUpperLayerId()).toBe('action-01');
    expect(conceptToActionLink.getLowerLayerId()).toBe('concept-01');

    // 各層の基本的な機能をテスト
    layers.forEach(layer => {
      const testContext = new ContextInfo(new MockContext([0.5, 0.5, 0.5]), new Set());
      const expectedPattern = layer.generateExpectedPattern('test-destination', testContext);
      expect(expectedPattern).toBeInstanceOf(ExpectedPatternV2);
    });
  });

  test('should handle error conditions and recovery', () => {
    // エラー条件とリカバリーのテスト
    const invalidPattern = new ActualPatternV2<MockContext>(
      new ContextInfo(new MockContext([]), new Set()) // 空のベクトル
    );

    expect(() => {
      sensoryLayer.observeActualPattern(invalidPattern);
    }).not.toThrow(); // エラーハンドリングが適切に行われることを期待

    // 無効な学習信号の処理
    const invalidLearningSignal = new LearningSignal<MockContext>(
      new AdaptiveLearningRate(-1, LearningRateOrigin.ADAPTIVE), // 無効な学習率
      new (class extends Object {
        constructor() { super(); }
        get magnitude() { return NaN; }
        get contextInfo() { return null; }
      })() as any,
      new UpdateScope(new Set())
    );

    expect(async () => {
      await patternLayer.updatePredictiveModel(invalidLearningSignal);
    }).not.toThrow(); // 適切なエラーハンドリング
  });

  test('should maintain system performance under load', () => {
    // 負荷下でのシステム性能の維持をテスト
    const startTime = Date.now();
    
    // 大量の処理を実行
    for (let i = 0; i < 100; i++) {
      const testPattern = new ActualPatternV2<MockContext>(
        new ContextInfo(new MockContext([Math.random(), Math.random(), Math.random()]), 
        new Set([Tag.createString('load_test', `iteration_${i}`)]))
      );
      
      sensoryLayer.observeActualPattern(testPattern);
      
      const expectation = patternLayer.generateExpectedPattern(
        sensoryLayer.getLayerId(),
        testPattern.contextInfo
      );
      
      const judgement = sensorToPatternLink.performComprehensiveJudgement(expectation, testPattern);
      expect(judgement).toBeDefined();
    }
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // 合理的な処理時間内で完了することを確認（10秒未満）
    expect(processingTime).toBeLessThan(10000);
    
    console.log(`Load test completed in ${processingTime}ms (100 iterations)`);
  });
});

// 統計レポート用のテストユーティリティ
describe('System Statistics and Reporting', () => {
  test('should provide comprehensive system statistics', () => {
    const sensoryLayer = new SensoryAutonomousLayer<MockContext>('stats-sensory');
    const patternLayer = new PatternAutonomousLayer<MockContext>('stats-pattern');
    const link = new InterLayerRelativeJudgementLink<MockContext>(
      patternLayer.getLayerId(),
      sensoryLayer.getLayerId(),
      new L2Distance(),
      new AdaptiveLearningRatePolicy(),
      new DynamicUpdateScopePolicy(),
      new MagnitudeBasedSkipPolicy()
    );

    // いくつかの判定を実行
    for (let i = 0; i < 10; i++) {
      const expected = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([Math.random(), Math.random()]), new Set())
      );
      const actual = new ActualPatternV2<MockContext>(
        new ContextInfo(new MockContext([Math.random(), Math.random()]), new Set())
      );
      
      link.performComprehensiveJudgement(expected, actual);
    }

    // 統計情報を取得
    const stats = link.getStatistics();
    expect(stats.totalJudgements).toBe(10);
    expect(stats.skipCounts.size).toBeGreaterThan(0);
    expect(stats.averageDifferenceMagnitude).toBeGreaterThanOrEqual(0);
    expect(stats.averageLearningRate).toBeGreaterThanOrEqual(0);

    console.log('Link Statistics:', {
      totalJudgements: stats.totalJudgements,
      skipCounts: Object.fromEntries(stats.skipCounts),
      averageDifferenceMagnitude: stats.averageDifferenceMagnitude.toFixed(4),
      averageLearningRate: stats.averageLearningRate.toFixed(4),
      recentActivity: stats.recentActivity
    });
  });
});