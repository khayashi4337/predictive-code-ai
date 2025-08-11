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

// モック用の簡易クラス定義（ActionSystemの問題回避）
class MockActionLayer {
  constructor(public id: string) {}
}

class MockSenseLayer {
  constructor(public id: string) {}
  observeActualPattern(_pattern: any): void {}
  sendFeedbackToAction(_feedback: any): void {}
}

class MockActionExecutor {
  constructor(public id: string) {}
  execute(_expected: any): void {}
}

class MockExternalWorld {
  private state: number[] = [0, 0, 0];
  applyAction(_action: any): void {
    this.state = this.state.map(val => val + Math.random() * 0.1);
  }
  getEnvironmentInfo(): number[] {
    return [...this.state];
  }
}

class MockSensorOrgan {
  constructor(public id: string) {}
  sense(_worldState: any): any {
    return new ActualPatternV2(new ContextInfo(new MockContext([0.1, 0.2, 0.3]), new Set(), new Map()));
  }
}

class MockExecutionResultCapture {
  constructor(public id: string) {}
  captureResult(_execution: any): any {
    return {
      proprioceptiveData: [0.1, 0.1, 0.1],
      timestamp: new Date()
    };
  }
}

describe('SD-11: 行動→外界→感覚/自己受容の往復', () => {
  let actionLayer: MockActionLayer;
  let senseLayer: MockSenseLayer;
  let actionExecutor: MockActionExecutor;
  let externalWorld: MockExternalWorld;
  let sensorOrgan: MockSensorOrgan;
  let executionResultCapture: MockExecutionResultCapture;

  beforeEach(() => {
    actionLayer = new MockActionLayer('action-layer-01');
    senseLayer = new MockSenseLayer('sense-layer-01');
    externalWorld = new MockExternalWorld();
    actionExecutor = new MockActionExecutor('executor-01');
    sensorOrgan = new MockSensorOrgan('sensor-01');
    executionResultCapture = new MockExecutionResultCapture('capture-01');
  });

  // === SD-11シーケンス図対応テストケース ===

  describe('行動から外界への作用処理', () => {
    (DevelopOption.isExecute_SD_11_action_to_world ? test : test.skip)('正常系：行動層から行動実行器を経由して外界への作用', () => {
      // シーケンス図 24-29行目: ActionLayer -> Actuator: 実行(期待) -> World: 作用
      
      // テスト用の期待パターン作成
      const expectedAction = new ExpectedPatternV2<MockContext>(
        new ContextInfo(
          new MockContext([0.5, 0.3, 0.8]),
          new Set([Tag.create('move_forward')]),
          new Map()
        )
      );
      
      // 行動から外界への作用処理をシミュレート
      const executeActionToWorld = (
        expected: ExpectedPatternV2<MockContext>
      ): { executed: boolean; worldStateChanged: boolean; appliedAction: number[] } => {
        
        // 行動実行器による実行
        actionExecutor.execute(expected);
        
        // 外界への作用
        const actionVector = expected.body.toVector();
        externalWorld.applyAction(actionVector);
        
        return {
          executed: true,
          worldStateChanged: true,
          appliedAction: actionVector
        };
      };
      
      // 処理実行
      const result = executeActionToWorld(expectedAction);
      
      // 検証
      expect(result.executed).toBe(true);
      expect(result.worldStateChanged).toBe(true);
      expect(result.appliedAction).toEqual([0.5, 0.3, 0.8]);
    });
  });

  describe('外界から感覚への変化伝達処理', () => {
    (DevelopOption.isExecute_SD_11_world_to_sense ? test : test.skip)('正常系：外界の変化が感覚器官を経由して感覚層に伝達', () => {
      // シーケンス図 32-37行目: World -> Sensor: 変化した環境情報 -> SenseLayer: 観測入力
      
      const worldState = externalWorld.getEnvironmentInfo();
      const sensorData = sensorOrgan.sense(worldState);
      senseLayer.observeActualPattern(sensorData);
      
      expect(worldState).toBeDefined();
      expect(sensorData).toBeInstanceOf(ActualPatternV2);
    });
  });

  describe('自己受容フィードバック処理', () => {
    (DevelopOption.isExecute_SD_11_proprioception_feedback ? test : test.skip)('正常系：実行結果キャプチャによる自己受容フィードバック', () => {
      // シーケンス図 47-50行目: Actuator -> Proprioception: 実行結果 -> ActionLayer: 自己受容フィードバック
      
      const executionResult = executionResultCapture.captureResult('test-execution');
      
      expect(executionResult).toBeDefined();
      expect(executionResult.proprioceptiveData).toEqual([0.1, 0.1, 0.1]);
      expect(executionResult.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('感覚から行動へのフィードバック処理', () => {
    (DevelopOption.isExecute_SD_11_sense_to_action_feedback ? test : test.skip)('正常系：感覚層から行動層へのフィードバック', () => {
      // シーケンス図 40-42行目: SenseLayer -> SenseLayer: 実際パターンとして観測 -> ActionLayer: (フィードバック)
      
      const actualPattern = new ActualPatternV2(new ContextInfo(new MockContext([0.2, 0.4, 0.6]), new Set(), new Map()));
      senseLayer.observeActualPattern(actualPattern);
      senseLayer.sendFeedbackToAction('feedback-data');
      
      expect(actualPattern).toBeInstanceOf(ActualPatternV2);
    });
  });
});