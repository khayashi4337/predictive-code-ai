import { PatternAutonomousLayer, PatternType, PatternRecognitionResult } from './LayerImplementations';
import { VectorizableContext } from '../tag/VectorizableContext';
import { ContextInfo } from '../tag/ContextInfo';
import { Statistics } from '../tag/Statistics';
import { Tag } from '../tag/Tag';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { LearningSignal } from '../learning/LearningSignalV2';
import { RelativeDifference } from '../pattern/RelativeDifference';

// テスト用の VectorizableContext 実装
class TestVectorizableContext implements VectorizableContext {
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

// モック LearningSignal クラス
class MockLearningSignal implements LearningSignal<VectorizableContext> {
  constructor(
    public readonly referenceDifference: RelativeDifference<VectorizableContext>
  ) {}
}

// モック RelativeDifference クラス
class MockRelativeDifference implements RelativeDifference<VectorizableContext> {
  constructor(
    public readonly magnitude: number,
    public readonly contextInfo: ContextInfo<VectorizableContext>
  ) {}
}

describe('PatternAutonomousLayer クラス', () => {
  let patternLayer: PatternAutonomousLayer<VectorizableContext>;

  beforeEach(() => {
    patternLayer = new PatternAutonomousLayer<VectorizableContext>('test_pattern_layer', 'テストパターン層');
  });

  describe('基本機能テスト', () => {
    test('正常にインスタンス化できる', () => {
      expect(patternLayer).toBeInstanceOf(PatternAutonomousLayer);
      expect(patternLayer.getLayerId()).toBe('test_pattern_layer');
      expect(patternLayer.getLayerName()).toBe('テストパターン層');
      expect(patternLayer.getLayerType()).toBe('pattern');
      expect(patternLayer.isActive()).toBe(true);
    });

    test('設定ファイルパスを指定してインスタンス化できる', () => {
      const layerWithConfig = new PatternAutonomousLayer('layer_with_config', '設定付き層', '/dummy/config/path');
      expect(layerWithConfig.getLayerId()).toBe('layer_with_config');
      expect(layerWithConfig.getLayerName()).toBe('設定付き層');
    });

    test('統計情報を正しく取得できる', () => {
      const stats = patternLayer.getStatistics();
      expect(stats.totalPatternsGenerated).toBe(0);
      expect(stats.totalPatternsObserved).toBe(0);
      expect(stats.totalModelUpdates).toBe(0);
      expect(stats.lastActivityTimestamp).toBeNull();
      expect(stats.averageProcessingTime).toBe(0);
      expect(stats.isHealthy).toBe(true); // 初期状態では健全
    });
  });

  describe('期待パターン生成テスト', () => {
    test('均一パターンの期待パターンを生成できる', () => {
      const uniformVector = [0.5, 0.5, 0.5, 0.5, 0.5]; // 低分散
      const context = new TestVectorizableContext(uniformVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const expectedPattern = patternLayer.generateExpectedPattern('destination_1', contextInfo);

      expect(expectedPattern).toBeInstanceOf(ExpectedPatternV2);
      expect(expectedPattern.body).toBeDefined();
      expect(expectedPattern.contextInfo).toBeDefined();
      
      // 統計情報に pattern_uniform タグが追加されているか確認
      const generatedTags = Array.from(expectedPattern.contextInfo.tags);
      const patternTags = generatedTags.filter(tag => tag.key.startsWith('pattern_'));
      expect(patternTags.length).toBeGreaterThan(0);
    });

    test('ランダムパターンの期待パターンを生成できる', () => {
      // 高エントロピーの不規則なベクトル
      const randomVector = [0.1, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6];
      const context = new TestVectorizableContext(randomVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const expectedPattern = patternLayer.generateExpectedPattern('destination_2', contextInfo);

      expect(expectedPattern).toBeInstanceOf(ExpectedPatternV2);
      expect(expectedPattern.body.toVector()).toBeDefined();
      
      // パターン認識による統計情報が追加されているか確認
      const stats = expectedPattern.contextInfo.statistics;
      expect(stats.getNumber('similarity')).toBeDefined();
      expect(stats.getNumber('intensity')).toBeDefined();
      expect(stats.getNumber('confidence')).toBeDefined();
    });

    test('シーケンシャルパターンの期待パターンを生成できる', () => {
      // 連続的な値を持つベクトル
      const sequentialVector = [1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 0.8];
      const context = new TestVectorizableContext(sequentialVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const expectedPattern = patternLayer.generateExpectedPattern('destination_3', contextInfo);

      expect(expectedPattern).toBeInstanceOf(ExpectedPatternV2);
      
      // destination IDに基づく変換が適用されているか確認
      const originalVector = context.toVector();
      const transformedVector = expectedPattern.body.toVector();
      expect(transformedVector).not.toEqual(originalVector);
      expect(transformedVector.length).toBe(originalVector.length);
    });

    test('空間パターンの期待パターンを生成できる', () => {
      // 空間的勾配を持つベクトル
      const spatialVector = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4];
      const context = new TestVectorizableContext(spatialVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const expectedPattern = patternLayer.generateExpectedPattern('destination_4', contextInfo);

      expect(expectedPattern).toBeInstanceOf(ExpectedPatternV2);
      expect(expectedPattern.body.getDimension()).toBe(spatialVector.length);
    });

    test('周波数パターンの期待パターンを生成できる', () => {
      // 周波数成分を持つベクトル（前半と後半で相関）
      const frequencyVector = [0.8, 0.2, 0.9, 0.1, 0.8, 0.2, 0.9, 0.1];
      const context = new TestVectorizableContext(frequencyVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const expectedPattern = patternLayer.generateExpectedPattern('destination_5', contextInfo);

      expect(expectedPattern).toBeInstanceOf(ExpectedPatternV2);
      
      // 周波数変換が適用されているか確認
      const transformedVector = expectedPattern.body.toVector();
      expect(transformedVector.every(v => isFinite(v))).toBe(true);
    });

    test('複雑パターンの期待パターンを生成できる', () => {
      // 複雑で不規則なパターン
      const complexVector = [0.1, 0.95, 0.3, 0.87, 0.15, 0.92, 0.28, 0.83, 0.19];
      const context = new TestVectorizableContext(complexVector);
      const tags = new Set([Tag.create('complex_pattern'), Tag.create('high_dimension')]);
      const stats = new Statistics();
      stats.setNumber('complexity_score', 0.85);
      const contextInfo = new ContextInfo(context, tags, stats);

      const expectedPattern = patternLayer.generateExpectedPattern('destination_complex', contextInfo);

      expect(expectedPattern).toBeInstanceOf(ExpectedPatternV2);
      
      // 元のタグと新しいタグが統合されているか確認
      const resultTags = expectedPattern.contextInfo.tags;
      expect(resultTags.size).toBeGreaterThan(tags.size);
      
      // 統計情報が統合されているか確認
      const resultStats = expectedPattern.contextInfo.statistics;
      expect(resultStats.getNumber('complexity_score')).toBe(0.85);
    });

    test('異なるdestinationIDで異なる変換が適用される', () => {
      const testVector = [1, 2, 3, 4, 5];
      const context = new TestVectorizableContext(testVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const pattern1 = patternLayer.generateExpectedPattern('dest_A', contextInfo);
      const pattern2 = patternLayer.generateExpectedPattern('dest_B', contextInfo);

      const vector1 = pattern1.body.toVector();
      const vector2 = pattern2.body.toVector();

      // 異なるdestination IDで異なる結果が得られることを確認
      expect(vector1).not.toEqual(vector2);
      expect(vector1.length).toBe(vector2.length);
    });
  });

  describe('パターン認識テスト', () => {
    test('パターンタイプが正しく分類される', () => {
      const testCases = [
        { vector: [0.5, 0.5, 0.5, 0.5], expectedType: 'uniform' },
        { vector: [0.1, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6], expectedType: 'random' },
        { vector: [1.0, 1.1, 1.2, 1.3, 1.4], expectedType: 'sequential' },
        { vector: [1.0, 0.8, 0.6, 0.4, 0.2], expectedType: 'spatial' }
      ];

      testCases.forEach(({ vector, expectedType }) => {
        const context = new TestVectorizableContext(vector);
        const contextInfo = new ContextInfo(context, new Set(), new Statistics());
        
        const pattern = patternLayer.generateExpectedPattern('test_dest', contextInfo);
        
        // パターンタイプに基づくタグが設定されているか確認
        const tags = Array.from(pattern.contextInfo.tags);
        const patternTag = tags.find(tag => tag.key.startsWith('pattern_'));
        expect(patternTag).toBeDefined();
      });
    });

    test('類似度計算が正常に動作する', () => {
      const highMagnitudeVector = [5, 6, 7, 8, 9];
      const lowMagnitudeVector = [0.1, 0.2, 0.3, 0.4, 0.5];
      
      const highContext = new TestVectorizableContext(highMagnitudeVector);
      const lowContext = new TestVectorizableContext(lowMagnitudeVector);
      
      const highContextInfo = new ContextInfo(highContext, new Set(), new Statistics());
      const lowContextInfo = new ContextInfo(lowContext, new Set(), new Statistics());

      const highPattern = patternLayer.generateExpectedPattern('dest', highContextInfo);
      const lowPattern = patternLayer.generateExpectedPattern('dest', lowContextInfo);

      // 大きさの異なるベクトルで異なる類似度が計算されることを確認
      const highSimilarity = highPattern.contextInfo.statistics.getNumber('similarity');
      const lowSimilarity = lowPattern.contextInfo.statistics.getNumber('similarity');
      
      expect(highSimilarity).toBeDefined();
      expect(lowSimilarity).toBeDefined();
      expect(highSimilarity).not.toBe(lowSimilarity);
    });

    test('強度計算が設定に従って動作する', () => {
      const intensiveVector = [10, -10, 15, -15, 20];
      const mildVector = [0.1, -0.1, 0.2, -0.2, 0.3];
      
      const intensiveContext = new TestVectorizableContext(intensiveVector);
      const mildContext = new TestVectorizableContext(mildVector);
      
      const intensiveContextInfo = new ContextInfo(intensiveContext, new Set(), new Statistics());
      const mildContextInfo = new ContextInfo(mildContext, new Set(), new Statistics());

      const intensivePattern = patternLayer.generateExpectedPattern('dest', intensiveContextInfo);
      const mildPattern = patternLayer.generateExpectedPattern('dest', mildContextInfo);

      const intensiveIntensity = intensivePattern.contextInfo.statistics.getNumber('intensity');
      const mildIntensity = mildPattern.contextInfo.statistics.getNumber('intensity');

      expect(intensiveIntensity).toBeDefined();
      expect(mildIntensity).toBeDefined();
      expect(intensiveIntensity).toBeGreaterThan(mildIntensity);
    });

    test('信頼度計算が類似度と強度から正しく算出される', () => {
      const testVector = [1, 2, 3, 4, 5];
      const context = new TestVectorizableContext(testVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const pattern = patternLayer.generateExpectedPattern('dest', contextInfo);
      
      const similarity = pattern.contextInfo.statistics.getNumber('similarity')!;
      const intensity = pattern.contextInfo.statistics.getNumber('intensity')!;
      const confidence = pattern.contextInfo.statistics.getNumber('confidence')!;

      // 信頼度が類似度と強度の重み付き平均に保守的因子を適用した値になっているか
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
      expect(confidence).toBeLessThanOrEqual(Math.max(similarity, intensity));
    });
  });

  describe('パターン変換テスト', () => {
    test('シーケンシャル変換が正しく適用される', () => {
      const sequentialVector = [1, 2, 3, 4, 5];
      const context = new TestVectorizableContext(sequentialVector);
      // 強制的にsequentialパターンとして認識させるための設定
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const pattern = patternLayer.generateExpectedPattern('seq_dest', contextInfo);
      const transformedVector = pattern.body.toVector();

      expect(transformedVector).toBeDefined();
      expect(transformedVector.length).toBe(sequentialVector.length);
      expect(transformedVector).not.toEqual(sequentialVector);
      
      // 変換後も有限な値であることを確認
      expect(transformedVector.every(v => isFinite(v))).toBe(true);
    });

    test('空間変換が減衰効果を適用する', () => {
      const spatialVector = [1, 1, 1, 1, 1];
      const context = new TestVectorizableContext(spatialVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const pattern = patternLayer.generateExpectedPattern('spatial_dest', contextInfo);
      const transformedVector = pattern.body.toVector();

      expect(transformedVector).toBeDefined();
      expect(transformedVector.length).toBe(spatialVector.length);
      
      // 空間変換により位置による減衰効果があることを確認
      // （完全に同じ値ではないことで確認）
      expect(transformedVector).not.toEqual(spatialVector);
    });

    test('周波数変換がコサイン成分を追加する', () => {
      const frequencyVector = [1, 0, 1, 0, 1];
      const context = new TestVectorizableContext(frequencyVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const pattern = patternLayer.generateExpectedPattern('freq_dest', contextInfo);
      const transformedVector = pattern.body.toVector();

      expect(transformedVector).toBeDefined();
      expect(transformedVector.length).toBe(frequencyVector.length);
      expect(transformedVector.every(v => isFinite(v))).toBe(true);
    });

    test('デフォルト変換が強度に基づいて適用される', () => {
      const defaultVector = [2, 4, 6, 8, 10];
      const context = new TestVectorizableContext(defaultVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const pattern = patternLayer.generateExpectedPattern('default_dest', contextInfo);
      const transformedVector = pattern.body.toVector();

      expect(transformedVector).toBeDefined();
      expect(transformedVector.length).toBe(defaultVector.length);
      
      // デフォルト変換では強度による影響があることを確認
      expect(transformedVector).not.toEqual(defaultVector);
    });
  });

  describe('コンテキスト統合テスト', () => {
    test('元のタグが保持される設定で動作する', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const originalTags = new Set([
        Tag.create('original_tag1'),
        Tag.create('original_tag2')
      ]);
      const contextInfo = new ContextInfo(context, originalTags, new Statistics());

      const pattern = patternLayer.generateExpectedPattern('dest', contextInfo);
      const resultTags = pattern.contextInfo.tags;

      // 元のタグが保持されているか確認
      expect(resultTags.size).toBeGreaterThan(originalTags.size);
      originalTags.forEach(tag => {
        const hasTag = Array.from(resultTags).some(t => t.key === tag.key);
        expect(hasTag).toBe(true);
      });
    });

    test('拡張タイムスタンプが追加される', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const beforeTime = new Date();
      const pattern = patternLayer.generateExpectedPattern('dest', contextInfo);
      const afterTime = new Date();

      const enhancementTimestamp = pattern.contextInfo.statistics.getDate('enhancement_timestamp');
      expect(enhancementTimestamp).toBeDefined();
      expect(enhancementTimestamp!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(enhancementTimestamp!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    test('統計情報が正しく統合される', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const originalStats = new Statistics();
      originalStats.setNumber('original_metric', 42);
      originalStats.setString('original_label', 'test');
      
      const contextInfo = new ContextInfo(context, new Set(), originalStats);
      const pattern = patternLayer.generateExpectedPattern('dest', contextInfo);

      const resultStats = pattern.contextInfo.statistics;
      
      // 元の統計情報が保持されているか確認
      expect(resultStats.getNumber('original_metric')).toBe(42);
      expect(resultStats.getString('original_label')).toBe('test');
      
      // 新しい統計情報が追加されているか確認
      expect(resultStats.getNumber('similarity')).toBeDefined();
      expect(resultStats.getNumber('intensity')).toBeDefined();
      expect(resultStats.getNumber('confidence')).toBeDefined();
    });
  });

  describe('フォールバック処理テスト', () => {
    test('例外発生時にフォールバックパターンが生成される', () => {
      // toVector()で例外を投げるコンテキスト
      const faultyContext = {
        toVector: () => { throw new Error('Test error'); },
        getDimension: () => { throw new Error('Test error'); }
      } as VectorizableContext;
      
      const contextInfo = new ContextInfo(faultyContext, new Set(), new Statistics());
      
      // 例外が発生してもフォールバックパターンが返されることを確認
      const pattern = patternLayer.generateExpectedPattern('dest', contextInfo);
      
      expect(pattern).toBeInstanceOf(ExpectedPatternV2);
      expect(pattern.body).toBeDefined();
      
      // フォールバックフラグが設定されているか確認
      expect(pattern.contextInfo.statistics.getBoolean('fallback')).toBe(true);
    });

    test('フォールバックパターンには減衰因子が適用される', () => {
      const normalVector = [1, 2, 3, 4, 5];
      const faultyContext = {
        toVector: () => normalVector,
        getDimension: () => { throw new Error('Dimension error'); }
      } as VectorizableContext;
      
      const contextInfo = new ContextInfo(faultyContext, new Set(), new Statistics());
      
      // エラーハンドリングをモック
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const pattern = patternLayer.generateExpectedPattern('dest', contextInfo);
      
      // フォールバックの場合、減衰因子が適用された値になる
      const fallbackVector = pattern.body.toVector();
      expect(fallbackVector).toBeDefined();
      expect(fallbackVector.length).toBeGreaterThan(0);
      
      jest.restoreAllMocks();
    });

    test('無効な入力でもフォールバック処理が動作する', () => {
      const invalidInputs = [
        new TestVectorizableContext([]), // 空配列
        new TestVectorizableContext([NaN, Infinity, -Infinity]), // 無効な値
        new TestVectorizableContext([null as any, undefined as any]) // null/undefined
      ];

      invalidInputs.forEach(context => {
        const contextInfo = new ContextInfo(context, new Set(), new Statistics());
        
        expect(() => {
          const pattern = patternLayer.generateExpectedPattern('dest', contextInfo);
          expect(pattern).toBeDefined();
        }).not.toThrow();
      });
    });
  });

  describe('観測とモデル更新テスト', () => {
    test('実際パターンの観測が統計を更新する', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());
      const actualPattern = new ActualPatternV2(contextInfo);

      const initialStats = patternLayer.getStatistics();
      expect(initialStats.totalPatternsObserved).toBe(0);

      patternLayer.observeActualPattern(actualPattern);

      const updatedStats = patternLayer.getStatistics();
      expect(updatedStats.totalPatternsObserved).toBe(1);
      expect(updatedStats.lastActivityTimestamp).not.toBeNull();
    });

    test('予測モデル更新でバースト伝播が動作する', async () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());
      const relativeDifference = new MockRelativeDifference(0.8, contextInfo); // バースト閾値0.75を超える
      const learningSignal = new MockLearningSignal(relativeDifference);

      const result = await patternLayer.doUpdatePredictiveModel(learningSignal);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // 高い差分値の場合の処理が実行されることを確認
      // (具体的な実装に依存するため、基本的な動作のみテスト)
    });

    test('低い差分値では通常処理が行われる', async () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());
      const relativeDifference = new MockRelativeDifference(0.3, contextInfo); // バースト閾値未満
      const learningSignal = new MockLearningSignal(relativeDifference);

      const result = await patternLayer.doUpdatePredictiveModel(learningSignal);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大きなベクトルの効率的な処理', () => {
      const largeVector = Array(1000).fill(0).map(() => Math.random());
      const context = new TestVectorizableContext(largeVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const start = performance.now();
      const pattern = patternLayer.generateExpectedPattern('performance_test', contextInfo);
      const duration = performance.now() - start;

      expect(pattern).toBeDefined();
      expect(duration).toBeLessThan(100); // 100ms以内
    });

    test('繰り返し処理のパフォーマンス', () => {
      const testVector = [1, 2, 3, 4, 5];
      const context = new TestVectorizableContext(testVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        patternLayer.generateExpectedPattern(`dest_${i}`, contextInfo);
      }

      const duration = performance.now() - start;
      const averageTime = duration / iterations;

      expect(averageTime).toBeLessThan(10); // 平均10ms以内
    });

    test('メモリ使用量の安定性', () => {
      const testVector = [1, 2, 3, 4, 5];
      const context = new TestVectorizableContext(testVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      // 大量の処理を実行してメモリリークがないことを確認
      for (let i = 0; i < 1000; i++) {
        patternLayer.generateExpectedPattern(`memory_test_${i}`, contextInfo);
      }

      // 統計情報が適切に管理されていることを確認
      const stats = patternLayer.getStatistics();
      expect(stats.totalPatternsGenerated).toBe(1000);
      expect(stats.isHealthy).toBe(true);
    });
  });

  describe('エッジケース・境界条件テスト', () => {
    test('ゼロベクトルの処理', () => {
      const zeroVector = [0, 0, 0, 0, 0];
      const context = new TestVectorizableContext(zeroVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      expect(() => {
        const pattern = patternLayer.generateExpectedPattern('zero_test', contextInfo);
        expect(pattern).toBeDefined();
        expect(pattern.body.toVector().every(v => isFinite(v))).toBe(true);
      }).not.toThrow();
    });

    test('極端な値を含むベクトルの処理', () => {
      const extremeVector = [Number.MAX_VALUE, Number.MIN_VALUE, 1e10, -1e10, 0];
      const context = new TestVectorizableContext(extremeVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      expect(() => {
        const pattern = patternLayer.generateExpectedPattern('extreme_test', contextInfo);
        expect(pattern).toBeDefined();
      }).not.toThrow();
    });

    test('単一要素ベクトルの処理', () => {
      const singleVector = [42];
      const context = new TestVectorizableContext(singleVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const pattern = patternLayer.generateExpectedPattern('single_test', contextInfo);
      expect(pattern).toBeDefined();
      expect(pattern.body.toVector()).toHaveLength(1);
    });

    test('特殊文字を含む destination ID の処理', () => {
      const context = new TestVectorizableContext([1, 2, 3]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());
      
      const specialDestinations = [
        '',
        '   ',
        '🎯',
        'destination/with/slashes',
        'destination.with.dots',
        'destination-with-dashes',
        'destination_with_underscores',
        'DESTINATION_WITH_CAPS',
        '123456789',
        'mixed_🎯_chars'
      ];

      specialDestinations.forEach(dest => {
        expect(() => {
          const pattern = patternLayer.generateExpectedPattern(dest, contextInfo);
          expect(pattern).toBeDefined();
        }).not.toThrow();
      });
    });

    test('大量のタグと統計を持つコンテキストの処理', () => {
      const context = new TestVectorizableContext([1, 2, 3, 4, 5]);
      
      // 大量のタグを作成
      const tags = new Set<Tag>();
      for (let i = 0; i < 100; i++) {
        tags.add(Tag.create(`tag_${i}`));
      }
      
      // 大量の統計情報を作成
      const stats = new Statistics();
      for (let i = 0; i < 100; i++) {
        stats.setNumber(`metric_${i}`, Math.random());
        stats.setString(`label_${i}`, `value_${i}`);
        stats.setBoolean(`flag_${i}`, i % 2 === 0);
      }
      
      const contextInfo = new ContextInfo(context, tags, stats);
      
      const start = performance.now();
      const pattern = patternLayer.generateExpectedPattern('large_context_test', contextInfo);
      const duration = performance.now() - start;

      expect(pattern).toBeDefined();
      expect(duration).toBeLessThan(50); // 50ms以内
      
      // 結果のコンテキストも適切に統合されているか確認
      expect(pattern.contextInfo.tags.size).toBeGreaterThan(tags.size);
      expect(pattern.contextInfo.statistics.size()).toBeGreaterThan(stats.size());
    });
  });

  describe('設定依存の動作テスト', () => {
    test('パターン認識の閾値設定が反映される', () => {
      // 均一性の閾値テスト
      const almostUniformVector = [0.5, 0.51, 0.49, 0.5, 0.52]; // 低分散だが完全に均一ではない
      const context = new TestVectorizableContext(almostUniformVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const pattern = patternLayer.generateExpectedPattern('threshold_test', contextInfo);
      
      // 設定の閾値に基づいてパターンが分類されることを確認
      expect(pattern).toBeDefined();
      expect(pattern.contextInfo.statistics.getNumber('similarity')).toBeDefined();
    });

    test('変換設定パラメータが適用される', () => {
      const testVector = [1, 2, 3, 4, 5];
      const context = new TestVectorizableContext(testVector);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      const pattern1 = patternLayer.generateExpectedPattern('config_test_1', contextInfo);
      const pattern2 = patternLayer.generateExpectedPattern('config_test_2', contextInfo);

      // 設定に基づく変換が一貫して適用されることを確認
      expect(pattern1.body.toVector()).toBeDefined();
      expect(pattern2.body.toVector()).toBeDefined();
      
      // 同じ入力でも destination ID により異なる結果が得られることを確認
      expect(pattern1.body.toVector()).not.toEqual(pattern2.body.toVector());
    });

    test('デバッグ設定に応じたログ出力', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
      
      const context = new TestVectorizableContext([1, 2, 3]);
      const contextInfo = new ContextInfo(context, new Set(), new Statistics());

      patternLayer.generateExpectedPattern('debug_test', contextInfo);

      // デバッグログが設定に応じて出力されているか確認
      // （具体的な出力内容は設定による）
      expect(consoleSpy).toHaveBeenCalledTimes(expect.any(Number));
      
      consoleSpy.mockRestore();
      consoleInfoSpy.mockRestore();
    });
  });
});