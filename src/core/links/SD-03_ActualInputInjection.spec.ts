import { SensoryAutonomousLayer } from '../layers/LayerImplementations';
import { ActualPatternV2 } from '../pattern/ActualPatternV2';
import { ContextInfo } from '../tag/ContextInfo';
import { VectorizableContext } from '../tag/VectorizableContext';
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

describe('SD-03: Actual Input Injection', () => {
  let sensoryLayer: SensoryAutonomousLayer<MockContext>;

  beforeEach(() => {
    sensoryLayer = new SensoryAutonomousLayer<MockContext>('sensory-01');
    // observeActualPatternは内部状態を変更するため、スパイは限定的に使用
  });

  test('should process an actual input pattern successfully', () => {
    // 1. 外部から実際パターンが入力される
    const actualContext = new ContextInfo(
      new MockContext([0.1, 0.9, 0.2, 0.8]), 
      new Set([Tag.createString('source', 'external_sensor')])
    );
    const actualPattern = new ActualPatternV2(actualContext);

    // 2. 感覚層が実際パターンを観測する
    // この呼び出しがエラーなく成功することを確認する
    expect(() => {
      sensoryLayer.observeActualPattern(actualPattern);
    }).not.toThrow();

    // 3. (オプション) 内部状態の確認
    // 本来は内部バッファのサイズなどを確認したいが、privateでアクセスできないため、
    // エラーなく実行されることをもって、基本的な整合性が取れていると判断する。
    // 今後の実装で内部状態を外部から確認できるメソッドが追加されれば、
    // より詳細なアサーションを追加する。
  });
});
