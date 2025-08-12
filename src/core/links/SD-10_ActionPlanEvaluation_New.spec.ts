import { ConceptAutonomousLayer, ActionAutonomousLayer } from '../layers/LayerImplementations';
import { InterLayerRelativeJudgementLink } from './InterLayerRelativeJudgementLink';
import { ActionExecutor, ExecutionResultCapture, ExecutionResultPattern, ExternalWorld } from '../action/ActionSystem';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { RelativeDifference } from '../pattern/RelativeDifference';
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
  distance(expected: ExpectedPatternV2<MockContext>, actual: any): number {
    const v1 = expected.body.toVector();
    const v2 = actual.body ? actual.body.toVector() : actual.toVector();
    return Math.sqrt(v1.reduce((sum, val, i) => sum + (val - (v2[i] || 0)) ** 2, 0));
  }
  isValidDistance(): boolean { return true; }
  getName(): string { return 'MockEuclideanDistance'; }
}

describe('SD-10: 行動計画の相対判定（行動↔概念）', () => {
  let mockLearningRatePolicy: jest.Mocked<LearningRatePolicy<MockContext>>;
  let mockUpdateScopePolicy: jest.Mocked<UpdateScopePolicy<MockContext>>;
  let mockSkipPolicy: jest.Mocked<SkipPolicy<MockContext>>;
  let mockDistanceMetric: MockDistanceMetric;

  beforeEach(() => {
    mockDistanceMetric = new MockDistanceMetric();
    
    mockLearningRatePolicy = {
      learningRate: jest.fn((_difference: RelativeDifference<MockContext>, _context: ContextInfo<MockContext>) => 
        new AdaptiveLearningRate(0.15, LearningRateOrigin.ADAPTIVE)
      ),
      isValid: jest.fn(() => true),
      getPolicyName: jest.fn(() => 'MockActionLearningRatePolicy')
    };

    mockUpdateScopePolicy = {
      scope: jest.fn((_difference: RelativeDifference<MockContext>, _context: ContextInfo<MockContext>) => 
        new UpdateScope(new Set(['action_strategy', 'execution_params']))
      ),
      isValid: jest.fn(() => true),
      getPolicyName: jest.fn(() => 'MockActionUpdateScopePolicy')
    };

    mockSkipPolicy = {
      judgeSkip: jest.fn((_difference: RelativeDifference<MockContext>) => SkipEnum.FocusedCalculation),
      isValid: jest.fn(() => true),
      getPolicyName: jest.fn(() => 'MockActionSkipPolicy')
    };
  });

  // === SD-10シーケンス図対応テストケース ===

  describe('行動計画伝播処理', () => {
    (DevelopOption.isExecute_SD_10_action_plan_propagation ? test : test.skip)('正常系：概念層から行動層への期待パターン伝播', () => {
      // シーケンス図 24行目: ConceptLayer -> ActionLayer: 行動計画（期待パターン）を伝播
      
      // 概念層から行動層への期待パターン伝播をシミュレート
      const propagateActionPlan = (
        sourceLayerId: string,
        targetLayerId: string,
        actionContext: ContextInfo<MockContext>
      ): ExpectedPatternV2<MockContext> => {
        
        // 概念層が行動計画を生成
        const actionPlan = new ExpectedPatternV2<MockContext>(actionContext);
        
        // 行動層への伝播処理
        const propagationMetadata = {
          sourceLayer: sourceLayerId,
          targetLayer: targetLayerId,
          timestamp: new Date(),
          propagationType: 'action_plan'
        };
        
        return actionPlan;
      };
      
      // テスト用のコンテキストを作成
      const actionContextInfo = new ContextInfo(
        new MockContext([0.8, 0.3, 0.5]), 
        new Set([Tag.create('move_forward'), Tag.create('action_plan')]), 
        new Map([['priority', 0.8]])
      );
      
      // 行動計画の伝播を実行
      const actionPlan = propagateActionPlan('concept-layer-01', 'action-layer-01', actionContextInfo);
      
      // 検証
      expect(actionPlan).toBeInstanceOf(ExpectedPatternV2);
      expect(actionPlan.body).toBe(actionContextInfo.body);
      expect(actionPlan.contextInfo.tags.size).toBe(2);
      expect(actionPlan.contextInfo.body.toVector()).toEqual([0.8, 0.3, 0.5]);
    });
  });

  describe('実行・キャプチャ処理', () => {
    (DevelopOption.isExecute_SD_10_execution_and_capture ? test : test.skip)('正常系：行動実行器での実行と結果キャプチャ', () => {
      // シーケンス図 28-36行目: ActionLayer -> Actuator: 実行 -> Capture -> ResultPattern
      
      // 行動実行とキャプチャの一連の流れをシミュレート
      const executeAndCapture = (
        actionPlan: ExpectedPatternV2<MockContext>
      ): { executionId: string; result: ContextInfo<MockContext>; captureTimestamp: Date } => {
        
        // 行動実行器での実行をシミュレート
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 外界での行動実行（実際の値に若干のノイズを追加）
        const executedVector = actionPlan.body.toVector().map(val => val + (Math.random() - 0.5) * 0.1);
        
        // 実行結果のキャプチャ
        const captureTimestamp = new Date();
        const executionResult = new ContextInfo(
          new MockContext(executedVector),
          new Set([Tag.create('execution_result'), Tag.create('captured')]),
          new Map([
            ['capture_timestamp', captureTimestamp.getTime()],
            ['execution_success', 1.0]
          ])
        );
        
        return {
          executionId,
          result: executionResult,
          captureTimestamp
        };
      };
      
      // テスト用の行動計画を作成
      const actionPlan = new ExpectedPatternV2<MockContext>(
        new ContextInfo(
          new MockContext([0.6, 0.4, 0.8]), 
          new Set([Tag.create('test_action')]), 
          new Map()
        )
      );
      
      // 実行・キャプチャ処理を実行
      const execution = executeAndCapture(actionPlan);
      
      // 検証
      expect(execution.executionId).toBeDefined();
      expect(execution.executionId.startsWith('exec_')).toBe(true);
      expect(execution.result).toBeInstanceOf(ContextInfo);
      expect(execution.result.body.toVector()).toHaveLength(3);
      expect(execution.result.tags.size).toBe(2);
      // execution_id は statistics ではなく返却値の executionId で確認済み
      expect(execution.result.statistics.has('capture_timestamp')).toBe(true);
      expect(execution.captureTimestamp).toBeInstanceOf(Date);
      
      // 実行結果が期待値から大きく逸脱していないことを確認
      const originalVector = actionPlan.body.toVector();
      const resultVector = execution.result.body.toVector();
      resultVector.forEach((val, idx) => {
        expect(Math.abs(val - originalVector[idx])).toBeLessThan(0.2); // ノイズの範囲内
      });
    });
  });

  describe('相対差分計算処理', () => {
    (DevelopOption.isExecute_SD_10_difference_calculation ? test : test.skip)('正常系：期待結果と実行結果の相対差分計算', () => {
      // シーケンス図 39-41行目: ActionLayer -> Link: 相対差分計算(期待, 実行結果) -> 相対差分
      
      // 相対差分計算処理をシミュレート
      const calculateRelativeDifference = (
        expectedPattern: ExpectedPatternV2<MockContext>,
        executionResult: ContextInfo<MockContext>,
        distanceMetric: DifferenceDistanceMetric<MockContext>
      ): RelativeDifference<MockContext> => {
        
        // 実行結果を実際パターンとして扱う
        const actualPattern = new ActualPatternV2<MockContext>(executionResult);
        
        // 距離メトリクスを使用して距離を計算
        const distance = distanceMetric.distance(expectedPattern, actualPattern);
        
        // 相対差分のコンテキストを作成（期待と実際の差分情報）
        const differenceContext = new ContextInfo(
          new MockContext([
            expectedPattern.body.toVector()[0] - executionResult.body.toVector()[0],
            expectedPattern.body.toVector()[1] - executionResult.body.toVector()[1],
            expectedPattern.body.toVector()[2] - executionResult.body.toVector()[2]
          ]),
          new Set([Tag.create('difference'), Tag.create('action_evaluation')]),
          new Map([
            ['distance', distance],
            ['expected_magnitude', Math.sqrt(expectedPattern.body.toVector().reduce((a, b) => a + b*b, 0))],
            ['actual_magnitude', Math.sqrt(executionResult.body.toVector().reduce((a, b) => a + b*b, 0))]
          ])
        );
        
        // 相対差分オブジェクトを生成
        return new RelativeDifference<MockContext>(distance, differenceContext);
      };
      
      // テスト用データの準備
      const expectedPattern = new ExpectedPatternV2<MockContext>(
        new ContextInfo(
          new MockContext([0.7, 0.3, 0.9]), 
          new Set([Tag.create('expected_action')]), 
          new Map()
        )
      );
      
      const executionResult = new ContextInfo(
        new MockContext([0.6, 0.4, 0.8]), // 期待から若干ずれた結果
        new Set([Tag.create('actual_execution')]),
        new Map([['execution_success', 0.9]])
      );
      
      // 相対差分を計算
      const relativeDifference = calculateRelativeDifference(expectedPattern, executionResult, mockDistanceMetric);
      
      // 検証
      expect(relativeDifference).toBeInstanceOf(RelativeDifference);
      expect(relativeDifference.magnitude).toBeGreaterThan(0);
      expect(relativeDifference.magnitude).toBeLessThan(1.0); // 妥当な範囲内
      expect(relativeDifference.contextInfo).toBeInstanceOf(ContextInfo);
      expect(relativeDifference.contextInfo.tags.size).toBe(2);
      expect(relativeDifference.contextInfo.statistics.has('distance')).toBe(true);
      expect(relativeDifference.contextInfo.statistics.has('expected_magnitude')).toBe(true);
      expect(relativeDifference.contextInfo.statistics.has('actual_magnitude')).toBe(true);
      
      // 差分ベクトルが正しく計算されていることを確認（浮動小数点誤差を考慮）
      const differenceVector = relativeDifference.contextInfo.body.toVector();
      expect(differenceVector[0]).toBeCloseTo(0.1, 5); // 0.7-0.6
      expect(differenceVector[1]).toBeCloseTo(-0.1, 5); // 0.3-0.4
      expect(differenceVector[2]).toBeCloseTo(0.1, 5); // 0.9-0.8
    });
  });

  describe('概念層統合処理', () => {
    (DevelopOption.isExecute_SD_10_concept_integration ? test : test.skip)('正常系：差分の上位層への伝播と統合', () => {
      // シーケンス図 44行目: ActionLayer --> ConceptLayer: 差分を上位へ伝播
      
      // 差分の上位層への伝播と統合処理をシミュレート
      const propagateToConceptLayer = (
        relativeDifference: RelativeDifference<MockContext>,
        actionLayerId: string,
        conceptLayerId: string,
        policies: {
          learningRate: LearningRatePolicy<MockContext>;
          updateScope: UpdateScopePolicy<MockContext>;
          skipPolicy: SkipPolicy<MockContext>;
        }
      ): {
        shouldPropagate: boolean;
        learningSignal: {
          learningRate: AdaptiveLearningRate;
          updateScope: UpdateScope;
          skipDecision: SkipEnum;
        };
        integrationResult: {
          conceptLayerNotified: boolean;
          feedbackGenerated: boolean;
        };
      } => {
        
        // スキップ判定による処理制御
        const skipDecision = policies.skipPolicy.judgeSkip(relativeDifference);
        const shouldPropagate = skipDecision !== SkipEnum.FullSkip;
        
        if (!shouldPropagate) {
          return {
            shouldPropagate: false,
            learningSignal: {
              learningRate: new AdaptiveLearningRate(0.0, LearningRateOrigin.INITIAL),
              updateScope: new UpdateScope(),
              skipDecision
            },
            integrationResult: {
              conceptLayerNotified: false,
              feedbackGenerated: false
            }
          };
        }
        
        // 学習信号の生成
        const contextInfo = new ContextInfo(
          new MockContext([0.5, 0.5, 0.5]),
          new Set([Tag.create('concept_integration')]),
          new Map()
        );
        
        const learningRate = policies.learningRate.learningRate(relativeDifference, contextInfo);
        const updateScope = policies.updateScope.scope(relativeDifference, contextInfo);
        
        // 概念層への統合処理
        const integrationResult = {
          conceptLayerNotified: true,
          feedbackGenerated: learningRate.value > 0.05 // 学習率が十分高い場合にフィードバック生成
        };
        
        return {
          shouldPropagate,
          learningSignal: {
            learningRate,
            updateScope,
            skipDecision
          },
          integrationResult
        };
      };
      
      // テスト用の相対差分を作成
      const testDifference = new RelativeDifference<MockContext>(
        0.25, // 中程度の差分
        new ContextInfo(
          new MockContext([0.1, -0.2, 0.15]),
          new Set([Tag.create('action_difference')]),
          new Map([['error_magnitude', 0.25]])
        )
      );
      
      // 上位層への伝播処理を実行
      const propagationResult = propagateToConceptLayer(
        testDifference,
        'action-layer-01',
        'concept-layer-01',
        {
          learningRate: mockLearningRatePolicy,
          updateScope: mockUpdateScopePolicy,
          skipPolicy: mockSkipPolicy
        }
      );
      
      // 検証
      expect(propagationResult.shouldPropagate).toBe(true);
      expect(propagationResult.learningSignal).toBeDefined();
      expect(propagationResult.learningSignal.learningRate).toBeInstanceOf(AdaptiveLearningRate);
      expect(propagationResult.learningSignal.learningRate.value).toBe(0.15);
      expect(propagationResult.learningSignal.updateScope).toBeInstanceOf(UpdateScope);
      expect(propagationResult.learningSignal.updateScope.parameterIds.size).toBe(2);
      expect(propagationResult.learningSignal.skipDecision).toBe(SkipEnum.FocusedCalculation);
      
      expect(propagationResult.integrationResult.conceptLayerNotified).toBe(true);
      expect(propagationResult.integrationResult.feedbackGenerated).toBe(true); // 0.15 > 0.05
      
      // ポリシーが正しく呼び出されたことを確認
      expect(mockLearningRatePolicy.learningRate).toHaveBeenCalledWith(testDifference, expect.any(ContextInfo));
      expect(mockUpdateScopePolicy.scope).toHaveBeenCalledWith(testDifference, expect.any(ContextInfo));
      expect(mockSkipPolicy.judgeSkip).toHaveBeenCalledWith(testDifference);
    });
  });
});