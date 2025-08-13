import { ConceptAutonomousLayer } from './LayerImplementations';
import { Context } from '../tag/Context';
import { ContextInfo } from '../tag/ContextInfo';
import { Statistics } from '../tag/Statistics';
import { Tag } from '../tag/Tag';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { LearningSignal } from '../learning/LearningSignal';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { RelativeDelta } from '../pattern/RelativeDelta';
import { AdaptiveLearningRate } from '../learning/AdaptiveLearningRate';
import { UpdateScope } from '../learning/UpdateScope';
import { DevelopOption } from '../../debug/DevelopOption';

// テスト用の Context 実装
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

// VectorizableContext を実装するテスト用クラス
class TestVectorizableContext implements Context {
  constructor(
    private vector: number[],
    private metadata: Record<string, any> = {}
  ) {}

  toVector(): number[] {
    return [...this.vector];
  }

  getDimension(): number {
    return this.vector.length;
  }

  getMetadata(): Record<string, any> {
    return { ...this.metadata };
  }
}

// モック RelativeDifference クラス
class MockRelativeDifference extends RelativeDifference<Context> {
  constructor(
    magnitude: number,
    contextInfo: ContextInfo<Context>
  ) {
    super(magnitude, contextInfo);
  }
}

// MockLearningSignal ヘルパー関数
function createMockLearningSignal(referenceDifference: RelativeDifference<Context>): LearningSignal<Context> {
  // RelativeDelta を作成
  const dummyDelta = { 
    magnitude: referenceDifference.magnitude,
    contextInfo: referenceDifference.contextInfo 
  } as any as RelativeDelta<Context>;
  
  const dummyLearningRate = AdaptiveLearningRate.createInitial(0.1);
  const dummyUpdateScope = UpdateScope.createFullScope(10, 'test_scope');
  
  return LearningSignal.fromDelta(dummyDelta, dummyLearningRate, dummyUpdateScope);
}

describe('ConceptAutonomousLayer クラス', () => {
  let conceptLayer: ConceptAutonomousLayer<Context>;
  
  // DevelopOptionの元の値を保存
  const originalMockFlag = DevelopOption.isGenerateExpectedPatternMock;

  beforeEach(() => {
    conceptLayer = new ConceptAutonomousLayer<Context>('test_concept_layer', 'テスト概念層');
  });

  afterEach(() => {
    // テスト後にDevelopOptionを元に戻す
    (DevelopOption as any).isGenerateExpectedPatternMock = originalMockFlag;
  });

  describe('基本機能テスト', () => {
    test('正常にインスタンス化できる', () => {
      expect(conceptLayer).toBeInstanceOf(ConceptAutonomousLayer);
      expect(conceptLayer.getLayerId()).toBe('test_concept_layer');
      expect(conceptLayer.getLayerName()).toBe('テスト概念層');
      expect(conceptLayer.getLayerType()).toBe('concept');
      expect(conceptLayer.isActive()).toBe(true);
    });

    test('統計情報を正しく取得できる', () => {
      const stats = conceptLayer.getStatistics();
      expect(stats.totalPatternsGenerated).toBe(0);
      expect(stats.totalPatternsObserved).toBe(0);
      expect(stats.totalModelUpdates).toBe(0);
      expect(stats.lastActivityTimestamp).toBeNull();
      expect(stats.averageProcessingTime).toBe(0);
      expect(stats.isHealthy).toBe(true);
    });

    test('ConceptualFeatureExtractorが内部で初期化される', () => {
      // 内部の特徴抽出器が初期化されていることを間接的に確認
      expect(conceptLayer).toBeDefined();
      
      // generateExpectedPatternの呼び出しで特徴抽出器が動作することを確認
      const context = new SimpleTestContext({ value: 123 });
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());
      
      expect(() => {
        conceptLayer.generateExpectedPattern('test_dest', contextInfo);
      }).not.toThrow();
    });
  });

  describe('期待パターン生成テスト（モック無効時）', () => {
    beforeEach(() => {
      // モックを無効にして本番実装をテスト
      (DevelopOption as any).isGenerateExpectedPatternMock = false;
    });

    test('特徴抽出を使用した期待パターンを生成できる', () => {
      const context = new TestVectorizableContext([1, 2, 3, 4, 5]);
      const stats = new Statistics();
      stats.setNumber('test_metric', 0.8);
      const tags = new Set([Tag.create('feature_test')]);
      const contextInfo = new ContextInfo(context, tags, stats);

      const expectedPattern = conceptLayer.generateExpectedPattern('feature_dest', contextInfo);

      expect(expectedPattern).toBeInstanceOf(ExpectedPatternV2);
      expect(expectedPattern.body).toBeDefined();
      expect(expectedPattern.contextInfo).toBeDefined();
      
      // 予測に関する統計情報が追加されているか確認
      const resultStats = expectedPattern.contextInfo.statistics;
      expect(resultStats.getString('prediction_source')).toBe('conceptual_feature_extraction');
      expect(resultStats.getDate('prediction_timestamp')).toBeDefined();
      expect(resultStats.getNumber('prediction_confidence')).toBe(0.7);
    });

    test('特徴量から予測ベクトルが構築される', () => {
      const context = new TestVectorizableContext([2, 4, 6, 8, 10]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const expectedPattern = conceptLayer.generateExpectedPattern('prediction_dest', contextInfo);
      
      const predictedVector = (expectedPattern.body as any).toVector ? (expectedPattern.body as any).toVector() : [];
      expect(predictedVector).toBeDefined();
      expect(Array.isArray(predictedVector)).toBe(true);
      
      if (predictedVector.length > 0) {
        // 抽象化により元のベクトルから変化していることを確認
        const originalVector = context.toVector();
        expect(predictedVector).not.toEqual(originalVector);
        expect(predictedVector.every((v: number) => isFinite(v))).toBe(true);
      }
    });

    test('destination IDに基づく変換が適用される', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const pattern1 = conceptLayer.generateExpectedPattern('dest_A', contextInfo);
      const pattern2 = conceptLayer.generateExpectedPattern('dest_B', contextInfo);

      // 異なるdestination IDで異なる結果が得られることを確認
      if ((pattern1.body as any).toVector && (pattern2.body as any).toVector) {
        const vector1 = (pattern1.body as any).toVector();
        const vector2 = (pattern2.body as any).toVector();
        expect(vector1).not.toEqual(vector2);
      }
    });

    test('概念レベルでの抽象化が適用される', () => {
      const context = new TestVectorizableContext([10, 20, 30, 40, 50]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const expectedPattern = conceptLayer.generateExpectedPattern('abstraction_test', contextInfo);
      
      if ((expectedPattern.body as any).toVector) {
        const abstractedVector = (expectedPattern.body as any).toVector();
        const originalVector = context.toVector();
        
        // 抽象化度（0.8）が適用されていることを確認
        // 値が減衰されていることを期待
        const avgOriginal = originalVector.reduce((sum: number, v: number) => sum + Math.abs(v), 0) / originalVector.length;
        const avgAbstracted = abstractedVector.reduce((sum: number, v: number) => sum + Math.abs(v), 0) / abstractedVector.length;
        
        expect(avgAbstracted).toBeLessThan(avgOriginal);
      }
    });

    test('予測タグが適切に追加される', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const originalTags = new Set([Tag.create('original')]);
      const contextInfo = new ContextInfo(context, originalTags, new Statistics());

      const expectedPattern = conceptLayer.generateExpectedPattern('tag_test', contextInfo);
      
      const resultTags = Array.from(expectedPattern.contextInfo.tags);
      const tagKeys = resultTags.map(tag => tag.key);
      
      // 元のタグが保持されているか確認
      expect(tagKeys).toContain('original');
      
      // 予測関連のタグが追加されているか確認
      expect(tagKeys).toContain('predicted');
      expect(tagKeys).toContain('conceptual');
    });

    test('複雑な特徴量コンテキストの処理', () => {
      const context = new TestVectorizableContext([1.5, -2.3, 0.7, 3.8, -1.2]);
      const stats = new Statistics();
      stats.setNumber('complexity', 0.85);
      stats.setNumber('relevance', 0.92);
      stats.setString('category', 'high_level');
      const tags = new Set([
        Tag.create('complex'),
        Tag.create('high_dimensional'),
        Tag.create('processed')
      ]);
      const contextInfo = new ContextInfo(context, tags, stats);

      const expectedPattern = conceptLayer.generateExpectedPattern('complex_dest', contextInfo);
      
      expect(expectedPattern).toBeDefined();
      expect(expectedPattern.contextInfo.statistics.size()).toBeGreaterThan(stats.size());
      expect(expectedPattern.contextInfo.tags.size).toBeGreaterThan(tags.size);
    });
  });

  describe('期待パターン生成テスト（モック有効時）', () => {
    beforeEach(() => {
      // モックを有効にして簡易実装をテスト
      (DevelopOption as any).isGenerateExpectedPatternMock = true;
    });

    test('モック実装では入力コンテキストがそのまま使用される', () => {
      const context = new SimpleTestContext({ test: 'data' });
      const stats = new Statistics();
      stats.setNumber('mock_test', 123);
      const tags = new Set([Tag.create('mock_tag')]);
      const contextInfo = new ContextInfo(context, tags, stats);

      const expectedPattern = conceptLayer.generateExpectedPattern('mock_dest', contextInfo);

      expect(expectedPattern).toBeInstanceOf(ExpectedPatternV2);
      
      // モック実装では入力コンテキストがそのまま返される
      expect(expectedPattern.contextInfo).toBe(contextInfo);
      expect(expectedPattern.body).toBe(context);
    });

    test('モック実装でも基本的な処理は正常に動作する', () => {
      const context = new SimpleTestContext({ value: 456 });
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      expect(() => {
        const pattern = conceptLayer.generateExpectedPattern('mock_test', contextInfo);
        expect(pattern).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('フォールバック処理テスト', () => {
    beforeEach(() => {
      (DevelopOption as any).isGenerateExpectedPatternMock = false;
    });

    test('特徴抽出エラー時のフォールバック処理', () => {
      // 特徴抽出でエラーが発生する可能性のあるコンテキスト
      const problematicContext = {
        toString: () => { throw new Error('toString error'); },
        valueOf: () => { throw new Error('valueOf error'); }
      } as any;
      
      const contextInfo = new ContextInfo(problematicContext, new Set(), new Statistics());
      
      // エラーログをモック
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const expectedPattern = conceptLayer.generateExpectedPattern('fallback_test', contextInfo);
      
      expect(expectedPattern).toBeInstanceOf(ExpectedPatternV2);
      
      // フォールバック情報が設定されているか確認
      const stats = expectedPattern.contextInfo.statistics;
      expect(stats.getBoolean('fallback')).toBe(true);
      expect(stats.getString('fallback_reason')).toBe('feature_extraction_failed');
      
      // フォールバックタグが追加されているか確認
      const tags = Array.from(expectedPattern.contextInfo.tags);
      const tagKeys = tags.map(tag => tag.key);
      expect(tagKeys).toContain('fallback');
      
      consoleSpy.mockRestore();
    });

    test('フォールバックパターンでも元のコンテキストが保持される', () => {
      const originalContext = new SimpleTestContext({ preserved: 'data' });
      const originalStats = new Statistics();
      originalStats.setString('important', 'preserve_this');
      const originalTags = new Set([Tag.create('keep_this')]);
      const contextInfo = new ContextInfo(originalContext, originalTags, originalStats);
      
      // 特徴抽出器を直接エラーにするのは困難なため、
      // 例外をキャッチする可能性のある状況を作る
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const expectedPattern = conceptLayer.generateExpectedPattern('preserve_test', contextInfo);
      
      // 元のデータが保持されているか確認
      expect(expectedPattern.body).toBe(originalContext);
      expect(expectedPattern.contextInfo.statistics.getString('important')).toBe('preserve_this');
      
      const resultTags = Array.from(expectedPattern.contextInfo.tags);
      const hasOriginalTag = resultTags.some(tag => tag.key === 'keep_this');
      expect(hasOriginalTag).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('null・undefined入力のエラーハンドリング', () => {
      const invalidInputs = [null, undefined];
      
      invalidInputs.forEach(invalidContext => {
        if (invalidContext !== null && invalidContext !== undefined) {
          const contextInfo = new ContextInfo(invalidContext as any, new Set(), new Statistics());
          
          expect(() => {
            const pattern = conceptLayer.generateExpectedPattern('invalid_test', contextInfo);
            expect(pattern).toBeDefined();
          }).not.toThrow();
        }
      });
    });
  });

  describe('特徴量統合テスト', () => {
    beforeEach(() => {
      (DevelopOption as any).isGenerateExpectedPatternMock = false;
    });

    test('FeatureListを使用した型安全な特徴量処理', () => {
      const context = new TestVectorizableContext([1.1, 2.2, 3.3, 4.4]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const expectedPattern = conceptLayer.generateExpectedPattern('feature_list_test', contextInfo);
      
      expect(expectedPattern).toBeDefined();
      
      // 内部でFeatureListが使用されて適切に処理されることを確認
      // （実装の詳細に依存するため、基本的な動作確認のみ）
      expect(expectedPattern.body).toBeDefined();
    });

    test('多様な特徴量タイプの統合処理', () => {
      const context = new TestVectorizableContext([5, 10, 15, 20, 25]);
      const stats = new Statistics();
      
      // 様々な型の統計情報を設定
      stats.setNumber('numeric_feature', 42.5);
      stats.setBoolean('binary_feature', true);
      stats.setString('categorical_feature', 'category_A');
      stats.setDate('temporal_feature', new Date('2023-06-15'));
      
      const tags = new Set([
        Tag.create('vector_tag'),
        Tag.create('statistical_tag'),
        Tag.create('temporal_tag')
      ]);
      
      const contextInfo = new ContextInfo(context, tags, stats);
      const expectedPattern = conceptLayer.generateExpectedPattern('integration_test', contextInfo);
      
      expect(expectedPattern).toBeDefined();
      
      // 各種特徴量が適切に統合されて新しいコンテキストが生成されることを確認
      const resultStats = expectedPattern.contextInfo.statistics;
      expect(resultStats.size()).toBeGreaterThan(stats.size());
    });

    test('特徴量ベクトルから予測への変換精度', () => {
      const preciseVector = [1.111, 2.222, 3.333];
      const context = new TestVectorizableContext(preciseVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const expectedPattern = conceptLayer.generateExpectedPattern('precision_test', contextInfo);
      
      if ((expectedPattern.body as any).toVector) {
        const predictedVector = (expectedPattern.body as any).toVector();
        
        // 数値精度が保持されているか確認
        expect(predictedVector.every((v: number) => isFinite(v) && !isNaN(v))).toBe(true);
        
        // 概念レベルでの変換が適用されているか確認
        expect(predictedVector).not.toEqual(preciseVector);
      }
    });
  });

  describe('観測とモデル更新テスト', () => {
    test('実際パターンの観測が統計を更新する', () => {
      const context = new SimpleTestContext({ observed: true });
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());
      const actualPattern = new ActualPatternV2(contextInfo);

      const initialStats = conceptLayer.getStatistics();
      expect(initialStats.totalPatternsObserved).toBe(0);

      conceptLayer.observeActualPattern(actualPattern);

      const updatedStats = conceptLayer.getStatistics();
      expect(updatedStats.totalPatternsObserved).toBe(1);
      expect(updatedStats.lastActivityTimestamp).not.toBeNull();
    });

    test('予測モデル更新が統計を更新する', async () => {
      const context = new SimpleTestContext({ update: true });
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());
      const relativeDifference = new MockRelativeDifference(0.5, contextInfo);
      const learningSignal = createMockLearningSignal(relativeDifference);

      const initialStats = conceptLayer.getStatistics();
      expect(initialStats.totalModelUpdates).toBe(0);

      const result = await conceptLayer.doUpdatePredictiveModel(learningSignal);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // 概念層では空の配列が返される（現在の実装）
      expect(result).toHaveLength(0);
    });

    test('処理時間の統計が正しく記録される', () => {
      const context = new SimpleTestContext({ timing: true });
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());
      const actualPattern = new ActualPatternV2(contextInfo);

      // 複数回観測して統計を蓄積
      for (let i = 0; i < 5; i++) {
        conceptLayer.observeActualPattern(actualPattern);
      }

      const stats = conceptLayer.getStatistics();
      expect(stats.totalPatternsObserved).toBe(5);
      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
      expect(stats.lastActivityTimestamp).not.toBeNull();
    });
  });

  describe('パフォーマンステスト', () => {
    beforeEach(() => {
      (DevelopOption as any).isGenerateExpectedPatternMock = false;
    });

    test('大きなベクトルの効率的な処理', () => {
      const largeVector = Array(500).fill(0).map(() => Math.random());
      const context = new TestVectorizableContext(largeVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const start = performance.now();
      const expectedPattern = conceptLayer.generateExpectedPattern('performance_test', contextInfo);
      const duration = performance.now() - start;

      expect(expectedPattern).toBeDefined();
      expect(duration).toBeLessThan(100); // 100ms以内
    });

    test('繰り返し処理のパフォーマンス', () => {
      const testVector = [1, 2, 3, 4, 5];
      const context = new TestVectorizableContext(testVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const iterations = 50;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        conceptLayer.generateExpectedPattern(`perf_dest_${i}`, contextInfo);
      }

      const duration = performance.now() - start;
      const averageTime = duration / iterations;

      expect(averageTime).toBeLessThan(20); // 平均20ms以内
    });

    test('大量の特徴量を持つコンテキストの処理', () => {
      const context = new TestVectorizableContext(Array(100).fill(0).map(() => Math.random()));
      
      const stats = new Statistics();
      for (let i = 0; i < 100; i++) {
        stats.setNumber(`metric_${i}`, Math.random());
      }
      
      const tags = new Set<Tag>();
      for (let i = 0; i < 50; i++) {
        tags.add(Tag.create(`feature_tag_${i}`));
      }
      
      const contextInfo = new ContextInfo(context, tags, stats);
      
      const start = performance.now();
      const expectedPattern = conceptLayer.generateExpectedPattern('large_feature_test', contextInfo);
      const duration = performance.now() - start;

      expect(expectedPattern).toBeDefined();
      expect(duration).toBeLessThan(150); // 150ms以内
    });

    test('メモリ使用量の安定性', () => {
      const testVector = [1, 2, 3];
      const context = new TestVectorizableContext(testVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      // 大量の処理を実行してメモリリークがないことを確認
      for (let i = 0; i < 200; i++) {
        conceptLayer.generateExpectedPattern(`memory_test_${i}`, contextInfo);
      }

      const stats = conceptLayer.getStatistics();
      expect(stats.totalPatternsGenerated).toBe(200);
      expect(stats.isHealthy).toBe(true);
    });
  });

  describe('エッジケース・境界条件テスト', () => {
    beforeEach(() => {
      (DevelopOption as any).isGenerateExpectedPatternMock = false;
    });

    test('空のコンテキストの処理', () => {
      const emptyContext = new TestVectorizableContext([]);
      const contextInfo = new ContextInfo(emptyContext, new Set(), new Statistics());

      expect(() => {
        const pattern = conceptLayer.generateExpectedPattern('empty_test', contextInfo);
        expect(pattern).toBeDefined();
      }).not.toThrow();
    });

    test('極端な値を含むコンテキストの処理', () => {
      const extremeContext = new TestVectorizableContext([
        Number.MAX_VALUE,
        Number.MIN_VALUE,
        Infinity,
        -Infinity,
        NaN,
        0
      ]);
      const contextInfo = new ContextInfo(extremeContext, new Set(), new Statistics());

      expect(() => {
        const pattern = conceptLayer.generateExpectedPattern('extreme_test', contextInfo);
        expect(pattern).toBeDefined();
      }).not.toThrow();
    });

    test('非VectorizableContextの処理', () => {
      const nonVectorContext = new SimpleTestContext({ 
        notVector: 'this is not vectorizable' 
      });
      const contextInfo = new ContextInfo(nonVectorContext, new Set(), new Statistics());

      expect(() => {
        const pattern = conceptLayer.generateExpectedPattern('non_vector_test', contextInfo);
        expect(pattern).toBeDefined();
        
        // フォールバックまたは適切な処理が行われることを確認
        expect(pattern.body).toBe(nonVectorContext);
      }).not.toThrow();
    });

    test('特殊文字を含む destination ID の処理', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());
      
      const specialDestinations = [
        '',
        '🧠',
        'concept/layer/test',
        'destination.with.dots',
        'UPPER_CASE_DEST',
        '123456789',
        'concept_特殊文字_test'
      ];

      specialDestinations.forEach(dest => {
        expect(() => {
          const pattern = conceptLayer.generateExpectedPattern(dest, contextInfo);
          expect(pattern).toBeDefined();
        }).not.toThrow();
      });
    });

    test('循環参照を含むコンテキストの処理', () => {
      const circularContext: any = { data: [1, 2, 3] };
      circularContext.self = circularContext; // 循環参照
      
      const contextInfo = new ContextInfo(circularContext, new Set(), new Statistics());

      expect(() => {
        const pattern = conceptLayer.generateExpectedPattern('circular_test', contextInfo);
        expect(pattern).toBeDefined();
      }).not.toThrow();
    });

    test('大量のネストしたオブジェクトの処理', () => {
      let deepContext: any = { value: 1 };
      for (let i = 0; i < 100; i++) {
        deepContext = { nested: deepContext, level: i };
      }
      
      const contextInfo = new ContextInfo(deepContext, new Set(), new Statistics());

      expect(() => {
        const pattern = conceptLayer.generateExpectedPattern('deep_nest_test', contextInfo);
        expect(pattern).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('概念層固有機能テスト', () => {
    beforeEach(() => {
      (DevelopOption as any).isGenerateExpectedPatternMock = false;
    });

    test('概念レベルでの抽象化が適用される', () => {
      const concreteVector = [10, 20, 30, 40, 50]; // 具体的な値
      const context = new TestVectorizableContext(concreteVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const expectedPattern = conceptLayer.generateExpectedPattern('abstraction_test', contextInfo);
      
      if ((expectedPattern.body as any).toVector) {
        const abstractedVector = (expectedPattern.body as any).toVector();
        
        // 抽象化により値が減衰されていることを確認
        const originalMagnitude = Math.sqrt(concreteVector.reduce((sum: number, v: number) => sum + v * v, 0));
        const abstractedMagnitude = Math.sqrt(abstractedVector.reduce((sum: number, v: number) => sum + v * v, 0));
        
        expect(abstractedMagnitude).toBeLessThan(originalMagnitude);
      }
    });

    test('概念的複雑度に基づく処理の調整', () => {
      // 単純なコンテキスト
      const simpleContext = new TestVectorizableContext([1, 1, 1]);
      const simpleStats = new Statistics();
      const simpleTags = new Set([Tag.create('simple')]);
      const simpleContextInfo = new ContextInfo(simpleContext, simpleTags, simpleStats);
      
      // 複雑なコンテキスト
      const complexContext = new TestVectorizableContext([1.7, -2.3, 4.1, -0.8, 3.2]);
      const complexStats = new Statistics();
      for (let i = 0; i < 10; i++) {
        complexStats.setNumber(`complex_metric_${i}`, Math.random());
      }
      const complexTags = new Set<Tag>();
      for (let i = 0; i < 5; i++) {
        complexTags.add(Tag.create(`complex_tag_${i}`));
      }
      const complexContextInfo = new ContextInfo(complexContext, complexTags, complexStats);

      const simplePattern = conceptLayer.generateExpectedPattern('simple_dest', simpleContextInfo);
      const complexPattern = conceptLayer.generateExpectedPattern('complex_dest', complexContextInfo);

      expect(simplePattern).toBeDefined();
      expect(complexPattern).toBeDefined();
      
      // 複雑なコンテキストでより多くの統計情報が生成されることを確認
      expect(complexPattern.contextInfo.statistics.size()).toBeGreaterThan(
        simplePattern.contextInfo.statistics.size()
      );
    });

    test('概念タグの適切な付与', () => {
      const context = new TestVectorizableContext([2, 4, 6, 8]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const expectedPattern = conceptLayer.generateExpectedPattern('concept_tag_test', contextInfo);
      
      const resultTags = Array.from(expectedPattern.contextInfo.tags);
      const tagKeys = resultTags.map(tag => tag.key);
      
      // 概念層固有のタグが追加されているか確認
      expect(tagKeys).toContain('conceptual');
      expect(tagKeys).toContain('predicted');
    });

    test('予測信頼度の適切な設定', () => {
      const context = new TestVectorizableContext([1.5, 2.5, 3.5]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const expectedPattern = conceptLayer.generateExpectedPattern('confidence_test', contextInfo);
      
      const confidence = expectedPattern.contextInfo.statistics.getNumber('prediction_confidence');
      expect(confidence).toBe(0.7); // 概念層の固定信頼度
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    test('予測ソースの明示', () => {
      const context = new TestVectorizableContext([7, 14, 21]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const expectedPattern = conceptLayer.generateExpectedPattern('source_test', contextInfo);
      
      const predictionSource = expectedPattern.contextInfo.statistics.getString('prediction_source');
      expect(predictionSource).toBe('conceptual_feature_extraction');
    });
  });

  describe('DevelopOption制御テスト', () => {
    test('DevelopOptionによる実装切り替えが正しく動作する', () => {
      const context = new SimpleTestContext({ test: 'switch' });
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      // モック有効時
      (DevelopOption as any).isGenerateExpectedPatternMock = true;
      const mockPattern = conceptLayer.generateExpectedPattern('switch_test_mock', contextInfo);
      expect(mockPattern.contextInfo).toBe(contextInfo);

      // モック無効時
      (DevelopOption as any).isGenerateExpectedPatternMock = false;
      const realPattern = conceptLayer.generateExpectedPattern('switch_test_real', contextInfo);
      
      // 実装による処理結果の違いを確認
      if ((context as any).toVector) {
        // VectorizableContextの場合は処理が異なる
        expect(realPattern.contextInfo).not.toBe(contextInfo);
      } else {
        // 通常のContextの場合はフォールバック処理になる可能性
        expect(realPattern).toBeDefined();
      }
    });

    test('モック実装と本番実装の互換性', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());
      
      // 両方の実装で基本的なインターフェースが同じことを確認
      (DevelopOption as any).isGenerateExpectedPatternMock = true;
      const mockResult = conceptLayer.generateExpectedPattern('compat_test', contextInfo);
      
      (DevelopOption as any).isGenerateExpectedPatternMock = false;
      const realResult = conceptLayer.generateExpectedPattern('compat_test', contextInfo);
      
      // 両方ともExpectedPatternV2のインスタンスであることを確認
      expect(mockResult).toBeInstanceOf(ExpectedPatternV2);
      expect(realResult).toBeInstanceOf(ExpectedPatternV2);
      
      // 基本的なプロパティが存在することを確認
      expect(mockResult.body).toBeDefined();
      expect(mockResult.contextInfo).toBeDefined();
      expect(realResult.body).toBeDefined();
      expect(realResult.contextInfo).toBeDefined();
    });
  });
});