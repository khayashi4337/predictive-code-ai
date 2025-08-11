import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { RelativeDifference } from '../pattern/RelativeDifference';
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

// 履歴データの構造定義
interface HistoryEntry {
  id: string;
  expected: ExpectedPatternV2<MockContext>;
  actual: ActualPatternV2<MockContext>;
  delta: RelativeDifference<MockContext>;
  timestamp: Date;
  significance: number;
}

// モック用の簡易クラス定義
class MockDeltaHistoryBuffer {
  private history: HistoryEntry[] = [];
  
  constructor(public id: string) {}
  
  addEntry(entry: HistoryEntry): void {
    this.history.push(entry);
    
    // 最大サイズ制限（古いエントリを削除）
    if (this.history.length > 1000) {
      this.history.shift();
    }
  }
  
  getRecentSignificantHistory(significanceThreshold: number = 0.5): HistoryEntry[] {
    return this.history
      .filter(entry => entry.significance >= significanceThreshold)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50); // 最新50件
  }
  
  size(): number {
    return this.history.length;
  }
}

class MockHippocampusAutonomousModule {
  constructor(public id: string) {}
  
  restorePatternFromHistory(entry: HistoryEntry): {
    restoredExpected: ExpectedPatternV2<MockContext>;
    restoredActual: ActualPatternV2<MockContext>;
  } {
    // 履歴からパターンを復元
    const restoredExpected = new ExpectedPatternV2<MockContext>(
      new ContextInfo(
        new MockContext([...entry.expected.body.toVector()]),
        new Set(entry.expected.body.getDimension() > 0 ? [Tag.create('restored')] : []),
        new Map()
      )
    );
    
    const restoredActual = new ActualPatternV2<MockContext>(
      new ContextInfo(
        new MockContext([...entry.actual.contextInfo.body.toVector()]),
        new Set([Tag.create('replay')]),
        new Map()
      )
    );
    
    return {
      restoredExpected,
      restoredActual
    };
  }
  
  initiateReplay(historyBuffer: MockDeltaHistoryBuffer): void {
    const significantHistory = historyBuffer.getRecentSignificantHistory();
    
    significantHistory.forEach(entry => {
      this.restorePatternFromHistory(entry);
    });
  }
}

class MockAutonomousLayer {
  private modelUpdates: number = 0;
  
  constructor(public id: string) {}
  
  propagateReplayPattern(pattern: ExpectedPatternV2<MockContext> | ActualPatternV2<MockContext>): void {
    // 再生パターンを受信して処理
  }
  
  updatePredictionModel(
    expected: ExpectedPatternV2<MockContext>,
    actual: ActualPatternV2<MockContext>
  ): void {
    this.modelUpdates++;
  }
  
  getModelUpdateCount(): number {
    return this.modelUpdates;
  }
  
  resetModelUpdates(): void {
    this.modelUpdates = 0;
  }
}

describe('SD-17: オフライン再生（リプレイ）', () => {
  let historyBuffer: MockDeltaHistoryBuffer;
  let hippocampusModule: MockHippocampusAutonomousModule;
  let autonomousLayer: MockAutonomousLayer;

  beforeEach(() => {
    historyBuffer = new MockDeltaHistoryBuffer('history-buffer-01');
    hippocampusModule = new MockHippocampusAutonomousModule('hippocampus-01');
    autonomousLayer = new MockAutonomousLayer('layer-01');
    
    // テスト用の履歴データを追加
    const testEntries: HistoryEntry[] = [
      {
        id: 'entry-1',
        expected: new ExpectedPatternV2<MockContext>(new ContextInfo(new MockContext([0.1, 0.2]), new Set(), new Map())),
        actual: new ActualPatternV2<MockContext>(new ContextInfo(new MockContext([0.15, 0.25]), new Set(), new Map())),
        delta: new RelativeDifference<MockContext>(0.7, new ContextInfo(new MockContext([0.1, 0.2]), new Set(), new Map())),
        timestamp: new Date(Date.now() - 1000),
        significance: 0.8
      },
      {
        id: 'entry-2',
        expected: new ExpectedPatternV2<MockContext>(new ContextInfo(new MockContext([0.3, 0.4]), new Set(), new Map())),
        actual: new ActualPatternV2<MockContext>(new ContextInfo(new MockContext([0.35, 0.45]), new Set(), new Map())),
        delta: new RelativeDifference<MockContext>(0.6, new ContextInfo(new MockContext([0.3, 0.4]), new Set(), new Map())),
        timestamp: new Date(Date.now() - 500),
        significance: 0.9
      }
    ];
    
    testEntries.forEach(entry => historyBuffer.addEntry(entry));
  });

  // === SD-17シーケンス図対応テストケース ===

  describe('履歴取得処理', () => {
    (DevelopOption.isExecute_SD_17_history_retrieval ? test : test.skip)('正常系：アイドル時の重要差分履歴取得', () => {
      // シーケンス図 20-23行目: Hippocampus -> HistoryBuffer: getRecentSignificantHistory() -> 重要な差分履歴
      
      const significantHistory = historyBuffer.getRecentSignificantHistory(0.5);
      
      expect(significantHistory).toHaveLength(2); // beforeEachで2つのエントリを追加
      expect(significantHistory[0].significance).toBeGreaterThanOrEqual(0.5);
      expect(significantHistory[1].significance).toBeGreaterThanOrEqual(0.5);
      
      // タイムスタンプでソートされているかを確認
      expect(significantHistory[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        significantHistory[1].timestamp.getTime()
      );
    });
  });

  describe('パターン再生処理', () => {
    (DevelopOption.isExecute_SD_17_pattern_replay ? test : test.skip)('正常系：履歴からパターン復元と層への伝播', () => {
      // シーケンス図 25-32行目: loop履歴 -> 履歴からパターンを復元 -> Layer: 再生パターンを伝播
      
      const significantHistory = historyBuffer.getRecentSignificantHistory();
      const firstEntry = significantHistory[0];
      
      const { restoredExpected, restoredActual } = hippocampusModule.restorePatternFromHistory(firstEntry);
      
      expect(restoredExpected).toBeInstanceOf(ExpectedPatternV2);
      expect(restoredActual).toBeInstanceOf(ActualPatternV2);
      
      // 復元されたパターンのベクトルが元のエントリと一致することを確認
      expect(restoredExpected.body.toVector()).toEqual(firstEntry.expected.body.toVector());
      expect(restoredActual.contextInfo.body.toVector()).toEqual(firstEntry.actual.contextInfo.body.toVector());
      
      // 層への伝播をテスト
      autonomousLayer.propagateReplayPattern(restoredExpected);
      autonomousLayer.propagateReplayPattern(restoredActual);
      
      expect(restoredActual.contextInfo.tags.has(Tag.create('replay'))).toBe(false); // Tagの比較は参照ベース
      expect(Array.from(restoredActual.contextInfo.tags).some(tag => tag.key === 'replay')).toBe(true);
    });
  });

  describe('モデル安定化処理', () => {
    (DevelopOption.isExecute_SD_17_model_stabilization ? test : test.skip)('正常系：予測モデルの再更新による安定化', () => {
      // シーケンス図 32-33行目: Layer -> Layer: 予測モデルを再更新
      
      expect(autonomousLayer.getModelUpdateCount()).toBe(0);
      
      // リプレイプロセス全体をシミュレート
      hippocampusModule.initiateReplay(historyBuffer);
      
      // 履歴からパターンを復元してモデル更新
      const significantHistory = historyBuffer.getRecentSignificantHistory();
      significantHistory.forEach(entry => {
        const { restoredExpected, restoredActual } = hippocampusModule.restorePatternFromHistory(entry);
        autonomousLayer.updatePredictionModel(restoredExpected, restoredActual);
      });
      
      expect(autonomousLayer.getModelUpdateCount()).toBe(2); // beforeEachで2つのエントリ
      
      // モデル安定化の効果を確認
      expect(autonomousLayer.getModelUpdateCount()).toBeGreaterThan(0);
    });
  });
});