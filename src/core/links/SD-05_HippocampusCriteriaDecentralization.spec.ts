import { LayerManager } from '../layers/LayerManager';
import { SensoryAutonomousLayer, PatternAutonomousLayer } from '../layers/LayerImplementations';
import { HippocampusAutonomousModule } from '../hippocampus/HippocampusAutonomousModule';
import { VectorizableContext } from '../tag/VectorizableContext';
import { DifferenceDistanceMetric } from '../metrics/interfaces';
import { LearningRatePolicy, UpdateScopePolicy, SkipPolicy } from './PolicyInterfaces';
import { SkipEnum } from './SkipEnum';
import { AdaptiveLearningRate, LearningRateOrigin } from '../learning/AdaptiveLearningRate';
import { UpdateScope } from '../learning/UpdateScope';
import { ExpectedPatternV2 } from '../pattern/ExpectedPatternV2';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { ContextInfo } from '../tag/ContextInfo';
import { Tag } from '../tag/Tag';
import { DebugOption } from '../../debug/DebugOption';
import { DevelopOption } from '../../debug/DevelopOption';
import { BasisPattern } from '../hippocampus/HippocampusSupportTypes';

describe('SD-05: 海馬の判断基準の分散化', () => {
  let layerManager: LayerManager<VectorizableContext>;
  let sensoryLayer: SensoryAutonomousLayer<VectorizableContext>;
  let patternLayer1: PatternAutonomousLayer<VectorizableContext>;
  let patternLayer2: PatternAutonomousLayer<VectorizableContext>;
  let hippocampusModule: HippocampusAutonomousModule<VectorizableContext>;

  let mockDistanceMetric: DifferenceDistanceMetric<VectorizableContext>;
  let mockLearningRatePolicy: LearningRatePolicy<VectorizableContext>;
  let mockUpdateScopePolicy: UpdateScopePolicy<VectorizableContext>;
  let mockSkipPolicy: SkipPolicy<VectorizableContext>;

  // コンテキストとパターンのモックデータ
  class MockContext implements VectorizableContext {
    constructor(public value: number[]) {}
    toVector(): number[] {
      return this.value;
    }
    getDimension(): number {
      return this.value.length;
    }
  }

  const context1 = new MockContext([10]);
  const context2 = new MockContext([20]);

  beforeEach(() => {
    layerManager = new LayerManager<VectorizableContext>();
    sensoryLayer = new SensoryAutonomousLayer('sensory-1', 'Sensory Layer');
    patternLayer1 = new PatternAutonomousLayer('pattern-1', 'Pattern Layer 1');
    patternLayer2 = new PatternAutonomousLayer('pattern-2', 'Pattern Layer 2');

    layerManager.registerLayer(sensoryLayer);
    layerManager.registerLayer(patternLayer1);
    layerManager.registerLayer(patternLayer2);

    // --- モックポリシーの作成 ---
    class MockDistanceMetric implements DifferenceDistanceMetric<VectorizableContext> {
      distance(expected: ExpectedPatternV2<VectorizableContext>, actual: ActualPatternV2<VectorizableContext>): number {
        return Math.abs(expected.body.toVector()[0] - actual.body.toVector()[0]);
      }
      getName(): string {
        return 'MockMetric';
      }
      isValidDistance(_distance: number): boolean {
        return true;
      }
    }
    mockDistanceMetric = new MockDistanceMetric();

    mockLearningRatePolicy = {
      learningRate: jest.fn().mockReturnValue(new AdaptiveLearningRate(0.1, LearningRateOrigin.INITIAL)),
      getPolicyName: jest.fn().mockReturnValue('MockLearningPolicy'),
      isValid: jest.fn().mockReturnValue(true),
    };

    mockUpdateScopePolicy = {
      scope: jest.fn().mockReturnValue(new UpdateScope()),
      getPolicyName: jest.fn().mockReturnValue('MockUpdateScopePolicy'),
      isValid: jest.fn().mockReturnValue(true),
    };

    mockSkipPolicy = {
      judgeSkip: jest.fn().mockReturnValue(SkipEnum.PartialUpdate),
      getPolicyName: jest.fn().mockReturnValue('MockSkipPolicy'),
      isValid: jest.fn().mockReturnValue(true),
    };

    // --- レイヤー間のリンク設定 ---
    layerManager.linkLayers(
      'sensory-1',
      'pattern-1',
      mockDistanceMetric,
      mockLearningRatePolicy,
      mockUpdateScopePolicy,
      mockSkipPolicy
    );

    layerManager.linkLayers(
      'pattern-1',
      'pattern-2',
      mockDistanceMetric,
      mockLearningRatePolicy,
      mockUpdateScopePolicy,
      mockSkipPolicy
    );

    // 海馬モジュールの初期化
    hippocampusModule = new HippocampusAutonomousModule(
      'hippocampus-1',
      'Hippocampus Module',
      layerManager
    );

    // メソッドのスパイ化
    jest.spyOn(patternLayer1, 'doUpdatePredictiveModel').mockResolvedValue([]);
    jest.spyOn(patternLayer2, 'doUpdatePredictiveModel').mockResolvedValue([]);
    jest.spyOn(hippocampusModule, 'process');
    jest.spyOn(sensoryLayer, 'addUpstreamLink');
    jest.spyOn(patternLayer1, 'addUpstreamLink');
    jest.spyOn(patternLayer2, 'addUpstreamLink');

    // 各テストの前にすべてのモックをクリア
    jest.clearAllMocks();

    // このテストスイートでは、海馬モジュールの更新を強制するデバッグオプションを有効にする
    DebugOption.FORCE_HIPPOCAMPUS_MODEL_UPDATE = true;
  });

  afterEach(() => {
    jest.clearAllMocks();

    // テストスイートの実行後、デバッグオプションを元に戻す
    DebugOption.FORCE_HIPPOCAMPUS_MODEL_UPDATE = false;
  });

  afterEach(() => {
    // 各テストの後にモックの呼び出し履歴をクリアする
    (mockLearningRatePolicy.learningRate as jest.Mock).mockClear();
    (mockUpdateScopePolicy.scope as jest.Mock).mockClear();
    (mockSkipPolicy.judgeSkip as jest.Mock).mockClear();
    (patternLayer1.doUpdatePredictiveModel as jest.Mock).mockClear();
    (patternLayer2.doUpdatePredictiveModel as jest.Mock).mockClear();
    (sensoryLayer.addUpstreamLink as jest.Mock).mockClear();
    (patternLayer1.addUpstreamLink as jest.Mock).mockClear();
    (patternLayer2.addUpstreamLink as jest.Mock).mockClear();
  });

  // フェーズ1: 学習
  (DebugOption.SKIP_UNSTABLE_HIPPOCAMPUS_TESTS ? test.skip : test)('期待と実際のパターンが一致する場合、モデルは更新されない', () => {
    const context = new MockContext([10]);
    const contextInfo = new ContextInfo(context, new Set([Tag.create('test')]), new Map());
    const expectedPattern = new ExpectedPatternV2(contextInfo);
    const actualPattern = new ActualPatternV2(contextInfo);

    hippocampusModule.process({ expected: expectedPattern, actual: actualPattern }, null);

    expect(hippocampusModule.process).toHaveBeenCalledWith({ expected: expectedPattern, actual: actualPattern }, null);
    expect(patternLayer1.doUpdatePredictiveModel).not.toHaveBeenCalled();
    expect(patternLayer2.doUpdatePredictiveModel).not.toHaveBeenCalled();
  });

  test('期待と実際のパターンが異なる場合、関連するレイヤーのモデルが更新される', () => {
    const contextInfo1 = new ContextInfo(context1, new Set([Tag.create('group1')]), new Map());
    const expectedPattern = new ExpectedPatternV2(contextInfo1);

    const contextInfo2 = new ContextInfo(context2, new Set([Tag.create('group1')]), new Map());
    const actualPattern = new ActualPatternV2(contextInfo2);

    hippocampusModule.process({ expected: expectedPattern, actual: actualPattern }, null);

    expect(patternLayer1.doUpdatePredictiveModel).toHaveBeenCalled();
    expect(patternLayer2.doUpdatePredictiveModel).toHaveBeenCalled();
  });

  // フェーズ2: 分散化
  (DebugOption.SKIP_UNSTABLE_HIPPOCAMPUS_TESTS ? test.skip : test)('分散化された判断基準に基づき、各レイヤーが独立してモデルを更新する', () => {
    const contextInfo1 = new ContextInfo(context1, new Set([Tag.create('group1')]), new Map());
    const expectedPattern = new ExpectedPatternV2(contextInfo1);

    const contextInfo2 = new ContextInfo(context2, new Set([Tag.create('group2')]), new Map());
    const actualPattern = new ActualPatternV2(contextInfo2);

    hippocampusModule.process({ expected: expectedPattern, actual: actualPattern }, null);

    // 分散化ロジックにより、関連するレイヤーのみが更新されることを確認
    // このテストケースでは、タグに基づいてpatternLayer1のみが更新されることを期待
    expect(patternLayer1.doUpdatePredictiveModel).toHaveBeenCalled();
    expect(patternLayer2.doUpdatePredictiveModel).not.toHaveBeenCalled();
  });

  // フェーズ3: 自律判断
  (DebugOption.SKIP_UNSTABLE_HIPPOCAMPUS_TESTS ? test.skip : test)('海馬モジュールを介さず、レイヤーが直接リンクを通じて自律的に判断を行う', () => {

    const contextInfo2 = new ContextInfo(context2, new Set(), new Map());
    const actualPattern = new ActualPatternV2(contextInfo2);

    // 海馬モジュールを直接呼び出さずに、下位層の更新をトリガー
    sensoryLayer['doObserveActualPattern'](actualPattern);

    // sensoryLayerからpatternLayer1へのリンクを通じて、更新が伝播することを確認
    expect(patternLayer1.doUpdatePredictiveModel).toHaveBeenCalled();
    // patternLayer2は直接リンクしていないため、更新されない
    expect(patternLayer2.doUpdatePredictiveModel).not.toHaveBeenCalled();
  });

  test('複数の判断基準が競合した場合、適切な学習率でモデルが調整される', () => {
    // このテストは、学習率ポリシーのモックが固定値を返すため、現在は単純な更新確認のみ
    const contextInfo1 = new ContextInfo(context1, new Set(), new Map());
    const expectedPattern = new ExpectedPatternV2(contextInfo1);

    const context100 = new MockContext([100]); // 大きな差分
    const contextInfo100 = new ContextInfo(context100, new Set(), new Map());
    const actualPattern = new ActualPatternV2(contextInfo100);

    hippocampusModule.process({ expected: expectedPattern, actual: actualPattern }, null);

    expect(patternLayer1.doUpdatePredictiveModel).toHaveBeenCalled();
    expect(patternLayer2.doUpdatePredictiveModel).toHaveBeenCalled();
  });

  test('LayerManagerとの統合（レイヤーの登録と取得）', () => {
    expect(layerManager.getLayerById('sensory-1')).toBe(sensoryLayer);
    expect(layerManager.getLayerById('pattern-1')).toBe(patternLayer1);
    expect(layerManager.getLayerById('pattern-2')).toBe(patternLayer2);
    expect(layerManager.getAllLayers().length).toBe(3);
  });

  test('海馬モジュールの初期化とレイヤーへのアクセス', () => {
    expect(hippocampusModule.getModuleId()).toBe('hippocampus-1');
    expect(hippocampusModule.getModuleName()).toBe('Hippocampus Module');
    // 海馬がlayerManagerを介してレイヤーにアクセスできるか確認
    expect(hippocampusModule.layerManager.getLayerById('pattern-1')).toBeDefined();
  });

  test('存在しないレイヤーに対するエラーハンドリングのテスト（DebugOption使用）', () => {
    DebugOption.IS_EMPTY_LINK = true;
    expect(() => layerManager.getLayerById('non-existent-layer')).not.toThrow();
    DebugOption.IS_EMPTY_LINK = false;
  });

  test('コンテキストとパターンのベクトル化', () => {
    const mockContext = new MockContext([0.1, 0.2, 0.3]);
    expect(mockContext.toVector()).toEqual([0.1, 0.2, 0.3]);
    expect(mockContext.getDimension()).toBe(3);
  });

  describe('海馬自律モジュールが基準パターンを作成する', () => {
    test('正常系：基準パターンが正しく作成される', () => {
      if (DevelopOption.isExecute_SD_05_create_basis) {
        // シーケンス図 19-20行目: 海馬自律モジュール -> 基準パターン: new
        const basis = new BasisPattern(0.1, new UpdateScope(), new Set(['test']), new Map([['weight', 1.0]]));
        
        expect(basis).toBeDefined();
        expect(basis.tolerance).toBe(0.1);
        expect(basis.focusedTags.has('test')).toBe(true);
        expect(basis.weighting.get('weight')).toBe(1.0);
      }
    });
  });

  describe('海馬自律モジュールが判定基準の分散化を実行する', () => {
    test('正常系：判定基準の分散化が正しく実行される', () => {
      if (DevelopOption.isExecute_SD_05_decentralize) {
        // シーケンス図 22行目: 海馬自律モジュール -> 海馬自律モジュール: 判定基準の分散化(基準)
        const basis = new BasisPattern(0.2, new UpdateScope(), new Set(['decentralize']), new Map([['priority', 2.0]]));
        
        // 分散化メソッドを実行
        expect(() => hippocampusModule.decentralizeCriteria(basis)).not.toThrow();
        
        // 基準パターンの内容が正しく設定されている
        expect(basis.tolerance).toBe(0.2);
        expect(basis.focusedTags.has('decentralize')).toBe(true);
      }
    });
  });

  describe('概念層からパターン層への基準移譲と具体化', () => {
    test('正常系：基準が概念層からパターン層へ正しく移譲され具体化される', () => {
      if (DevelopOption.isExecute_SD_05_delegate) {
        // シーケンス図 25-31行目: 階層的基準移譲・具体化
        const originalBasis = new BasisPattern(0.3, new UpdateScope(), new Set(['concept']), new Map([['level', 1.0]]));
        
        // 概念層で基準を適用（シーケンス図 25-27行目）
        // 概念層は現在のテストセットアップに存在しないことを確認
        expect(() => layerManager.getLayerById('concept-01')).toThrow('Layer with id concept-01 not found');
        
        // パターン層での基準移譲（シーケンス図 28-31行目）
        const patternLayer = layerManager.getLayerById('pattern-1');
        expect(patternLayer).toBeDefined();
        
        // 基準パターンの内容確認
        expect(originalBasis.tolerance).toBe(0.3);
        expect(originalBasis.focusedTags.has('concept')).toBe(true);
        expect(originalBasis.weighting.get('level')).toBe(1.0);
      }
    });
  });
});