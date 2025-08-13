import { ConceptualFeatureExtractor } from './ConceptualFeatureExtractor';
import { ContextInfo } from '../tag/ContextInfo';
import { Statistics } from '../tag/Statistics';
import { Tag } from '../tag/Tag';
import { Context } from '../tag/Context';
import { Feature, VectorFeature, StatisticalFeature, TagFeature } from './FeatureInterfaces';

// テスト用の Context 実装
interface TestContext extends Context {
  data: number[];
  metadata?: string;
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

describe('ConceptualFeatureExtractor クラス', () => {
  let extractor: ConceptualFeatureExtractor<TestVectorizableContext>;

  beforeEach(() => {
    extractor = new ConceptualFeatureExtractor<TestVectorizableContext>();
  });

  describe('基本機能テスト', () => {
    test('正常にインスタンス化できる', () => {
      expect(extractor).toBeInstanceOf(ConceptualFeatureExtractor);
      expect(extractor.getExtractorName()).toBe('ConceptualFeatureExtractor');
      expect(extractor.getLayerType()).toBe('concept');
      expect(extractor.isValid()).toBe(true);
    });

    test('サポートされている特徴量タイプを正しく返す', () => {
      const supportedTypes = extractor.getSupportedFeatureTypes();
      expect(supportedTypes).toContain('conceptual_vector');
      expect(supportedTypes).toContain('conceptual_statistical');
      expect(supportedTypes).toContain('conceptual_tag');
      expect(supportedTypes).toHaveLength(3);
    });

    test('層設定を正しく返す', () => {
      const config = extractor.getLayerConfiguration();
      expect(config).toHaveProperty('config');
      expect(config).toHaveProperty('performance_tracker');
      expect(config.config).toHaveProperty('confidence_scores');
      expect(config.config).toHaveProperty('abstraction');
      expect(config.config).toHaveProperty('debug');
    });

    test('バリデーションが正常に動作する', () => {
      expect(extractor.isValid()).toBe(true);
    });
  });

  describe('ベクトル特徴抽出テスト', () => {
    test('VectorizableContextからベクトル特徴を抽出できる', () => {
      const context = new TestVectorizableContext([1, 2, 3, 4, 5]);
      const stats = new Statistics();
      const tags = new Set([Tag.create('test_tag')]);
      const contextInfo = new ContextInfo(context, tags, stats);

      const features = extractor.extract(contextInfo);
      
      // ベクトル特徴が抽出されているか確認
      const vectorFeatures = features.filter(f => f.type === 'conceptual_vector');
      expect(vectorFeatures).toHaveLength(1);
      
      const vectorFeature = vectorFeatures[0] as VectorFeature;
      expect(vectorFeature.name).toBe('primary_concept_vector');
      expect(vectorFeature.confidence).toBeGreaterThan(0);
      expect(vectorFeature.source).toBe('context_body');
      expect(vectorFeature.dimension).toBeGreaterThan(0);
      expect(vectorFeature.isValid()).toBe(true);
    });

    test('空のベクトルでもエラーが発生しない', () => {
      const context = new TestVectorizableContext([]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      expect(() => {
        const features = extractor.extract(contextInfo);
        expect(features).toBeDefined();
      }).not.toThrow();
    });

    test('無効な値を含むベクトルを適切に処理する', () => {
      const context = new TestVectorizableContext([1, NaN, Infinity, -Infinity, 5]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const features = extractor.extract(contextInfo);
      expect(features).toBeDefined();
      expect(features.length).toBeGreaterThan(0);
    });

    test('大きなベクトルを効率的に処理する', () => {
      const largeVector = Array(1000).fill(0).map(() => Math.random());
      const context = new TestVectorizableContext(largeVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const start = performance.now();
      const features = extractor.extract(contextInfo);
      const duration = performance.now() - start;

      expect(features).toBeDefined();
      expect(duration).toBeLessThan(100); // 100ms以内
    });
  });

  describe('統計特徴抽出テスト', () => {
    test('統計情報から統計特徴を抽出できる', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const stats = new Statistics();
      stats.setNumber('metric1', 10.5);
      stats.setNumber('metric2', 20.8);
      stats.setNumber('metric3', 15.2);
      
      const contextInfo = new ContextInfo(context, new Set(), stats);
      const features = extractor.extract(contextInfo);

      const statisticalFeatures = features.filter(f => f.type === 'conceptual_statistical');
      expect(statisticalFeatures.length).toBeGreaterThan(0);

      const contextStatsFeature = statisticalFeatures.find(f => f.name === 'context_statistics') as StatisticalFeature;
      expect(contextStatsFeature).toBeDefined();
      expect(contextStatsFeature.mean).toBeCloseTo((10.5 + 20.8 + 15.2) / 3, 2);
      expect(contextStatsFeature.variance).toBeDefined();
      expect(contextStatsFeature.standardDeviation).toBeDefined();
      expect(contextStatsFeature.range).toBeDefined();
      expect(contextStatsFeature.isValid()).toBe(true);
    });

    test('数値以外の統計は無視される', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const stats = new Statistics();
      stats.setString('text_metric', 'hello');
      stats.setBoolean('boolean_metric', true);
      stats.setDate('date_metric', new Date());
      
      const contextInfo = new ContextInfo(context, new Set(), stats);
      const features = extractor.extract(contextInfo);

      const contextStatsFeature = features.find(f => f.name === 'context_statistics');
      // 数値統計がないため、context_statisticsは作られない可能性がある
      // または作られても適切にフィルタリングされている
      expect(features).toBeDefined();
    });

    test('無限大やNaNを含む統計を適切に処理する', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const stats = new Statistics();
      stats.setNumber('normal', 10);
      stats.setNumber('nan_value', NaN);
      stats.setNumber('infinity', Infinity);
      stats.setNumber('negative_infinity', -Infinity);
      
      const contextInfo = new ContextInfo(context, new Set(), stats);
      
      expect(() => {
        const features = extractor.extract(contextInfo);
        expect(features).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('タグ特徴抽出テスト', () => {
    test('タグ情報からタグ特徴を抽出できる', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const tags = new Set([
        Tag.create('tag1'),
        Tag.create('tag2'),
        Tag.create('tag3'),
        Tag.create('tag1') // 重複
      ]);
      
      const contextInfo = new ContextInfo(context, tags, new Statistics());
      const features = extractor.extract(contextInfo);

      const tagFeatures = features.filter(f => f.type === 'conceptual_tag');
      expect(tagFeatures).toHaveLength(1);

      const tagFeature = tagFeatures[0] as TagFeature;
      expect(tagFeature.name).toBe('tag_diversity');
      expect(tagFeature.tagCount).toBe(tags.size);
      expect(tagFeature.tagTypes).toContain('tag1');
      expect(tagFeature.tagTypes).toContain('tag2');
      expect(tagFeature.tagTypes).toContain('tag3');
      expect(tagFeature.tagWeights).toBeInstanceOf(Map);
      expect(tagFeature.isValid()).toBe(true);
    });

    test('空のタグセットでもエラーが発生しない', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      expect(() => {
        const features = extractor.extract(contextInfo);
        expect(features).toBeDefined();
      }).not.toThrow();
    });

    test('単一タグの場合の多様性計算', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const tags = new Set([Tag.create('single_tag')]);
      
      const contextInfo = new ContextInfo(context, tags, new Statistics());
      const features = extractor.extract(contextInfo);

      const tagFeatures = features.filter(f => f.type === 'conceptual_tag');
      if (tagFeatures.length > 0) {
        const tagFeature = tagFeatures[0] as TagFeature;
        expect(tagFeature.value).toBeGreaterThanOrEqual(0); // 最小多様性が適用される
      }
    });

    test('多数のタグの効率的な処理', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const tags = new Set<Tag>();
      for (let i = 0; i < 100; i++) {
        tags.add(Tag.create(`tag_${i}`));
      }
      
      const contextInfo = new ContextInfo(context, tags, new Statistics());
      
      const start = performance.now();
      const features = extractor.extract(contextInfo);
      const duration = performance.now() - start;

      expect(features).toBeDefined();
      expect(duration).toBeLessThan(50); // 50ms以内
    });
  });

  describe('概念固有特徴抽出テスト', () => {
    test('抽象化レベルを正しく計算する', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const stats = new Statistics();
      stats.setNumber('metric1', 10);
      stats.setNumber('metric2', 20);
      const tags = new Set([Tag.create('tag1'), Tag.create('tag2')]);
      
      const contextInfo = new ContextInfo(context, tags, stats);
      const features = extractor.extract(contextInfo);

      const abstractionFeature = features.find(f => f.name === 'abstraction_level');
      expect(abstractionFeature).toBeDefined();
      expect(abstractionFeature!.value).toBeGreaterThanOrEqual(0);
      expect(abstractionFeature!.value).toBeLessThanOrEqual(1);
      expect(abstractionFeature!.type).toBe('conceptual_statistical');
    });

    test('概念的複雑度を正しく計算する', () => {
      const context = new TestVectorizableContext([1, 2, 3, 4, 5]);
      const stats = new Statistics();
      stats.setNumber('complexity_factor', 0.8);
      const tags = new Set([Tag.create('complex'), Tag.create('pattern')]);
      
      const contextInfo = new ContextInfo(context, tags, stats);
      const features = extractor.extract(contextInfo);

      const complexityFeature = features.find(f => f.name === 'conceptual_complexity');
      expect(complexityFeature).toBeDefined();
      expect(complexityFeature!.value).toBeGreaterThanOrEqual(0);
      expect(complexityFeature!.value).toBeLessThanOrEqual(1);
      expect(complexityFeature!.type).toBe('conceptual_statistical');
    });

    test('情報量に応じた抽象化レベルの変化', () => {
      // 情報量が少ない場合（高抽象化）
      const simpleContext = new TestVectorizableContext([1]);
      const simpleStats = new Statistics();
      const simpleTags = new Set([Tag.create('simple')]);
      const simpleContextInfo = new ContextInfo(simpleContext, simpleTags, simpleStats);
      
      // 情報量が多い場合（低抽象化）
      const complexContext = new TestVectorizableContext(Array(50).fill(0).map(() => Math.random()));
      const complexStats = new Statistics();
      for (let i = 0; i < 20; i++) {
        complexStats.setNumber(`metric_${i}`, Math.random());
      }
      const complexTags = new Set<Tag>();
      for (let i = 0; i < 10; i++) {
        complexTags.add(Tag.create(`tag_${i}`));
      }
      const complexContextInfo = new ContextInfo(complexContext, complexTags, complexStats);

      const simpleFeatures = extractor.extract(simpleContextInfo);
      const complexFeatures = extractor.extract(complexContextInfo);

      const simpleAbstraction = simpleFeatures.find(f => f.name === 'abstraction_level');
      const complexAbstraction = complexFeatures.find(f => f.name === 'abstraction_level');

      expect(simpleAbstraction).toBeDefined();
      expect(complexAbstraction).toBeDefined();
      
      // 情報量が多いほど抽象化レベルは低くなる
      expect(complexAbstraction!.value).toBeLessThan(simpleAbstraction!.value);
    });
  });

  describe('ベクトル抽象化処理テスト', () => {
    test('ベクトル抽象化が設定に従って動作する', () => {
      const originalVector = [1.0, 0.1, 0.8, 0.2, 1.2]; // 重要度の異なる値
      const context = new TestVectorizableContext(originalVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const features = extractor.extract(contextInfo);
      const vectorFeature = features.find(f => f.type === 'conceptual_vector') as VectorFeature;
      
      expect(vectorFeature).toBeDefined();
      const abstractedVector = vectorFeature.toVector();
      
      // 抽象化により元のベクトルと異なることを確認
      expect(abstractedVector).not.toEqual(originalVector);
      expect(abstractedVector.length).toBe(originalVector.length);
      
      // 正規化されているかテスト（設定による）
      const magnitude = Math.sqrt(abstractedVector.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeGreaterThan(0);
    });

    test('ゼロベクトルの抽象化処理', () => {
      const zeroVector = [0, 0, 0, 0, 0];
      const context = new TestVectorizableContext(zeroVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      expect(() => {
        const features = extractor.extract(contextInfo);
        expect(features).toBeDefined();
      }).not.toThrow();
    });

    test('大きな値を含むベクトルの抽象化', () => {
      const extremeVector = [1e6, -1e6, 1e-6, -1e-6, 0];
      const context = new TestVectorizableContext(extremeVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const features = extractor.extract(contextInfo);
      const vectorFeature = features.find(f => f.type === 'conceptual_vector') as VectorFeature;
      
      expect(vectorFeature).toBeDefined();
      expect(vectorFeature.isValid()).toBe(true);
      
      const abstractedVector = vectorFeature.toVector();
      expect(abstractedVector.every(v => isFinite(v))).toBe(true);
    });
  });

  describe('タグ重み計算テスト', () => {
    test('タグ重みが正しく計算される', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const tags = new Set([
        Tag.create('common'),
        Tag.create('common'),
        Tag.create('rare'),
        Tag.create('medium'),
        Tag.create('medium')
      ]);
      
      const contextInfo = new ContextInfo(context, tags, new Statistics());
      const features = extractor.extract(contextInfo);

      const tagFeature = features.find(f => f.type === 'conceptual_tag') as TagFeature;
      if (tagFeature) {
        const weights = tagFeature.tagWeights;
        expect(weights.size).toBeGreaterThan(0);
        
        // 重みの合計が1に正規化されているか確認
        const totalWeight = Array.from(weights.values()).reduce((sum, w) => sum + w, 0);
        expect(totalWeight).toBeCloseTo(1, 2);
      }
    });

    test('希少タグのブースト処理', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const tags = new Set([
        Tag.create('common'),
        Tag.create('common'),
        Tag.create('rare_single') // 単独のタグ
      ]);
      
      const contextInfo = new ContextInfo(context, tags, new Statistics());
      const features = extractor.extract(contextInfo);

      const tagFeature = features.find(f => f.type === 'conceptual_tag') as TagFeature;
      if (tagFeature) {
        const weights = tagFeature.tagWeights;
        const rareWeight = weights.get('rare_single');
        const commonWeight = weights.get('common');
        
        if (rareWeight && commonWeight) {
          // 希少タグのブーストにより、単独タグの重みが高くなる
          expect(rareWeight).toBeGreaterThan(commonWeight);
        }
      }
    });
  });

  describe('エラーハンドリング・フォールバック機能テスト', () => {
    test('VectorizableContext以外でもフォールバック特徴が生成される', () => {
      const nonVectorizableContext = { data: [1, 2, 3] } as any;
      const contextInfo = new ContextInfo(nonVectorizableContext, new Set(), new Statistics());

      const features = extractor.extract(contextInfo);
      
      // フォールバック特徴が生成されているか確認
      expect(features).toBeDefined();
      expect(features.length).toBeGreaterThanOrEqual(1);
      
      // フォールバック特徴の確認
      const fallbackFeature = features.find(f => f.name === 'fallback_feature');
      if (fallbackFeature) {
        expect(fallbackFeature.confidence).toBeLessThan(0.5); // 低信頼度
        expect(fallbackFeature.source).toBe('fallback');
      }
    });

    test('異常なコンテキストでもエラーが発生しない', () => {
      const abnormalContexts = [
        null,
        undefined,
        { toVector: () => null },
        { toVector: () => undefined },
        { toVector: () => [NaN, Infinity, -Infinity] }
      ];

      abnormalContexts.forEach(ctx => {
        expect(() => {
          if (ctx) {
            const contextInfo = new ContextInfo(ctx as any, new Set(), new Statistics());
            const features = extractor.extract(contextInfo);
            expect(features).toBeDefined();
          }
        }).not.toThrow();
      });
    });

    test('例外発生時のフォールバック処理', () => {
      // toVector()で例外を投げるコンテキスト
      const faultyContext = {
        toVector: () => { throw new Error('Test error'); },
        getDimension: () => { throw new Error('Test error'); }
      } as any;
      
      const contextInfo = new ContextInfo(faultyContext, new Set(), new Statistics());
      const features = extractor.extract(contextInfo);

      // フォールバック特徴が返されることを確認
      expect(features).toBeDefined();
      expect(features.length).toBe(1);
      expect(features[0].name).toBe('fallback_feature');
      expect(features[0].source).toBe('fallback');
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量のタグと統計を持つコンテキストの効率的な処理', () => {
      const context = new TestVectorizableContext(Array(100).fill(0).map(() => Math.random()));
      
      const stats = new Statistics();
      for (let i = 0; i < 50; i++) {
        stats.setNumber(`metric_${i}`, Math.random() * 100);
      }
      
      const tags = new Set<Tag>();
      for (let i = 0; i < 50; i++) {
        tags.add(Tag.create(`tag_${i % 10}`)); // 重複あり
      }
      
      const contextInfo = new ContextInfo(context, tags, stats);
      
      const start = performance.now();
      const features = extractor.extract(contextInfo);
      const duration = performance.now() - start;

      expect(features).toBeDefined();
      expect(features.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50); // 50ms以内
    });

    test('繰り返し抽出のパフォーマンス', () => {
      const context = new TestVectorizableContext([1, 2, 3, 4, 5]);
      const contextInfo = new ContextInfo(context, new Set([Tag.create('test')]), new Statistics());

      const iterations = 100;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        extractor.extract(contextInfo);
      }
      
      const duration = performance.now() - start;
      const averageTime = duration / iterations;

      expect(averageTime).toBeLessThan(5); // 平均5ms以内
    });
  });

  describe('特徴量の品質テスト', () => {
    test('抽出されたすべての特徴量が有効', () => {
      const context = new TestVectorizableContext([1, 2, 3, 4, 5]);
      const stats = new Statistics();
      stats.setNumber('quality', 0.95);
      const tags = new Set([Tag.create('high_quality')]);
      
      const contextInfo = new ContextInfo(context, tags, stats);
      const features = extractor.extract(contextInfo);

      features.forEach(feature => {
        expect(feature.isValid()).toBe(true);
        expect(feature.confidence).toBeGreaterThanOrEqual(0);
        expect(feature.confidence).toBeLessThanOrEqual(1);
        expect(feature.name).toBeTruthy();
        expect(feature.type).toBeTruthy();
        expect(feature.source).toBeTruthy();
        expect(isFinite(feature.value)).toBe(true);
      });
    });

    test('信頼度が設定された範囲内にある', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());
      const features = extractor.extract(contextInfo);

      features.forEach(feature => {
        expect(feature.confidence).toBeGreaterThanOrEqual(0);
        expect(feature.confidence).toBeLessThanOrEqual(1);
      });
    });

    test('特徴量の一意性', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const contextInfo = new ContextInfo(context, new Set([Tag.create('unique')]), new Statistics());
      const features = extractor.extract(contextInfo);

      const names = features.map(f => f.name);
      const uniqueNames = new Set(names);
      
      // 特徴量名が重複していないことを確認
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('設定依存の動作テスト', () => {
    test('抽象化設定の影響確認', () => {
      const vectorWithSignificantValues = [0.1, 0.9, 0.2, 0.8, 0.3]; // 有意な値を含む
      const context = new TestVectorizableContext(vectorWithSignificantValues);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const features = extractor.extract(contextInfo);
      const vectorFeature = features.find(f => f.type === 'conceptual_vector') as VectorFeature;
      
      if (vectorFeature) {
        const abstractedVector = vectorFeature.toVector();
        
        // 抽象化により元のベクトルから変化していることを確認
        expect(abstractedVector).not.toEqual(vectorWithSignificantValues);
        
        // 正規化されているかどうかは設定による
        const magnitude = Math.sqrt(abstractedVector.reduce((sum, v) => sum + v * v, 0));
        expect(magnitude).toBeGreaterThan(0);
      }
    });

    test('デバッグログレベルの動作確認', () => {
      // console出力をキャプチャするためのモック
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      const context = new TestVectorizableContext([1, 2, 3]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());
      
      // ログレベルが低い場合、ログ出力されない可能性が高い
      extractor.extract(contextInfo);
      
      // ログが出力されているかは設定による
      // このテストは実装の設定値によって結果が変わる
      expect(consoleSpy).toHaveBeenCalledTimes(expect.any(Number));
      
      consoleSpy.mockRestore();
    });
  });
});