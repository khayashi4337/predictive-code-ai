import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { ContextInfo } from '../tag/ContextInfo';
import { VectorizableContext } from '../tag/VectorizableContext';
import { Tag } from '../tag/Tag';
import { DevelopOption } from '../../debug/DevelopOption';

// モック用のコンテキスト定義
class MockContext implements VectorizableContext {
  constructor(public vector: number[]) {}
  toVector(): number[] {
    return this.vector;
  }
  getDimension(): number {
    return this.vector.length;
  }
}

// モック用の簡易クラス定義
class MockAutonomousLayer {
  private expectedPatterns: ExpectedPatternV2<MockContext>[] = [];
  private actualPatterns: ActualPatternV2<MockContext>[] = [];
  
  constructor(public id: string, public isUpper: boolean) {}
  
  generateExpected(_destination: string): ExpectedPatternV2<MockContext> | null {
    // 初期段階では期待が未成熟
    if (this.expectedPatterns.length === 0) {
      return null; // 空の期待またはランダム
    }
    return this.expectedPatterns[0];
  }
  
  propagateExpected(_expected: ExpectedPatternV2<MockContext>): void {
    // 期待の伝播
  }
  
  observeActual(_actual: ActualPatternV2<MockContext>): void {
    this.actualPatterns.push(_actual);
  }
  
  sendFeedback(_actual: ActualPatternV2<MockContext>): void {
    // 上位層への実際パターンフィードバック
  }
  
  formExpectationFromActual(): ExpectedPatternV2<MockContext> | null {
    if (this.actualPatterns.length === 0) return null;
    
    // 実際パターンから期待を形成
    const latestActual = this.actualPatterns[this.actualPatterns.length - 1];
    return new ExpectedPatternV2<MockContext>(latestActual.contextInfo);
  }
  
  getActualPatterns(): ReadonlyArray<ActualPatternV2<MockContext>> {
    return this.actualPatterns;
  }
}

class MockPatternBuffer {
  private buffer: Array<ExpectedPatternV2<MockContext> | ActualPatternV2<MockContext>> = [];
  private readonly maxSize = 50;
  
  constructor(public id: string, public bufferType: 'expected' | 'actual') {}
  
  store(pattern: ExpectedPatternV2<MockContext> | ActualPatternV2<MockContext>): void {
    this.buffer.push(pattern);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }
  
  getPatterns(): ReadonlyArray<ExpectedPatternV2<MockContext> | ActualPatternV2<MockContext>> {
    return this.buffer;
  }
  
  isEmpty(): boolean {
    return this.buffer.length === 0;
  }
  
  size(): number {
    return this.buffer.length;
  }
  
  clear(): void {
    this.buffer = [];
  }
}

describe('SD-15: コールドスタート（期待未成熟）', () => {
  let upperLayer: MockAutonomousLayer;
  let lowerLayer: MockAutonomousLayer;
  let expectedBuffer: MockPatternBuffer;
  let actualBuffer: MockPatternBuffer;

  beforeEach(() => {
    upperLayer = new MockAutonomousLayer('upper-layer-01', true);
    lowerLayer = new MockAutonomousLayer('lower-layer-01', false);
    expectedBuffer = new MockPatternBuffer('expected-buffer-01', 'expected');
    actualBuffer = new MockPatternBuffer('actual-buffer-01', 'actual');
  });

  // === SD-15シーケンス図対応テストケース ===

  describe('コールドスタート初期化処理', () => {
    (DevelopOption.isExecute_SD_15_cold_start_initialization ? test : test.skip)('正常系：期待パターンバッファへの空期待またはランダム期待格納', () => {
      // シーケンス図 24-26行目: UpperLayer -> ExpectedBuffer: 格納(空の期待 or ランダム)
      
      expect(expectedBuffer.isEmpty()).toBe(true);
      
      // 初期段階では期待が未成熟なので null が返される
      const initialExpected = upperLayer.generateExpected('lower-layer');
      
      if (initialExpected === null) {
        // 空の期待の場合：バッファは空のまま
        expect(expectedBuffer.size()).toBe(0);
      } else {
        // ランダム期待が生成された場合：バッファに格納
        expectedBuffer.store(initialExpected);
        expect(expectedBuffer.size()).toBe(1);
      }
      
      expect(initialExpected).toBeNull(); // 初期段階では null
    });
  });

  describe('パターンバッファリング処理', () => {
    (DevelopOption.isExecute_SD_15_pattern_buffering ? test : test.skip)('正常系：実際パターンの観測と蓄積優先処理', () => {
      // シーケンス図 33-38行目: LowerLayer -> ActualBuffer: 観測した実際を格納
      // 期待が未成熟なため、差分計算をスキップし、観測パターンの蓄積を優先する
      
      const actualPatterns = [
        new ActualPatternV2<MockContext>(new ContextInfo(new MockContext([0.1, 0.2, 0.3]), new Set(), new Map())),
        new ActualPatternV2<MockContext>(new ContextInfo(new MockContext([0.4, 0.5, 0.6]), new Set(), new Map())),
        new ActualPatternV2<MockContext>(new ContextInfo(new MockContext([0.7, 0.8, 0.9]), new Set(), new Map()))
      ];
      
      expect(actualBuffer.isEmpty()).toBe(true);
      
      // 実際パターンを観測して蓄積
      actualPatterns.forEach(pattern => {
        lowerLayer.observeActual(pattern);
        actualBuffer.store(pattern);
      });
      
      expect(actualBuffer.size()).toBe(3);
      expect(lowerLayer.getActualPatterns()).toHaveLength(3);
      expect(actualBuffer.isEmpty()).toBe(false);
    });
  });

  describe('期待形成処理', () => {
    (DevelopOption.isExecute_SD_15_expectation_formation ? test : test.skip)('正常系：実際パターンから期待の形成開始', () => {
      // シーケンス図 43-45行目: UpperLayer -> UpperLayer: 実際パターンから期待を形成
      
      // まず実際パターンを観測させる
      const observedPattern = new ActualPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.3, 0.6, 0.9]), new Set([Tag.create('learning')]), new Map())
      );
      
      upperLayer.observeActual(observedPattern);
      
      // 実際パターンから期待を形成
      const formedExpectation = upperLayer.formExpectationFromActual();
      
      expect(formedExpectation).not.toBeNull();
      expect(formedExpectation).toBeInstanceOf(ExpectedPatternV2);
      
      if (formedExpectation) {
        expect(formedExpectation.body.toVector()).toEqual([0.3, 0.6, 0.9]);
        expect(formedExpectation.body.getDimension()).toBe(3);
      }
      
      expect(upperLayer.getActualPatterns()).toHaveLength(1);
    });
  });
});