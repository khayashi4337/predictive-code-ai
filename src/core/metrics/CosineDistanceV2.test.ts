import { CosineDistance } from './CosineDistance';
import { VectorizableContext } from '../tag/VectorizableContext';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { ContextInfo } from '../tag/ContextInfo';
import { Tag } from '../tag/Tag';

/**
 * テスト用の数値ベクトル化可能なContext実装
 */
class TestVectorizableContext implements VectorizableContext {
  constructor(
    public readonly id: string,
    private vector: number[]
  ) {}

  toVector(): number[] {
    return [...this.vector];
  }

  getDimension(): number {
    return this.vector.length;
  }
}

/**
 * テスト用のContextInfoヘルパー関数
 */
function createContextInfo<T extends VectorizableContext>(context: T): ContextInfo<T> {
  const tags = new Set([
    Tag.createString('test', 'test-tag')
  ]);
  
  const statistics = new Map([
    ['confidenceScore', 1.0]
  ]);
  
  return new ContextInfo(context, tags, statistics);
}

describe('CosineDistance (クラス図準拠版)', () => {
  let cosineDistance: CosineDistance<TestVectorizableContext>;

  beforeEach(() => {
    cosineDistance = new CosineDistance<TestVectorizableContext>();
  });

  describe('基本機能', () => {
    test('メトリクス名がCosineであること', () => {
      expect(cosineDistance.getName()).toBe('Cosine');
    });

    test('同一ベクトルの距離は0であること', () => {
      const vector = [1, 2, 3];
      const context = new TestVectorizableContext('test', vector);
      const contextInfo = createContextInfo(context);
      
      const expected = new ExpectedPatternV2(contextInfo);
      const actual = new ActualPatternV2(contextInfo);

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBeCloseTo(0, 10);
    });

    test('直交ベクトルの距離は1であること', () => {
      const contextA = new TestVectorizableContext('a', [1, 0]);
      const contextB = new TestVectorizableContext('b', [0, 1]);
      
      const expected = new ExpectedPatternV2(createContextInfo(contextA));
      const actual = new ActualPatternV2(createContextInfo(contextB));

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBeCloseTo(1, 10);
    });

    test('完全に反対方向のベクトルの距離は2であること', () => {
      const contextA = new TestVectorizableContext('a', [1, 0]);
      const contextB = new TestVectorizableContext('b', [-1, 0]);
      
      const expected = new ExpectedPatternV2(createContextInfo(contextA));
      const actual = new ActualPatternV2(createContextInfo(contextB));

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBeCloseTo(2, 10);
    });
  });

  describe('数学的特性の検証', () => {
    test('正規化の影響を受けないこと', () => {
      const contextA = new TestVectorizableContext('a', [1, 2]);
      const contextB = new TestVectorizableContext('b', [2, 4]);
      
      const expected = new ExpectedPatternV2(createContextInfo(contextA));
      const actual = new ActualPatternV2(createContextInfo(contextB));

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBeCloseTo(0, 10);
    });

    test('対称性: distance(A,B) = distance(B,A)', () => {
      const contextA = new TestVectorizableContext('a', [1, 2, 3]);
      const contextB = new TestVectorizableContext('b', [4, 5, 6]);
      
      const patternA_expected = new ExpectedPatternV2(createContextInfo(contextA));
      const patternB_actual = new ActualPatternV2(createContextInfo(contextB));
      
      const patternB_expected = new ExpectedPatternV2(createContextInfo(contextB));
      const patternA_actual = new ActualPatternV2(createContextInfo(contextA));

      const distanceAB = cosineDistance.distance(patternA_expected, patternB_actual);
      const distanceBA = cosineDistance.distance(patternB_expected, patternA_actual);
      
      expect(distanceAB).toBeCloseTo(distanceBA, 10);
    });

    test('距離が0-2の範囲内であること', () => {
      const testCases = [
        { a: [1, 0], b: [1, 0] },     // 同一方向: 0
        { a: [1, 0], b: [0, 1] },     // 直交: 1
        { a: [1, 0], b: [-1, 0] },    // 反対: 2
        { a: [1, 1], b: [1, -1] },    // 角度あり
        { a: [3, 4], b: [6, 8] }      // スケール違い: 0
      ];

      testCases.forEach(({ a, b }, index) => {
        const contextA = new TestVectorizableContext(`a${index}`, a);
        const contextB = new TestVectorizableContext(`b${index}`, b);
        
        const expected = new ExpectedPatternV2(createContextInfo(contextA));
        const actual = new ActualPatternV2(createContextInfo(contextB));

        const distance = cosineDistance.distance(expected, actual);
        expect(distance).toBeGreaterThanOrEqual(0);
        expect(distance).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('ゼロベクトル同士の距離は0であること', () => {
      const zeroContext = new TestVectorizableContext('zero', [0, 0, 0]);
      
      const expected = new ExpectedPatternV2(createContextInfo(zeroContext));
      const actual = new ActualPatternV2(createContextInfo(zeroContext));

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBe(0);
    });

    test('ゼロベクトルと非ゼロベクトルの距離は1であること', () => {
      const zeroContext = new TestVectorizableContext('zero', [0, 0, 0]);
      const nonZeroContext = new TestVectorizableContext('nonzero', [1, 2, 3]);
      
      const expected = new ExpectedPatternV2(createContextInfo(zeroContext));
      const actual = new ActualPatternV2(createContextInfo(nonZeroContext));

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBe(1);
    });

    test('次元数が異なる場合はエラーをスローすること', () => {
      const context2D = new TestVectorizableContext('2d', [1, 2]);
      const context3D = new TestVectorizableContext('3d', [1, 2, 3]);
      
      const expected = new ExpectedPatternV2(createContextInfo(context2D));
      const actual = new ActualPatternV2(createContextInfo(context3D));

      expect(() => {
        cosineDistance.distance(expected, actual);
      }).toThrow('Dimension mismatch');
    });

    test('空のベクトルの場合はエラーをスローすること', () => {
      const emptyContext = new TestVectorizableContext('empty', []);
      
      const expected = new ExpectedPatternV2(createContextInfo(emptyContext));
      const actual = new ActualPatternV2(createContextInfo(emptyContext));

      expect(() => {
        cosineDistance.distance(expected, actual);
      }).toThrow('Empty vector');
    });

    test('NaNやInfinityを含むベクトルの場合はエラーをスローすること', () => {
      const invalidContext = new TestVectorizableContext('invalid', [1, NaN, 3]);
      const validContext = new TestVectorizableContext('valid', [1, 2, 3]);
      
      const expected = new ExpectedPatternV2(createContextInfo(invalidContext));
      const actual = new ActualPatternV2(createContextInfo(validContext));

      expect(() => {
        cosineDistance.distance(expected, actual);
      }).toThrow('Invalid vector values');
    });
  });

  describe('距離値の有効性チェック', () => {
    test('有効な距離値を正しく判定すること', () => {
      expect(cosineDistance.isValidDistance(0)).toBe(true);
      expect(cosineDistance.isValidDistance(1)).toBe(true);
      expect(cosineDistance.isValidDistance(2)).toBe(true);
      expect(cosineDistance.isValidDistance(1.5)).toBe(true);
    });

    test('無効な距離値を正しく判定すること', () => {
      expect(cosineDistance.isValidDistance(-0.1)).toBe(false);
      expect(cosineDistance.isValidDistance(2.1)).toBe(false);
      expect(cosineDistance.isValidDistance(NaN)).toBe(false);
      expect(cosineDistance.isValidDistance(Infinity)).toBe(false);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大きなベクトルでの計算時間が許容範囲内であること', () => {
      const largeVector = Array.from({ length: 1000 }, () => Math.random() * 100);
      const largeVector2 = Array.from({ length: 1000 }, () => Math.random() * 100);
      
      const context1 = new TestVectorizableContext('large1', largeVector);
      const context2 = new TestVectorizableContext('large2', largeVector2);
      
      const expected = new ExpectedPatternV2(createContextInfo(context1));
      const actual = new ActualPatternV2(createContextInfo(context2));

      const startTime = performance.now();
      const distance = cosineDistance.distance(expected, actual);
      const endTime = performance.now();
      
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThanOrEqual(2);
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });
  });
});