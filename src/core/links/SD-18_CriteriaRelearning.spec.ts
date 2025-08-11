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

// 判定履歴のエントリ定義
interface JudgmentHistoryEntry {
  id: string;
  inputPattern: MockContext;
  judgmentResult: 'large_delta' | 'small_delta' | 'medium_delta';
  actualMagnitude: number;
  contextTags: Set<Tag>;
  timestamp: Date;
  criteriaUsed: string;
}

// モック用の簡易クラス定義
class MockJudgmentHistory {
  private entries: JudgmentHistoryEntry[] = [];
  
  constructor(public id: string) {}
  
  addEntry(entry: JudgmentHistoryEntry): void {
    this.entries.push(entry);
    
    // 最大エントリ数制限
    if (this.entries.length > 10000) {
      this.entries.shift();
    }
  }
  
  getHistory(fromDate?: Date): JudgmentHistoryEntry[] {
    if (fromDate) {
      return this.entries.filter(entry => entry.timestamp >= fromDate);
    }
    return [...this.entries];
  }
  
  getHistoryByResult(result: 'large_delta' | 'small_delta' | 'medium_delta'): JudgmentHistoryEntry[] {
    return this.entries.filter(entry => entry.judgmentResult === result);
  }
  
  size(): number {
    return this.entries.length;
  }
  
  getAverageActualMagnitude(result: 'large_delta' | 'small_delta' | 'medium_delta'): number {
    const filtered = this.getHistoryByResult(result);
    if (filtered.length === 0) return 0;
    
    const sum = filtered.reduce((acc, entry) => acc + entry.actualMagnitude, 0);
    return sum / filtered.length;
  }
}

class MockCriteriaPattern {
  private tolerances: Map<string, number> = new Map();
  private weights: Map<string, number> = new Map();
  
  constructor(public id: string) {
    // デフォルト値を設定
    this.tolerances.set('large_threshold', 0.7);
    this.tolerances.set('small_threshold', 0.3);
    this.weights.set('magnitude_weight', 1.0);
    this.weights.set('context_weight', 0.5);
  }
  
  updateTolerance(key: string, newTolerance: number): void {
    this.tolerances.set(key, newTolerance);
  }
  
  updateWeight(key: string, newWeight: number): void {
    this.weights.set(key, newWeight);
  }
  
  getTolerance(key: string): number {
    return this.tolerances.get(key) || 0;
  }
  
  getWeight(key: string): number {
    return this.weights.get(key) || 0;
  }
  
  getAllTolerances(): Map<string, number> {
    return new Map(this.tolerances);
  }
  
  getAllWeights(): Map<string, number> {
    return new Map(this.weights);
  }
}

class MockHippocampusAutonomousModule {
  constructor(public id: string) {}
  
  analyzeJudgmentHistory(
    history: JudgmentHistoryEntry[]
  ): {
    largeDeltaAccuracy: number;
    smallDeltaAccuracy: number;
    recommendedTolerances: Map<string, number>;
    recommendedWeights: Map<string, number>;
  } {
    const largeDeltaEntries = history.filter(entry => entry.judgmentResult === 'large_delta');
    const smallDeltaEntries = history.filter(entry => entry.judgmentResult === 'small_delta');
    
    // 精度計算（簡略化）
    const largeDeltaAccuracy = largeDeltaEntries.length > 0 
      ? largeDeltaEntries.filter(entry => entry.actualMagnitude > 0.5).length / largeDeltaEntries.length
      : 0;
    
    const smallDeltaAccuracy = smallDeltaEntries.length > 0
      ? smallDeltaEntries.filter(entry => entry.actualMagnitude < 0.5).length / smallDeltaEntries.length
      : 0;
    
    // 推奨閾値の計算
    const recommendedTolerances = new Map<string, number>();
    const recommendedWeights = new Map<string, number>();
    
    if (largeDeltaAccuracy < 0.8) {
      // 大きな差分の判定精度が低い場合、閾値を調整
      recommendedTolerances.set('large_threshold', 0.6);
    } else {
      recommendedTolerances.set('large_threshold', 0.7);
    }
    
    if (smallDeltaAccuracy < 0.8) {
      // 小さな差分の判定精度が低い場合、閾値を調整
      recommendedTolerances.set('small_threshold', 0.4);
    } else {
      recommendedTolerances.set('small_threshold', 0.3);
    }
    
    recommendedWeights.set('magnitude_weight', largeDeltaAccuracy > 0.9 ? 1.2 : 1.0);
    recommendedWeights.set('context_weight', smallDeltaAccuracy > 0.9 ? 0.7 : 0.5);
    
    return {
      largeDeltaAccuracy,
      smallDeltaAccuracy,
      recommendedTolerances,
      recommendedWeights
    };
  }
  
  performCriteriaRelearning(
    historyData: JudgmentHistoryEntry[],
    currentCriteria: MockCriteriaPattern
  ): void {
    const analysis = this.analyzeJudgmentHistory(historyData);
    
    // 基準パターンの更新
    analysis.recommendedTolerances.forEach((tolerance, key) => {
      currentCriteria.updateTolerance(key, tolerance);
    });
    
    analysis.recommendedWeights.forEach((weight, key) => {
      currentCriteria.updateWeight(key, weight);
    });
  }
}

describe('SD-18: 判定基準の再学習', () => {
  let hippocampusModule: MockHippocampusAutonomousModule;
  let judgmentHistory: MockJudgmentHistory;
  let criteriaPattern: MockCriteriaPattern;

  beforeEach(() => {
    hippocampusModule = new MockHippocampusAutonomousModule('hippocampus-01');
    judgmentHistory = new MockJudgmentHistory('judgment-history-01');
    criteriaPattern = new MockCriteriaPattern('criteria-pattern-01');
    
    // テスト用の履歴データを追加
    const testEntries: JudgmentHistoryEntry[] = [
      {
        id: 'entry-1',
        inputPattern: new MockContext([0.1, 0.2, 0.3]),
        judgmentResult: 'large_delta',
        actualMagnitude: 0.8,
        contextTags: new Set([Tag.create('test')]),
        timestamp: new Date(Date.now() - 3600000), // 1時間前
        criteriaUsed: 'default'
      },
      {
        id: 'entry-2',
        inputPattern: new MockContext([0.4, 0.5, 0.6]),
        judgmentResult: 'small_delta',
        actualMagnitude: 0.2,
        contextTags: new Set([Tag.create('test')]),
        timestamp: new Date(Date.now() - 1800000), // 30分前
        criteriaUsed: 'default'
      },
      {
        id: 'entry-3',
        inputPattern: new MockContext([0.7, 0.8, 0.9]),
        judgmentResult: 'large_delta',
        actualMagnitude: 0.3, // 実際は小さかった（誤判定）
        contextTags: new Set([Tag.create('error')]),
        timestamp: new Date(Date.now() - 900000), // 15分前
        criteriaUsed: 'default'
      }
    ];
    
    testEntries.forEach(entry => judgmentHistory.addEntry(entry));
  });

  // === SD-18シーケンス図対応テストケース ===

  describe('判定履歴分析処理', () => {
    (DevelopOption.isExecute_SD_18_judgment_history_analysis ? test : test.skip)('正常系：蓄積された判定履歴の取得と分析', () => {
      // シーケンス図 24-27行目: Hippocampus -> History: getHistory() -> 判定履歴データ
      
      const historyData = judgmentHistory.getHistory();
      const largeDeltaEntries = judgmentHistory.getHistoryByResult('large_delta');
      const smallDeltaEntries = judgmentHistory.getHistoryByResult('small_delta');
      
      expect(historyData).toHaveLength(3); // beforeEachで3つのエントリを追加
      expect(largeDeltaEntries).toHaveLength(2); // 2つがlarge_delta
      expect(smallDeltaEntries).toHaveLength(1); // 1つがsmall_delta
      
      // 平均実際magnitude値の計算テスト
      const avgLargeDelta = judgmentHistory.getAverageActualMagnitude('large_delta');
      const avgSmallDelta = judgmentHistory.getAverageActualMagnitude('small_delta');
      
      expect(avgLargeDelta).toBeCloseTo(0.55, 1); // (0.8 + 0.3) / 2 = 0.55
      expect(avgSmallDelta).toBe(0.2);
    });
  });

  describe('基準再学習処理', () => {
    (DevelopOption.isExecute_SD_18_criteria_relearning ? test : test.skip)('正常系：履歴分析に基づく判定基準の再学習', () => {
      // シーケンス図 31-32行目: Hippocampus -> Hippocampus: 判定基準再学習(履歴)
      
      const historyData = judgmentHistory.getHistory();
      const analysis = hippocampusModule.analyzeJudgmentHistory(historyData);
      
      expect(analysis.largeDeltaAccuracy).toBeLessThan(1.0); // 誤判定があるため精度は1未満
      expect(analysis.smallDeltaAccuracy).toBe(1.0); // small_deltaは正確
      
      expect(analysis.recommendedTolerances.has('large_threshold')).toBe(true);
      expect(analysis.recommendedTolerances.has('small_threshold')).toBe(true);
      expect(analysis.recommendedWeights.has('magnitude_weight')).toBe(true);
      expect(analysis.recommendedWeights.has('context_weight')).toBe(true);
      
      // 精度が低い場合の閾値調整を確認
      expect(analysis.recommendedTolerances.get('large_threshold')).toBeLessThanOrEqual(0.7);
    });
  });

  describe('基準更新処理', () => {
    (DevelopOption.isExecute_SD_18_criteria_update ? test : test.skip)('正常系：基準パターンの許容差と重みの更新', () => {
      // シーケンス図 37行目: Hippocampus -> Criteria: 更新(新しい許容差, 重み)
      
      const initialLargeThreshold = criteriaPattern.getTolerance('large_threshold');
      const initialMagnitudeWeight = criteriaPattern.getWeight('magnitude_weight');
      
      expect(initialLargeThreshold).toBe(0.7);
      expect(initialMagnitudeWeight).toBe(1.0);
      
      // 基準再学習プロセスを実行
      const historyData = judgmentHistory.getHistory();
      hippocampusModule.performCriteriaRelearning(historyData, criteriaPattern);
      
      const updatedLargeThreshold = criteriaPattern.getTolerance('large_threshold');
      const updatedMagnitudeWeight = criteriaPattern.getWeight('magnitude_weight');
      
      // 精度が低いため、閾値が調整されることを確認
      expect(updatedLargeThreshold).toBeLessThan(initialLargeThreshold);
      expect(updatedMagnitudeWeight).toBeGreaterThanOrEqual(initialMagnitudeWeight);
      
      // すべての許容差と重みが正の値であることを確認
      const allTolerances = criteriaPattern.getAllTolerances();
      const allWeights = criteriaPattern.getAllWeights();
      
      allTolerances.forEach(tolerance => {
        expect(tolerance).toBeGreaterThan(0);
      });
      
      allWeights.forEach(weight => {
        expect(weight).toBeGreaterThan(0);
      });
    });
  });
});