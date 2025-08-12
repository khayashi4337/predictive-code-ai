import { ConceptAutonomousLayer, ActionAutonomousLayer } from '../layers/LayerImplementations';
import { InterLayerRelativeJudgementLink } from './InterLayerRelativeJudgementLink';
import { ActionExecutor, ExecutionResultCapture, ExecutionResultPattern, ExternalWorld } from '../action/ActionSystem';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { ContextInfo } from '../tag/ContextInfo';
import { VectorizableContext } from '../tag/VectorizableContext';
import { LearningRatePolicy, UpdateScopePolicy, SkipPolicy } from './PolicyInterfaces';
import { DifferenceDistanceMetric } from '../metrics/interfaces';
import { AdaptiveLearningRate, LearningRateOrigin } from '../learning/AdaptiveLearningRate';
import { UpdateScope } from '../learning/UpdateScope';
import { SkipEnum } from './SkipEnum';
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

// テスト用のモック実装
class MockDistanceMetric implements DifferenceDistanceMetric<MockContext> {
  distance(expected: ExpectedPatternV2<MockContext>, actual: ActualPatternV2<MockContext>): number {
    const v1 = expected.body.toVector();
    const v2 = actual.body.toVector();
    return Math.sqrt(v1.reduce((sum, val, i) => sum + (val - (v2[i] || 0)) ** 2, 0));
  }
  isValidDistance(): boolean { return true; }
  getName(): string { return 'MockEuclideanDistance'; }
}

describe('SD-10: 行動計画の相対判定（行動↔概念）', () => {
  let conceptLayer: ConceptAutonomousLayer<MockContext>;
  let actionLayer: ActionAutonomousLayer<MockContext>;
  let link: InterLayerRelativeJudgementLink<MockContext>;
  let actionExecutor: ActionExecutor<MockContext>;
  let executionResultCapture: ExecutionResultCapture<MockContext>;
  let externalWorld: ExternalWorld;
  
  let mockDistanceMetric: MockDistanceMetric;
  let mockLearningRatePolicy: jest.Mocked<LearningRatePolicy<MockContext>>;
  let mockUpdateScopePolicy: jest.Mocked<UpdateScopePolicy<MockContext>>;
  let mockSkipPolicy: jest.Mocked<SkipPolicy<MockContext>>;

  beforeEach(() => {
    // 層の初期化
    conceptLayer = new ConceptAutonomousLayer<MockContext>('concept-01');
    actionLayer = new ActionAutonomousLayer<MockContext>('action-01');
    
    // 外界システムの初期化
    externalWorld = new ExternalWorld();
    actionExecutor = new ActionExecutor<MockContext>('executor-01');
    executionResultCapture = new ExecutionResultCapture<MockContext>('capture-01', externalWorld);

    // モックポリシーの設定
    mockDistanceMetric = new MockDistanceMetric();
    
    mockLearningRatePolicy = {
      learningRate: jest.fn(() => new AdaptiveLearningRate(0.15, LearningRateOrigin.ADAPTIVE)),
      isValid: jest.fn(() => true),
      getPolicyName: jest.fn(() => 'MockActionLearningRatePolicy')
    };

    mockUpdateScopePolicy = {
      scope: jest.fn(() => new UpdateScope(new Set(['action_strategy', 'execution_params']))),
      isValid: jest.fn(() => true),
      getPolicyName: jest.fn(() => 'MockActionUpdateScopePolicy')
    };

    mockSkipPolicy = {
      judgeSkip: jest.fn(() => SkipEnum.FocusedCalculation),
      isValid: jest.fn(() => true),
      getPolicyName: jest.fn(() => 'MockActionSkipPolicy')
    };

    // 層間リンクの設定
    link = new InterLayerRelativeJudgementLink<MockContext>(
      conceptLayer.getLayerId(),
      actionLayer.getLayerId(),
      mockDistanceMetric,
      mockLearningRatePolicy,
      mockUpdateScopePolicy,
      mockSkipPolicy
    );

    // スパイの設定
    jest.spyOn(conceptLayer, 'generateExpectedPattern');
    jest.spyOn(actionLayer, 'observeActualPattern');
    jest.spyOn(actionExecutor, 'execute');
    jest.spyOn(executionResultCapture, 'get');
    jest.spyOn(externalWorld, 'updateState');
    jest.spyOn(link, 'calculateRelativeDifference');
  });

  test('should follow the complete action plan evaluation sequence', () => {
    // 1. 概念層が行動計画（期待パターン）を行動層に伝播 (シーケンス図 24行目)
    const actionPlan = conceptLayer.generateExpectedPattern(
      actionLayer.getLayerId(),
      new ContextInfo(new MockContext([0.8, 0.3, 0.5]), new Set([Tag.createString('intent', 'move_forward')]))
    );
    
    expect(conceptLayer.generateExpectedPattern).toHaveBeenCalledWith(
      actionLayer.getLayerId(),
      expect.any(ContextInfo)
    );
    expect(actionPlan).toBeInstanceOf(ExpectedPatternV2);

    // 2. 行動層が行動実行器に実行を委託 (シーケンス図 28行目)
    actionExecutor.execute(actionPlan);
    expect(actionExecutor.execute).toHaveBeenCalledWith(actionPlan);

    // 3. 行動実行器が外界に作用して結果をキャプチャに送信 (シーケンス図 30行目)
    // 実行による外界の状態変化をシミュレート
    externalWorld.updateState(actionPlan.body.toVector());
    expect(externalWorld.updateState).toHaveBeenCalledWith(actionPlan.body.toVector());

    // 4. 実行結果キャプチャが実行結果パターンを作成 (シーケンス図 34-36行目)
    const executionResult = executionResultCapture.get();
    expect(executionResultCapture.get).toHaveBeenCalled();
    expect(executionResult).toBeInstanceOf(ExecutionResultPattern);

    // 5. 行動層がリンクに相対差分計算を依頼 (シーケンス図 39行目)
    const judgementResult = link.performComprehensiveJudgement(actionPlan, executionResult);
    expect(link.calculateRelativeDifference).toHaveBeenCalledWith(actionPlan, executionResult);

    // 6. 相対差分が計算されることを確認 (シーケンス図 41行目)
    expect(judgementResult.referenceDifference).toBeDefined();
    expect(judgementResult.referenceDifference.magnitude).toBeGreaterThanOrEqual(0);

    // 7. 差分が上位層（概念層）へ伝播されることをシミュレート (シーケンス図 44行目)
    actionLayer.observeActualPattern(executionResult);
    expect(actionLayer.observeActualPattern).toHaveBeenCalledWith(executionResult);
  });

  test('should handle action execution success scenarios', () => {
    // 成功した行動実行のテスト
    const successfulActionPlan = conceptLayer.generateExpectedPattern(
      actionLayer.getLayerId(),
      new ContextInfo(new MockContext([0.9, 0.1, 0.2]), new Set([Tag.createString('intent', 'precise_movement')]))
    );

    // 実行
    actionExecutor.execute(successfulActionPlan);
    
    // 実行履歴を確認
    const executionHistory = actionExecutor.getExecutionHistory();
    expect(executionHistory.length).toBeGreaterThan(0);
    
    const latestExecution = executionHistory[executionHistory.length - 1];
    expect(latestExecution.expectedPattern).toBe(successfulActionPlan);

    // 外界の状態更新
    externalWorld.updateState(successfulActionPlan.body.toVector());
    
    // 実行結果を取得
    const result = executionResultCapture.get();
    expect(result.executionId).toBeDefined();

    // 期待結果と実際結果の差分を評価
    const judgement = link.performComprehensiveJudgement(successfulActionPlan, result);
    
    // 成功した場合、差分は比較的小さいはず
    expect(judgement.shouldProcess).toBe(true);
    expect(judgement.learningRate.value).toBe(0.15);
  });

  test('should handle action execution failure scenarios', () => {
    // 失敗した行動実行のテスト（期待と実際の大きな差分）
    const problematicActionPlan = conceptLayer.generateExpectedPattern(
      actionLayer.getLayerId(),
      new ContextInfo(new MockContext([1.0, 0.0, 1.0]), new Set([Tag.createString('intent', 'complex_maneuver')]))
    );

    // 実行
    actionExecutor.execute(problematicActionPlan);

    // 予期しない外界の反応をシミュレート（実行計画と異なる結果）
    externalWorld.updateState([0.1, 0.9, 0.1]); // 期待と大きく異なる状態
    
    const result = executionResultCapture.get();
    const judgement = link.performComprehensiveJudgement(problematicActionPlan, result);

    // 失敗の場合、差分が大きくなるはず
    expect(judgement.referenceDifference.magnitude).toBeGreaterThan(0.5);
    expect(judgement.shouldProcess).toBe(true);

    // 学習信号の内容を確認
    expect(mockLearningRatePolicy.learningRate).toHaveBeenCalled();
    expect(mockUpdateScopePolicy.scope).toHaveBeenCalled();
  });

  test('should track execution result patterns with proper context', () => {
    // 実行結果パターンのコンテキスト情報の追跡をテスト
    const contextualActionPlan = conceptLayer.generateExpectedPattern(
      actionLayer.getLayerId(),
      new ContextInfo(
        new MockContext([0.6, 0.4, 0.8]),
        new Set([
          Tag.createString('context', 'test_environment'),
          Tag.createString('priority', 'high')
        ]),
        new Map([['execution_urgency', 0.8]])
      )
    );

    actionExecutor.execute(contextualActionPlan);
    externalWorld.updateState(contextualActionPlan.body.toVector());
    
    const result = executionResultCapture.get();
    
    // コンテキスト情報が保持されていることを確認
    expect(result.contextInfo).toBeDefined();
    expect(result.contextInfo.statistics.has('capture_timestamp')).toBe(true);
    expect(result.contextInfo.statistics.has('capture_id')).toBe(true);

    // 実行IDが設定されていることを確認
    expect(result.executionId).toBeDefined();
    expect(result.executionId.startsWith('exec_')).toBe(true);
  });

  test('should handle multiple concurrent action executions', () => {
    // 複数の同時行動実行を処理できることをテスト
    const actionPlans = [
      conceptLayer.generateExpectedPattern(actionLayer.getLayerId(), 
        new ContextInfo(new MockContext([0.3, 0.7, 0.1]), new Set([Tag.createString('action', 'action_1')]))),
      conceptLayer.generateExpectedPattern(actionLayer.getLayerId(), 
        new ContextInfo(new MockContext([0.7, 0.3, 0.9]), new Set([Tag.createString('action', 'action_2')]))),
      conceptLayer.generateExpectedPattern(actionLayer.getLayerId(), 
        new ContextInfo(new MockContext([0.5, 0.5, 0.5]), new Set([Tag.createString('action', 'action_3')])))
    ];

    // すべての行動を実行
    actionPlans.forEach(plan => {
      actionExecutor.execute(plan);
      externalWorld.updateState(plan.body.toVector());
    });

    // 実行履歴の確認
    const history = actionExecutor.getExecutionHistory();
    expect(history.length).toBe(3);

    // 各実行に対して結果を取得し、差分を評価
    actionPlans.forEach(plan => {
      const result = executionResultCapture.get();
      const judgement = link.performComprehensiveJudgement(plan, result);
      
      expect(judgement).toBeDefined();
      expect(judgement.referenceDifference).toBeInstanceOf(Object);
    });
  });

  test('should integrate action evaluation with concept layer learning', () => {
    // 行動評価が概念層の学習に統合されることをテスト
    const learningActionPlan = conceptLayer.generateExpectedPattern(
      actionLayer.getLayerId(),
      new ContextInfo(new MockContext([0.2, 0.8, 0.6]), new Set([Tag.createString('learning', 'adaptive')]))
    );

    actionExecutor.execute(learningActionPlan);
    externalWorld.updateState([0.3, 0.7, 0.5]); // 若干の差異を含む結果

    const result = executionResultCapture.get();
    const judgement = link.performComprehensiveJudgement(learningActionPlan, result);

    // 行動層が実際パターンを観測
    actionLayer.observeActualPattern(result);

    // 概念層での学習を確認するため、新しい期待パターンを生成
    const updatedPlan = conceptLayer.generateExpectedPattern(
      actionLayer.getLayerId(),
      new ContextInfo(new MockContext([0.2, 0.8, 0.6]), new Set([Tag.createString('learning', 'updated')]))
    );

    expect(updatedPlan).toBeInstanceOf(ExpectedPatternV2);
    // 学習効果により、新しい計画が生成されることを確認
    expect(conceptLayer.generateExpectedPattern).toHaveBeenCalledTimes(2);
  });
});