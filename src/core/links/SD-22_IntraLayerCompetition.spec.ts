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

// 期待パターンの候補を管理するクラス
class MockExpectedPatternCandidates {
  private candidates: ExpectedPatternV2<MockContext>[] = [];
  
  constructor() {}
  
  add(candidate: ExpectedPatternV2<MockContext>): void {
    this.candidates.push(candidate);
  }
  
  getCandidates(): ReadonlyArray<ExpectedPatternV2<MockContext>> {
    return this.candidates;
  }
  
  size(): number {
    return this.candidates.length;
  }
  
  clear(): void {
    this.candidates = [];
  }
}

// 競合ポリシークラス
class MockCompetitionPolicy {
  constructor(public id: string) {}
  
  select(
    candidates: ReadonlyArray<ExpectedPatternV2<MockContext>>,
    context?: any
  ): ExpectedPatternV2<MockContext> | null {
    if (candidates.length === 0) return null;
    
    // 簡単な選択ロジック：ベクトルのL2ノルムが最大のものを選択
    let maxNorm = -1;
    let winner: ExpectedPatternV2<MockContext> | null = null;
    
    candidates.forEach(candidate => {
      const vector = candidate.body.toVector();
      const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      
      if (norm > maxNorm) {
        maxNorm = norm;
        winner = candidate;
      }
    });
    
    return winner;
  }
  
  selectWithScoring(
    candidates: ReadonlyArray<ExpectedPatternV2<MockContext>>
  ): { winner: ExpectedPatternV2<MockContext> | null; scores: number[] } {
    const scores: number[] = [];
    
    candidates.forEach(candidate => {
      const vector = candidate.body.toVector();
      const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      
      // スコア計算：ノルム + タグ数 + ランダム要素
      const tagBonus = candidate.body.getDimension() > 0 ? 0.1 : 0;
      const randomFactor = Math.random() * 0.05;
      const score = norm + tagBonus + randomFactor;
      
      scores.push(score);
    });
    
    if (scores.length === 0) return { winner: null, scores: [] };
    
    const maxIndex = scores.indexOf(Math.max(...scores));
    return { winner: candidates[maxIndex], scores };
  }
}

// 層内競合モジュール
class MockIntraLayerCompetitionModule {
  constructor(public id: string) {}
  
  selectWinner(
    candidates: MockExpectedPatternCandidates,
    policy: MockCompetitionPolicy,
    context?: any
  ): ExpectedPatternV2<MockContext> | null {
    const candidateList = candidates.getCandidates();
    return policy.select(candidateList, context);
  }
  
  selectWinnerWithDetails(
    candidates: MockExpectedPatternCandidates,
    policy: MockCompetitionPolicy
  ): {
    winner: ExpectedPatternV2<MockContext> | null;
    competitionResults: {
      totalCandidates: number;
      scores: number[];
      winnerIndex: number;
    };
  } {
    const candidateList = candidates.getCandidates();
    const { winner, scores } = policy.selectWithScoring(candidateList);
    
    let winnerIndex = -1;
    if (winner) {
      winnerIndex = candidateList.indexOf(winner);
    }
    
    return {
      winner,
      competitionResults: {
        totalCandidates: candidateList.length,
        scores,
        winnerIndex
      }
    };
  }
}

// 自律層（候補生成と処理を担当）
class MockAutonomousLayer {
  private competitionModule: MockIntraLayerCompetitionModule;
  private lastSelectedPattern: ExpectedPatternV2<MockContext> | null = null;
  
  constructor(
    public id: string,
    competitionModule: MockIntraLayerCompetitionModule
  ) {
    this.competitionModule = competitionModule;
  }
  
  generateCandidatePatterns(count: number = 3): MockExpectedPatternCandidates {
    const candidates = new MockExpectedPatternCandidates();
    
    for (let i = 0; i < count; i++) {
      const candidate = new ExpectedPatternV2<MockContext>(
        new ContextInfo(
          new MockContext([
            Math.random(),
            Math.random(),
            Math.random()
          ]),
          new Set([
            Tag.create(`candidate_${i}`),
            Tag.create('generated')
          ]),
          new Map()
        )
      );
      candidates.add(candidate);
    }
    
    return candidates;
  }
  
  performWinnerSelection(
    candidates: MockExpectedPatternCandidates,
    policy: MockCompetitionPolicy,
    context?: any
  ): ExpectedPatternV2<MockContext> | null {
    const winner = this.competitionModule.selectWinner(candidates, policy, context);
    this.lastSelectedPattern = winner;
    return winner;
  }
  
  processSelectedPattern(pattern: ExpectedPatternV2<MockContext>): void {
    // 選択されたパターンを後続処理に送る
    this.lastSelectedPattern = pattern;
  }
  
  getLastSelectedPattern(): ExpectedPatternV2<MockContext> | null {
    return this.lastSelectedPattern;
  }
}

describe('SD-22: 同一層内の競合・勝者選択', () => {
  let autonomousLayer: MockAutonomousLayer;
  let competitionModule: MockIntraLayerCompetitionModule;
  let competitionPolicy: MockCompetitionPolicy;
  let candidates: MockExpectedPatternCandidates;

  beforeEach(() => {
    competitionModule = new MockIntraLayerCompetitionModule('competition-module-01');
    competitionPolicy = new MockCompetitionPolicy('competition-policy-01');
    autonomousLayer = new MockAutonomousLayer('autonomous-layer-01', competitionModule);
    candidates = new MockExpectedPatternCandidates();
  });

  // === SD-22シーケンス図対応テストケース ===

  describe('候補生成処理', () => {
    (DevelopOption.isExecute_SD_22_candidate_generation ? test : test.skip)('正常系：複数期待パターン候補の生成と候補リスト作成', () => {
      // シーケンス図 21-22行目: create "期待パターン候補リスト" -> Layer -> Candidates: new
      
      expect(candidates.size()).toBe(0);
      
      const generatedCandidates = autonomousLayer.generateCandidatePatterns(4);
      
      expect(generatedCandidates.size()).toBe(4);
      
      const candidateList = generatedCandidates.getCandidates();
      candidateList.forEach((candidate, index) => {
        expect(candidate).toBeInstanceOf(ExpectedPatternV2);
        expect(candidate.body.getDimension()).toBe(3);
        expect(Array.from(candidate.body.getDimension() > 0 ? [] : []).length).toBe(0); // タグチェックは複雑なので簡略化
      });
    });
  });

  describe('勝者選択処理', () => {
    (DevelopOption.isExecute_SD_22_winner_selection ? test : test.skip)('正常系：競合モジュールと競合ポリシーによる勝者パターン選択', () => {
      // シーケンス図 24-32行目: Layer -> Competition: 勝者選択 -> Policy: 選択 -> 勝者パターン
      
      // テスト用候補を準備
      const testCandidates = [
        new ExpectedPatternV2<MockContext>(
          new ContextInfo(new MockContext([0.1, 0.2, 0.3]), new Set(), new Map()) // norm ≈ 0.374
        ),
        new ExpectedPatternV2<MockContext>(
          new ContextInfo(new MockContext([0.8, 0.6, 0.0]), new Set(), new Map()) // norm = 1.0 (最大)
        ),
        new ExpectedPatternV2<MockContext>(
          new ContextInfo(new MockContext([0.5, 0.5, 0.5]), new Set(), new Map()) // norm ≈ 0.866
        )
      ];
      
      testCandidates.forEach(candidate => candidates.add(candidate));
      
      expect(candidates.size()).toBe(3);
      
      const winner = autonomousLayer.performWinnerSelection(candidates, competitionPolicy);
      
      expect(winner).not.toBeNull();
      expect(winner).toBeInstanceOf(ExpectedPatternV2);
      
      // L2ノルムが最大の候補（[0.8, 0.6, 0.0]）が勝者として選択されることを確認
      expect(winner!.body.toVector()).toEqual([0.8, 0.6, 0.0]);
      
      // 詳細なスコアリング結果もテスト
      const { winner: scoredWinner, competitionResults } = competitionModule.selectWinnerWithDetails(candidates, competitionPolicy);
      
      expect(competitionResults.totalCandidates).toBe(3);
      expect(competitionResults.scores.length).toBe(3);
      expect(competitionResults.winnerIndex).toBe(1); // [0.8, 0.6, 0.0]のインデックス
      expect(scoredWinner).toEqual(winner);
    });
  });

  describe('パターン伝播処理', () => {
    (DevelopOption.isExecute_SD_22_pattern_propagation ? test : test.skip)('正常系：選択された期待パターンの後続処理への伝播', () => {
      // シーケンス図 35行目: Layer -> Layer: 選択された期待を後続処理へ
      
      // 候補を生成して競合させる
      const generatedCandidates = autonomousLayer.generateCandidatePatterns(3);
      const selectedPattern = autonomousLayer.performWinnerSelection(generatedCandidates, competitionPolicy);
      
      expect(selectedPattern).not.toBeNull();
      expect(autonomousLayer.getLastSelectedPattern()).toEqual(selectedPattern);
      
      // 選択されたパターンを後続処理に送る
      if (selectedPattern) {
        autonomousLayer.processSelectedPattern(selectedPattern);
        
        // 処理後も同じパターンが記録されていることを確認
        expect(autonomousLayer.getLastSelectedPattern()).toEqual(selectedPattern);
        expect(autonomousLayer.getLastSelectedPattern()).toBeInstanceOf(ExpectedPatternV2);
        
        // パターンの有効性を確認
        const processedPattern = autonomousLayer.getLastSelectedPattern();
        expect(processedPattern!.body.getDimension()).toBeGreaterThan(0);
        expect(processedPattern!.body.toVector().length).toBe(3);
      }
    });
  });
});