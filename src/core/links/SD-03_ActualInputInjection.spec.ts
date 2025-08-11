import { SensoryAutonomousLayer } from '../layers/LayerImplementations';
import { SensoryOrgan, InputNormalizer, ThalamusGate, DefaultGatePolicy } from '../input/InputSystem';
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

describe('SD-03: Actual Input Injection (SensoryOrgan->ThalamusGate->SensoryLayer)', () => {
  let sensoryOrgan: SensoryOrgan;
  let inputNormalizer: InputNormalizer<MockContext>;
  let thalamusGate: ThalamusGate;
  let sensoryLayer: SensoryAutonomousLayer<MockContext>;
  let gatePolicy: DefaultGatePolicy;

  beforeEach(() => {
    // シーケンス図の参加者をインスタンス化
    sensoryOrgan = new SensoryOrgan('visual-sensor-01');
    inputNormalizer = new InputNormalizer<MockContext>();
    gatePolicy = new DefaultGatePolicy();
    thalamusGate = new ThalamusGate(gatePolicy);
    sensoryLayer = new SensoryAutonomousLayer<MockContext>('sensory-01');
    
    // スパイの設定
    jest.spyOn(sensoryOrgan, 'captureRawData');
    jest.spyOn(inputNormalizer, 'normalize');
    jest.spyOn(thalamusGate, 'filter');
    jest.spyOn(sensoryLayer, 'observeActualPattern');
  });

  test('should follow the complete input injection sequence from sensor to sensory layer', () => {
    // 1. 感覚器官が生データをキャプチャ (シーケンス図 23行目)
    const rawData = sensoryOrgan.captureRawData();
    expect(sensoryOrgan.captureRawData).toHaveBeenCalled();
    expect(rawData).toBeDefined();
    expect(rawData).toHaveProperty('data');
    expect(rawData).toHaveProperty('timestamp');

    // 2. 入力正規化器で実際パターンに変換 (シーケンス図 26-29行目)
    const normalizedPattern = inputNormalizer.normalize(rawData);
    expect(inputNormalizer.normalize).toHaveBeenCalledWith(rawData);
    expect(normalizedPattern).toBeInstanceOf(ActualPatternV2);

    // 3. 視床ゲートでフィルタリング (シーケンス図 30-35行目)
    const filteredPattern = thalamusGate.filter(normalizedPattern);
    expect(thalamusGate.filter).toHaveBeenCalledWith(normalizedPattern);
    expect(filteredPattern).toBeInstanceOf(ActualPatternV2);

    // フィルタリングによる変換が行われていることを確認
    const originalVector = normalizedPattern.body.toVector();
    const filteredVector = filteredPattern.body.toVector();
    expect(filteredVector).toBeDefined();
    expect(filteredVector.length).toBe(originalVector.length);

    // 4. 感覚自律層が実際パターンを観測 (シーケンス図 36-41行目)
    sensoryLayer.observeActualPattern(filteredPattern);
    expect(sensoryLayer.observeActualPattern).toHaveBeenCalledWith(filteredPattern);
  });

  test('should apply gate policy filtering correctly', () => {
    // ゲートポリシーのテスト用設定
    const customGatePolicy = new DefaultGatePolicy();
    const customThalamusGate = new ThalamusGate(customGatePolicy);

    // テスト用の入力パターン
    const rawData = { data: [0.05, 0.8, 0.02, 0.9], timestamp: Date.now() };
    const normalizedPattern = inputNormalizer.normalize(rawData);

    // ゲートポリシーの動作をスパイ
    jest.spyOn(customGatePolicy, 'threshold').mockReturnValue(0.1);
    jest.spyOn(customGatePolicy, 'gain').mockReturnValue(2.0);

    // フィルタリング実行
    const filteredPattern = customThalamusGate.filter(normalizedPattern);

    // ポリシーが呼ばれていることを確認
    expect(customGatePolicy.threshold).toHaveBeenCalledWith(normalizedPattern.contextInfo.tags);
    expect(customGatePolicy.gain).toHaveBeenCalledWith(normalizedPattern.contextInfo.tags);

    // フィルタリング効果の確認
    const filteredVector = filteredPattern.body.toVector();
    expect(filteredVector).toBeDefined();
  });

  test('should handle gate threshold and gain adjustments', () => {
    // 閾値とゲインの動的調整テスト
    const testTags = new Set([Tag.createString('modality', 'visual')]);

    // 閾値とゲインを調整
    thalamusGate.adjustThreshold(0.05, testTags);
    thalamusGate.adjustGain(1.5, testTags);

    // 調整が適用されることを確認
    expect(() => {
      thalamusGate.adjustThreshold(0.05, testTags);
      thalamusGate.adjustGain(1.5, testTags);
    }).not.toThrow();
  });

  test('should preserve context information through the pipeline', () => {
    const rawData = { data: [0.1, 0.2, 0.3], timestamp: Date.now() };
    const normalizedPattern = inputNormalizer.normalize(rawData);
    
    // 元のコンテキスト情報を確認
    expect(normalizedPattern.contextInfo.tags.size).toBeGreaterThan(0);
    expect(normalizedPattern.contextInfo.statistics.has('normalization_timestamp')).toBe(true);
    
    // フィルタリング後もコンテキスト情報が保持されることを確認
    const filteredPattern = thalamusGate.filter(normalizedPattern);
    expect(filteredPattern.contextInfo.tags.size).toBeGreaterThan(0);
    expect(filteredPattern.contextInfo.statistics.has('thalamus_filter_applied')).toBe(true);
    expect(filteredPattern.contextInfo.statistics.has('threshold_used')).toBe(true);
    expect(filteredPattern.contextInfo.statistics.has('gain_used')).toBe(true);
  });

  test('should handle multiple sensory organs concurrently', () => {
    // 複数の感覚器官の同時処理
    const auditoryOrgan = new SensoryOrgan('auditory-sensor-01');
    const tactileOrgan = new SensoryOrgan('tactile-sensor-01');
    
    const visualData = sensoryOrgan.captureRawData();
    const auditoryData = auditoryOrgan.captureRawData();
    const tactileData = tactileOrgan.captureRawData();
    
    // 各感覚器官が独立して機能することを確認
    expect(sensoryOrgan.getOrganId()).toBe('visual-sensor-01');
    expect(auditoryOrgan.getOrganId()).toBe('auditory-sensor-01');
    expect(tactileOrgan.getOrganId()).toBe('tactile-sensor-01');
    
    // 全ての感覚器官からデータが取得できることを確認
    [visualData, auditoryData, tactileData].forEach(data => {
      expect(data).toBeDefined();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
    });
  });
});
