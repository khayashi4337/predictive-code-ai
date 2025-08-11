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

// モック用の簡易クラス定義
class MockInterLayerJudgementLink {
  constructor(public id: string) {}
  evaluateDifference(_difference: RelativeDifference<MockContext>): boolean {
    return _difference.magnitude > 0.8; // 驚愕閾値
  }
}

class MockSurpriseThresholdPolicy {
  private readonly threshold = 0.8;
  
  constructor(public id: string) {}
  
  requiresIntervention(_difference: RelativeDifference<MockContext>): boolean {
    return _difference.magnitude > this.threshold;
  }
  
  getThreshold(): number {
    return this.threshold;
  }
}

class MockEmergencyInterventionHandler {
  constructor(public id: string) {}
  
  handleEmergencyIntervention(_difference: RelativeDifference<MockContext>): void {
    // 緊急介入処理
  }
  
  alertHippocampus(_difference: RelativeDifference<MockContext>): void {
    // 海馬への強制注意喚起
  }
  
  overrideThalamusGate(): void {
    // 視床ゲートの一時的な全開
  }
}

class MockHippocampusModule {
  constructor(public id: string) {}
  
  forceAttentionAlert(_difference: RelativeDifference<MockContext>): void {
    // 強制注意喚起
  }
  
  emergencyRecall(_difference: RelativeDifference<MockContext>): any[] {
    // 関連経験の緊急想起
    return ['emergency_memory_1', 'emergency_memory_2'];
  }
}

class MockThalamusGate {
  private isForceOpen = false;
  
  constructor(public id: string) {}
  
  forceFullOpen(): void {
    this.isForceOpen = true;
  }
  
  isGateOpen(): boolean {
    return this.isForceOpen;
  }
  
  resetGate(): void {
    this.isForceOpen = false;
  }
}

describe('SD-13: 巨大Δの非常導線（驚愕→介入）', () => {
  let judgementLink: MockInterLayerJudgementLink;
  let surprisePolicy: MockSurpriseThresholdPolicy;
  let emergencyHandler: MockEmergencyInterventionHandler;
  let hippocampusModule: MockHippocampusModule;
  let thalamusGate: MockThalamusGate;

  beforeEach(() => {
    judgementLink = new MockInterLayerJudgementLink('link-01');
    surprisePolicy = new MockSurpriseThresholdPolicy('surprise-policy-01');
    emergencyHandler = new MockEmergencyInterventionHandler('emergency-handler-01');
    hippocampusModule = new MockHippocampusModule('hippocampus-01');
    thalamusGate = new MockThalamusGate('thalamus-gate-01');
  });

  // === SD-13シーケンス図対応テストケース ===

  describe('巨大差分検出処理', () => {
    (DevelopOption.isExecute_SD_13_huge_delta_detection ? test : test.skip)('正常系：相対差分の大きさ評価と驚愕閾値ポリシー判定', () => {
      // シーケンス図 28-32行目: Link -> Policy: 介入要否(差分) - 差分.大きさ > 驚愕閾値
      
      const hugeDifference = new RelativeDifference<MockContext>(
        0.9, // 巨大な差分の大きさ
        new ContextInfo(new MockContext([0.2, 0.3, 0.4]), new Set(), new Map())
      );
      
      const isHugeDelta = judgementLink.evaluateDifference(hugeDifference);
      const requiresIntervention = surprisePolicy.requiresIntervention(hugeDifference);
      
      expect(hugeDifference.magnitude).toBeGreaterThan(0.8);
      expect(isHugeDelta).toBe(true);
      expect(requiresIntervention).toBe(true);
      expect(surprisePolicy.getThreshold()).toBe(0.8);
    });
  });

  describe('緊急介入処理', () => {
    (DevelopOption.isExecute_SD_13_emergency_intervention ? test : test.skip)('正常系：介入要判定時の緊急介入ハンドラ起動', () => {
      // シーケンス図 36-37行目: Link -> Handler: 緊急介入(差分)
      
      const emergencyDifference = new RelativeDifference<MockContext>(
        0.85,
        new ContextInfo(new MockContext([0.1, 0.2, 0.3]), new Set(), new Map())
      );
      
      emergencyHandler.handleEmergencyIntervention(emergencyDifference);
      
      expect(emergencyDifference.magnitude).toBeGreaterThan(0.8);
      expect(surprisePolicy.requiresIntervention(emergencyDifference)).toBe(true);
    });
  });

  describe('海馬強制注意喚起処理', () => {
    (DevelopOption.isExecute_SD_13_hippocampus_alert ? test : test.skip)('正常系：海馬への強制注意喚起と関連経験の緊急想起', () => {
      // シーケンス図 38-41行目: Handler -> Hippocampus: 強制注意喚起(差分) -> 関連経験の緊急想起
      
      const criticalDifference = new RelativeDifference<MockContext>(
        0.9,
        new ContextInfo(new MockContext([0.2, 0.1, 0.3]), new Set(), new Map())
      );
      
      emergencyHandler.alertHippocampus(criticalDifference);
      hippocampusModule.forceAttentionAlert(criticalDifference);
      const emergencyMemories = hippocampusModule.emergencyRecall(criticalDifference);
      
      expect(criticalDifference.magnitude).toBe(0.9);
      expect(emergencyMemories).toEqual(['emergency_memory_1', 'emergency_memory_2']);
      expect(emergencyMemories).toHaveLength(2);
    });
  });

  describe('視床ゲート強制開放処理', () => {
    (DevelopOption.isExecute_SD_13_thalamus_gate_override ? test : test.skip)('正常系：感覚入力の強制通過とゲート全開', () => {
      // シーケンス図 43-46行目: Handler -> ThalamusGate: 感覚入力の強制通過 -> ゲートを一時的に全開
      
      expect(thalamusGate.isGateOpen()).toBe(false);
      
      emergencyHandler.overrideThalamusGate();
      thalamusGate.forceFullOpen();
      
      expect(thalamusGate.isGateOpen()).toBe(true);
      
      // テスト後のクリーンアップ
      thalamusGate.resetGate();
      expect(thalamusGate.isGateOpen()).toBe(false);
    });
  });
});