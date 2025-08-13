import { 
  FeatureList, 
  FeatureMap, 
  FeatureMultiMap, 
  TypedFeatureList,
  VectorFeatureList,
  StatisticalFeatureList,
  TagFeatureList,
  TemporalFeatureList
} from './FeatureCollections';
import { 
  Feature, 
  VectorFeature, 
  StatisticalFeature, 
  TagFeature, 
  TemporalFeature 
} from './FeatureInterfaces';

// テスト用の Feature 実装クラス群
class TestFeature implements Feature {
  readonly type = 'test';
  
  constructor(
    public readonly name: string,
    public readonly value: number,
    public readonly confidence: number,
    public readonly source: string
  ) {}
  
  isValid(): boolean {
    return this.confidence >= 0 && this.confidence <= 1 && isFinite(this.value);
  }
}

class TestVectorFeature implements VectorFeature {
  readonly type = 'test_vector';
  
  constructor(
    public readonly name: string,
    public readonly value: number,
    public readonly confidence: number,
    public readonly source: string,
    private readonly vector: number[]
  ) {}
  
  get dimension(): number {
    return this.vector.length;
  }
  
  toVector(): number[] {
    return [...this.vector];
  }
  
  toNormalizedVector(): number[] {
    const magnitude = Math.sqrt(this.vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return new Array(this.vector.length).fill(0);
    return this.vector.map(v => v / magnitude);
  }
  
  isValid(): boolean {
    return this.confidence >= 0 && this.confidence <= 1 && 
           this.vector.every(v => isFinite(v)) &&
           isFinite(this.value);
  }
}

class TestStatisticalFeature implements StatisticalFeature {
  readonly type = 'test_statistical';
  
  constructor(
    public readonly name: string,
    public readonly value: number,
    public readonly confidence: number,
    public readonly source: string,
    public readonly mean: number,
    public readonly variance?: number,
    public readonly standardDeviation?: number,
    public readonly range?: [number, number]
  ) {}
  
  isValid(): boolean {
    return this.confidence >= 0 && this.confidence <= 1 && 
           isFinite(this.value) && isFinite(this.mean);
  }
}

class TestTagFeature implements TagFeature {
  readonly type = 'test_tag';
  
  constructor(
    public readonly name: string,
    public readonly value: number,
    public readonly confidence: number,
    public readonly source: string,
    public readonly tagCount: number,
    public readonly tagTypes: string[],
    public readonly tagWeights: Map<string, number>
  ) {}
  
  isValid(): boolean {
    return this.confidence >= 0 && this.confidence <= 1 && 
           this.tagCount >= 0 && this.tagTypes.length >= 0;
  }
}

class TestTemporalFeature implements TemporalFeature {
  readonly type = 'test_temporal';
  
  constructor(
    public readonly name: string,
    public readonly value: number,
    public readonly confidence: number,
    public readonly source: string,
    public readonly timestamp: number,
    public readonly changeRate: number,
    public readonly trendDirection: -1 | 0 | 1
  ) {}
  
  isValid(): boolean {
    return this.confidence >= 0 && this.confidence <= 1 && 
           isFinite(this.value) && isFinite(this.timestamp);
  }
}

describe('FeatureList クラス', () => {
  let featureList: FeatureList;

  beforeEach(() => {
    featureList = new FeatureList();
  });

  describe('基本CRUD操作テスト', () => {
    test('特徴量を追加できる', () => {
      const feature = new TestFeature('test_feature', 0.8, 0.9, 'test_source');
      
      expect(featureList.size()).toBe(0);
      featureList.add(feature);
      expect(featureList.size()).toBe(1);
      expect(featureList.get(0)).toBe(feature);
    });

    test('指定位置に特徴量を挿入できる', () => {
      const feature1 = new TestFeature('feature1', 0.5, 0.8, 'source1');
      const feature2 = new TestFeature('feature2', 0.7, 0.9, 'source2');
      const feature3 = new TestFeature('feature3', 0.6, 0.85, 'source3');
      
      featureList.add(feature1);
      featureList.add(feature3);
      featureList.insert(1, feature2);
      
      expect(featureList.size()).toBe(3);
      expect(featureList.get(0)).toBe(feature1);
      expect(featureList.get(1)).toBe(feature2);
      expect(featureList.get(2)).toBe(feature3);
    });

    test('範囲外への挿入でエラーが発生する', () => {
      const feature = new TestFeature('test', 0.5, 0.8, 'source');
      
      expect(() => featureList.insert(-1, feature)).toThrow();
      expect(() => featureList.insert(1, feature)).toThrow(); // size=0なので1は範囲外
    });

    test('特徴量を削除できる', () => {
      const feature1 = new TestFeature('feature1', 0.5, 0.8, 'source1');
      const feature2 = new TestFeature('feature2', 0.7, 0.9, 'source2');
      
      featureList.add(feature1);
      featureList.add(feature2);
      
      const removed = featureList.removeAt(0);
      expect(removed).toBe(feature1);
      expect(featureList.size()).toBe(1);
      expect(featureList.get(0)).toBe(feature2);
    });

    test('範囲外の削除はundefinedを返す', () => {
      const result = featureList.removeAt(0);
      expect(result).toBeUndefined();
      
      const feature = new TestFeature('test', 0.5, 0.8, 'source');
      featureList.add(feature);
      
      const invalidResult = featureList.removeAt(-1);
      expect(invalidResult).toBeUndefined();
      
      const outOfBoundsResult = featureList.removeAt(1);
      expect(outOfBoundsResult).toBeUndefined();
    });

    test('名前で特徴量を削除できる', () => {
      const feature1 = new TestFeature('feature1', 0.5, 0.8, 'source1');
      const feature2 = new TestFeature('feature2', 0.7, 0.9, 'source2');
      
      featureList.add(feature1);
      featureList.add(feature2);
      
      const removed = featureList.removeByName('feature1');
      expect(removed).toBe(true);
      expect(featureList.size()).toBe(1);
      expect(featureList.get(0)).toBe(feature2);
      
      const notFound = featureList.removeByName('nonexistent');
      expect(notFound).toBe(false);
    });

    test('すべての特徴量をクリアできる', () => {
      const feature1 = new TestFeature('feature1', 0.5, 0.8, 'source1');
      const feature2 = new TestFeature('feature2', 0.7, 0.9, 'source2');
      
      featureList.add(feature1);
      featureList.add(feature2);
      expect(featureList.size()).toBe(2);
      
      featureList.clear();
      expect(featureList.size()).toBe(0);
      expect(featureList.isEmpty()).toBe(true);
    });
  });

  describe('検索・フィルタリング機能テスト', () => {
    beforeEach(() => {
      const feature1 = new TestFeature('feature1', 0.5, 0.8, 'source1');
      const feature2 = new TestVectorFeature('vector_feature', 0.7, 0.9, 'source2', [1, 2, 3]);
      const feature3 = new TestFeature('feature3', 0.6, 0.85, 'source1');
      
      featureList.add(feature1);
      featureList.add(feature2);
      featureList.add(feature3);
    });

    test('名前で特徴量を検索できる', () => {
      const found = featureList.findByName('feature1');
      expect(found).toBeDefined();
      expect(found!.name).toBe('feature1');
      
      const notFound = featureList.findByName('nonexistent');
      expect(notFound).toBeUndefined();
    });

    test('タイプで特徴量を検索できる', () => {
      const testFeatures = featureList.findByType('test');
      expect(testFeatures).toHaveLength(2);
      expect(testFeatures.every(f => f.type === 'test')).toBe(true);
      
      const vectorFeatures = featureList.findByType('test_vector');
      expect(vectorFeatures).toHaveLength(1);
      expect(vectorFeatures[0].type).toBe('test_vector');
      
      const emptyResults = featureList.findByType('nonexistent_type');
      expect(emptyResults).toHaveLength(0);
    });

    test('コンストラクタで型安全に検索できる', () => {
      const testFeatures = featureList.findByConstructor(TestFeature);
      expect(testFeatures).toHaveLength(2);
      expect(testFeatures.every(f => f instanceof TestFeature)).toBe(true);
      
      const vectorFeatures = featureList.findByConstructor(TestVectorFeature);
      expect(vectorFeatures).toHaveLength(1);
      expect(vectorFeatures[0]).toBeInstanceOf(TestVectorFeature);
    });

    test('条件でフィルタリングできる', () => {
      const highConfidenceFeatures = featureList.filter(f => f.confidence > 0.85);
      expect(highConfidenceFeatures).toHaveLength(2);
      
      const source1Features = featureList.filter(f => f.source === 'source1');
      expect(source1Features).toHaveLength(2);
      
      const highValueFeatures = featureList.filter(f => f.value > 0.65);
      expect(highValueFeatures).toHaveLength(1);
    });

    test('特徴量の存在確認ができる', () => {
      const feature1 = featureList.get(0)!;
      expect(featureList.contains(feature1)).toBe(true);
      
      const externalFeature = new TestFeature('external', 0.5, 0.8, 'external');
      expect(featureList.contains(externalFeature)).toBe(false);
      
      expect(featureList.containsByName('feature1')).toBe(true);
      expect(featureList.containsByName('nonexistent')).toBe(false);
    });
  });

  describe('変換・出力機能テスト', () => {
    beforeEach(() => {
      const vectorFeature = new TestVectorFeature('vector', 0.7, 0.9, 'source', [1, 2, 3]);
      const simpleFeature = new TestFeature('simple', 0.5, 0.8, 'source');
      
      featureList.add(vectorFeature);
      featureList.add(simpleFeature);
    });

    test('特徴量をベクトルに変換できる', () => {
      const vector = featureList.toVector();
      
      // VectorFeatureのベクトル + SimpleFeatureの値
      expect(vector).toEqual([1, 2, 3, 0.5]);
    });

    test('特徴量の値のみを配列で取得できる', () => {
      const values = featureList.toValueArray();
      expect(values).toEqual([0.7, 0.5]);
    });

    test('特徴量を配列として取得できる', () => {
      const array = featureList.toArray();
      expect(array).toHaveLength(2);
      expect(array[0].name).toBe('vector');
      expect(array[1].name).toBe('simple');
      
      // 元のリストと独立していることを確認
      array.push(new TestFeature('external', 0.3, 0.7, 'external'));
      expect(featureList.size()).toBe(2);
    });
  });

  describe('イテレータ・操作機能テスト', () => {
    beforeEach(() => {
      featureList.add(new TestFeature('a', 0.3, 0.7, 'source'));
      featureList.add(new TestFeature('b', 0.5, 0.8, 'source'));
      featureList.add(new TestFeature('c', 0.7, 0.9, 'source'));
    });

    test('forEach で反復処理できる', () => {
      const names: string[] = [];
      const indices: number[] = [];
      
      featureList.forEach((feature, index) => {
        names.push(feature.name);
        indices.push(index);
      });
      
      expect(names).toEqual(['a', 'b', 'c']);
      expect(indices).toEqual([0, 1, 2]);
    });

    test('map で変換処理できる', () => {
      const names = featureList.map(feature => feature.name);
      expect(names).toEqual(['a', 'b', 'c']);
      
      const confidences = featureList.map((feature, index) => feature.confidence + index * 0.01);
      expect(confidences).toEqual([0.7, 0.81, 0.92]);
    });

    test('ソート機能が動作する', () => {
      // デフォルトソート（名前順）
      featureList.sort();
      const sortedNames = featureList.map(f => f.name);
      expect(sortedNames).toEqual(['a', 'b', 'c']);
      
      // カスタムソート（値の降順）
      featureList.sort((a, b) => b.value - a.value);
      const valuesSorted = featureList.map(f => f.value);
      expect(valuesSorted).toEqual([0.7, 0.5, 0.3]);
    });

    test('for...of ループが動作する', () => {
      const names: string[] = [];
      for (const feature of featureList) {
        names.push(feature.name);
      }
      expect(names).toEqual(['a', 'b', 'c']);
    });

    test('Array.from で配列に変換できる', () => {
      const features = Array.from(featureList);
      expect(features).toHaveLength(3);
      expect(features.map(f => f.name)).toEqual(['a', 'b', 'c']);
    });

    test('分割代入で値を取得できる', () => {
      const [first, second] = featureList;
      expect(first.name).toBe('a');
      expect(second.name).toBe('b');
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量の特徴量の効率的な処理', () => {
      const start = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        featureList.add(new TestFeature(`feature_${i}`, Math.random(), Math.random(), 'perf_test'));
      }
      
      const addDuration = performance.now() - start;
      expect(addDuration).toBeLessThan(100); // 100ms以内
      expect(featureList.size()).toBe(10000);
      
      // 検索パフォーマンス
      const searchStart = performance.now();
      featureList.findByName('feature_5000');
      const searchDuration = performance.now() - searchStart;
      expect(searchDuration).toBeLessThan(10); // 10ms以内
    });

    test('大きなベクトル特徴量の変換パフォーマンス', () => {
      const largeVector = Array(1000).fill(0).map(() => Math.random());
      featureList.add(new TestVectorFeature('large_vector', 0.8, 0.9, 'perf', largeVector));
      
      const start = performance.now();
      const resultVector = featureList.toVector();
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(10); // 10ms以内
      expect(resultVector).toHaveLength(1000);
    });
  });

  describe('エッジケース・境界条件テスト', () => {
    test('空のリストの操作', () => {
      expect(featureList.size()).toBe(0);
      expect(featureList.isEmpty()).toBe(true);
      expect(featureList.get(0)).toBeUndefined();
      expect(featureList.findByName('any')).toBeUndefined();
      expect(featureList.toVector()).toEqual([]);
      expect(featureList.toValueArray()).toEqual([]);
      expect(featureList.toArray()).toEqual([]);
    });

    test('無効な特徴量の処理', () => {
      const invalidFeature = new TestFeature('invalid', NaN, -0.5, ''); // 無効な値
      
      expect(() => {
        featureList.add(invalidFeature);
        expect(featureList.size()).toBe(1);
        expect(featureList.get(0)!.isValid()).toBe(false);
      }).not.toThrow();
    });

    test('極端な値を含む特徴量の処理', () => {
      const extremeFeatures = [
        new TestFeature('max', Number.MAX_VALUE, 1, 'extreme'),
        new TestFeature('min', Number.MIN_VALUE, 0, 'extreme'),
        new TestFeature('infinity', Infinity, 0.5, 'extreme'),
        new TestFeature('negative_infinity', -Infinity, 0.5, 'extreme'),
        new TestFeature('zero', 0, 0, 'extreme')
      ];
      
      extremeFeatures.forEach(feature => {
        featureList.add(feature);
      });
      
      expect(featureList.size()).toBe(5);
      
      const vector = featureList.toVector();
      expect(vector).toHaveLength(5);
      expect(vector.some(v => !isFinite(v))).toBe(true); // 無限大を含む
    });

    test('重複する名前の特徴量の処理', () => {
      const feature1 = new TestFeature('duplicate', 0.5, 0.8, 'source1');
      const feature2 = new TestFeature('duplicate', 0.7, 0.9, 'source2');
      
      featureList.add(feature1);
      featureList.add(feature2);
      
      expect(featureList.size()).toBe(2);
      
      // findByNameは最初に見つかったものを返す
      const found = featureList.findByName('duplicate');
      expect(found).toBe(feature1);
      
      // 削除は最初に見つかったものを削除
      featureList.removeByName('duplicate');
      expect(featureList.size()).toBe(1);
      expect(featureList.get(0)).toBe(feature2);
    });

    test('特殊文字を含む名前の処理', () => {
      const specialNames = [
        '', // 空文字
        '   ', // スペースのみ
        '🎯特徴量', // 絵文字と日本語
        'feature.with.dots',
        'feature/with/slashes',
        'feature-with-dashes',
        'feature_with_underscores',
        'UPPERCASE_FEATURE',
        '123456789',
        'ＡＢＣ全角文字'
      ];
      
      specialNames.forEach((name, index) => {
        featureList.add(new TestFeature(name, index * 0.1, 0.8, 'special'));
      });
      
      expect(featureList.size()).toBe(specialNames.length);
      
      specialNames.forEach(name => {
        const found = featureList.findByName(name);
        expect(found).toBeDefined();
        expect(found!.name).toBe(name);
      });
    });
  });
});

describe('FeatureMap クラス', () => {
  let featureMap: FeatureMap;

  beforeEach(() => {
    featureMap = new FeatureMap();
  });

  describe('基本CRUD操作テスト', () => {
    test('特徴量を追加・取得できる', () => {
      const feature = new TestFeature('test_feature', 0.8, 0.9, 'test_source');
      
      expect(featureMap.size()).toBe(0);
      featureMap.put('key1', feature);
      expect(featureMap.size()).toBe(1);
      expect(featureMap.get('key1')).toBe(feature);
    });

    test('名前をキーとして特徴量を追加できる', () => {
      const feature = new TestFeature('auto_key_feature', 0.7, 0.8, 'source');
      
      featureMap.putByName(feature);
      expect(featureMap.get('auto_key_feature')).toBe(feature);
    });

    test('特徴量を削除できる', () => {
      const feature = new TestFeature('removable', 0.6, 0.7, 'source');
      
      featureMap.put('remove_key', feature);
      expect(featureMap.containsKey('remove_key')).toBe(true);
      
      const removed = featureMap.remove('remove_key');
      expect(removed).toBe(true);
      expect(featureMap.containsKey('remove_key')).toBe(false);
      
      const notFound = featureMap.remove('nonexistent');
      expect(notFound).toBe(false);
    });

    test('すべてをクリアできる', () => {
      featureMap.put('key1', new TestFeature('feature1', 0.5, 0.8, 'source'));
      featureMap.put('key2', new TestFeature('feature2', 0.7, 0.9, 'source'));
      
      expect(featureMap.size()).toBe(2);
      featureMap.clear();
      expect(featureMap.size()).toBe(0);
      expect(featureMap.isEmpty()).toBe(true);
    });
  });

  describe('検索・存在確認テスト', () => {
    beforeEach(() => {
      featureMap.put('key1', new TestFeature('feature1', 0.5, 0.8, 'source1'));
      featureMap.put('key2', new TestVectorFeature('vector_feature', 0.7, 0.9, 'source2', [1, 2]));
      featureMap.put('key3', new TestFeature('feature3', 0.6, 0.85, 'source1'));
    });

    test('キーの存在確認ができる', () => {
      expect(featureMap.containsKey('key1')).toBe(true);
      expect(featureMap.containsKey('key2')).toBe(true);
      expect(featureMap.containsKey('nonexistent')).toBe(false);
    });

    test('値の存在確認ができる', () => {
      const feature1 = featureMap.get('key1')!;
      expect(featureMap.containsValue(feature1)).toBe(true);
      
      const externalFeature = new TestFeature('external', 0.3, 0.7, 'external');
      expect(featureMap.containsValue(externalFeature)).toBe(false);
    });

    test('タイプでフィルタリングできる', () => {
      const testFeatures = featureMap.filterByType('test');
      expect(testFeatures.size()).toBe(2);
      
      const vectorFeatures = featureMap.filterByType('test_vector');
      expect(vectorFeatures.size()).toBe(1);
      
      const emptyResult = featureMap.filterByType('nonexistent');
      expect(emptyResult.size()).toBe(0);
    });

    test('条件でフィルタリングできる', () => {
      const highConfidenceFeatures = featureMap.filter((key, feature) => feature.confidence > 0.85);
      expect(highConfidenceFeatures.size()).toBe(2);
      
      const source1Features = featureMap.filter((key, feature) => feature.source === 'source1');
      expect(source1Features.size()).toBe(2);
      
      const keyStartsWithKey1 = featureMap.filter((key, feature) => key.startsWith('key1'));
      expect(keyStartsWithKey1.size()).toBe(1);
    });
  });

  describe('一覧取得・変換機能テスト', () => {
    beforeEach(() => {
      featureMap.put('alpha', new TestFeature('feature_alpha', 0.3, 0.7, 'source'));
      featureMap.put('beta', new TestFeature('feature_beta', 0.5, 0.8, 'source'));
      featureMap.put('gamma', new TestFeature('feature_gamma', 0.7, 0.9, 'source'));
    });

    test('すべてのキーを取得できる', () => {
      const keys = featureMap.keySet();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('alpha');
      expect(keys).toContain('beta');
      expect(keys).toContain('gamma');
    });

    test('すべての値を取得できる', () => {
      const values = featureMap.values();
      expect(values).toHaveLength(3);
      
      const names = values.map(f => f.name);
      expect(names).toContain('feature_alpha');
      expect(names).toContain('feature_beta');
      expect(names).toContain('feature_gamma');
    });

    test('すべてのエントリを取得できる', () => {
      const entries = featureMap.entries();
      expect(entries).toHaveLength(3);
      
      const entryMap = new Map(entries);
      expect(entryMap.get('alpha')!.name).toBe('feature_alpha');
      expect(entryMap.get('beta')!.name).toBe('feature_beta');
      expect(entryMap.get('gamma')!.name).toBe('feature_gamma');
    });

    test('オブジェクトに変換できる', () => {
      const obj = featureMap.toObject();
      
      expect(obj.alpha.name).toBe('feature_alpha');
      expect(obj.beta.name).toBe('feature_beta');
      expect(obj.gamma.name).toBe('feature_gamma');
    });
  });

  describe('マージ・反復処理機能テスト', () => {
    test('他のFeatureMapとマージできる（上書きなし）', () => {
      featureMap.put('shared', new TestFeature('original', 0.5, 0.8, 'original'));
      featureMap.put('unique1', new TestFeature('unique1', 0.6, 0.9, 'map1'));
      
      const other = new FeatureMap();
      other.put('shared', new TestFeature('conflict', 0.7, 0.9, 'other'));
      other.put('unique2', new TestFeature('unique2', 0.8, 0.95, 'map2'));
      
      featureMap.merge(other, false); // 上書きなし
      
      expect(featureMap.size()).toBe(3);
      expect(featureMap.get('shared')!.name).toBe('original'); // 上書きされない
      expect(featureMap.get('unique1')!.name).toBe('unique1');
      expect(featureMap.get('unique2')!.name).toBe('unique2');
    });

    test('他のFeatureMapとマージできる（上書きあり）', () => {
      featureMap.put('shared', new TestFeature('original', 0.5, 0.8, 'original'));
      
      const other = new FeatureMap();
      other.put('shared', new TestFeature('updated', 0.7, 0.9, 'other'));
      
      featureMap.merge(other, true); // 上書きあり
      
      expect(featureMap.get('shared')!.name).toBe('updated'); // 上書きされる
    });

    test('forEach で反復処理できる', () => {
      featureMap.put('key1', new TestFeature('feature1', 0.5, 0.8, 'source'));
      featureMap.put('key2', new TestFeature('feature2', 0.7, 0.9, 'source'));
      
      const collected: Array<{key: string, name: string}> = [];
      featureMap.forEach((key, feature) => {
        collected.push({ key, name: feature.name });
      });
      
      expect(collected).toHaveLength(2);
      expect(collected.some(item => item.key === 'key1' && item.name === 'feature1')).toBe(true);
      expect(collected.some(item => item.key === 'key2' && item.name === 'feature2')).toBe(true);
    });

    test('for...of ループが動作する', () => {
      featureMap.put('a', new TestFeature('fa', 0.5, 0.8, 'source'));
      featureMap.put('b', new TestFeature('fb', 0.7, 0.9, 'source'));
      
      const entries: Array<[string, Feature]> = [];
      for (const entry of featureMap) {
        entries.push(entry);
      }
      
      expect(entries).toHaveLength(2);
      expect(entries.some(([k, v]) => k === 'a' && v.name === 'fa')).toBe(true);
      expect(entries.some(([k, v]) => k === 'b' && v.name === 'fb')).toBe(true);
    });
  });

  describe('エッジケース・境界条件テスト', () => {
    test('空のマップの操作', () => {
      expect(featureMap.size()).toBe(0);
      expect(featureMap.isEmpty()).toBe(true);
      expect(featureMap.get('any')).toBeUndefined();
      expect(featureMap.keySet()).toEqual([]);
      expect(featureMap.values()).toEqual([]);
      expect(featureMap.entries()).toEqual([]);
    });

    test('特殊キーの処理', () => {
      const specialKeys = ['', '   ', '🔑', 'key.with.dots', 'key/with/slashes'];
      
      specialKeys.forEach((key, index) => {
        featureMap.put(key, new TestFeature(`feature_${index}`, index * 0.1, 0.8, 'special'));
      });
      
      expect(featureMap.size()).toBe(specialKeys.length);
      
      specialKeys.forEach(key => {
        expect(featureMap.containsKey(key)).toBe(true);
        expect(featureMap.get(key)).toBeDefined();
      });
    });

    test('同じキーでの上書き', () => {
      const original = new TestFeature('original', 0.5, 0.8, 'source1');
      const updated = new TestFeature('updated', 0.7, 0.9, 'source2');
      
      featureMap.put('same_key', original);
      expect(featureMap.get('same_key')).toBe(original);
      
      featureMap.put('same_key', updated);
      expect(featureMap.get('same_key')).toBe(updated);
      expect(featureMap.size()).toBe(1);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量のキー・値ペアの効率的な処理', () => {
      const start = performance.now();
      
      for (let i = 0; i < 5000; i++) {
        featureMap.put(`key_${i}`, new TestFeature(`feature_${i}`, Math.random(), Math.random(), 'perf'));
      }
      
      const addDuration = performance.now() - start;
      expect(addDuration).toBeLessThan(100); // 100ms以内
      expect(featureMap.size()).toBe(5000);
      
      // 取得パフォーマンス
      const getStart = performance.now();
      featureMap.get('key_2500');
      const getDuration = performance.now() - getStart;
      expect(getDuration).toBeLessThan(5); // 5ms以内（Mapの高速アクセス）
    });
  });
});

describe('FeatureMultiMap クラス', () => {
  let multiMap: FeatureMultiMap;

  beforeEach(() => {
    multiMap = new FeatureMultiMap();
  });

  describe('基本機能テスト', () => {
    test('同じキーに複数の特徴量を追加できる', () => {
      const feature1 = new TestFeature('feature1', 0.5, 0.8, 'source1');
      const feature2 = new TestFeature('feature2', 0.7, 0.9, 'source2');
      
      multiMap.put('group1', feature1);
      multiMap.put('group1', feature2);
      
      const group1Features = multiMap.get('group1');
      expect(group1Features.size()).toBe(2);
      expect(group1Features.get(0)).toBe(feature1);
      expect(group1Features.get(1)).toBe(feature2);
    });

    test('異なるキーの特徴量を独立して管理できる', () => {
      multiMap.put('group1', new TestFeature('f1', 0.5, 0.8, 'source'));
      multiMap.put('group2', new TestFeature('f2', 0.7, 0.9, 'source'));
      
      expect(multiMap.keySize()).toBe(2);
      expect(multiMap.totalSize()).toBe(2);
      expect(multiMap.get('group1').size()).toBe(1);
      expect(multiMap.get('group2').size()).toBe(1);
    });

    test('最初の特徴量を取得できる', () => {
      const first = new TestFeature('first', 0.5, 0.8, 'source');
      const second = new TestFeature('second', 0.7, 0.9, 'source');
      
      multiMap.put('group', first);
      multiMap.put('group', second);
      
      expect(multiMap.getFirst('group')).toBe(first);
      expect(multiMap.getFirst('nonexistent')).toBeUndefined();
    });

    test('キーのすべての特徴量を削除できる', () => {
      multiMap.put('group', new TestFeature('f1', 0.5, 0.8, 'source'));
      multiMap.put('group', new TestFeature('f2', 0.7, 0.9, 'source'));
      
      expect(multiMap.containsKey('group')).toBe(true);
      
      const removed = multiMap.removeAll('group');
      expect(removed).toBe(true);
      expect(multiMap.containsKey('group')).toBe(false);
      
      const notFound = multiMap.removeAll('nonexistent');
      expect(notFound).toBe(false);
    });

    test('特定の特徴量を削除できる', () => {
      const feature1 = new TestFeature('keep', 0.5, 0.8, 'source');
      const feature2 = new TestFeature('remove', 0.7, 0.9, 'source');
      
      multiMap.put('group', feature1);
      multiMap.put('group', feature2);
      
      const removed = multiMap.remove('group', feature2);
      expect(removed).toBe(true);
      
      const remainingFeatures = multiMap.get('group');
      expect(remainingFeatures.size()).toBe(1);
      expect(remainingFeatures.get(0)).toBe(feature1);
    });
  });

  describe('一覧取得・統計機能テスト', () => {
    beforeEach(() => {
      multiMap.put('type1', new TestFeature('f1', 0.5, 0.8, 'source'));
      multiMap.put('type1', new TestFeature('f2', 0.7, 0.9, 'source'));
      multiMap.put('type2', new TestFeature('f3', 0.6, 0.85, 'source'));
    });

    test('すべてのキーを取得できる', () => {
      const keys = multiMap.keySet();
      expect(keys).toEqual(['type1', 'type2']);
    });

    test('すべての特徴量リストを取得できる', () => {
      const allLists = multiMap.values();
      expect(allLists).toHaveLength(2);
      expect(allLists[0].size()).toBe(2); // type1
      expect(allLists[1].size()).toBe(1); // type2
    });

    test('すべての特徴量を平坦化して取得できる', () => {
      const allFeatures = multiMap.allFeatures();
      expect(allFeatures).toHaveLength(3);
      
      const names = allFeatures.map(f => f.name);
      expect(names).toContain('f1');
      expect(names).toContain('f2');
      expect(names).toContain('f3');
    });

    test('統計情報を正しく取得できる', () => {
      expect(multiMap.totalSize()).toBe(3);
      expect(multiMap.keySize()).toBe(2);
      expect(multiMap.isEmpty()).toBe(false);
      
      multiMap.clear();
      expect(multiMap.isEmpty()).toBe(true);
      expect(multiMap.totalSize()).toBe(0);
      expect(multiMap.keySize()).toBe(0);
    });

    test('forEach で反復処理できる', () => {
      const collected: Array<{key: string, count: number}> = [];
      
      multiMap.forEach((key, features) => {
        collected.push({ key, count: features.size() });
      });
      
      expect(collected).toHaveLength(2);
      expect(collected.find(item => item.key === 'type1')?.count).toBe(2);
      expect(collected.find(item => item.key === 'type2')?.count).toBe(1);
    });
  });

  describe('エッジケース・境界条件テスト', () => {
    test('存在しないキーからの取得', () => {
      const emptyList = multiMap.get('nonexistent');
      expect(emptyList.size()).toBe(0);
      expect(emptyList.isEmpty()).toBe(true);
    });

    test('空のマルチマップの操作', () => {
      expect(multiMap.totalSize()).toBe(0);
      expect(multiMap.keySize()).toBe(0);
      expect(multiMap.isEmpty()).toBe(true);
      expect(multiMap.keySet()).toEqual([]);
      expect(multiMap.values()).toEqual([]);
      expect(multiMap.allFeatures()).toEqual([]);
    });

    test('大量の特徴量を同じキーに追加', () => {
      const count = 1000;
      
      for (let i = 0; i < count; i++) {
        multiMap.put('large_group', new TestFeature(`feature_${i}`, i * 0.001, 0.8, 'bulk'));
      }
      
      expect(multiMap.get('large_group').size()).toBe(count);
      expect(multiMap.totalSize()).toBe(count);
      expect(multiMap.keySize()).toBe(1);
    });
  });
});

describe('TypedFeatureList クラス', () => {
  let vectorList: VectorFeatureList;
  let statisticalList: StatisticalFeatureList;
  let tagList: TagFeatureList;
  let temporalList: TemporalFeatureList;

  beforeEach(() => {
    vectorList = new TypedFeatureList<VectorFeature>('test_vector');
    statisticalList = new TypedFeatureList<StatisticalFeature>('test_statistical');
    tagList = new TypedFeatureList<TagFeature>('test_tag');
    temporalList = new TypedFeatureList<TemporalFeature>('test_temporal');
  });

  describe('型安全性テスト', () => {
    test('VectorFeatureList は VectorFeature のみ受け入れる', () => {
      const vectorFeature = new TestVectorFeature('vector', 0.8, 0.9, 'source', [1, 2, 3]);
      const nonVectorFeature = new TestFeature('non_vector', 0.5, 0.8, 'source');
      
      expect(() => {
        vectorList.add(vectorFeature);
      }).not.toThrow();
      
      expect(() => {
        vectorList.add(nonVectorFeature as any);
      }).toThrow();
      
      expect(vectorList.size()).toBe(1);
      expect(vectorList.get(0)).toBe(vectorFeature);
    });

    test('StatisticalFeatureList は StatisticalFeature のみ受け入れる', () => {
      const statFeature = new TestStatisticalFeature('stat', 0.7, 0.9, 'source', 0.5, 0.1, 0.3, [0, 1]);
      const nonStatFeature = new TestFeature('non_stat', 0.5, 0.8, 'source');
      
      expect(() => {
        statisticalList.add(statFeature);
      }).not.toThrow();
      
      expect(() => {
        statisticalList.add(nonStatFeature as any);
      }).toThrow();
      
      expect(statisticalList.size()).toBe(1);
    });

    test('TagFeatureList は TagFeature のみ受け入れる', () => {
      const tagFeature = new TestTagFeature('tag', 0.6, 0.8, 'source', 3, ['a', 'b', 'c'], new Map());
      
      expect(() => {
        tagList.add(tagFeature);
      }).not.toThrow();
      
      expect(tagList.size()).toBe(1);
    });

    test('TemporalFeatureList は TemporalFeature のみ受け入れる', () => {
      const temporalFeature = new TestTemporalFeature('temporal', 0.8, 0.9, 'source', Date.now(), 0.1, 1);
      
      expect(() => {
        temporalList.add(temporalFeature);
      }).not.toThrow();
      
      expect(temporalList.size()).toBe(1);
    });
  });

  describe('型別操作テスト', () => {
    test('各型で名前検索が動作する', () => {
      const vectorFeature = new TestVectorFeature('search_vector', 0.8, 0.9, 'source', [1, 2]);
      vectorList.add(vectorFeature);
      
      const found = vectorList.findByName('search_vector');
      expect(found).toBe(vectorFeature);
      
      const notFound = vectorList.findByName('nonexistent');
      expect(notFound).toBeUndefined();
    });

    test('型安全な全件取得ができる', () => {
      const features = [
        new TestVectorFeature('v1', 0.5, 0.8, 'source', [1]),
        new TestVectorFeature('v2', 0.7, 0.9, 'source', [2, 3])
      ];
      
      features.forEach(f => vectorList.add(f));
      
      const allFeatures = vectorList.getAll();
      expect(allFeatures).toHaveLength(2);
      expect(allFeatures.every(f => f instanceof TestVectorFeature)).toBe(true);
    });

    test('イテレータが型安全に動作する', () => {
      const vectorFeature = new TestVectorFeature('iter_test', 0.8, 0.9, 'source', [1, 2, 3]);
      vectorList.add(vectorFeature);
      
      const features: VectorFeature[] = [];
      for (const feature of vectorList) {
        features.push(feature);
        expect(feature).toBeInstanceOf(TestVectorFeature);
        expect(feature.dimension).toBeDefined(); // VectorFeature固有のプロパティ
      }
      
      expect(features).toHaveLength(1);
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('型不一致でのエラーメッセージが適切', () => {
      const wrongTypeFeature = new TestFeature('wrong', 0.5, 0.8, 'source');
      
      expect(() => {
        vectorList.add(wrongTypeFeature as any);
      }).toThrow("Expected feature type 'test_vector', got 'test'");
    });

    test('空のTypedFeatureListの操作', () => {
      expect(vectorList.size()).toBe(0);
      expect(vectorList.isEmpty()).toBe(true);
      expect(vectorList.get(0)).toBeUndefined();
      expect(vectorList.findByName('any')).toBeUndefined();
      expect(vectorList.getAll()).toEqual([]);
    });
  });
});