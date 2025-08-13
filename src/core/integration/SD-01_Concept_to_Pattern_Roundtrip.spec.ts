import { DevelopOption } from '../../debug/DevelopOption';
import { ConceptAutonomousLayer, PatternAutonomousLayer } from '../layers/LayerImplementations';
import { InterLayerRelativeJudgementLink } from '../links/InterLayerRelativeJudgementLink';
import { ContextInfo } from '../tag/ContextInfo';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { L2Distance } from '../metrics/L2Distance';
import { CosineDistance } from '../metrics/CosineDistance';
import { VectorizableContext } from '../tag/VectorizableContext';
import { Tag } from '../tag/Tag';
import { Statistics } from '../tag/Statistics';
import { BaseLearningRatePolicy } from '../links/BaseLearningRatePolicy';
import { BaseUpdateScopePolicy } from '../links/BaseUpdateScopePolicy';
import { BaseSkipPolicy } from '../links/BaseSkipPolicy';
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

// Mockポリシークラスは本番のBase*Policy実装に置き換えられました
// 以下のクラスがMockの代わりに使用されます:
// - BaseLearningRatePolicy<MockVectorizableContext>
// - BaseUpdateScopePolicy<MockVectorizableContext> 
// - BaseSkipPolicy<MockVectorizableContext>


describe('SD-01: 概念→パターンの基本往復', () => {
    test('シーケンス図に沿った処理が実行されること', async () => {
      try {

    // 1. 登場クラスのインスタンス化（フラグに応じてモック/本番を切り替え）
    const conceptLayer = DevelopOption.isUseRealImplementation_SD_01_layers
      ? new ConceptAutonomousLayer<MockVectorizableContext>('concept1', '概念層')
      : new ConceptAutonomousLayer<MockVectorizableContext>('concept1', '概念層'); // TODO: モック実装があれば切り替え
      
    const patternLayer = DevelopOption.isUseRealImplementation_SD_01_layers
      ? new PatternAutonomousLayer<MockVectorizableContext>('pattern1', 'パターン層')
      : new PatternAutonomousLayer<MockVectorizableContext>('pattern1', 'パターン層'); // TODO: モック実装があれば切り替え
    
    // メトリクスの切り替え
    const metric = DevelopOption.isUseRealImplementation_SD_01_metrics
      ? new L2Distance()
      : new L2Distance(); // TODO: モックメトリクスがあれば切り替え
    
    // ポリシーの切り替え（Mockから本番実装のBase*Policyに変更）
    const learningRatePolicy = DevelopOption.isUseRealImplementation_SD_01_policies
      ? new BaseLearningRatePolicy<MockVectorizableContext>()
      : new BaseLearningRatePolicy<MockVectorizableContext>(); // 本番実装を使用
    const updateScopePolicy = DevelopOption.isUseRealImplementation_SD_01_policies
      ? new BaseUpdateScopePolicy<MockVectorizableContext>()
      : new BaseUpdateScopePolicy<MockVectorizableContext>(); // 本番実装を使用
    const skipPolicy = DevelopOption.isUseRealImplementation_SD_01_policies
      ? new BaseSkipPolicy<MockVectorizableContext>()
      : new BaseSkipPolicy<MockVectorizableContext>(); // 本番実装を使用
    
    // リンクの作成
    const link = DevelopOption.isUseRealImplementation_SD_01_link
      ? new InterLayerRelativeJudgementLink<MockVectorizableContext>(
          'concept1',
          'pattern1',
          metric,
          learningRatePolicy,
          updateScopePolicy,
          skipPolicy
        )
      : new InterLayerRelativeJudgementLink<MockVectorizableContext>( // TODO: モックリンクがあれば切り替え
          'concept1',
          'pattern1',
          metric,
          learningRatePolicy,
          updateScopePolicy,
          skipPolicy
        );

    // 2. 期待パターン生成
    const contextForExpected = new ContextInfo(new MockVectorizableContext([0.1, 0.2, 0.3]), new Set([Tag.create('test')]), new Statistics());
    const expectedPattern = conceptLayer.generateExpectedPattern('pattern1', contextForExpected);
    console.log('生成された期待パターン:', expectedPattern);

    // 3. 実際パターン観測 - 期待パターンと同じ次元になるよう調整
    const expectedDimension = expectedPattern.contextInfo.body.getDimension();
    const actualVector = [0.15, 0.25, 0.35];
    // 期待パターンの次元に合わせて実際パターンを調整
    while (actualVector.length < expectedDimension) {
      actualVector.push(actualVector[actualVector.length - 1] * 0.9); // 最後の値を減衰させて追加
    }
    const actualPatternBody = new MockVectorizableContext(actualVector.slice(0, expectedDimension));
    const contextForActual = new ContextInfo(actualPatternBody, new Set([Tag.create('actual')]), new Statistics());
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
        throw error;
      }
    });
  });
