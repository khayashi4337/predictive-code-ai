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
function createContextInfo<T extends VectorizableContext>(context: T): ContextInfo<T> {
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
      const expectedExp = new TestVectorizableExperience('exp', [1, 0]);
      const actualExp = new TestVectorizableExperience('act', [0, 1]);
      
      const expected = new ExpectedPattern('expected', createAttachedInfo(expectedExp));
      const actual = new ActualPattern('actual', createAttachedInfo(actualExp), 'test-context');

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBeCloseTo(1, 10); // cos(90°) = 0, so distance = 1 - 0 = 1
    });

    test('コサイン距離の計算が正確であること - 平行ベクトル', () => {
      // 平行ベクトル [1,2] と [2,4] のコサイン距離は0
      const expectedExp = new TestVectorizableExperience('exp', [1, 2]);
      const actualExp = new TestVectorizableExperience('act', [2, 4]);
      
      const expected = new ExpectedPattern('expected', createAttachedInfo(expectedExp));
      const actual = new ActualPattern('actual', createAttachedInfo(actualExp), 'test-context');

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBeCloseTo(0, 10); // cos(0°) = 1, so distance = 1 - 1 = 0
    });

    test('コサイン距離の計算が正確であること - 反対ベクトル', () => {
      // 反対ベクトル [1,0] と [-1,0] のコサイン距離は2
      const expectedExp = new TestVectorizableExperience('exp', [1, 0]);
      const actualExp = new TestVectorizableExperience('act', [-1, 0]);
      
      const expected = new ExpectedPattern('expected', createAttachedInfo(expectedExp));
      const actual = new ActualPattern('actual', createAttachedInfo(actualExp), 'test-context');

      const distance = cosineDistance.distance(expected, actual);
      expect(distance).toBeCloseTo(2, 10); // cos(180°) = -1, so distance = 1 - (-1) = 2
    });

    test('コサイン距離の計算が正確であること - 45度の角度', () => {
      // [1,0] と [1,1] の角度は45度, cos(45°) = √2/2 ≈ 0.707
      const expectedExp = new TestVectorizableExperience('exp', [1, 0]);
      const actualExp = new TestVectorizableExperience('act', [1, 1]);
      
      const expected = new ExpectedPattern('expected', createAttachedInfo(expectedExp));
      const actual = new ActualPattern('actual', createAttachedInfo(actualExp), 'test-context');

      const distance = cosineDistance.distance(expected, actual);
      const expectedDistance = 1 - (1 / Math.sqrt(2));
      expect(distance).toBeCloseTo(expectedDistance, 10);
    });

    test('非負性: 距離は常に0以上であること', () => {
      const testCases = [
        { exp: [1, 2], act: [3, 4] },
        { exp: [-1, -2], act: [1, 2] },
        { exp: [1, -1], act: [-1, 1] },
        { exp: [1.5, 2.7], act: [-3.2, 4.1] }
      ];

      testCases.forEach(({ exp, act }) => {
        const expectedExp = new TestVectorizableExperience('exp', exp);
        const actualExp = new TestVectorizableExperience('act', act);
        
        const expected = new ExpectedPattern('expected', createAttachedInfo(expectedExp));
        const actual = new ActualPattern('actual', createAttachedInfo(actualExp), 'test-context');

        const distance = cosineDistance.distance(expected, actual);
        expect(distance).toBeGreaterThanOrEqual(-1e-10); // 数値誤差を考慮
        expect(distance).toBeLessThanOrEqual(2 + 1e-10); // コサイン距離は0-2の範囲
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

      const distanceAB = cosineDistance.distance(patternA, patternB);
      const distanceBA = cosineDistance.distance(patternB_asExpected, patternA_asActual);
      
      expect(distanceAB).toBeCloseTo(distanceBA, 10);
    });

    test('スケール不変性: ベクトルの大きさが変わっても距離は同じ', () => {
      const baseVector = [3, 4];
      const scaledVector = [6, 8]; // 2倍スケール
      
      const expBase = new TestVectorizableExperience('base', baseVector);
      const expReference = new TestVectorizableExperience('ref', [1, 0]);
      const expScaled = new TestVectorizableExperience('scaled', scaledVector);
      
      const refPattern = new ExpectedPattern('ref', createAttachedInfo(expReference));
      const baseActual = new ActualPattern('base', createAttachedInfo(expBase), 'test-context');
      const scaledActual = new ActualPattern('scaled', createAttachedInfo(expScaled), 'test-context');

      const distanceBase = cosineDistance.distance(refPattern, baseActual);
      const distanceScaled = cosineDistance.distance(refPattern, scaledActual);
      
      expect(distanceBase).toBeCloseTo(distanceScaled, 10);
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('ゼロベクトルの場合はエラーをスローすること', () => {
      const zeroExp = new TestVectorizableExperience('zero', [0, 0, 0]);
      const nonZeroExp = new TestVectorizableExperience('nonzero', [1, 2, 3]);
      
      const expected = new ExpectedPattern('zero', createAttachedInfo(zeroExp));
      const actual = new ActualPattern('nonzero', createAttachedInfo(nonZeroExp), 'test-context');

      expect(() => {
        cosineDistance.distance(expected, actual);
      }).toThrow('Zero vector');
    });

    test('次元数が異なる場合はエラーをスローすること', () => {
      const exp2D = new TestVectorizableExperience('2d', [1, 2]);
      const exp3D = new TestVectorizableExperience('3d', [1, 2, 3]);
      
      const expected = new ExpectedPattern('2d', createAttachedInfo(exp2D));
      const actual = new ActualPattern('3d', createAttachedInfo(exp3D), 'test-context');

      expect(() => {
        cosineDistance.distance(expected, actual);
      }).toThrow('Dimension mismatch');
    });

    test('空のベクトルの場合はエラーをスローすること', () => {
      const emptyExp = new TestVectorizableExperience('empty', []);
      
      const expected = new ExpectedPattern('empty', createAttachedInfo(emptyExp));
      const actual = new ActualPattern('empty', createAttachedInfo(emptyExp), 'test-context');

      expect(() => {
        cosineDistance.distance(expected, actual);
      }).toThrow('Empty vector');
    });

    test('NaNやInfinityを含むベクトルの場合はエラーをスローすること', () => {
      const invalidExp = new TestVectorizableExperience('invalid', [1, NaN, 3]);
      const validExp = new TestVectorizableExperience('valid', [1, 2, 3]);
      
      const expected = new ExpectedPattern('invalid', createAttachedInfo(invalidExp));
      const actual = new ActualPattern('valid', createAttachedInfo(validExp), 'test-context');

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
      expect(cosineDistance.isValidDistance(0.5)).toBe(true);
      expect(cosineDistance.isValidDistance(1.5)).toBe(true);
    });

    test('無効な距離値を正しく判定すること', () => {
      expect(cosineDistance.isValidDistance(-0.1)).toBe(false); // 負の値
      expect(cosineDistance.isValidDistance(2.1)).toBe(false);  // 範囲外
      expect(cosineDistance.isValidDistance(NaN)).toBe(false);
      expect(cosineDistance.isValidDistance(Infinity)).toBe(false);
      expect(cosineDistance.isValidDistance(-Infinity)).toBe(false);
    });
  });

  describe('特殊ケース', () => {
    test('単位ベクトル同士の計算', () => {
      const unitX = new TestVectorizableExperience('unitX', [1, 0, 0]);
      const unitY = new TestVectorizableExperience('unitY', [0, 1, 0]);
      const unitZ = new TestVectorizableExperience('unitZ', [0, 0, 1]);
      
      const expectedX = new ExpectedPattern('x', createAttachedInfo(unitX));
      const actualY = new ActualPattern('y', createAttachedInfo(unitY), 'test-context');
      const actualZ = new ActualPattern('z', createAttachedInfo(unitZ), 'test-context');

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
      
      const exp1 = new TestVectorizableExperience('sin', vector1);
      const exp2 = new TestVectorizableExperience('cos', vector2);
      
      const expected = new ExpectedPattern('sin', createAttachedInfo(exp1));
      const actual = new ActualPattern('cos', createAttachedInfo(exp2), 'test-context');

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
      
      const exp1 = new TestVectorizableExperience('large1', largeVector1);
      const exp2 = new TestVectorizableExperience('large2', largeVector2);
      
      const expected = new ExpectedPattern('large1', createAttachedInfo(exp1));
      const actual = new ActualPattern('large2', createAttachedInfo(exp2), 'test-context');

      const startTime = performance.now();
      const distance = cosineDistance.distance(expected, actual);
      const endTime = performance.now();
      
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThanOrEqual(2);
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });
  });
});