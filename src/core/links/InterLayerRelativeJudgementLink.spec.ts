import { InterLayerRelativeJudgementLink } from './InterLayerRelativeJudgementLink';
import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';
import { Statistics } from '../tag/Statistics';
import { Tag } from '../tag/Tag';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { AdaptiveLearningRate, LearningRateOrigin } from '../learning/AdaptiveLearningRate';
import { UpdateScope, ParameterRange } from '../learning/UpdateScope';
import { SkipEnum } from './SkipEnum';
import { 
  LearningRatePolicy, 
  UpdateScopePolicy, 
  SkipPolicy 
} from './PolicyInterfaces';
import { DifferenceDistanceMetric } from '../metrics/interfaces';

// テスト用のContext実装
interface TestContext extends Context {
  data: any;
  metadata?: Record<string, any>;
}

class SimpleTestContext implements TestContext {
  constructor(
    public data: any,
    public metadata: Record<string, any> = {}
  ) {}
}

// モック距離メトリクス
class MockDistanceMetric implements DifferenceDistanceMetric<Context> {
  constructor(private fixedDistance: number = 0.5) {}

  distance(expected: ExpectedPatternV2<Context>, actual: ActualPatternV2<Context>): number {
    return this.fixedDistance;
  }

  getName(): string {
    return 'MockDistanceMetric';
  }

  isValidDistance(distance: number): boolean {
    return distance >= 0 && isFinite(distance);
  }

  setFixedDistance(distance: number): void {
    this.fixedDistance = distance;
  }
}

// モック学習率ポリシー
class MockLearningRatePolicy implements LearningRatePolicy<Context> {
  constructor(
    private fixedValue: number = 0.01,
    private policyName: string = 'MockLearningRatePolicy'
  ) {}

  learningRate(difference: RelativeDifference<Context>, context: ContextInfo<Context>): AdaptiveLearningRate {
    const metadata = new Map([
      ['magnitude', difference.magnitude],
      ['policyName', this.policyName]
    ]);
    return AdaptiveLearningRate.createAdaptive(this.fixedValue, 'mock_policy', metadata);
  }

  getPolicyName(): string {
    return this.policyName;
  }

  isValid(): boolean {
    return this.fixedValue > 0;
  }

  setFixedValue(value: number): void {
    this.fixedValue = value;
  }
}

// モック更新スコープポリシー
class MockUpdateScopePolicy implements UpdateScopePolicy<Context> {
  constructor(
    private scopeSize: number = 5,
    private policyName: string = 'MockUpdateScopePolicy'
  ) {}

  scope(difference: RelativeDifference<Context>, context: ContextInfo<Context>): UpdateScope {
    const parameterIds = new Set<string>();
    for (let i = 0; i < this.scopeSize; i++) {
      parameterIds.add(`param_${i}`);
    }
    return UpdateScope.createParameterScope(Array.from(parameterIds), 'mock_scope');
  }

  getPolicyName(): string {
    return this.policyName;
  }

  isValid(): boolean {
    return this.scopeSize > 0;
  }

  setScopeSize(size: number): void {
    this.scopeSize = size;
  }
}

// モックスキップポリシー
class MockSkipPolicy implements SkipPolicy<Context> {
  constructor(
    private fixedSkip: SkipEnum = SkipEnum.PartialUpdate,
    private policyName: string = 'MockSkipPolicy'
  ) {}

  judgeSkip(difference: RelativeDifference<Context>): SkipEnum {
    // 大きさに基づく動的判定も可能
    if (difference.magnitude < 0.1) {
      return SkipEnum.FullSkip;
    } else if (difference.magnitude > 0.8) {
      return SkipEnum.FocusedCalculation;
    }
    return this.fixedSkip;
  }

  getPolicyName(): string {
    return this.policyName;
  }

  isValid(): boolean {
    return true;
  }

  setFixedSkip(skip: SkipEnum): void {
    this.fixedSkip = skip;
  }
}

// モック RelativeDifference
class MockRelativeDifference implements RelativeDifference<Context> {
  constructor(
    public readonly magnitude: number,
    public readonly contextInfo: ContextInfo<Context>,
    public readonly metadata: Map<string, any> = new Map()
  ) {}
}

describe('InterLayerRelativeJudgementLink クラス', () => {
  let link: InterLayerRelativeJudgementLink<Context>;
  let mockDistanceMetric: MockDistanceMetric;
  let mockLearningRatePolicy: MockLearningRatePolicy;
  let mockUpdateScopePolicy: MockUpdateScopePolicy;
  let mockSkipPolicy: MockSkipPolicy;

  beforeEach(() => {
    mockDistanceMetric = new MockDistanceMetric(0.5);
    mockLearningRatePolicy = new MockLearningRatePolicy(0.01);
    mockUpdateScopePolicy = new MockUpdateScopePolicy(3);
    mockSkipPolicy = new MockSkipPolicy(SkipEnum.PartialUpdate);

    link = new InterLayerRelativeJudgementLink(
      'upper_layer_1',
      'lower_layer_1',
      mockDistanceMetric,
      mockLearningRatePolicy,
      mockUpdateScopePolicy,
      mockSkipPolicy,
      'test_link_1'
    );
  });

  describe('基本機能・初期化テスト', () => {
    test('正常にインスタンス化できる', () => {
      expect(link).toBeInstanceOf(InterLayerRelativeJudgementLink);
      expect(link.getLinkId()).toBe('test_link_1');
      expect(link.getUpperLayerId()).toBe('upper_layer_1');
      expect(link.getLowerLayerId()).toBe('lower_layer_1');
    });

    test('リンクIDの自動生成が動作する', () => {
      const autoIdLink = new InterLayerRelativeJudgementLink(
        'upper_2',
        'lower_2',
        mockDistanceMetric,
        mockLearningRatePolicy,
        mockUpdateScopePolicy,
        mockSkipPolicy
      );

      const linkId = autoIdLink.getLinkId();
      expect(linkId).toMatch(/^link_upper_2_lower_2_/);
      expect(linkId.length).toBeGreaterThan(20);
    });

    test('入力検証が正しく動作する', () => {
      // 空のレイヤーID
      expect(() => {
        new InterLayerRelativeJudgementLink(
          '',
          'lower',
          mockDistanceMetric,
          mockLearningRatePolicy,
          mockUpdateScopePolicy,
          mockSkipPolicy
        );
      }).toThrow('Layer IDs cannot be empty');

      // 同じレイヤーID
      expect(() => {
        new InterLayerRelativeJudgementLink(
          'same_layer',
          'same_layer',
          mockDistanceMetric,
          mockLearningRatePolicy,
          mockUpdateScopePolicy,
          mockSkipPolicy
        );
      }).toThrow('Upper and lower layer IDs must be different');

      // null距離メトリクス
      expect(() => {
        new InterLayerRelativeJudgementLink(
          'upper',
          'lower',
          null as any,
          mockLearningRatePolicy,
          mockUpdateScopePolicy,
          mockSkipPolicy
        );
      }).toThrow('All policies and distance metric are required');
    });

    test('統計情報を正しく初期化する', () => {
      const stats = link.getStatistics();
      
      expect(stats.totalJudgements).toBe(0);
      expect(stats.skipCounts.size).toBe(0);
      expect(stats.averageDifferenceMagnitude).toBe(0);
      expect(stats.averageLearningRate).toBe(0);
      expect(stats.recentActivity).toBe(false);
    });

    test('メタデータが正しく設定される', () => {
      const metadata = new Map([
        ['test_key', 'test_value'],
        ['priority', 'high']
      ]);

      const linkWithMetadata = new InterLayerRelativeJudgementLink(
        'upper',
        'lower',
        mockDistanceMetric,
        mockLearningRatePolicy,
        mockUpdateScopePolicy,
        mockSkipPolicy,
        'meta_test_link',
        metadata
      );

      // メタデータがコピーされて独立していることを確認
      metadata.set('test_key', 'modified');
      const json = linkWithMetadata.toJSON() as any;
      expect(json.metadata.test_key).toBe('test_value');
    });
  });

  describe('相対差分計算テスト', () => {
    let expectedPattern: ExpectedPatternV2<Context>;
    let actualPattern: ActualPatternV2<Context>;

    beforeEach(() => {
      const context1 = new SimpleTestContext({ expected: true });
      const context2 = new SimpleTestContext({ actual: true });
      const stats1 = new Statistics();
      stats1.setNumber('confidence', 0.8);
      const stats2 = new Statistics();
      stats2.setNumber('accuracy', 0.9);

      expectedPattern = new ExpectedPatternV2(new ContextInfo(context1, new Set([Tag.create('expected')]), stats1));
      actualPattern = new ActualPatternV2(new ContextInfo(context2, new Set([Tag.create('actual')]), stats2));
    });

    test('相対差分を正常に計算できる', () => {
      const difference = link.calculateRelativeDifference(expectedPattern, actualPattern);

      expect(difference).toBeInstanceOf(MockRelativeDifference);
      expect(difference.magnitude).toBe(0.5); // モックの固定値
      expect(difference.contextInfo).toBeDefined();
      expect(difference.contextInfo.body).toBe(expectedPattern.body);
    });

    test('距離メトリクスが呼び出される', () => {
      const distanceSpy = jest.spyOn(mockDistanceMetric, 'distance');
      
      link.calculateRelativeDifference(expectedPattern, actualPattern);
      
      expect(distanceSpy).toHaveBeenCalledWith(expectedPattern, actualPattern);
      expect(distanceSpy).toHaveBeenCalledTimes(1);
    });

    test('コンテキスト情報が正しく統合される', () => {
      const difference = link.calculateRelativeDifference(expectedPattern, actualPattern);
      
      const resultTags = Array.from(difference.contextInfo.tags);
      const tagKeys = resultTags.map(tag => tag.key);
      
      // 両方のパターンのタグが統合される
      expect(tagKeys).toContain('expected');
      expect(tagKeys).toContain('actual');
      
      // 統計情報が統合される
      const resultStats = difference.contextInfo.statistics;
      expect(resultStats.getNumber('confidence')).toBe(0.8);
      expect(resultStats.getNumber('accuracy')).toBe(0.9);
      expect(resultStats.getDate('pattern_comparison_timestamp')).toBeDefined();
    });

    test('メタデータが適切に設定される', () => {
      const difference = link.calculateRelativeDifference(expectedPattern, actualPattern);
      
      expect(difference.metadata.get('metric_type')).toBe('MockDistanceMetric');
      expect(difference.metadata.get('upper_layer')).toBe('upper_layer_1');
      expect(difference.metadata.get('lower_layer')).toBe('lower_layer_1');
      expect(difference.metadata.get('link_id')).toBe('test_link_1');
    });

    test('無効なパターンでエラーが発生する', () => {
      expect(() => {
        link.calculateRelativeDifference(null as any, actualPattern);
      }).toThrow('Both expected and actual patterns are required');

      expect(() => {
        link.calculateRelativeDifference(expectedPattern, null as any);
      }).toThrow('Both expected and actual patterns are required');

      // bodyがnullのパターン
      const invalidPattern = new ExpectedPatternV2(new ContextInfo(null as any, new Set(), new Statistics()));
      expect(() => {
        link.calculateRelativeDifference(invalidPattern, actualPattern);
      }).toThrow('Pattern bodies are required');
    });

    test('異なる距離メトリクスで異なる結果が得られる', () => {
      mockDistanceMetric.setFixedDistance(0.3);
      const difference1 = link.calculateRelativeDifference(expectedPattern, actualPattern);
      
      mockDistanceMetric.setFixedDistance(0.8);
      const difference2 = link.calculateRelativeDifference(expectedPattern, actualPattern);
      
      expect(difference1.magnitude).toBe(0.3);
      expect(difference2.magnitude).toBe(0.8);
    });
  });

  describe('学習率調整テスト', () => {
    let mockContext: ContextInfo<Context>;
    let mockDifference: MockRelativeDifference;

    beforeEach(() => {
      const context = new SimpleTestContext({ learning: true });
      const stats = new Statistics();
      stats.setNumber('learning_factor', 1.2);
      mockContext = new ContextInfo(context, new Set([Tag.create('learning')]), stats);
      mockDifference = new MockRelativeDifference(0.4, mockContext);
    });

    test('学習率を正常に調整できる', () => {
      const learningRate = link.adjustLearningRate(mockDifference, mockContext);

      expect(learningRate).toBeInstanceOf(AdaptiveLearningRate);
      expect(learningRate.value).toBe(0.01); // モックの固定値
      expect(learningRate.origin).toBe(LearningRateOrigin.ADAPTIVE);
    });

    test('学習率ポリシーが呼び出される', () => {
      const policySpy = jest.spyOn(mockLearningRatePolicy, 'learningRate');
      
      link.adjustLearningRate(mockDifference, mockContext);
      
      expect(policySpy).toHaveBeenCalledWith(mockDifference, mockContext);
      expect(policySpy).toHaveBeenCalledTimes(1);
    });

    test('無効な入力でエラーが発生する', () => {
      expect(() => {
        link.adjustLearningRate(null as any, mockContext);
      }).toThrow('Difference and context are required');

      expect(() => {
        link.adjustLearningRate(mockDifference, null as any);
      }).toThrow('Difference and context are required');
    });

    test('異なる差分値で異なる学習率が得られる', () => {
      const highDifference = new MockRelativeDifference(0.9, mockContext);
      const lowDifference = new MockRelativeDifference(0.1, mockContext);

      // ポリシーを差分値に応じて調整
      mockLearningRatePolicy.setFixedValue(0.05);
      const highLR = link.adjustLearningRate(highDifference, mockContext);
      
      mockLearningRatePolicy.setFixedValue(0.001);
      const lowLR = link.adjustLearningRate(lowDifference, mockContext);

      expect(highLR.value).toBeGreaterThan(lowLR.value);
    });
  });

  describe('更新スコープ決定テスト', () => {
    let mockContext: ContextInfo<Context>;
    let mockDifference: MockRelativeDifference;

    beforeEach(() => {
      const context = new SimpleTestContext({ scope: true });
      mockContext = new ContextInfo(context, new Set(), new Statistics());
      mockDifference = new MockRelativeDifference(0.6, mockContext);
    });

    test('更新スコープを正常に決定できる', () => {
      const updateScope = link.determineUpdateScope(mockDifference, mockContext);

      expect(updateScope).toBeInstanceOf(UpdateScope);
      expect(updateScope.parameterIds.size).toBe(3); // モックのデフォルト
    });

    test('更新スコープポリシーが呼び出される', () => {
      const policySpy = jest.spyOn(mockUpdateScopePolicy, 'scope');
      
      link.determineUpdateScope(mockDifference, mockContext);
      
      expect(policySpy).toHaveBeenCalledWith(mockDifference, mockContext);
      expect(policySpy).toHaveBeenCalledTimes(1);
    });

    test('無効な入力でエラーが発生する', () => {
      expect(() => {
        link.determineUpdateScope(null as any, mockContext);
      }).toThrow('Difference and context are required');

      expect(() => {
        link.determineUpdateScope(mockDifference, null as any);
      }).toThrow('Difference and context are required');
    });

    test('異なる差分値で異なるスコープが得られる', () => {
      mockUpdateScopePolicy.setScopeSize(2);
      const scope1 = link.determineUpdateScope(mockDifference, mockContext);
      
      mockUpdateScopePolicy.setScopeSize(5);
      const scope2 = link.determineUpdateScope(mockDifference, mockContext);

      expect(scope1.parameterIds.size).toBe(2);
      expect(scope2.parameterIds.size).toBe(5);
    });
  });

  describe('スキップ判定テスト', () => {
    test('スキップ判定を正常に行える', () => {
      const context = new SimpleTestContext({ skip: true });
      const mockDifference = new MockRelativeDifference(0.3, new ContextInfo(context, new Set(), new Statistics()));

      const skipResult = link.judgeCalculationSkip(mockDifference);

      expect(Object.values(SkipEnum)).toContain(skipResult);
    });

    test('スキップポリシーが呼び出される', () => {
      const context = new SimpleTestContext({ skip: true });
      const mockDifference = new MockRelativeDifference(0.3, new ContextInfo(context, new Set(), new Statistics()));
      const policySpy = jest.spyOn(mockSkipPolicy, 'judgeSkip');
      
      link.judgeCalculationSkip(mockDifference);
      
      expect(policySpy).toHaveBeenCalledWith(mockDifference);
      expect(policySpy).toHaveBeenCalledTimes(1);
    });

    test('無効な差分でエラーが発生する', () => {
      expect(() => {
        link.judgeCalculationSkip(null as any);
      }).toThrow('Difference is required');
    });

    test('差分の大きさに応じたスキップ判定', () => {
      const context = new SimpleTestContext({ test: true });
      
      // 小さな差分 -> FullSkip
      const smallDifference = new MockRelativeDifference(0.05, new ContextInfo(context, new Set(), new Statistics()));
      const smallSkip = link.judgeCalculationSkip(smallDifference);
      expect(smallSkip).toBe(SkipEnum.FullSkip);
      
      // 大きな差分 -> FocusedCalculation
      const largeDifference = new MockRelativeDifference(0.9, new ContextInfo(context, new Set(), new Statistics()));
      const largeSkip = link.judgeCalculationSkip(largeDifference);
      expect(largeSkip).toBe(SkipEnum.FocusedCalculation);
      
      // 中程度の差分 -> PartialUpdate（モックのデフォルト）
      const mediumDifference = new MockRelativeDifference(0.3, new ContextInfo(context, new Set(), new Statistics()));
      const mediumSkip = link.judgeCalculationSkip(mediumDifference);
      expect(mediumSkip).toBe(SkipEnum.PartialUpdate);
    });
  });

  describe('包括的判定テスト', () => {
    let expectedPattern: ExpectedPatternV2<Context>;
    let actualPattern: ActualPatternV2<Context>;

    beforeEach(() => {
      const context1 = new SimpleTestContext({ comprehensive: 'expected' });
      const context2 = new SimpleTestContext({ comprehensive: 'actual' });
      
      expectedPattern = new ExpectedPatternV2(new ContextInfo(context1, new Set(), new Statistics()));
      actualPattern = new ActualPatternV2(new ContextInfo(context2, new Set(), new Statistics()));
    });

    test('包括的判定が正常に実行される', () => {
      const result = link.performComprehensiveJudgement(expectedPattern, actualPattern);

      expect(result.referenceDifference).toBeDefined();
      expect(result.learningRate).toBeInstanceOf(AdaptiveLearningRate);
      expect(result.updateScope).toBeInstanceOf(UpdateScope);
      expect(Object.values(SkipEnum)).toContain(result.skipJudgement);
      expect(result.shouldProcess).toBe(true);
    });

    test('FullSkipの場合は処理をスキップする', () => {
      // 小さな差分でFullSkipを発生させる
      mockDistanceMetric.setFixedDistance(0.01);
      
      const result = link.performComprehensiveJudgement(expectedPattern, actualPattern);

      expect(result.skipJudgement).toBe(SkipEnum.FullSkip);
      expect(result.shouldProcess).toBe(false);
      expect(result.learningRate.getMetadata('skipped')).toBe(true);
    });

    test('PartialUpdateの場合は通常処理を行う', () => {
      mockDistanceMetric.setFixedDistance(0.3);
      
      const result = link.performComprehensiveJudgement(expectedPattern, actualPattern);

      expect(result.skipJudgement).toBe(SkipEnum.PartialUpdate);
      expect(result.shouldProcess).toBe(true);
    });

    test('FocusedCalculationの場合は集中処理を行う', () => {
      mockDistanceMetric.setFixedDistance(0.9);
      
      const result = link.performComprehensiveJudgement(expectedPattern, actualPattern);

      expect(result.skipJudgement).toBe(SkipEnum.FocusedCalculation);
      expect(result.shouldProcess).toBe(true);
    });

    test('包括的判定の結果が履歴に記録される', () => {
      const initialHistory = link.getJudgementHistory();
      expect(initialHistory.length).toBe(0);

      link.performComprehensiveJudgement(expectedPattern, actualPattern);

      const historyAfter = link.getJudgementHistory();
      expect(historyAfter.length).toBe(1);
      
      const record = historyAfter[0];
      expect(record.timestamp).toBeInstanceOf(Date);
      expect(record.referenceDifference).toBeDefined();
      expect(record.learningRate).toBeDefined();
      expect(record.updateScope).toBeDefined();
      expect(record.skipJudgement).toBeDefined();
    });

    test('複数回の判定で履歴が蓄積される', () => {
      // 5回実行
      for (let i = 0; i < 5; i++) {
        link.performComprehensiveJudgement(expectedPattern, actualPattern);
      }

      const history = link.getJudgementHistory();
      expect(history.length).toBe(5);
      
      // 時系列順になっていることを確認
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(history[i-1].timestamp.getTime());
      }
    });
  });

  describe('判定履歴管理テスト', () => {
    let expectedPattern: ExpectedPatternV2<Context>;
    let actualPattern: ActualPatternV2<Context>;

    beforeEach(() => {
      const context1 = new SimpleTestContext({ history: 'test' });
      const context2 = new SimpleTestContext({ history: 'test' });
      
      expectedPattern = new ExpectedPatternV2(new ContextInfo(context1, new Set(), new Statistics()));
      actualPattern = new ActualPatternV2(new ContextInfo(context2, new Set(), new Statistics()));
    });

    test('履歴の上限管理が動作する', () => {
      // 150回実行（上限100を超える）
      for (let i = 0; i < 150; i++) {
        link.performComprehensiveJudgement(expectedPattern, actualPattern);
      }

      const history = link.getJudgementHistory();
      expect(history.length).toBe(100); // 上限に制限される
    });

    test('最大件数を指定して履歴を取得できる', () => {
      // 10回実行
      for (let i = 0; i < 10; i++) {
        link.performComprehensiveJudgement(expectedPattern, actualPattern);
      }

      const recent3 = link.getJudgementHistory(3);
      expect(recent3.length).toBe(3);
      
      const recent20 = link.getJudgementHistory(20);
      expect(recent20.length).toBe(10); // 実際の履歴数より多くは取得できない
    });

    test('履歴が読み取り専用として返される', () => {
      link.performComprehensiveJudgement(expectedPattern, actualPattern);
      
      const history = link.getJudgementHistory();
      
      // TypeScriptの型チェックにより、ReadonlyArrayとして返される
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(1);
    });
  });

  describe('ポリシー更新テスト', () => {
    test('学習率ポリシーを更新できる', () => {
      const newPolicy = new MockLearningRatePolicy(0.05, 'NewLearningRatePolicy');
      
      expect(() => {
        link.updateLearningRatePolicy(newPolicy);
      }).not.toThrow();

      // 更新後のポリシーが使用されることを確認
      const context = new SimpleTestContext({ update: true });
      const difference = new MockRelativeDifference(0.5, new ContextInfo(context, new Set(), new Statistics()));
      const learningRate = link.adjustLearningRate(difference, new ContextInfo(context, new Set(), new Statistics()));
      
      expect(learningRate.value).toBe(0.05);
    });

    test('更新スコープポリシーを更新できる', () => {
      const newPolicy = new MockUpdateScopePolicy(8, 'NewUpdateScopePolicy');
      
      expect(() => {
        link.updateScopePolicy(newPolicy);
      }).not.toThrow();

      // 更新後のポリシーが使用されることを確認
      const context = new SimpleTestContext({ update: true });
      const difference = new MockRelativeDifference(0.5, new ContextInfo(context, new Set(), new Statistics()));
      const updateScope = link.determineUpdateScope(difference, new ContextInfo(context, new Set(), new Statistics()));
      
      expect(updateScope.parameterIds.size).toBe(8);
    });

    test('スキップポリシーを更新できる', () => {
      const newPolicy = new MockSkipPolicy(SkipEnum.FocusedCalculation, 'NewSkipPolicy');
      
      expect(() => {
        link.updateSkipPolicy(newPolicy);
      }).not.toThrow();

      // 更新後のポリシーが使用されることを確認
      const context = new SimpleTestContext({ update: true });
      const difference = new MockRelativeDifference(0.5, new ContextInfo(context, new Set(), new Statistics()));
      const skipResult = link.judgeCalculationSkip(difference);
      
      expect(skipResult).toBe(SkipEnum.FocusedCalculation);
    });

    test('nullポリシーの設定でエラーが発生する', () => {
      expect(() => {
        link.updateLearningRatePolicy(null as any);
      }).toThrow('Learning rate policy is required');

      expect(() => {
        link.updateScopePolicy(null as any);
      }).toThrow('Update scope policy is required');

      expect(() => {
        link.updateSkipPolicy(null as any);
      }).toThrow('Skip policy is required');
    });
  });

  describe('統計情報テスト', () => {
    let expectedPattern: ExpectedPatternV2<Context>;
    let actualPattern: ActualPatternV2<Context>;

    beforeEach(() => {
      const context1 = new SimpleTestContext({ stats: 'test' });
      const context2 = new SimpleTestContext({ stats: 'test' });
      
      expectedPattern = new ExpectedPatternV2(new ContextInfo(context1, new Set(), new Statistics()));
      actualPattern = new ActualPatternV2(new ContextInfo(context2, new Set(), new Statistics()));
    });

    test('統計情報が正しく計算される', () => {
      // 様々な差分で5回実行
      const distances = [0.1, 0.3, 0.5, 0.7, 0.9];
      distances.forEach(distance => {
        mockDistanceMetric.setFixedDistance(distance);
        link.performComprehensiveJudgement(expectedPattern, actualPattern);
      });

      const stats = link.getStatistics();
      
      expect(stats.totalJudgements).toBe(5);
      expect(stats.averageDifferenceMagnitude).toBeCloseTo(0.5, 1); // (0.1+0.3+0.5+0.7+0.9)/5
      expect(stats.averageLearningRate).toBe(0.01); // モックの固定値
      expect(stats.recentActivity).toBe(true); // 最近実行したため
    });

    test('スキップ回数が正しくカウントされる', () => {
      // FullSkipを2回
      mockDistanceMetric.setFixedDistance(0.005);
      link.performComprehensiveJudgement(expectedPattern, actualPattern);
      link.performComprehensiveJudgement(expectedPattern, actualPattern);
      
      // PartialUpdateを3回
      mockDistanceMetric.setFixedDistance(0.3);
      link.performComprehensiveJudgement(expectedPattern, actualPattern);
      link.performComprehensiveJudgement(expectedPattern, actualPattern);
      link.performComprehensiveJudgement(expectedPattern, actualPattern);
      
      // FocusedCalculationを1回
      mockDistanceMetric.setFixedDistance(0.9);
      link.performComprehensiveJudgement(expectedPattern, actualPattern);

      const stats = link.getStatistics();
      
      expect(stats.skipCounts.get(SkipEnum.FullSkip)).toBe(2);
      expect(stats.skipCounts.get(SkipEnum.PartialUpdate)).toBe(3);
      expect(stats.skipCounts.get(SkipEnum.FocusedCalculation)).toBe(1);
    });

    test('最近の活動判定が正しく動作する', () => {
      // 最初は活動なし
      let stats = link.getStatistics();
      expect(stats.recentActivity).toBe(false);
      
      // 判定実行後は活動あり
      link.performComprehensiveJudgement(expectedPattern, actualPattern);
      stats = link.getStatistics();
      expect(stats.recentActivity).toBe(true);
    });

    test('平均値計算が空の状態でも動作する', () => {
      const stats = link.getStatistics();
      
      expect(stats.averageDifferenceMagnitude).toBe(0);
      expect(stats.averageLearningRate).toBe(0);
      expect(stats.totalJudgements).toBe(0);
    });
  });

  describe('JSON・文字列変換テスト', () => {
    test('JSON変換が正常に動作する', () => {
      const json = link.toJSON() as any;
      
      expect(json.linkId).toBe('test_link_1');
      expect(json.upperLayerId).toBe('upper_layer_1');
      expect(json.lowerLayerId).toBe('lower_layer_1');
      expect(json.distanceMetric).toBe('MockDistanceMetric');
      expect(json.learningRatePolicy).toBe('MockLearningRatePolicy');
      expect(json.updateScopePolicy).toBe('MockUpdateScopePolicy');
      expect(json.skipPolicy).toBe('MockSkipPolicy');
      expect(json.createdAt).toBeDefined();
      expect(json.metadata).toBeDefined();
      expect(json.statistics).toBeDefined();
    });

    test('文字列変換が正常に動作する', () => {
      const str = link.toString();
      
      expect(str).toContain('InterLayerLink');
      expect(str).toContain('test_link_');
      expect(str).toContain('upper_layer_1→lower_layer_1');
      expect(str).toContain('judgements=0');
    });

    test('判定実行後の文字列変換', () => {
      const context = new SimpleTestContext({ str: 'test' });
      const expectedPattern = new ExpectedPatternV2(new ContextInfo(context, new Set(), new Statistics()));
      const actualPattern = new ActualPatternV2(new ContextInfo(context, new Set(), new Statistics()));
      
      // 3回実行
      for (let i = 0; i < 3; i++) {
        link.performComprehensiveJudgement(expectedPattern, actualPattern);
      }
      
      const str = link.toString();
      expect(str).toContain('judgements=3');
    });
  });

  describe('パフォーマンステスト', () => {
    let expectedPattern: ExpectedPatternV2<Context>;
    let actualPattern: ActualPatternV2<Context>;

    beforeEach(() => {
      const context1 = new SimpleTestContext({ perf: 'test' });
      const context2 = new SimpleTestContext({ perf: 'test' });
      
      expectedPattern = new ExpectedPatternV2(new ContextInfo(context1, new Set(), new Statistics()));
      actualPattern = new ActualPatternV2(new ContextInfo(context2, new Set(), new Statistics()));
    });

    test('大量の判定処理が効率的に実行される', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        link.performComprehensiveJudgement(expectedPattern, actualPattern);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500); // 500ms以内
      
      const stats = link.getStatistics();
      expect(stats.totalJudgements).toBe(1000);
    });

    test('履歴の上限管理が効率的に動作する', () => {
      const start = performance.now();
      
      // 上限を超える数の判定を実行
      for (let i = 0; i < 150; i++) {
        link.performComprehensiveJudgement(expectedPattern, actualPattern);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(200); // 200ms以内
      
      const history = link.getJudgementHistory();
      expect(history.length).toBe(100); // 上限に制限
    });

    test('統計計算のパフォーマンス', () => {
      // 大量のデータを蓄積
      for (let i = 0; i < 100; i++) {
        link.performComprehensiveJudgement(expectedPattern, actualPattern);
      }
      
      const start = performance.now();
      
      // 統計情報を100回取得
      for (let i = 0; i < 100; i++) {
        link.getStatistics();
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50); // 50ms以内
    });
  });

  describe('エッジケース・境界条件テスト', () => {
    test('極端な距離値の処理', () => {
      const context = new SimpleTestContext({ edge: 'test' });
      const expectedPattern = new ExpectedPatternV2(new ContextInfo(context, new Set(), new Statistics()));
      const actualPattern = new ActualPatternV2(new ContextInfo(context, new Set(), new Statistics()));
      
      const extremeValues = [0, Number.MIN_VALUE, Number.MAX_VALUE, Infinity];
      
      extremeValues.forEach(value => {
        if (isFinite(value)) {
          mockDistanceMetric.setFixedDistance(value);
          
          expect(() => {
            const result = link.performComprehensiveJudgement(expectedPattern, actualPattern);
            expect(result.referenceDifference.magnitude).toBe(value);
          }).not.toThrow();
        }
      });
    });

    test('空のコンテキストの処理', () => {
      const emptyContext = new SimpleTestContext(null);
      const expectedPattern = new ExpectedPatternV2(new ContextInfo(emptyContext, new Set(), new Statistics()));
      const actualPattern = new ActualPatternV2(new ContextInfo(emptyContext, new Set(), new Statistics()));
      
      expect(() => {
        link.performComprehensiveJudgement(expectedPattern, actualPattern);
      }).not.toThrow();
    });

    test('大量のタグとメタデータを持つコンテキストの処理', () => {
      const largeContext = new SimpleTestContext({ large: 'data' });
      const largeTags = new Set<Tag>();
      const largeStats = new Statistics();
      
      // 100個のタグを追加
      for (let i = 0; i < 100; i++) {
        largeTags.add(Tag.create(`tag_${i}`));
      }
      
      // 100個の統計情報を追加
      for (let i = 0; i < 100; i++) {
        largeStats.setNumber(`metric_${i}`, Math.random());
      }
      
      const expectedPattern = new ExpectedPatternV2(new ContextInfo(largeContext, largeTags, largeStats));
      const actualPattern = new ActualPatternV2(new ContextInfo(largeContext, largeTags, largeStats));
      
      const start = performance.now();
      const result = link.performComprehensiveJudgement(expectedPattern, actualPattern);
      const duration = performance.now() - start;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(50); // 50ms以内
    });

    test('特殊な文字を含むIDの処理', () => {
      const specialChars = ['🔗', '层→层', 'layer.1', 'layer/1', 'layer-1', 'LAYER_1'];
      
      specialChars.forEach(specialId => {
        expect(() => {
          new InterLayerRelativeJudgementLink(
            `upper_${specialId}`,
            `lower_${specialId}`,
            mockDistanceMetric,
            mockLearningRatePolicy,
            mockUpdateScopePolicy,
            mockSkipPolicy
          );
        }).not.toThrow();
      });
    });

    test('循環参照を含むメタデータの処理', () => {
      const circularMetadata = new Map();
      const circularObject: any = { name: 'circular' };
      circularObject.self = circularObject;
      circularMetadata.set('circular', circularObject);
      
      expect(() => {
        new InterLayerRelativeJudgementLink(
          'upper',
          'lower',
          mockDistanceMetric,
          mockLearningRatePolicy,
          mockUpdateScopePolicy,
          mockSkipPolicy,
          'circular_test',
          circularMetadata
        );
      }).not.toThrow();
    });
  });

  describe('並行アクセス・スレッドセーフティテスト', () => {
    test('同時アクセスでもデータ整合性が保たれる', async () => {
      const context = new SimpleTestContext({ concurrent: true });
      const expectedPattern = new ExpectedPatternV2(new ContextInfo(context, new Set(), new Statistics()));
      const actualPattern = new ActualPatternV2(new ContextInfo(context, new Set(), new Statistics()));
      
      // 10個の並行処理を実行
      const promises = Array.from({ length: 10 }, (_, i) => 
        Promise.resolve().then(() => {
          for (let j = 0; j < 10; j++) {
            link.performComprehensiveJudgement(expectedPattern, actualPattern);
          }
        })
      );
      
      await Promise.all(promises);
      
      const stats = link.getStatistics();
      expect(stats.totalJudgements).toBe(100);
      expect(link.getJudgementHistory().length).toBe(100);
    });
  });
});