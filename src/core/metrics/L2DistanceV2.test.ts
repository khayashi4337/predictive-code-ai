import { L2Distance } from './L2Distance';
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
function createContextInfo<T extends VectorizableContext>(context: T): ContextInfo<T> {
  const tags = new Set([
    Tag.createString('test', 'test-tag')
  ]);
  
  const statistics = new Map([
    ['confidenceScore', 1.0],
    ['accuracy', 1.0],
    ['relevanceScore', 1.0]
  ]);
  
  return new ContextInfo(context, tags, statistics);
}

describe('L2Distance (クラス図準拠版)', () => {
  let l2Distance: L2Distance<TestVectorizableContext>;

  beforeEach(() => {
    l2Distance = new L2Distance<TestVectorizableContext>();
  });

  describe('基本機能', () => {
    test('メトリクス名がL2であること', () => {
      expect(l2Distance.getName()).toBe('L2');
    });

    test('同一ベクトルの距離は0であること', () => {
      const vector = [1, 2, 3];
      const context = new TestVectorizableContext('test', vector);
      const contextInfo = createContextInfo(context);
      
      const expected = new ExpectedPatternV2(contextInfo);
      const actual = new ActualPatternV2(contextInfo);

      const distance = l2Distance.distance(expected, actual);
      expect(distance).toBe(0);
    });
  });

  describe('数学的特性の検証', () => {
    test('ユークリッド距離の計算が正確であること', () => {
      // √((3-1)² + (4-2)² + (5-3)²) = √(4 + 4 + 4) = √12 ≈ 3.464
      const expectedContext = new TestVectorizableContext('exp', [1, 2, 3]);
      const actualContext = new TestVectorizableContext('act', [3, 4, 5]);
      
      const expected = new ExpectedPatternV2(createContextInfo(expectedContext));
      const actual = new ActualPatternV2(createContextInfo(actualContext));

      const distance = l2Distance.distance(expected, actual);
      expect(distance).toBeCloseTo(Math.sqrt(12), 5);
    });

    test('非負性: 距離は常に0以上であること', () => {
      const testCases = [
        { exp: [1, 2], act: [3, 4] },
        { exp: [-1, -2], act: [1, 2] },
        { exp: [0, 0], act: [5, 5] },
        { exp: [1.5, 2.7], act: [-3.2, 4.1] }
      ];

      testCases.forEach(({ exp, act }) => {
        const expectedContext = new TestVectorizableContext('exp', exp);
        const actualContext = new TestVectorizableContext('act', act);
        
        const expected = new ExpectedPatternV2(createContextInfo(expectedContext));
        const actual = new ActualPatternV2(createContextInfo(actualContext));

        const distance = l2Distance.distance(expected, actual);
        expect(distance).toBeGreaterThanOrEqual(0);
      });
    });

    test('対称性: distance(A,B) = distance(B,A)', () => {
      const contextA = new TestVectorizableContext('a', [1, 2, 3]);
      const contextB = new TestVectorizableContext('b', [4, 5, 6]);
      
      const patternA_expected = new ExpectedPatternV2(createContextInfo(contextA));
      const patternB_actual = new ActualPatternV2(createContextInfo(contextB));
      
      const patternB_expected = new ExpectedPatternV2(createContextInfo(contextB));
      const patternA_actual = new ActualPatternV2(createContextInfo(contextA));

      const distanceAB = l2Distance.distance(patternA_expected, patternB_actual);
      const distanceBA = l2Distance.distance(patternB_expected, patternA_actual);
      
      expect(distanceAB).toBeCloseTo(distanceBA, 10);
    });

    test('三角不等式: d(A,C) ≤ d(A,B) + d(B,C)', () => {
      const contextA = new TestVectorizableContext('a', [0, 0]);
      const contextB = new TestVectorizableContext('b', [1, 1]);
      const contextC = new TestVectorizableContext('c', [2, 0]);
      
      const patternA_expected = new ExpectedPatternV2(createContextInfo(contextA));
      const patternB_expected = new ExpectedPatternV2(createContextInfo(contextB));
      
      const actualB = new ActualPatternV2(createContextInfo(contextB));
      const actualC = new ActualPatternV2(createContextInfo(contextC));

      const distanceAC = l2Distance.distance(patternA_expected, actualC);
      const distanceAB = l2Distance.distance(patternA_expected, actualB);
      const distanceBC = l2Distance.distance(patternB_expected, actualC);

      expect(distanceAC).toBeLessThanOrEqual(distanceAB + distanceBC + 1e-10); // 数値誤差を考慮
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('ゼロベクトルとの距離計算', () => {
      const zeroContext = new TestVectorizableContext('zero', [0, 0, 0]);
      const nonZeroContext = new TestVectorizableContext('nonzero', [3, 4, 0]);
      
      const expected = new ExpectedPatternV2(createContextInfo(zeroContext));
      const actual = new ActualPatternV2(createContextInfo(nonZeroContext));

      const distance = l2Distance.distance(expected, actual);
      expect(distance).toBe(5); // √(9 + 16 + 0) = 5
    });

    test('次元数が異なる場合はエラーをスローすること', () => {
      const context2D = new TestVectorizableContext('2d', [1, 2]);
      const context3D = new TestVectorizableContext('3d', [1, 2, 3]);
      
      const expected = new ExpectedPatternV2(createContextInfo(context2D));
      const actual = new ActualPatternV2(createContextInfo(context3D));

      expect(() => {
        l2Distance.distance(expected, actual);
      }).toThrow('Dimension mismatch');
    });

    test('空のベクトルの場合はエラーをスローすること', () => {
      const emptyContext = new TestVectorizableContext('empty', []);
      
      const expected = new ExpectedPatternV2(createContextInfo(emptyContext));
      const actual = new ActualPatternV2(createContextInfo(emptyContext));

      expect(() => {
        l2Distance.distance(expected, actual);
      }).toThrow('Empty vector');
    });

    test('NaNやInfinityを含むベクトルの場合はエラーをスローすること', () => {
      const invalidContext = new TestVectorizableContext('invalid', [1, NaN, 3]);
      const validContext = new TestVectorizableContext('valid', [1, 2, 3]);
      
      const expected = new ExpectedPatternV2(createContextInfo(invalidContext));
      const actual = new ActualPatternV2(createContextInfo(validContext));

      expect(() => {
        l2Distance.distance(expected, actual);
      }).toThrow('Invalid vector values');
    });
  });

  describe('距離値の有効性チェック', () => {
    test('有効な距離値を正しく判定すること', () => {
      expect(l2Distance.isValidDistance(0)).toBe(true);
      expect(l2Distance.isValidDistance(1.5)).toBe(true);
      expect(l2Distance.isValidDistance(100)).toBe(true);
    });

    test('無効な距離値を正しく判定すること', () => {
      expect(l2Distance.isValidDistance(-1)).toBe(false);
      expect(l2Distance.isValidDistance(NaN)).toBe(false);
      expect(l2Distance.isValidDistance(Infinity)).toBe(false);
      expect(l2Distance.isValidDistance(-Infinity)).toBe(false);
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
      const distance = l2Distance.distance(expected, actual);
      const endTime = performance.now();
      
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });
  });
});