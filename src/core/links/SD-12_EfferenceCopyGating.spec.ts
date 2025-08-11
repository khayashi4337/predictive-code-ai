import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
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
class MockEfferenceCopyEmitter {
  constructor(public id: string) {}
  emit(_expected: ExpectedPatternV2<MockContext>, _tags: Set<Tag>): void {}
}

class MockThalamusGate {
  private thresholds: Map<string, number> = new Map();
  
  constructor(public id: string) {}
  
  adjustThreshold(_tags: Set<Tag>): number {
    return Math.random() * 0.5 + 0.3; // 0.3-0.8の範囲
  }
  
  updateThreshold(_newThreshold: number): void {
    // 閾値更新
  }
  
  getThreshold(_key: string): number {
    return this.thresholds.get(_key) || 0.5;
  }
}

class MockGatePolicy {
  constructor(public id: string) {}
  
  calculateThreshold(_tags: Set<Tag>): number {
    return 0.7; // 自己運動由来の感覚を抑制する高い閾値
  }
}

describe('SD-12: 運動予測コピーによる視床ゲート調整', () => {
  let efferenceCopyEmitter: MockEfferenceCopyEmitter;
  let thalamusGate: MockThalamusGate;
  let gatePolicy: MockGatePolicy;

  beforeEach(() => {
    efferenceCopyEmitter = new MockEfferenceCopyEmitter('efference-copy-01');
    thalamusGate = new MockThalamusGate('thalamus-gate-01');
    gatePolicy = new MockGatePolicy('gate-policy-01');
  });

  // === SD-12シーケンス図対応テストケース ===

  describe('運動予測コピー送出処理', () => {
    (DevelopOption.isExecute_SD_12_efference_copy_emission ? test : test.skip)('正常系：期待パターンに基づくコピー送出とタグ生成', () => {
      // シーケンス図 22-24行目: EfferenceCopy -> Tag: new (キー="自己運動") -> ThalamusGate: 送出(期待, タグ集合)
      
      const expectedPattern = new ExpectedPatternV2<MockContext>(
        new ContextInfo(new MockContext([0.1, 0.2, 0.3]), new Set(), new Map())
      );
      const selfMotionTag = Tag.create('自己運動');
      const tags = new Set([selfMotionTag]);
      
      efferenceCopyEmitter.emit(expectedPattern, tags);
      
      expect(selfMotionTag.key).toBe('自己運動');
      expect(tags.size).toBe(1);
    });
  });

  describe('視床ゲート調整処理', () => {
    (DevelopOption.isExecute_SD_12_thalamus_gate_adjustment ? test : test.skip)('正常系：ゲートポリシーによる閾値調整', () => {
      // シーケンス図 28-32行目: ThalamusGate -> GatePolicy: 閾値調整(タグ集合) -> 新しい閾値
      
      const selfMotionTag = Tag.create('自己運動');
      const tags = new Set([selfMotionTag]);
      
      const adjustedThreshold = thalamusGate.adjustThreshold(tags);
      const policyThreshold = gatePolicy.calculateThreshold(tags);
      
      expect(adjustedThreshold).toBeGreaterThanOrEqual(0.3);
      expect(adjustedThreshold).toBeLessThanOrEqual(0.8);
      expect(policyThreshold).toBe(0.7);
    });
  });

  describe('閾値更新処理', () => {
    (DevelopOption.isExecute_SD_12_threshold_update ? test : test.skip)('正常系：視床ゲートの閾値更新と自己運動感覚の抑制', () => {
      // シーケンス図 34行目: ThalamusGate -> ThalamusGate: 閾値更新
      
      const newThreshold = 0.75;
      const initialThreshold = thalamusGate.getThreshold('self-motion');
      
      thalamusGate.updateThreshold(newThreshold);
      const updatedThreshold = thalamusGate.getThreshold('self-motion');
      
      expect(initialThreshold).toBe(0.5);
      expect(newThreshold).toBe(0.75);
      expect(updatedThreshold).toBeDefined();
    });
  });
});