import { LearningSignal, SignalType, SignalIntensity } from './LearningSignal';
import { AdaptiveLearningRate } from './AdaptiveLearningRate';
import { UpdateScope } from './UpdateScope';
import { RelativeDelta, DeltaType } from '../pattern/RelativeDelta';
import { ExpectedPattern } from '../pattern/ExpectedPattern';
import { ActualPattern } from '../pattern/ActualPattern';
import { AttachedInfo } from '../tag/AttachedInfo';
import { Tag } from '../tag/Tag';
import { Experience } from '../tag/Experience';

// テスト用のExperience実装
interface TestExperience extends Experience {
  name: string;
  data: string;
}

describe('LearningSignal', () => {
  const createTestExperience = (name: string, data: string): TestExperience => ({
    name,
    data
  });

  const createTestAttachedInfo = (experience: TestExperience): AttachedInfo<TestExperience> => {
    const tag = Tag.createString('type', 'test');
    return new AttachedInfo(experience, new Set([tag]));
  };

  const createTestDelta = (magnitude: number = 0.5): RelativeDelta<TestExperience> => {
    const experience1 = createTestExperience('expected', 'data1');
    const experience2 = createTestExperience('actual', 'data2');
    const attachedInfo1 = createTestAttachedInfo(experience1);
    const attachedInfo2 = createTestAttachedInfo(experience2);
    const attachedInfo3 = createTestAttachedInfo(createTestExperience('delta', 'data'));

    const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);
    const actual = new ActualPattern('pattern-1', attachedInfo2, 'test-context', 0.9);

    return new RelativeDelta(expected, actual, DeltaType.MATCH, magnitude, attachedInfo3);
  };

  const createTestLearningRate = (): AdaptiveLearningRate => {
    return AdaptiveLearningRate.createInitial(0.01);
  };

  const createTestUpdateScope = (): UpdateScope => {
    return UpdateScope.createFullScope(10, 'test-scope');
  };

  describe('constructor', () => {
    test('should create instance with automatic signal type and intensity determination', () => {
      const delta = createTestDelta();
      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const signal = new LearningSignal(delta, learningRate, updateScope);

      expect(signal.delta).toBe(delta);
      expect(signal.learningRate).toBe(learningRate);
      expect(signal.updateScope).toBe(updateScope);
      expect(signal.priority).toBe(1);
      expect(signal.createdAt).toBeInstanceOf(Date);
      expect(signal.signalId).toMatch(/^signal_/);
      expect(signal.signalType).toBeDefined();
      expect(signal.intensity).toBeDefined();
    });

    test('should create instance with explicit signal type and intensity', () => {
      const delta = createTestDelta();
      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const signal = new LearningSignal(
        delta,
        learningRate,
        updateScope,
        SignalType.REINFORCEMENT,
        SignalIntensity.HIGH,
        2,
        'test-signal'
      );

      expect(signal.signalType).toBe(SignalType.REINFORCEMENT);
      expect(signal.intensity).toBe(SignalIntensity.HIGH);
      expect(signal.priority).toBe(2);
      expect(signal.signalId).toBe('test-signal');
    });
  });

  describe('static factory methods', () => {
    test('should create signal from delta', () => {
      const delta = createTestDelta();
      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const signal = LearningSignal.fromDelta(delta, learningRate, updateScope, {
        signalType: SignalType.CORRECTION,
        priority: 3
      });

      expect(signal.signalType).toBe(SignalType.CORRECTION);
      expect(signal.priority).toBe(3);
    });

    test('should create reinforcement signal', () => {
      const delta = createTestDelta();
      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const signal = LearningSignal.createReinforcement(
        delta,
        learningRate,
        updateScope,
        SignalIntensity.VERY_HIGH
      );

      expect(signal.signalType).toBe(SignalType.REINFORCEMENT);
      expect(signal.intensity).toBe(SignalIntensity.VERY_HIGH);
      expect(signal.priority).toBe(2);
    });

    test('should create correction signal', () => {
      const delta = createTestDelta();
      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const signal = LearningSignal.createCorrection(
        delta,
        learningRate,
        updateScope,
        SignalIntensity.LOW
      );

      expect(signal.signalType).toBe(SignalType.CORRECTION);
      expect(signal.intensity).toBe(SignalIntensity.LOW);
      expect(signal.priority).toBe(1.5);
    });
  });

  describe('signal type determination', () => {
    test('should determine REINFORCEMENT for improvement', () => {
      const experience1 = createTestExperience('expected', 'data1');
      const experience2 = createTestExperience('actual', 'data2');
      const attachedInfo1 = createTestAttachedInfo(experience1);
      const attachedInfo2 = createTestAttachedInfo(experience2);
      const attachedInfo3 = createTestAttachedInfo(createTestExperience('delta', 'data'));

      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.6);
      const actual = new ActualPattern('pattern-1', attachedInfo2, 'test-context', 0.9);
      const delta = new RelativeDelta(expected, actual, DeltaType.MATCH, 0.3, attachedInfo3);

      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const signal = new LearningSignal(delta, learningRate, updateScope);

      expect(signal.signalType).toBe(SignalType.REINFORCEMENT);
    });

    test('should determine CORRECTION for degradation', () => {
      const experience1 = createTestExperience('expected', 'data1');
      const experience2 = createTestExperience('actual', 'data2');
      const attachedInfo1 = createTestAttachedInfo(experience1);
      const attachedInfo2 = createTestAttachedInfo(experience2);
      const attachedInfo3 = createTestAttachedInfo(createTestExperience('delta', 'data'));

      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.9);
      const actual = new ActualPattern('pattern-1', attachedInfo2, 'test-context', 0.3);
      const delta = new RelativeDelta(expected, actual, DeltaType.MISMATCH, 0.6, attachedInfo3);

      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const signal = new LearningSignal(delta, learningRate, updateScope);

      expect(signal.signalType).toBe(SignalType.CORRECTION);
    });

    test('should determine STABILIZATION for small magnitude', () => {
      // 改善でも劣化でもない、小さな差分を作成
      const experience1 = createTestExperience('expected', 'data1');
      const experience2 = createTestExperience('actual', 'data2');
      const attachedInfo1 = createTestAttachedInfo(experience1);
      const attachedInfo2 = createTestAttachedInfo(experience2);
      const attachedInfo3 = createTestAttachedInfo(createTestExperience('delta', 'data'));

      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);
      const actual = new ActualPattern('pattern-1', attachedInfo2, 'test-context', 0.79);
      const delta = new RelativeDelta(expected, actual, DeltaType.MATCH, 0.05, attachedInfo3);
      
      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const signal = new LearningSignal(delta, learningRate, updateScope);

      expect(signal.signalType).toBe(SignalType.STABILIZATION);
    });
  });

  describe('intensity determination', () => {
    test('should determine intensity based on magnitude', () => {
      const testCases = [
        { magnitude: 0.05, expectedIntensity: SignalIntensity.VERY_LOW },
        { magnitude: 0.2, expectedIntensity: SignalIntensity.LOW },
        { magnitude: 0.4, expectedIntensity: SignalIntensity.MEDIUM },
        { magnitude: 0.7, expectedIntensity: SignalIntensity.HIGH },
        { magnitude: 0.9, expectedIntensity: SignalIntensity.VERY_HIGH }
      ];

      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      testCases.forEach(({ magnitude, expectedIntensity }) => {
        const delta = createTestDelta(magnitude);
        const signal = new LearningSignal(delta, learningRate, updateScope);

        expect(signal.intensity).toBe(expectedIntensity);
      });
    });
  });

  describe('validation and checks', () => {
    test('should validate signal', () => {
      const delta = createTestDelta();
      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const validSignal = new LearningSignal(delta, learningRate, updateScope);
      expect(validSignal.isValid()).toBe(true);

      const invalidSignal = new LearningSignal(
        delta,
        learningRate,
        updateScope,
        SignalType.IGNORE
      );
      expect(invalidSignal.isValid()).toBe(false);
    });

    test('should detect urgent signals', () => {
      const delta = createTestDelta(0.8); // 大きな差分
      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const urgentSignal = new LearningSignal(
        delta,
        learningRate,
        updateScope,
        SignalType.CORRECTION,
        SignalIntensity.VERY_HIGH,
        2
      );

      expect(urgentSignal.isUrgent()).toBe(true);

      const nonUrgentSignal = new LearningSignal(
        delta,
        learningRate,
        updateScope,
        SignalType.STABILIZATION,
        SignalIntensity.LOW,
        1
      );

      expect(nonUrgentSignal.isUrgent()).toBe(false);
    });

    test('should detect high impact signals', () => {
      const highImpactDelta = createTestDelta(0.8);
      const highLearningRate = AdaptiveLearningRate.createInitial(0.1);
      const largeUpdateScope = UpdateScope.createFullScope(20);

      const highImpactSignal = new LearningSignal(
        highImpactDelta,
        highLearningRate,
        largeUpdateScope
      );

      expect(highImpactSignal.hasHighImpact()).toBe(true);

      const lowImpactDelta = createTestDelta(0.1);
      const lowLearningRate = AdaptiveLearningRate.createInitial(0.001);
      const smallUpdateScope = UpdateScope.createFullScope(5);

      const lowImpactSignal = new LearningSignal(
        lowImpactDelta,
        lowLearningRate,
        smallUpdateScope
      );

      expect(lowImpactSignal.hasHighImpact()).toBe(false);
    });
  });

  describe('priority comparison', () => {
    test('should compare priorities correctly', () => {
      const delta = createTestDelta();
      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const highPrioritySignal = new LearningSignal(
        delta,
        learningRate,
        updateScope,
        SignalType.REINFORCEMENT,
        SignalIntensity.HIGH,
        3
      );

      const lowPrioritySignal = new LearningSignal(
        delta,
        learningRate,
        updateScope,
        SignalType.STABILIZATION,
        SignalIntensity.LOW,
        1
      );

      expect(highPrioritySignal.hasHigherPriorityThan(lowPrioritySignal)).toBe(true);
      expect(lowPrioritySignal.hasHigherPriorityThan(highPrioritySignal)).toBe(false);
    });

    test('should compare by intensity when priority is equal', () => {
      const delta = createTestDelta();
      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const highIntensitySignal = new LearningSignal(
        delta,
        learningRate,
        updateScope,
        SignalType.REINFORCEMENT,
        SignalIntensity.HIGH,
        2
      );

      const lowIntensitySignal = new LearningSignal(
        delta,
        learningRate,
        updateScope,
        SignalType.CORRECTION,
        SignalIntensity.LOW,
        2
      );

      expect(highIntensitySignal.hasHigherPriorityThan(lowIntensitySignal)).toBe(true);
    });
  });

  describe('immutable updates', () => {
    test('should create new instance with different learning rate', () => {
      const delta = createTestDelta();
      const originalLearningRate = createTestLearningRate();
      const newLearningRate = AdaptiveLearningRate.createInitial(0.005);
      const updateScope = createTestUpdateScope();

      const originalSignal = new LearningSignal(delta, originalLearningRate, updateScope);
      const newSignal = originalSignal.withLearningRate(newLearningRate);

      expect(newSignal).not.toBe(originalSignal);
      expect(originalSignal.learningRate.value).toBe(0.01);
      expect(newSignal.learningRate.value).toBe(0.005);
    });

    test('should create new instance with different update scope', () => {
      const delta = createTestDelta();
      const learningRate = createTestLearningRate();
      const originalUpdateScope = createTestUpdateScope();
      const newUpdateScope = UpdateScope.createFullScope(5);

      const originalSignal = new LearningSignal(delta, learningRate, originalUpdateScope);
      const newSignal = originalSignal.withUpdateScope(newUpdateScope);

      expect(newSignal).not.toBe(originalSignal);
      expect(originalSignal.updateScope.mask).toHaveLength(10);
      expect(newSignal.updateScope.mask).toHaveLength(5);
    });

    test('should create new instance with different priority', () => {
      const delta = createTestDelta();
      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const originalSignal = new LearningSignal(delta, learningRate, updateScope, undefined, undefined, 1);
      const newSignal = originalSignal.withPriority(5);

      expect(newSignal).not.toBe(originalSignal);
      expect(originalSignal.priority).toBe(1);
      expect(newSignal.priority).toBe(5);
    });
  });

  describe('toJSON', () => {
    test('should return correct JSON representation', () => {
      const delta = createTestDelta();
      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const signal = new LearningSignal(
        delta,
        learningRate,
        updateScope,
        SignalType.REINFORCEMENT,
        SignalIntensity.HIGH,
        2,
        'test-signal'
      );

      const json = signal.toJSON();

      expect(json).toMatchObject({
        signalId: 'test-signal',
        signalType: SignalType.REINFORCEMENT,
        intensity: SignalIntensity.HIGH,
        priority: 2,
        deltaType: delta.deltaType,
        deltaMagnitude: delta.magnitude,
        learningRateValue: 0.01,
        updateScopeId: updateScope.scopeId
      });
      expect(json).toHaveProperty('createdAt');
    });
  });

  describe('toString', () => {
    test('should return correct string representation', () => {
      const delta = createTestDelta();
      const learningRate = createTestLearningRate();
      const updateScope = createTestUpdateScope();

      const signal = new LearningSignal(
        delta,
        learningRate,
        updateScope,
        SignalType.REINFORCEMENT,
        SignalIntensity.HIGH,
        2,
        'test-signal'
      );

      const str = signal.toString();

      expect(str).toBe('LearningSignal[test-signal](reinforcement/high, priority=2)');
    });
  });
});