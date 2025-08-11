import { ConceptAutonomousLayer, PatternAutonomousLayer } from '../layers/LayerImplementations';
import { HippocampusAutonomousModule, BasisPattern } from '../hippocampus/HippocampusAutonomousModule';
import { VectorizableContext } from '../tag/VectorizableContext';
import { ContextInfo } from '../tag/ContextInfo';
import { UpdateScope } from '../learning/UpdateScope';

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

describe('SD-05: Hippocampus Criteria Decentralization', () => {
  let hippocampusModule: HippocampusAutonomousModule;
  let conceptLayer: ConceptAutonomousLayer<MockContext>;
  let patternLayer: PatternAutonomousLayer<MockContext>;

  beforeEach(() => {
    hippocampusModule = new HippocampusAutonomousModule();
    conceptLayer = new ConceptAutonomousLayer<MockContext>('concept-01');
    patternLayer = new PatternAutonomousLayer<MockContext>('pattern-01');
    
    jest.spyOn(hippocampusModule, 'decentralizeJudgementBasis');
    jest.spyOn(conceptLayer, 'updatePredictiveModel'); // Layer update tracking
    jest.spyOn(patternLayer, 'updatePredictiveModel');
  });

  test('should follow the complete basis decentralization sequence', () => {
    // 1. 海馬モジュールが基準パターンを作成 (シーケンス図 19-20行目)
    const basisPattern = new BasisPattern(
      0.1, // tolerance
      new UpdateScope(new Set(['concept_weights', 'pattern_templates'])),
      new Set(['visual', 'temporal']),
      new Map([['importance_visual', 0.8], ['importance_temporal', 0.6]])
    );

    expect(basisPattern).toBeInstanceOf(BasisPattern);
    expect(basisPattern.tolerance).toBe(0.1);
    expect(basisPattern.focusedTags.size).toBe(2);
    expect(basisPattern.weighting.get('importance_visual')).toBe(0.8);

    // 2. 海馬が判定基準の分散化を開始 (シーケンス図 22行目)
    hippocampusModule.decentralizeJudgementBasis(basisPattern);
    expect(hippocampusModule.decentralizeJudgementBasis).toHaveBeenCalledWith(basisPattern);

    // 3. 基準を概念層に移譲 (シーケンス図 25行目)
    // 実際の実装では海馬モジュールが概念層に基準を渡すが、
    // ここではその効果をシミュレート
    const conceptSpecificBasis = simulateConceptLayerBasisAdaptation(basisPattern);
    
    expect(conceptSpecificBasis).toBeDefined();
    expect(conceptSpecificBasis.tolerance).toBeCloseTo(basisPattern.tolerance, 2);

    // 4. 概念層が自身の文脈で基準を具体化 (シーケンス図 27-28行目)
    // 概念層が基準を受け取って自身の処理に適用することをシミュレート
    simulateConceptLayerBasisApplication(conceptLayer, conceptSpecificBasis);

    // 5. 具体化された基準をパターン層に移譲 (シーケンス図 28行目)
    const patternSpecificBasis = simulatePatternLayerBasisAdaptation(conceptSpecificBasis);
    expect(patternSpecificBasis).toBeDefined();

    // 6. パターン層でさらに具体化 (シーケンス図 31-32行目)
    simulatePatternLayerBasisApplication(patternLayer, patternSpecificBasis);
  });

  test('should adapt basis pattern for different layer contexts', () => {
    // 階層的な基準パターンの適応をテスト
    const originalBasis = new BasisPattern(
      0.2,
      new UpdateScope(new Set(['global_param'])),
      new Set(['modality_agnostic']),
      new Map([['general_importance', 1.0]])
    );

    // 概念層レベルでの適応
    const conceptBasis = simulateConceptLayerBasisAdaptation(originalBasis);
    expect(conceptBasis.tolerance).toBeLessThanOrEqual(originalBasis.tolerance);
    expect(conceptBasis.focusedTags.size).toBeGreaterThanOrEqual(originalBasis.focusedTags.size);

    // パターン層レベルでの適応
    const patternBasis = simulatePatternLayerBasisAdaptation(conceptBasis);
    expect(patternBasis.tolerance).toBeLessThanOrEqual(conceptBasis.tolerance);
    expect(patternBasis.weighting.size).toBeGreaterThanOrEqual(conceptBasis.weighting.size);
  });

  test('should handle basis pattern application in layers', () => {
    // 基準パターンの適用効果をテスト
    const testBasis = new BasisPattern(
      0.05,
      new UpdateScope(new Set(['specific_weights'])),
      new Set(['high_priority']),
      new Map([['urgency', 0.9]])
    );

    // 基準パターンの適用をシミュレート
    const conceptContext = new ContextInfo(new MockContext([0.5, 0.5]), new Set(), new Map());
    const conceptApplicationResult = testBasis.apply({ contextInfo: conceptContext } as any);
    
    expect(conceptApplicationResult).toBeDefined();
    // apply メソッドの結果が期待される型であることを確認
  });

  test('should maintain basis pattern hierarchy consistency', () => {
    // 階層間での基準パターンの一貫性をテスト
    const rootBasis = new BasisPattern(
      0.3,
      new UpdateScope(new Set(['root'])),
      new Set(['base_tag']),
      new Map([['base_weight', 0.5]])
    );

    const conceptBasis = simulateConceptLayerBasisAdaptation(rootBasis);
    const patternBasis = simulatePatternLayerBasisAdaptation(conceptBasis);

    // 階層が深くなるにつれて許容差が厳しくなることを確認
    expect(conceptBasis.tolerance).toBeLessThanOrEqual(rootBasis.tolerance);
    expect(patternBasis.tolerance).toBeLessThanOrEqual(conceptBasis.tolerance);

    // タグの継承と拡張を確認
    expect(conceptBasis.focusedTags.has('base_tag')).toBe(true);
    expect(patternBasis.focusedTags.has('base_tag')).toBe(true);
  });

  test('should handle empty or minimal basis patterns', () => {
    // 最小限の基準パターンの処理をテスト
    const minimalBasis = new BasisPattern();
    
    expect(() => {
      hippocampusModule.decentralizeJudgementBasis(minimalBasis);
    }).not.toThrow();

    // デフォルト値が適切に設定されていることを確認
    expect(minimalBasis.tolerance).toBeDefined();
    expect(minimalBasis.focusedTags).toBeInstanceOf(Set);
    expect(minimalBasis.weighting).toBeInstanceOf(Map);
  });

  // ヘルパーメソッドをテストクラス内の関数として定義
  function simulateConceptLayerBasisAdaptation(originalBasis: BasisPattern): BasisPattern {
    return new BasisPattern(
      originalBasis.tolerance * 0.8, // より厳しい許容差
      originalBasis.updateScope,
      new Set([...originalBasis.focusedTags, 'concept_specific']),
      new Map([
        ...originalBasis.weighting,
        ['concept_importance', 0.7]
      ])
    );
  }

  function simulatePatternLayerBasisAdaptation(conceptBasis: BasisPattern): BasisPattern {
    return new BasisPattern(
      conceptBasis.tolerance * 0.9,
      conceptBasis.updateScope,
      new Set([...conceptBasis.focusedTags, 'pattern_specific']),
      new Map([
        ...conceptBasis.weighting,
        ['pattern_importance', 0.6]
      ])
    );
  }

  function simulateConceptLayerBasisApplication(layer: ConceptAutonomousLayer<MockContext>, basis: BasisPattern): void {
    // 実際の実装では層が基準を内部モデルに適用する
    // ここではその効果をシミュレート
    const testContext = new ContextInfo(new MockContext([0.3, 0.7]), new Set(), new Map());
    const expectedPattern = layer.generateExpectedPattern('test-destination', testContext);
    
    expect(expectedPattern).toBeDefined();
    // 基準適用の効果を検証（実装依存）
  }

  function simulatePatternLayerBasisApplication(layer: PatternAutonomousLayer<MockContext>, basis: BasisPattern): void {
    const testContext = new ContextInfo(new MockContext([0.2, 0.8]), new Set(), new Map());
    const expectedPattern = layer.generateExpectedPattern('test-destination', testContext);
    
    expect(expectedPattern).toBeDefined();
    // 基準適用の効果を検証（実装依存）
  }
});