import { DevelopOption } from '../../debug/DevelopOption';
import { ConceptAutonomousLayer, PatternAutonomousLayer } from '../layers/LayerImplementations';
import { InterLayerRelativeJudgementLink } from '../links/InterLayerRelativeJudgementLink';
import { ContextInfo } from '../tag/ContextInfo';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { L2Distance } from '../metrics/L2Distance';
import { VectorizableContext } from '../tag/VectorizableContext';
import { Tag } from '../tag/Tag';
import { LearningRatePolicy, UpdateScopePolicy, SkipPolicy } from '../links/PolicyInterfaces';
import { AdaptiveLearningRate, LearningRateOrigin } from '../learning/AdaptiveLearningRate';
import { UpdateScope } from '../learning/UpdateScope';
import { SkipEnum } from '../links/SkipEnum';
import { RelativeDifference } from '../pattern/RelativeDifference';
import { LearningSignal } from '../learning/LearningSignalV2';

// --- モッククラス定義 ---

class MockVectorizableContext implements VectorizableContext {
  constructor(public vector: number[], public id: string = 'mock') {}
  toVector(): number[] {
    return this.vector;
  }
  getDimension(): number {
    return this.vector.length;
  }
}

class MockLearningRatePolicy implements LearningRatePolicy<MockVectorizableContext> {
  learningRate(_difference: RelativeDifference<MockVectorizableContext>, _context: ContextInfo<MockVectorizableContext>): AdaptiveLearningRate {
    return new AdaptiveLearningRate(0.1, LearningRateOrigin.MANUAL);
  }
  getPolicyName(): string { return 'MockLearningRatePolicy'; }
  isValid(): boolean { return true; }
}

class MockUpdateScopePolicy implements UpdateScopePolicy<MockVectorizableContext> {
  scope(_difference: RelativeDifference<MockVectorizableContext>, _context: ContextInfo<MockVectorizableContext>): UpdateScope {
    return new UpdateScope(new Set(['all']));
  }
  getPolicyName(): string { return 'MockUpdateScopePolicy'; }
  isValid(): boolean { return true; }
}

class MockSkipPolicy implements SkipPolicy<MockVectorizableContext> {
  judgeSkip(_difference: RelativeDifference<MockVectorizableContext>): SkipEnum {
    return SkipEnum.PartialUpdate;
  }
  getPolicyName(): string { return 'MockSkipPolicy'; }
  isValid(): boolean { return true; }
}


if (DevelopOption.isExecute_SD_01) {
  describe('SD-01: 概念→パターンの基本往復', () => {
    test('シーケンス図に沿った処理が実行されること', async () => {
      try {

    // 1. 登場クラスのインスタンス化
    const conceptLayer = new ConceptAutonomousLayer<MockVectorizableContext>('concept1', '概念層');
    const patternLayer = new PatternAutonomousLayer<MockVectorizableContext>('pattern1', 'パターン層');
    
    const link = new InterLayerRelativeJudgementLink<MockVectorizableContext>(
      'concept1',
      'pattern1',
      new L2Distance(),
      new MockLearningRatePolicy(),
      new MockUpdateScopePolicy(),
      new MockSkipPolicy()
    );

    // 2. 期待パターン生成
    const contextForExpected = new ContextInfo(new MockVectorizableContext([0.1, 0.2, 0.3]), new Set([Tag.create('test')]), new Map());
    const expectedPattern = conceptLayer.generateExpectedPattern('pattern1', contextForExpected);
    console.log('生成された期待パターン:', expectedPattern);

    // 3. 実際パターン観測
    const actualPatternBody = new MockVectorizableContext([0.15, 0.25, 0.35]);
    const contextForActual = new ContextInfo(actualPatternBody, new Set([Tag.create('actual')]), new Map());
    const actualPattern = new ActualPatternV2(contextForActual);
    patternLayer.observeActualPattern(actualPattern);
    console.log('観測された実際パターン:', actualPattern);

    // 4. 相対差分計算
    const difference = link.calculateRelativeDifference(expectedPattern, actualPattern);
    console.log('計算された相対差分:', difference);
    expect(difference).toBeInstanceOf(RelativeDifference);

    // 5. 差分を上位へ伝播し、学習信号を生成してモデルを更新
    const learningRate = link.adjustLearningRate(difference, contextForExpected);
    const updateScope = link.determineUpdateScope(difference, contextForExpected);
    const learningSignal = LearningSignal.create(learningRate, difference, updateScope);
    
    await conceptLayer.updatePredictiveModel(learningSignal);

        // ここでは処理がエラーなく実行されることを確認する
        expect(true).toBe(true);
      } catch (error) {
        console.error('テスト実行中にエラーが発生しました:', error);
        fail(error);
      }
    });
  });
} else {
  describe.skip('SD-01: 概念→パターンの基本往復', () => {
    test('isExecute_SD_01 is false, skipping tests', () => {});
  });
}
