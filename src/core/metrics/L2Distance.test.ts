import { L2Distance } from './L2Distance';
import { VectorizableExperience, DistanceMetricType } from './interfaces';
import { ExpectedPattern } from '../pattern/ExpectedPattern';
import { ActualPattern } from '../pattern/ActualPattern';
import { AttachedInfo } from '../tag/AttachedInfo';
import { Tag } from '../tag/Tag';
import { TagType } from '../tag/TagType';

/**
 * テスト用の数値ベクトル化可能なExperience実装
 */
class TestVectorizableExperience implements VectorizableExperience {
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
 * テスト用のAttachedInfoヘルパー関数
 */
function createAttachedInfo<T extends VectorizableExperience>(experience: T): AttachedInfo<T> {
  const tags = new Set([
    new Tag('test', TagType.CONTEXT, 'test-tag', 1.0)
  ]);
  
  return new AttachedInfo(
    experience,
    tags,
    { confidenceScore: 1.0, accuracy: 1.0, relevanceScore: 1.0 }
  );
}

describe('L2Distance', () => {
  let l2Distance: L2Distance<TestVectorizableExperience>;

  beforeEach(() => {
    l2Distance = new L2Distance<TestVectorizableExperience>();
  });

  describe('基本機能', () => {
    test('メトリクス名がL2であること', () => {
      expect(l2Distance.getName()).toBe('L2');
    });

    test('同一ベクトルの距離は0であること', () => {
      const vector = [1, 2, 3];
      const experience = new TestVectorizableExperience('test', vector);
      const attachedInfo = createAttachedInfo(experience);
      
      const expected = new ExpectedPattern('expected', attachedInfo);
      const actual = new ActualPattern('actual', attachedInfo, 'test-context');

      const distance = l2Distance.distance(expected, actual);
      expect(distance).toBe(0);
    });
  });

  describe('数学的特性の検証', () => {
    test('ユークリッド距離の計算が正確であること', () => {
      // √((3-1)² + (4-2)² + (5-3)²) = √(4 + 4 + 4) = √12 ≈ 3.464
      const expectedExp = new TestVectorizableExperience('exp', [1, 2, 3]);
      const actualExp = new TestVectorizableExperience('act', [3, 4, 5]);
      
      const expected = new ExpectedPattern('expected', createAttachedInfo(expectedExp));
      const actual = new ActualPattern('actual', createAttachedInfo(actualExp), 'test-context');

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
        const expectedExp = new TestVectorizableExperience('exp', exp);
        const actualExp = new TestVectorizableExperience('act', act);
        
        const expected = new ExpectedPattern('expected', createAttachedInfo(expectedExp));
        const actual = new ActualPattern('actual', createAttachedInfo(actualExp), 'test-context');

        const distance = l2Distance.distance(expected, actual);
        expect(distance).toBeGreaterThanOrEqual(0);
      });
    });

    test('対称性: distance(A,B) = distance(B,A)', () => {
      const expA = new TestVectorizableExperience('a', [1, 2, 3]);
      const expB = new TestVectorizableExperience('b', [4, 5, 6]);
      
      const patternA = new ExpectedPattern('a', createAttachedInfo(expA));
      const patternB = new ActualPattern('b', createAttachedInfo(expB), 'test-context');
      
      // A->B と B->A の比較のため、ExpectedとActualを入れ替えて計算
      const patternA_asActual = new ActualPattern('a', createAttachedInfo(expA), 'test-context');
      const patternB_asExpected = new ExpectedPattern('b', createAttachedInfo(expB));

      const distanceAB = l2Distance.distance(patternA, patternB);
      const distanceBA = l2Distance.distance(patternB_asExpected, patternA_asActual);
      
      expect(distanceAB).toBeCloseTo(distanceBA, 10);
    });

    test('三角不等式: d(A,C) ≤ d(A,B) + d(B,C)', () => {
      const expA = new TestVectorizableExperience('a', [0, 0]);
      const expB = new TestVectorizableExperience('b', [1, 1]);
      const expC = new TestVectorizableExperience('c', [2, 0]);
      
      const patternA = new ExpectedPattern('a', createAttachedInfo(expA));
      const patternB = new ExpectedPattern('b', createAttachedInfo(expB));
      const patternC = new ExpectedPattern('c', createAttachedInfo(expC));
      
      // ActualPattern versions for calculations
      const actualA = new ActualPattern('a', createAttachedInfo(expA), 'test');
      const actualB = new ActualPattern('b', createAttachedInfo(expB), 'test');
      const actualC = new ActualPattern('c', createAttachedInfo(expC), 'test');

      const distanceAC = l2Distance.distance(patternA, actualC);
      const distanceAB = l2Distance.distance(patternA, actualB);
      const distanceBC = l2Distance.distance(patternB, actualC);

      expect(distanceAC).toBeLessThanOrEqual(distanceAB + distanceBC + 1e-10); // 数値誤差を考慮
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('ゼロベクトルとの距離計算', () => {
      const zeroExp = new TestVectorizableExperience('zero', [0, 0, 0]);
      const nonZeroExp = new TestVectorizableExperience('nonzero', [3, 4, 0]);
      
      const expected = new ExpectedPattern('zero', createAttachedInfo(zeroExp));
      const actual = new ActualPattern('nonzero', createAttachedInfo(nonZeroExp), 'test-context');

      const distance = l2Distance.distance(expected, actual);
      expect(distance).toBe(5); // √(9 + 16 + 0) = 5
    });

    test('次元数が異なる場合はエラーをスローすること', () => {
      const exp2D = new TestVectorizableExperience('2d', [1, 2]);
      const exp3D = new TestVectorizableExperience('3d', [1, 2, 3]);
      
      const expected = new ExpectedPattern('2d', createAttachedInfo(exp2D));
      const actual = new ActualPattern('3d', createAttachedInfo(exp3D), 'test-context');

      expect(() => {
        l2Distance.distance(expected, actual);
      }).toThrow('Dimension mismatch');
    });

    test('空のベクトルの場合はエラーをスローすること', () => {
      const emptyExp = new TestVectorizableExperience('empty', []);
      
      const expected = new ExpectedPattern('empty', createAttachedInfo(emptyExp));
      const actual = new ActualPattern('empty', createAttachedInfo(emptyExp), 'test-context');

      expect(() => {
        l2Distance.distance(expected, actual);
      }).toThrow('Empty vector');
    });

    test('NaNやInfinityを含むベクトルの場合はエラーをスローすること', () => {
      const invalidExp = new TestVectorizableExperience('invalid', [1, NaN, 3]);
      const validExp = new TestVectorizableExperience('valid', [1, 2, 3]);
      
      const expected = new ExpectedPattern('invalid', createAttachedInfo(invalidExp));
      const actual = new ActualPattern('valid', createAttachedInfo(validExp), 'test-context');

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
      const largeVector = Array.from({ length: 1000 }, (_, i) => Math.random() * 100);
      const largeVector2 = Array.from({ length: 1000 }, (_, i) => Math.random() * 100);
      
      const exp1 = new TestVectorizableExperience('large1', largeVector);
      const exp2 = new TestVectorizableExperience('large2', largeVector2);
      
      const expected = new ExpectedPattern('large1', createAttachedInfo(exp1));
      const actual = new ActualPattern('large2', createAttachedInfo(exp2), 'test-context');

      const startTime = performance.now();
      const distance = l2Distance.distance(expected, actual);
      const endTime = performance.now();
      
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });
  });
});