import { InterLayerRelativeJudgementLink } from './InterLayerRelativeJudgementLink';
import { LearningRatePolicy, UpdateScopePolicy, SkipPolicy } from './PolicyInterfaces';
import { DifferenceDistanceMetric, DistanceMetricType, DistanceMetricFactory } from '../metrics/interfaces';
import { DistanceMetricFactoryImpl } from '../metrics/DistanceMetricFactory';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { ContextInfo } from '../tag/ContextInfo';
import { VectorizableContext } from '../tag/VectorizableContext';
import { AdaptiveLearningRate, LearningRateOrigin } from '../learning/AdaptiveLearningRate';
import { UpdateScope } from '../learning/UpdateScope';
import { SkipEnum } from './SkipEnum';
import { RelativeDifference } from '../pattern/RelativeDifference';
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

describe('SD-08: 距離メトリクス動的切替', () => {
  let factory: DistanceMetricFactory;
  let mockLearningRatePolicy: jest.Mocked<LearningRatePolicy<MockContext>>;
  let mockUpdateScopePolicy: jest.Mocked<UpdateScopePolicy<MockContext>>;
  let mockSkipPolicy: jest.Mocked<SkipPolicy<MockContext>>;

  beforeEach(() => {
    factory = DistanceMetricFactoryImpl.getInstance();
    
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
  });

  // === SD-08シーケンス図対応テストケース ===

  describe('距離メトリクスファクトリー解決処理', () => {
    (DevelopOption.isExecute_SD_08_factory_resolve ? test : test.skip)('正常系：文脈に基づくメトリクス種別選択とファクトリー解決', () => {
      // シーケンス図 25-32行目: Link -> Factory: resolve(距離メトリクス種別.EMD)
      
      // 文脈に基づくメトリクス種別の決定ロジックをシミュレート
      const contextBasedMetricSelection = (context: ContextInfo<MockContext>): DistanceMetricType => {
        const tags = Array.from(context.tags);
        const vector = context.body.toVector();
        
        // 文脈に応じたメトリクス選択ロジック
        if (tags.some(tag => tag.stringValue && tag.stringValue.includes('emd'))) {
          return DistanceMetricType.EMD;
        } else if (tags.some(tag => tag.stringValue && tag.stringValue.includes('cosine'))) {
          return DistanceMetricType.Cosine;
        } else if (vector.length > 10) {
          return DistanceMetricType.KL_Divergence;
        } else {
          return DistanceMetricType.L2;
        }
      };

      // テスト用の文脈を作成
      const context = new ContextInfo(new MockContext([0.1, 0.2, 0.3]), new Set([Tag.create('emd_test')]), new Map());
      
      // 文脈に基づくメトリクス選択
      const selectedType = contextBasedMetricSelection(context);
      expect(selectedType).toBe(DistanceMetricType.EMD);
      
      // ファクトリーによる解決
      const resolvedMetric = factory.resolve<MockContext>(selectedType);
      
      // 解決されたメトリクスの検証
      expect(resolvedMetric).toBeDefined();
      expect(resolvedMetric.getName()).toBe('EMD');
      const factoryImpl = factory as any;
      expect(factoryImpl.isSupported(selectedType)).toBe(true);
    });
  });

  describe('動的メトリクス切替処理', () => {
    (DevelopOption.isExecute_SD_08_metric_switching ? test : test.skip)('正常系：EMD距離による実際の距離計算実行', () => {
      // シーケンス図 34-37行目: Link -> EMDMetric: 距離(期待, 実際)
      
      // 複数メトリクスによる動的切替テスト
      const testMetrics = [
        { type: DistanceMetricType.L2, expectedName: 'L2' },
        { type: DistanceMetricType.Cosine, expectedName: 'Cosine' },
        { type: DistanceMetricType.KL_Divergence, expectedName: 'KL_Divergence' },
        { type: DistanceMetricType.EMD, expectedName: 'EMD' }
      ];

      testMetrics.forEach(({ type, expectedName }) => {
        // 各メトリクスを解決
        const metric = factory.resolve<MockContext>(type);
        
        // テスト用パターンを作成
        const expectedPattern = new ExpectedPatternV2<MockContext>(
          new ContextInfo(new MockContext([0.5, 0.5, 0.5]), new Set([Tag.create('dynamic_test')]), new Map())
        );
        const actualPattern = new ActualPatternV2<MockContext>(
          new ContextInfo(new MockContext([0.3, 0.7, 0.4]), new Set([Tag.create('dynamic_test')]), new Map())
        );

        // 距離計算を実行
        const distance = metric.distance(expectedPattern, actualPattern);
        
        // 距離計算の検証
        expect(distance).toBeGreaterThanOrEqual(0);
        expect(metric.getName()).toBe(expectedName);
        expect(metric.isValidDistance(distance)).toBe(true);
      });

      // 特にEMD距離での詳細テスト（シーケンス図の例）
      const emdMetric = factory.resolve<MockContext>(DistanceMetricType.EMD);
      expect(emdMetric.getName()).toBe('EMD');
    });
  });

  describe('相対差分生成処理', () => {
    (DevelopOption.isExecute_SD_08_difference_generation ? test : test.skip)('正常系：距離から相対差分への変換処理', () => {
      // シーケンス図 39行目: Link -> Link: 距離から相対差分を生成
      
      // EMDメトリクスを使用して距離計算から相対差分生成まで一連の流れをテスト
      const emdMetric = factory.resolve<MockContext>(DistanceMetricType.EMD);
      
      // テスト用パターンを作成
      const expectedPattern = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.8, 0.2, 0.1]), new Set([Tag.create('difference_test')]), new Map())
      );
      const actualPattern = new ActualPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.5, 0.4, 0.3]), new Set([Tag.create('difference_test')]), new Map())
      );
      
      // 距離を計算
      const distance = emdMetric.distance(expectedPattern, actualPattern);
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(emdMetric.isValidDistance(distance)).toBe(true);
      
      // 距離から相対差分への変換をシミュレート
      const generateRelativeDifference = (
        expected: ExpectedPatternV2<MockContext>, 
        actual: ActualPatternV2<MockContext>, 
        calculatedDistance: number
      ): RelativeDifference<MockContext> => {
        
        // 相対差分の計算ロジック
        const contextDiff = new ContextInfo(
          new MockContext([
            expected.contextInfo.body.toVector()[0] - actual.contextInfo.body.toVector()[0],
            expected.contextInfo.body.toVector()[1] - actual.contextInfo.body.toVector()[1],
            expected.contextInfo.body.toVector()[2] - actual.contextInfo.body.toVector()[2]
          ]),
          expected.contextInfo.tags,
          new Map(expected.contextInfo.statistics)
        );
        
        // 相対差分オブジェクトを生成
        return new RelativeDifference<MockContext>(
          Math.sqrt(calculatedDistance), // magnitudeは距離の平方根として計算
          contextDiff
        );
      };
      
      // 相対差分を生成
      const relativeDifference = generateRelativeDifference(expectedPattern, actualPattern, distance);
      
      // 相対差分の検証
      expect(relativeDifference).toBeDefined();
      // RelativeDifferenceにはdistanceプロパティがないため、magnitudeで検証
      expect(relativeDifference.magnitude).toBeGreaterThanOrEqual(0);
      expect(relativeDifference.contextInfo).toBeDefined();
      expect(relativeDifference.contextInfo.body).toBeDefined();
      expect(relativeDifference.getComputedAt()).toBeInstanceOf(Date);
      
      // 生成された相対差分がポリシーで使用可能であることを確認
      const learningRate = mockLearningRatePolicy.learningRate(relativeDifference, expectedPattern.contextInfo);
      const scope = mockUpdateScopePolicy.scope(relativeDifference, expectedPattern.contextInfo);
      const skipDecision = mockSkipPolicy.judgeSkip(relativeDifference);
      
      expect(learningRate).toBeDefined();
      expect(learningRate.value).toBeGreaterThan(0);
      expect(scope).toBeDefined();
      expect(scope.parameterIds.size).toBeGreaterThan(0);
      expect(skipDecision).toBeDefined();
      expect(Object.values(SkipEnum)).toContain(skipDecision);
    });
  });
});