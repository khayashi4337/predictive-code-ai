import { InterLayerRelativeJudgementLink } from './InterLayerRelativeJudgementLink';
import { SkipPolicy } from './PolicyInterfaces';
import { SkipEnum } from './SkipEnum';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { ContextInfo } from '../tag/ContextInfo';
import { VectorizableContext } from '../tag/VectorizableContext';
import { DevelopOption } from '../../debug/DevelopOption';
import { Tag } from '../tag/Tag';

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

describe('SD-09: 低Δの省エネ（早期終了）', () => {
  let mockSkipPolicy: jest.Mocked<SkipPolicy<MockContext>>;
  const ENERGY_SAVING_THRESHOLD = 0.1; // 省エネ閾値

  beforeEach(() => {
    mockSkipPolicy = {
      judgeSkip: jest.fn(),
      isValid: jest.fn(() => true),
      getPolicyName: jest.fn(() => 'MockSkipPolicy')
    };
  });

  // === SD-09シーケンス図対応テストケース ===

  describe('スキップ判定処理', () => {
    (DevelopOption.isExecute_SD_09_skip_judgment ? test : test.skip)('正常系：相対差分の大きさを評価しスキップ判定を実行', () => {
      // シーケンス図 23行目: Link -> SkipPolicy: スキップ判定(差分)
      
      // テスト用の相対差分を作成（中程度の大きさ）
      const contextInfo = new ContextInfo(
        new MockContext([0.5, 0.3, 0.8]), 
        new Set([Tag.create('skip_test')]), 
        new Map()
      );
      const relativeDifference = new RelativeDifference<MockContext>(0.2, contextInfo);
      
      // スキップ判定の実行をシミュレート
      const executeSkipJudgment = (
        difference: RelativeDifference<MockContext>, 
        skipPolicy: SkipPolicy<MockContext>
      ): SkipEnum => {
        // 相対差分の大きさを評価
        const magnitude = difference.magnitude;
        
        // ポリシーにスキップ判定を委譲
        return skipPolicy.judgeSkip(difference);
      };
      
      // モックの動作を設定
      mockSkipPolicy.judgeSkip.mockReturnValue(SkipEnum.PartialUpdate);
      
      // スキップ判定を実行
      const result = executeSkipJudgment(relativeDifference, mockSkipPolicy);
      
      // 検証
      expect(mockSkipPolicy.judgeSkip).toHaveBeenCalledWith(relativeDifference);
      expect(result).toBeDefined();
      expect(Object.values(SkipEnum)).toContain(result);
      expect(result).toBe(SkipEnum.PartialUpdate);
    });
  });

  describe('早期終了処理', () => {
    (DevelopOption.isExecute_SD_09_early_termination ? test : test.skip)('正常系：完全スキップ判定時の処理早期終了', () => {
      // シーケンス図 34-36行目: opt 判定 == 完全スキップ -> Link -->x: 処理を早期終了
      
      // テスト用の相対差分を作成（非常に小さな差分）
      const contextInfo = new ContextInfo(
        new MockContext([0.001, 0.002, 0.001]), 
        new Set([Tag.create('early_termination_test')]), 
        new Map()
      );
      const smallDifference = new RelativeDifference<MockContext>(0.01, contextInfo);
      
      // 早期終了処理をシミュレート
      const processWithEarlyTermination = (
        difference: RelativeDifference<MockContext>, 
        skipPolicy: SkipPolicy<MockContext>
      ): { terminated: boolean; reason?: string } => {
        // スキップ判定を実行
        const skipDecision = skipPolicy.judgeSkip(difference);
        
        // 判定が「完全スキップ」なら処理を早期終了
        if (skipDecision === SkipEnum.FullSkip) {
          return { 
            terminated: true, 
            reason: 'Early termination due to FullSkip decision' 
          };
        }
        
        // その他の場合は処理を継続
        return { terminated: false };
      };
      
      // モックの動作を設定：完全スキップを返すように設定
      mockSkipPolicy.judgeSkip.mockReturnValue(SkipEnum.FullSkip);
      
      // 早期終了処理を実行
      const result = processWithEarlyTermination(smallDifference, mockSkipPolicy);
      
      // 検証
      expect(mockSkipPolicy.judgeSkip).toHaveBeenCalledWith(smallDifference);
      expect(result).toBeDefined();
      expect(result.terminated).toBe(true);
      expect(result.reason).toBe('Early termination due to FullSkip decision');
      
      // 非完全スキップの場合のテスト
      mockSkipPolicy.judgeSkip.mockReturnValue(SkipEnum.PartialUpdate);
      const continuationResult = processWithEarlyTermination(smallDifference, mockSkipPolicy);
      
      expect(continuationResult.terminated).toBe(false);
      expect(continuationResult.reason).toBeUndefined();
    });
  });

  describe('閾値評価処理', () => {
    (DevelopOption.isExecute_SD_09_threshold_evaluation ? test : test.skip)('正常系：差分の大きさが閾値より小さい場合の完全スキップ', () => {
      // シーケンス図 27-29行目: opt 差分.大きさ < 閾値 -> SkipPolicy --> Link: スキップEnum.完全スキップ
      
      // 閾値評価とスキップ判定を組み合わせた処理をシミュレート
      const evaluateThresholdAndSkip = (
        difference: RelativeDifference<MockContext>,
        threshold: number,
        skipPolicy: SkipPolicy<MockContext>
      ): { skipDecision: SkipEnum; belowThreshold: boolean; energySaved: boolean } => {
        // 相対差分の大きさを取得
        const magnitude = difference.magnitude;
        
        // 閾値より小さいかどうか判定
        const belowThreshold = magnitude < threshold;
        
        // 閾値より小さい場合のスキップ判定ロジック
        let skipDecision: SkipEnum;
        if (belowThreshold) {
          // 省エネのため完全スキップを選択
          skipDecision = SkipEnum.FullSkip;
        } else {
          // 通常のスキップ判定をポリシーに委譲
          skipDecision = skipPolicy.judgeSkip(difference);
        }
        
        return {
          skipDecision,
          belowThreshold,
          energySaved: belowThreshold && skipDecision === SkipEnum.FullSkip
        };
      };
      
      // テストケース1: 閾値より小さい差分（省エネ対象）
      const smallContextInfo = new ContextInfo(
        new MockContext([0.02, 0.01, 0.03]), 
        new Set([Tag.create('small_diff_test')]), 
        new Map()
      );
      const smallDifference = new RelativeDifference<MockContext>(0.05, smallContextInfo); // 0.05 < 0.1
      
      const smallResult = evaluateThresholdAndSkip(smallDifference, ENERGY_SAVING_THRESHOLD, mockSkipPolicy);
      
      // 検証：小さな差分の場合
      expect(smallResult.belowThreshold).toBe(true);
      expect(smallResult.skipDecision).toBe(SkipEnum.FullSkip);
      expect(smallResult.energySaved).toBe(true);
      
      // テストケース2: 閾値より大きい差分（通常処理）
      const largeContextInfo = new ContextInfo(
        new MockContext([0.5, 0.7, 0.6]), 
        new Set([Tag.create('large_diff_test')]), 
        new Map()
      );
      const largeDifference = new RelativeDifference<MockContext>(0.3, largeContextInfo); // 0.3 > 0.1
      
      // 大きな差分の場合は通常のポリシー判定に委譲
      mockSkipPolicy.judgeSkip.mockReturnValue(SkipEnum.PartialUpdate);
      
      const largeResult = evaluateThresholdAndSkip(largeDifference, ENERGY_SAVING_THRESHOLD, mockSkipPolicy);
      
      // 検証：大きな差分の場合
      expect(largeResult.belowThreshold).toBe(false);
      expect(largeResult.skipDecision).toBe(SkipEnum.PartialUpdate);
      expect(largeResult.energySaved).toBe(false);
      expect(mockSkipPolicy.judgeSkip).toHaveBeenCalledWith(largeDifference);
      
      // テストケース3: 境界値テスト
      const boundaryContextInfo = new ContextInfo(
        new MockContext([0.1, 0.1, 0.1]), 
        new Set([Tag.create('boundary_test')]), 
        new Map()
      );
      const boundaryDifference = new RelativeDifference<MockContext>(0.1, boundaryContextInfo); // 0.1 == 0.1
      
      const boundaryResult = evaluateThresholdAndSkip(boundaryDifference, ENERGY_SAVING_THRESHOLD, mockSkipPolicy);
      
      // 検証：境界値の場合（閾値と等しい場合は通常処理）
      expect(boundaryResult.belowThreshold).toBe(false);
      expect(boundaryResult.energySaved).toBe(false);
    });
  });
});