import { L2Distance } from './L2Distance';
import { VectorizableContext } from '../tag/VectorizableContext';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { ContextInfo } from '../tag/ContextInfo';
import { Tag } from '../tag/Tag';

/**
 * テスト用のVectorizableContext実装
 */
class TestVectorizableContext implements VectorizableContext {
  constructor(private vector: number[]) {}

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
function createContextInfo(vector: number[]): ContextInfo<TestVectorizableContext> {
  const context = new TestVectorizableContext(vector);
  const tags = new Set([Tag.createString('test', 'unit-test')]);
  const statistics = new Map<string, number>();
  
  return new ContextInfo(context, tags, statistics);
}

describe('L2Distance', () => {
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
      const contextInfo = createContextInfo(vector);
      
      const expected = new ExpectedPatternV2(contextInfo);
      const actual = new ActualPatternV2(contextInfo);

      const distance = l2Distance.distance(expected, actual);
      expect(distance).toBe(0);
    });
  });

  describe('数学的特性の検証', () => {
    test('ユークリッド距離の計算が正確であること', () => {
      // √((3-1)² + (4-2)² + (5-3)²) = √(4 + 4 + 4) = √12 ≈ 3.464
      const expectedContext = createContextInfo([1, 2, 3]);
      const actualContext = createContextInfo([3, 4, 5]);
      
      const expected = new ExpectedPatternV2(expectedContext);
      const actual = new ActualPatternV2(actualContext);

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
        const expected = new ExpectedPatternV2(createContextInfo(exp));
        const actual = new ActualPatternV2(createContextInfo(act));

        const distance = l2Distance.distance(expected, actual);
        expect(distance).toBeGreaterThanOrEqual(0);
      });
    });

    test('対称性: distance(A,B) = distance(B,A)', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [4, 5, 6];
      
      const expectedA = new ExpectedPatternV2(createContextInfo(vectorA));
      const actualB = new ActualPatternV2(createContextInfo(vectorB));
      
      const expectedB = new ExpectedPatternV2(createContextInfo(vectorB));
      const actualA = new ActualPatternV2(createContextInfo(vectorA));

      const distanceAB = l2Distance.distance(expectedA, actualB);
      const distanceBA = l2Distance.distance(expectedB, actualA);
      
      expect(distanceAB).toBeCloseTo(distanceBA, 10);
    });

    test('三角不等式: d(A,C) ≤ d(A,B) + d(B,C)', () => {
      const vectorA = [0, 0];
      const vectorB = [1, 1];
      const vectorC = [2, 0];
      
      const expectedA = new ExpectedPatternV2(createContextInfo(vectorA));
      const actualB = new ActualPatternV2(createContextInfo(vectorB));
      const actualC = new ActualPatternV2(createContextInfo(vectorC));
      
      const expectedB = new ExpectedPatternV2(createContextInfo(vectorB));

      const distanceAC = l2Distance.distance(expectedA, actualC);
      const distanceAB = l2Distance.distance(expectedA, actualB);
      const distanceBC = l2Distance.distance(expectedB, actualC);

      expect(distanceAC).toBeLessThanOrEqual(distanceAB + distanceBC + 1e-10); // 数値誤差を考慮
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('ゼロベクトルとの距離計算', () => {
      const expected = new ExpectedPatternV2(createContextInfo([0, 0, 0]));
      const actual = new ActualPatternV2(createContextInfo([3, 4, 0]));

      const distance = l2Distance.distance(expected, actual);
      expect(distance).toBe(5); // √(9 + 16 + 0) = 5
    });

    test('次元数が異なる場合はエラーをスローすること', () => {
      const expected = new ExpectedPatternV2(createContextInfo([1, 2]));
      const actual = new ActualPatternV2(createContextInfo([1, 2, 3]));

      expect(() => {
        l2Distance.distance(expected, actual);
      }).toThrow('Dimension mismatch');
    });

    test('空のベクトルの場合はエラーをスローすること', () => {
      const expected = new ExpectedPatternV2(createContextInfo([]));
      const actual = new ActualPatternV2(createContextInfo([]));

      expect(() => {
        l2Distance.distance(expected, actual);
      }).toThrow('Empty vector');
    });

    test('NaNを含むベクトルの場合はエラーをスローすること', () => {
      const expected = new ExpectedPatternV2(createContextInfo([1, NaN, 3]));
      const actual = new ActualPatternV2(createContextInfo([1, 2, 3]));

      expect(() => {
        l2Distance.distance(expected, actual);
      }).toThrow('Invalid vector values');
    });

    test('Infinityを含むベクトルの場合はエラーをスローすること', () => {
      const expected = new ExpectedPatternV2(createContextInfo([1, Infinity, 3]));
      const actual = new ActualPatternV2(createContextInfo([1, 2, 3]));

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
      expect(l2Distance.isValidDistance(0.0001)).toBe(true);
    });

    test('無効な距離値を正しく判定すること', () => {
      expect(l2Distance.isValidDistance(-1)).toBe(false);
      expect(l2Distance.isValidDistance(-0.1)).toBe(false);
      expect(l2Distance.isValidDistance(NaN)).toBe(false);
      expect(l2Distance.isValidDistance(Infinity)).toBe(false);
      expect(l2Distance.isValidDistance(-Infinity)).toBe(false);
    });

    test('文字列や非数値は無効と判定すること', () => {
      expect(l2Distance.isValidDistance('1' as any)).toBe(false);
      expect(l2Distance.isValidDistance(null as any)).toBe(false);
      expect(l2Distance.isValidDistance(undefined as any)).toBe(false);
      expect(l2Distance.isValidDistance({} as any)).toBe(false);
    });
  });

  describe('精度とパフォーマンステスト', () => {
    test('小数点を含む計算の精度', () => {
      const expected = new ExpectedPatternV2(createContextInfo([0.1, 0.2, 0.3]));
      const actual = new ActualPatternV2(createContextInfo([0.4, 0.5, 0.6]));

      const distance = l2Distance.distance(expected, actual);
      // √((0.3)² + (0.3)² + (0.3)²) = √(0.27) ≈ 0.5196
      expect(distance).toBeCloseTo(Math.sqrt(0.27), 10);
    });

    test('大きなベクトルでの計算時間が許容範囲内であること', () => {
      const size = 1000;
      const largeVector1 = Array.from({ length: size }, (_, i) => Math.random() * 100);
      const largeVector2 = Array.from({ length: size }, (_, i) => Math.random() * 100);
      
      const expected = new ExpectedPatternV2(createContextInfo(largeVector1));
      const actual = new ActualPatternV2(createContextInfo(largeVector2));

      const startTime = performance.now();
      const distance = l2Distance.distance(expected, actual);
      const endTime = performance.now();
      
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThan(Infinity);
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });

    test('極端に大きな値での計算', () => {
      const expected = new ExpectedPatternV2(createContextInfo([1e6, 2e6]));
      const actual = new ActualPatternV2(createContextInfo([3e6, 4e6]));

      const distance = l2Distance.distance(expected, actual);
      // √((2e6)² + (2e6)²) = √(8e12) = 2√2 * 1e6 ≈ 2.828e6
      expect(distance).toBeCloseTo(2 * Math.sqrt(2) * 1e6, 0);
      expect(l2Distance.isValidDistance(distance)).toBe(true);
    });
  });

  describe('実用的なテストケース', () => {
    test('実際のパターン認識シナリオ', () => {
      // RGB色空間での色の距離計算をシミュレート
      const redColor = createContextInfo([255, 0, 0]);      // 赤
      const greenColor = createContextInfo([0, 255, 0]);    // 緑
      const yellowColor = createContextInfo([255, 255, 0]); // 黄色

      const red = new ExpectedPatternV2(redColor);
      const green = new ActualPatternV2(greenColor);
      const yellow = new ActualPatternV2(yellowColor);

      const redToGreen = l2Distance.distance(red, green);
      const redToYellow = l2Distance.distance(red, yellow);

      // 赤→黄色の距離が赤→緑よりも近い（黄色は赤成分を含むため）
      expect(redToYellow).toBeLessThan(redToGreen);
      expect(redToGreen).toBeCloseTo(Math.sqrt(255*255 + 255*255), 5);
    });

    test('時系列データの距離計算', () => {
      // 簡単な時系列パターンの距離
      const pattern1 = createContextInfo([1, 2, 3, 4, 5]);
      const pattern2 = createContextInfo([1, 2, 3, 4, 6]); // 最後だけ異なる
      const pattern3 = createContextInfo([2, 3, 4, 5, 6]); // 全体がシフト

      const p1 = new ExpectedPatternV2(pattern1);
      const p2 = new ActualPatternV2(pattern2);
      const p3 = new ActualPatternV2(pattern3);

      const distance12 = l2Distance.distance(p1, p2);
      const distance13 = l2Distance.distance(p1, p3);

      expect(distance12).toBe(1); // √((6-5)²) = 1
      expect(distance13).toBeCloseTo(Math.sqrt(5), 5); // √(1² + 1² + 1² + 1² + 1²) = √5
    });
  });
});