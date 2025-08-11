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
    return [...this.vector]; // コピーを返す
  }

  getDimension(): number {
    return this.vector.length;
  }
}

/**
 * テスト用のContextInfoヘルパー関数
 */
function createContextInfo(context: TestVectorizableContext): ContextInfo<TestVectorizableContext> {
  const tags = new Set([
    Tag.createString('test', 'test-tag')
  ]);
  
  const statistics = new Map([
    ['confidenceScore', 1.0]
  ]);
  
  return new ContextInfo(context, tags, statistics);
}

describe('CosineDistance', () => {
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
  });

  describe('数学的特性の検証', () => {
    test('コサイン距離の計算が正確であること - 直交ベクトル', () => {
      // 直交ベクトル [1,0] と [0,1] のコサイン距離は1
      const expectedContext = new TestVectorizableContext('exp', [1, 0]);
      const actualContext = new TestVectorizableContext('act', [0, 1]);
      
      const expected = new ExpectedPatternV2(createContextInfo(expectedContext));
      const actual = new ActualPatternV2(createContextInfo(actualContext));

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBeCloseTo(1, 10); // cos(90°) = 0, so distance = 1 - 0 = 1
    });

    test('コサイン距離の計算が正確であること - 平行ベクトル', () => {
      // 平行ベクトル [1,2] と [2,4] のコサイン距離は0
      const expectedContext = new TestVectorizableContext('exp', [1, 2]);
      const actualContext = new TestVectorizableContext('act', [2, 4]);
      
      const expected = new ExpectedPatternV2(createContextInfo(expectedContext));
      const actual = new ActualPatternV2(createContextInfo(actualContext));

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBeCloseTo(0, 10); // cos(0°) = 1, so distance = 1 - 1 = 0
    });

    test('コサイン距離の計算が正確であること - 反対ベクトル', () => {
      // 反対ベクトル [1,0] と [-1,0] のコサイン距離は2
      const expectedContext = new TestVectorizableContext('exp', [1, 0]);
      const actualContext = new TestVectorizableContext('act', [-1, 0]);
      
      const expected = new ExpectedPatternV2(createContextInfo(expectedContext));
      const actual = new ActualPatternV2(createContextInfo(actualContext));

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBeCloseTo(2, 10); // cos(180°) = -1, so distance = 1 - (-1) = 2
    });

    test('コサイン距離の計算が正確であること - 45度の角度', () => {
      // [1,0] と [1,1] の間の角度は45度。cos(45) = 1/sqrt(2)
      const expectedContext = new TestVectorizableContext('exp', [1, 0]);
      const actualContext = new TestVectorizableContext('act', [1, 1]);
      
      const expected = new ExpectedPatternV2(createContextInfo(expectedContext));
      const actual = new ActualPatternV2(createContextInfo(actualContext));

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBeCloseTo(1 - 1 / Math.sqrt(2), 10);
    });

    test('ゼロベクトルとの距離はNaNを返し、無効な距離として扱われるべき', () => {
      const zeroVectorContext = new TestVectorizableContext('zero', [0, 0, 0]);
      const normalVectorContext = new TestVectorizableContext('normal', [1, 2, 3]);

      const expected = new ExpectedPatternV2(createContextInfo(zeroVectorContext));
      const actual = new ActualPatternV2(createContextInfo(normalVectorContext));

      const distance = cosineDistance.distance(expected, actual);
      expect(isNaN(distance)).toBe(true);
      expect(cosineDistance.isValidDistance(distance)).toBe(false);
    });

    test('両方がゼロベクトルの場合もNaNを返す', () => {
      const zeroContext1 = new TestVectorizableContext('zero1', [0, 0]);
      const zeroContext2 = new TestVectorizableContext('zero2', [0, 0]);
      
      const expected = new ExpectedPatternV2(createContextInfo(zeroContext1));
      const actual = new ActualPatternV2(createContextInfo(zeroContext2));
      
      const distance = cosineDistance.distance(expected, actual);
      expect(isNaN(distance)).toBe(true);
    });

    test('距離は常に[0, 2]の範囲内であること', () => {
      const contextA = new TestVectorizableContext('a', [1, 2, 3]);
      const contextB = new TestVectorizableContext('b', [-4, 5, -6]);
      const contextC = new TestVectorizableContext('c', [10, -20, 30]);
      
      const expectedA = new ExpectedPatternV2(createContextInfo(contextA));
      const actualB = new ActualPatternV2(createContextInfo(contextB));
      const actualC = new ActualPatternV2(createContextInfo(contextC));

      const distanceAB = cosineDistance.distance(expectedA, actualB);
      const distanceAC = cosineDistance.distance(expectedA, actualC);

      expect(distanceAB).toBeGreaterThanOrEqual(0);
      expect(distanceAB).toBeLessThanOrEqual(2);
      expect(distanceAC).toBeGreaterThanOrEqual(0);
      expect(distanceAC).toBeLessThanOrEqual(2);
    });
  });

  describe('入力値の検証', () => {
    test('次元が異なるベクトルの場合はエラーをスローすること', () => {
      const context2D = new TestVectorizableContext('2d', [1, 2]);
      const context3D = new TestVectorizableContext('3d', [1, 2, 3]);
      
      const expected = new ExpectedPatternV2(createContextInfo(context2D));
      const actual = new ActualPatternV2(createContextInfo(context3D));

      expect(() => {
        cosineDistance.distance(expected, actual);
      }).toThrow('Vector dimensions do not match');
    });

    test('空のベクトル（次元0）の場合はエラーをスローすること', () => {
      const emptyContext = new TestVectorizableContext('empty', []);
      
      const expected = new ExpectedPatternV2(createContextInfo(emptyContext));
      const actual = new ActualPatternV2(createContextInfo(emptyContext));

      expect(() => {
        cosineDistance.distance(expected, actual);
      }).toThrow('Cannot compute distance for zero-dimensional vectors');
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

  describe('特殊ケース', () => {
    test('単位ベクトル同士の計算', () => {
      const unitX = new TestVectorizableContext('unitX', [1, 0, 0]);
      const unitY = new TestVectorizableContext('unitY', [0, 1, 0]);
      const unitZ = new TestVectorizableContext('unitZ', [0, 0, 1]);
      
      const expectedX = new ExpectedPatternV2(createContextInfo(unitX));
      const actualY = new ActualPatternV2(createContextInfo(unitY));
      const actualZ = new ActualPatternV2(createContextInfo(unitZ));

      // 直交単位ベクトル同士の距離は1
      const distanceXY = cosineDistance.distance(expectedX, actualY);
      const distanceXZ = cosineDistance.distance(expectedX, actualZ);
      
      expect(distanceXY).toBeCloseTo(1, 10);
      expect(distanceXZ).toBeCloseTo(1, 10);
    });

    test('高次元ベクトルでの計算', () => {
      const dim = 100;
      const vector1 = Array.from({ length: dim }, (_, i) => Math.sin(i));
      const vector2 = Array.from({ length: dim }, (_, i) => Math.cos(i));
      
      const context1 = new TestVectorizableContext('sin', vector1);
      const context2 = new TestVectorizableContext('cos', vector2);
      
      const expected = new ExpectedPatternV2(createContextInfo(context1));
      const actual = new ActualPatternV2(createContextInfo(context2));

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThanOrEqual(2);
      expect(isFinite(distance)).toBe(true);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大きなベクトルでの計算時間が許容範囲内であること', () => {
      const largeVector1 = Array.from({ length: 1000 }, () => Math.random() * 2 - 1);
      const largeVector2 = Array.from({ length: 1000 }, () => Math.random() * 2 - 1);
      
      const context1 = new TestVectorizableContext('large1', largeVector1);
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