import { KLDistance } from './KLDistance';
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

/**
 * 確率分布を正規化するヘルパー関数
 */
function normalizeProbability(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new Error('Invalid probability distribution');
  return values.map(v => v / sum);
}

describe('KLDistance', () => {
  let klDistance: KLDistance<TestVectorizableExperience>;

  beforeEach(() => {
    klDistance = new KLDistance<TestVectorizableExperience>();
  });

  describe('基本機能', () => {
    test('メトリクス名がKLであること', () => {
      expect(klDistance.getName()).toBe('KL');
    });

    test('同一分布の距離は0であること', () => {
      const probVector = normalizeProbability([1, 2, 3]);
      const experience = new TestVectorizableExperience('test', probVector);
      const attachedInfo = createAttachedInfo(experience);
      
      const expected = new ExpectedPattern('expected', attachedInfo);
      const actual = new ActualPattern('actual', attachedInfo, 'test-context');

      const distance = klDistance.distance(expected, actual);
      expect(distance).toBeCloseTo(0, 10);
    });
  });

  describe('数学的特性の検証', () => {
    test('KLダイバージェンスの計算が正確であること - 基本ケース', () => {
      // P = [0.5, 0.5], Q = [0.25, 0.75]
      // KL(P||Q) = 0.5*log(0.5/0.25) + 0.5*log(0.5/0.75) = 0.5*log(2) + 0.5*log(2/3)
      const pDist = [0.5, 0.5];
      const qDist = [0.25, 0.75];
      
      const expectedExp = new TestVectorizableExperience('p', pDist);
      const actualExp = new TestVectorizableExperience('q', qDist);
      
      const expected = new ExpectedPattern('expected', createAttachedInfo(expectedExp));
      const actual = new ActualPattern('actual', createAttachedInfo(actualExp), 'test-context');

      const distance = klDistance.distance(expected, actual);
      const expectedKL = 0.5 * Math.log(2) + 0.5 * Math.log(2/3);
      expect(distance).toBeCloseTo(expectedKL, 10);
    });

    test('均等分布と特定分布間のKLダイバージェンス', () => {
      // 均等分布 [1/3, 1/3, 1/3] と 特定分布 [0.5, 0.3, 0.2]
      const uniformDist = [1/3, 1/3, 1/3];
      const specificDist = [0.5, 0.3, 0.2];
      
      const expectedExp = new TestVectorizableExperience('uniform', uniformDist);
      const actualExp = new TestVectorizableExperience('specific', specificDist);
      
      const expected = new ExpectedPattern('expected', createAttachedInfo(expectedExp));
      const actual = new ActualPattern('actual', createAttachedInfo(actualExp), 'test-context');

      const distance = klDistance.distance(expected, actual);
      
      // 手動計算: (1/3)*log((1/3)/0.5) + (1/3)*log((1/3)/0.3) + (1/3)*log((1/3)/0.2)
      const expectedKL = (1/3) * Math.log((1/3)/0.5) + 
                        (1/3) * Math.log((1/3)/0.3) + 
                        (1/3) * Math.log((1/3)/0.2);
      expect(distance).toBeCloseTo(expectedKL, 10);
    });

    test('非負性: KLダイバージェンスは常に0以上であること', () => {
      const testCases = [
        { p: [0.7, 0.3], q: [0.6, 0.4] },
        { p: [0.1, 0.9], q: [0.9, 0.1] },
        { p: [0.33, 0.33, 0.34], q: [0.2, 0.3, 0.5] }
      ];

      testCases.forEach(({ p, q }) => {
        const expectedExp = new TestVectorizableExperience('p', p);
        const actualExp = new TestVectorizableExperience('q', q);
        
        const expected = new ExpectedPattern('expected', createAttachedInfo(expectedExp));
        const actual = new ActualPattern('actual', createAttachedInfo(actualExp), 'test-context');

        const distance = klDistance.distance(expected, actual);
        expect(distance).toBeGreaterThanOrEqual(-1e-10); // 数値誤差を考慮
      });
    });

    test('非対称性: KL(P||Q) ≠ KL(Q||P) (一般に)', () => {
      const pDist = [0.8, 0.2];
      const qDist = [0.2, 0.8];
      
      const expP = new TestVectorizableExperience('p', pDist);
      const expQ = new TestVectorizableExperience('q', qDist);
      
      const patternP = new ExpectedPattern('p', createAttachedInfo(expP));
      const patternQ = new ActualPattern('q', createAttachedInfo(expQ), 'test-context');
      
      // P->Q と Q->P の比較
      const patternP_asActual = new ActualPattern('p', createAttachedInfo(expP), 'test-context');
      const patternQ_asExpected = new ExpectedPattern('q', createAttachedInfo(expQ));

      const klPQ = klDistance.distance(patternP, patternQ);
      const klQP = klDistance.distance(patternQ_asExpected, patternP_asActual);
      
      expect(Math.abs(klPQ - klQP)).toBeGreaterThan(1e-10); // 異なることを確認
    });

    test('極端な分布でのKLダイバージェンス', () => {
      // 極端に偏った分布
      const sharpDist = [0.99, 0.01];
      const flatDist = [0.5, 0.5];
      
      const expectedExp = new TestVectorizableExperience('sharp', sharpDist);
      const actualExp = new TestVectorizableExperience('flat', flatDist);
      
      const expected = new ExpectedPattern('expected', createAttachedInfo(expectedExp));
      const actual = new ActualPattern('actual', createAttachedInfo(actualExp), 'test-context');

      const distance = klDistance.distance(expected, actual);
      expect(distance).toBeGreaterThan(0.1); // 大きな差があることを確認
      expect(isFinite(distance)).toBe(true);
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('負の値を含む場合はエラーをスローすること', () => {
      const invalidDist = [0.5, -0.1, 0.6];
      const validDist = [0.5, 0.5];
      
      const invalidExp = new TestVectorizableExperience('invalid', invalidDist);
      const validExp = new TestVectorizableExperience('valid', validDist);
      
      const expected = new ExpectedPattern('invalid', createAttachedInfo(invalidExp));
      const actual = new ActualPattern('valid', createAttachedInfo(validExp), 'test-context');

      expect(() => {
        klDistance.distance(expected, actual);
      }).toThrow('Invalid probability distribution');
    });

    test('ゼロ値を含む分布の処理（スムージング）', () => {
      const distWithZero = [0.5, 0.0, 0.5]; // ゼロを含む
      const normalDist = [0.3, 0.3, 0.4];
      
      const expectedExp = new TestVectorizableExperience('zero', distWithZero);
      const actualExp = new TestVectorizableExperience('normal', normalDist);
      
      const expected = new ExpectedPattern('expected', createAttachedInfo(expectedExp));
      const actual = new ActualPattern('actual', createAttachedInfo(actualExp), 'test-context');

      // スムージングにより計算可能であること
      const distance = klDistance.distance(expected, actual);
      expect(isFinite(distance)).toBe(true);
      expect(distance).toBeGreaterThanOrEqual(0);
    });

    test('次元数が異なる場合はエラーをスローすること', () => {
      const dist2D = [0.6, 0.4];
      const dist3D = [0.3, 0.3, 0.4];
      
      const exp2D = new TestVectorizableExperience('2d', dist2D);
      const exp3D = new TestVectorizableExperience('3d', dist3D);
      
      const expected = new ExpectedPattern('2d', createAttachedInfo(exp2D));
      const actual = new ActualPattern('3d', createAttachedInfo(exp3D), 'test-context');

      expect(() => {
        klDistance.distance(expected, actual);
      }).toThrow('Dimension mismatch');
    });

    test('空のベクトルの場合はエラーをスローすること', () => {
      const emptyExp = new TestVectorizableExperience('empty', []);
      
      const expected = new ExpectedPattern('empty', createAttachedInfo(emptyExp));
      const actual = new ActualPattern('empty', createAttachedInfo(emptyExp), 'test-context');

      expect(() => {
        klDistance.distance(expected, actual);
      }).toThrow('Empty vector');
    });

    test('NaNやInfinityを含む場合はエラーをスローすること', () => {
      const invalidDist = [0.5, NaN, 0.3];
      const validDist = [0.5, 0.5];
      
      const invalidExp = new TestVectorizableExperience('invalid', invalidDist);
      const validExp = new TestVectorizableExperience('valid', validDist);
      
      const expected = new ExpectedPattern('invalid', createAttachedInfo(invalidExp));
      const actual = new ActualPattern('valid', createAttachedInfo(validExp), 'test-context');

      expect(() => {
        klDistance.distance(expected, actual);
      }).toThrow('Invalid vector values');
    });

    test('すべて0の分布はエラーをスローすること', () => {
      const zeroDist = [0, 0, 0];
      const validDist = [0.5, 0.5, 0.0];
      
      const zeroExp = new TestVectorizableExperience('zero', zeroDist);
      const validExp = new TestVectorizableExperience('valid', validDist);
      
      const expected = new ExpectedPattern('zero', createAttachedInfo(zeroExp));
      const actual = new ActualPattern('valid', createAttachedInfo(validExp), 'test-context');

      expect(() => {
        klDistance.distance(expected, actual);
      }).toThrow('Invalid probability distribution');
    });
  });

  describe('距離値の有効性チェック', () => {
    test('有効な距離値を正しく判定すること', () => {
      expect(klDistance.isValidDistance(0)).toBe(true);
      expect(klDistance.isValidDistance(1.5)).toBe(true);
      expect(klDistance.isValidDistance(10)).toBe(true);
      expect(klDistance.isValidDistance(0.001)).toBe(true);
    });

    test('無効な距離値を正しく判定すること', () => {
      expect(klDistance.isValidDistance(-0.001)).toBe(false); // 負の値
      expect(klDistance.isValidDistance(NaN)).toBe(false);
      expect(klDistance.isValidDistance(Infinity)).toBe(false);
      expect(klDistance.isValidDistance(-Infinity)).toBe(false);
    });
  });

  describe('特殊ケース', () => {
    test('非常に小さな確率値での計算', () => {
      const smallProb = [0.9999, 0.0001];
      const normalProb = [0.5, 0.5];
      
      const smallExp = new TestVectorizableExperience('small', smallProb);
      const normalExp = new TestVectorizableExperience('normal', normalProb);
      
      const expected = new ExpectedPattern('small', createAttachedInfo(smallExp));
      const actual = new ActualPattern('normal', createAttachedInfo(normalExp), 'test-context');

      const distance = klDistance.distance(expected, actual);
      expect(isFinite(distance)).toBe(true);
      expect(distance).toBeGreaterThan(0);
    });

    test('高次元分布での計算', () => {
      const dim = 20;
      const uniform = Array(dim).fill(1/dim);
      const skewed = Array(dim).fill(0.01).concat([0.8]); // 最後の要素だけ大きい
      skewed.length = dim;
      
      const skewedSum = skewed.reduce((a, b) => a + b, 0);
      const normalizedSkewed = skewed.map(v => v / skewedSum);
      
      const uniformExp = new TestVectorizableExperience('uniform', uniform);
      const skewedExp = new TestVectorizableExperience('skewed', normalizedSkewed);
      
      const expected = new ExpectedPattern('uniform', createAttachedInfo(uniformExp));
      const actual = new ActualPattern('skewed', createAttachedInfo(skewedExp), 'test-context');

      const distance = klDistance.distance(expected, actual);
      expect(isFinite(distance)).toBe(true);
      expect(distance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大きな次元での計算時間が許容範囲内であること', () => {
      const dim = 1000;
      const dist1 = Array.from({ length: dim }, () => Math.random()).map(v => v / dim);
      const dist2 = Array.from({ length: dim }, () => Math.random()).map(v => v / dim);
      
      // 正規化
      const sum1 = dist1.reduce((a, b) => a + b, 0);
      const sum2 = dist2.reduce((a, b) => a + b, 0);
      const normDist1 = dist1.map(v => v / sum1);
      const normDist2 = dist2.map(v => v / sum2);
      
      const exp1 = new TestVectorizableExperience('large1', normDist1);
      const exp2 = new TestVectorizableExperience('large2', normDist2);
      
      const expected = new ExpectedPattern('large1', createAttachedInfo(exp1));
      const actual = new ActualPattern('large2', createAttachedInfo(exp2), 'test-context');

      const startTime = performance.now();
      const distance = klDistance.distance(expected, actual);
      const endTime = performance.now();
      
      expect(isFinite(distance)).toBe(true);
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(endTime - startTime).toBeLessThan(200); // 200ms以内
    });
  });
});