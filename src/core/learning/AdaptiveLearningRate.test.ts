import { AdaptiveLearningRate, LearningRateOrigin } from './AdaptiveLearningRate';

describe('AdaptiveLearningRate', () => {
  describe('constructor', () => {
    test('should create instance with valid parameters', () => {
      const rate = new AdaptiveLearningRate(0.01, LearningRateOrigin.INITIAL);

      expect(rate.value).toBe(0.01);
      expect(rate.origin).toBe(LearningRateOrigin.INITIAL);
      expect(rate.createdAt).toBeInstanceOf(Date);
      expect(rate.metadata.size).toBe(0);
      expect(rate.history).toHaveLength(0);
    });

    test('should create instance with metadata and history', () => {
      const metadata = new Map([['source', 'test']]);
      const history = [
        { value: 0.1, origin: LearningRateOrigin.INITIAL, timestamp: new Date() }
      ];
      const rate = new AdaptiveLearningRate(0.01, LearningRateOrigin.ADAPTIVE, metadata, history);

      expect(rate.metadata.get('source')).toBe('test');
      expect(rate.history).toHaveLength(1);
    });

    test('should throw error for non-positive value', () => {
      expect(() => {
        new AdaptiveLearningRate(0, LearningRateOrigin.INITIAL);
      }).toThrow('Learning rate value must be positive');

      expect(() => {
        new AdaptiveLearningRate(-0.1, LearningRateOrigin.INITIAL);
      }).toThrow('Learning rate value must be positive');
    });

    test('should throw error for non-finite value', () => {
      expect(() => {
        new AdaptiveLearningRate(Infinity, LearningRateOrigin.INITIAL);
      }).toThrow('Learning rate value must be finite');

      expect(() => {
        new AdaptiveLearningRate(NaN, LearningRateOrigin.INITIAL);
      }).toThrow('Learning rate value must be finite');
    });
  });

  describe('static factory methods', () => {
    test('should create initial learning rate', () => {
      const rate = AdaptiveLearningRate.createInitial(0.01);

      expect(rate.value).toBe(0.01);
      expect(rate.origin).toBe(LearningRateOrigin.INITIAL);
    });

    test('should create adaptive learning rate with reason', () => {
      const rate = AdaptiveLearningRate.createAdaptive(0.005, 'Loss plateaued');

      expect(rate.value).toBe(0.005);
      expect(rate.origin).toBe(LearningRateOrigin.ADAPTIVE);
      expect(rate.getMetadata('adjustmentReason')).toBe('Loss plateaued');
    });

    test('should create manual learning rate with setter', () => {
      const rate = AdaptiveLearningRate.createManual(0.02, 'admin');

      expect(rate.value).toBe(0.02);
      expect(rate.origin).toBe(LearningRateOrigin.MANUAL);
      expect(rate.getMetadata('setBy')).toBe('admin');
    });
  });

  describe('adjust', () => {
    test('should return new instance with updated values', () => {
      const originalRate = new AdaptiveLearningRate(0.01, LearningRateOrigin.INITIAL);
      const newMetadata = new Map([['reason', 'test adjustment']]);
      const adjustedRate = originalRate.adjust(0.005, LearningRateOrigin.ADAPTIVE, newMetadata);

      expect(adjustedRate).not.toBe(originalRate);
      expect(originalRate.value).toBe(0.01); // 元は変更されない
      expect(adjustedRate.value).toBe(0.005);
      expect(adjustedRate.origin).toBe(LearningRateOrigin.ADAPTIVE);
      expect(adjustedRate.getMetadata('reason')).toBe('test adjustment');
      expect(adjustedRate.history).toHaveLength(1);
      expect(adjustedRate.history[0].value).toBe(0.01);
    });
  });

  describe('exponentialDecay', () => {
    test('should apply exponential decay correctly', () => {
      const rate = new AdaptiveLearningRate(0.1, LearningRateOrigin.INITIAL);
      const decayedRate = rate.exponentialDecay(0.5, 'Half decay');

      expect(decayedRate.value).toBe(0.05);
      expect(decayedRate.origin).toBe(LearningRateOrigin.ADAPTIVE);
      expect(decayedRate.getMetadata('decayFactor')).toBe(0.5);
      expect(decayedRate.getMetadata('adjustmentReason')).toBe('Half decay');
    });

    test('should throw error for invalid decay factor', () => {
      const rate = new AdaptiveLearningRate(0.01, LearningRateOrigin.INITIAL);

      expect(() => {
        rate.exponentialDecay(0);
      }).toThrow('Decay factor must be between 0 and 1');

      expect(() => {
        rate.exponentialDecay(1.1);
      }).toThrow('Decay factor must be between 0 and 1');
    });
  });

  describe('stepDecay', () => {
    test('should apply step decay correctly', () => {
      const rate = new AdaptiveLearningRate(0.1, LearningRateOrigin.INITIAL);
      const decayedRate = rate.stepDecay(2, 0.1, 'Step decay');

      // 0.1 * (0.1^floor(2)) = 0.1 * 0.01 = 0.001
      expect(decayedRate.value).toBeCloseTo(0.001, 10);
      expect(decayedRate.origin).toBe(LearningRateOrigin.ADAPTIVE);
      expect(decayedRate.getMetadata('stepSize')).toBe(2);
      expect(decayedRate.getMetadata('gamma')).toBe(0.1);
    });
  });

  describe('isValid', () => {
    test('should return true for valid learning rate', () => {
      const rate = new AdaptiveLearningRate(0.01, LearningRateOrigin.INITIAL);

      expect(rate.isValid()).toBe(true);
      expect(rate.isValid(1e-10, 0.1)).toBe(true);
    });

    test('should return false for invalid learning rate', () => {
      const tooSmallRate = new AdaptiveLearningRate(1e-10, LearningRateOrigin.INITIAL);
      const tooBigRate = new AdaptiveLearningRate(2.0, LearningRateOrigin.INITIAL);

      expect(tooSmallRate.isValid()).toBe(false);
      expect(tooBigRate.isValid()).toBe(false);
    });
  });

  describe('isStable', () => {
    test('should return true for stable learning rate', () => {
      const rate = new AdaptiveLearningRate(0.01, LearningRateOrigin.INITIAL);

      expect(rate.isStable()).toBe(true); // 履歴が少ない場合は安定
    });

    test('should detect instability in learning rate', () => {
      let rate = new AdaptiveLearningRate(0.1, LearningRateOrigin.INITIAL);
      
      // 大きな変動を追加
      rate = rate.adjust(0.01, LearningRateOrigin.ADAPTIVE); // 90%減少
      rate = rate.adjust(0.05, LearningRateOrigin.ADAPTIVE); // 400%増加
      rate = rate.adjust(0.001, LearningRateOrigin.ADAPTIVE); // 98%減少

      expect(rate.isStable(0.5)).toBe(false); // 50%の閾値では不安定
    });
  });

  describe('metadata operations', () => {
    test('should get metadata value', () => {
      const metadata = new Map([['key1', 'value1']]);
      const rate = new AdaptiveLearningRate(0.01, LearningRateOrigin.INITIAL, metadata);

      expect(rate.getMetadata('key1')).toBe('value1');
      expect(rate.getMetadata('nonexistent')).toBeUndefined();
    });

    test('should check metadata existence', () => {
      const metadata = new Map([['existing', 'value']]);
      const rate = new AdaptiveLearningRate(0.01, LearningRateOrigin.INITIAL, metadata);

      expect(rate.hasMetadata('existing')).toBe(true);
      expect(rate.hasMetadata('nonexistent')).toBe(false);
    });
  });

  describe('toJSON', () => {
    test('should return correct JSON representation', () => {
      const metadata = new Map([['source', 'test']]);
      const rate = new AdaptiveLearningRate(0.01, LearningRateOrigin.ADAPTIVE, metadata);

      const json = rate.toJSON();

      expect(json).toMatchObject({
        value: 0.01,
        origin: LearningRateOrigin.ADAPTIVE,
        metadata: { source: 'test' },
        historyLength: 0
      });
      expect(json).toHaveProperty('createdAt');
    });
  });

  describe('toString', () => {
    test('should return correct string representation', () => {
      const rate = new AdaptiveLearningRate(0.01, LearningRateOrigin.ADAPTIVE);

      const str = rate.toString();

      expect(str).toBe('AdaptiveLearningRate[adaptive](value=0.01, history=0)');
    });
  });
});