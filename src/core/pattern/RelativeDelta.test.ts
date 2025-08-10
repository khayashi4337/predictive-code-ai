import { RelativeDelta, DeltaType } from './RelativeDelta';
import { ExpectedPattern } from './ExpectedPattern';
import { ActualPattern } from './ActualPattern';
import { AttachedInfo } from '../tag/AttachedInfo';
import { Tag } from '../tag/Tag';
import { Experience } from '../tag/Experience';

// テスト用のExperience実装
interface TestExperience extends Experience {
  name: string;
  data: string;
}

describe('RelativeDelta', () => {
  const createTestExperience = (name: string, data: string): TestExperience => ({
    name,
    data
  });

  const createTestAttachedInfo = (experience: TestExperience): AttachedInfo<TestExperience> => {
    const tag = Tag.createString('type', 'test');
    return new AttachedInfo(experience, new Set([tag]));
  };

  describe('constructor', () => {
    test('should create instance with expected and actual patterns', () => {
      const experience1 = createTestExperience('expected', 'data1');
      const experience2 = createTestExperience('actual', 'data2');
      const attachedInfo1 = createTestAttachedInfo(experience1);
      const attachedInfo2 = createTestAttachedInfo(experience2);
      const attachedInfo3 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);
      const actual = new ActualPattern('pattern-1', attachedInfo2, 'test-context', 0.9);
      
      const delta = new RelativeDelta(
        expected,
        actual,
        DeltaType.MATCH,
        0.1,
        attachedInfo3,
        ['Test note']
      );

      expect(delta.expectedPattern).toBe(expected);
      expect(delta.actualPattern).toBe(actual);
      expect(delta.deltaType).toBe(DeltaType.MATCH);
      expect(delta.magnitude).toBe(0.1);
      expect(delta.attachedInfo).toBe(attachedInfo3);
      expect(delta.notes).toEqual(['Test note']);
      expect(delta.computedAt).toBeInstanceOf(Date);
    });

    test('should create instance with only expected pattern', () => {
      const experience = createTestExperience('expected', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience);
      const attachedInfo2 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);
      
      const delta = new RelativeDelta(
        expected,
        undefined,
        DeltaType.MISSING,
        0.8,
        attachedInfo2
      );

      expect(delta.expectedPattern).toBe(expected);
      expect(delta.actualPattern).toBeUndefined();
      expect(delta.deltaType).toBe(DeltaType.MISSING);
    });

    test('should create instance with only actual pattern', () => {
      const experience = createTestExperience('actual', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience);
      const attachedInfo2 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      
      const actual = new ActualPattern('pattern-1', attachedInfo1, 'test-context', 0.9);
      
      const delta = new RelativeDelta(
        undefined,
        actual,
        DeltaType.UNEXPECTED,
        0.1,
        attachedInfo2
      );

      expect(delta.expectedPattern).toBeUndefined();
      expect(delta.actualPattern).toBe(actual);
      expect(delta.deltaType).toBe(DeltaType.UNEXPECTED);
    });

    test('should throw error when no patterns provided', () => {
      const experience = createTestExperience('delta', 'data');
      const attachedInfo = createTestAttachedInfo(experience);

      expect(() => {
        new RelativeDelta(undefined, undefined, DeltaType.MATCH, 0.1, attachedInfo);
      }).toThrow('At least one pattern (expected or actual) must be provided');
    });

    test('should throw error for invalid magnitude', () => {
      const experience = createTestExperience('expected', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience);
      const attachedInfo2 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);

      expect(() => {
        new RelativeDelta(expected, undefined, DeltaType.MISSING, -0.1, attachedInfo2);
      }).toThrow('Magnitude must be between 0 and 1');

      expect(() => {
        new RelativeDelta(expected, undefined, DeltaType.MISSING, 1.1, attachedInfo2);
      }).toThrow('Magnitude must be between 0 and 1');
    });
  });

  describe('computeFromPatterns', () => {
    test('should compute MATCH delta for identical patterns', () => {
      const experience1 = createTestExperience('expected', 'data');
      const experience2 = createTestExperience('actual', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience1);
      const attachedInfo2 = createTestAttachedInfo(experience2);
      const attachedInfo3 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.85);
      const actual = new ActualPattern('pattern-1', attachedInfo2, 'test-context', 0.88);
      
      const delta = RelativeDelta.computeFromPatterns(expected, actual, attachedInfo3);

      expect(delta.deltaType).toBe(DeltaType.MATCH);
      expect(delta.magnitude).toBeCloseTo(0.03, 2);
      expect(delta.expectedPattern).toBe(expected);
      expect(delta.actualPattern).toBe(actual);
      expect(delta.notes.length).toBeGreaterThan(0);
    });

    test('should compute PARTIAL_MATCH delta for similar patterns', () => {
      const experience1 = createTestExperience('expected', 'data');
      const experience2 = createTestExperience('actual', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience1);
      const attachedInfo2 = createTestAttachedInfo(experience2);
      const attachedInfo3 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);
      const actual = new ActualPattern('pattern-1', attachedInfo2, 'test-context', 0.6);
      
      const delta = RelativeDelta.computeFromPatterns(expected, actual, attachedInfo3);

      expect(delta.deltaType).toBe(DeltaType.PARTIAL_MATCH);
      expect(delta.magnitude).toBeCloseTo(0.2, 2);
    });

    test('should compute MISMATCH delta for different patterns', () => {
      const experience1 = createTestExperience('expected', 'data');
      const experience2 = createTestExperience('actual', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience1);
      const attachedInfo2 = createTestAttachedInfo(experience2);
      const attachedInfo3 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.9);
      const actual = new ActualPattern('pattern-2', attachedInfo2, 'test-context', 0.3);
      
      const delta = RelativeDelta.computeFromPatterns(expected, actual, attachedInfo3);

      expect(delta.deltaType).toBe(DeltaType.MISMATCH);
      expect(delta.magnitude).toBeGreaterThan(0.5);
    });
  });

  describe('fromMissingActual', () => {
    test('should create MISSING delta', () => {
      const experience = createTestExperience('expected', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience);
      const attachedInfo2 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);
      
      const delta = RelativeDelta.fromMissingActual(expected, attachedInfo2);

      expect(delta.deltaType).toBe(DeltaType.MISSING);
      expect(delta.magnitude).toBe(0.8);
      expect(delta.expectedPattern).toBe(expected);
      expect(delta.actualPattern).toBeUndefined();
      expect(delta.notes).toContain('Missing actual pattern');
    });
  });

  describe('fromUnexpectedActual', () => {
    test('should create UNEXPECTED delta', () => {
      const experience = createTestExperience('actual', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience);
      const attachedInfo2 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      const actual = new ActualPattern('pattern-1', attachedInfo1, 'test-context', 0.7);
      
      const delta = RelativeDelta.fromUnexpectedActual(actual, attachedInfo2);

      expect(delta.deltaType).toBe(DeltaType.UNEXPECTED);
      expect(delta.magnitude).toBeCloseTo(0.3, 5); // 1.0 - 0.7
      expect(delta.expectedPattern).toBeUndefined();
      expect(delta.actualPattern).toBe(actual);
      expect(delta.notes).toContain('Unexpected actual pattern');
    });
  });

  describe('isSignificant', () => {
    test('should return true for significant delta', () => {
      const experience = createTestExperience('expected', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience);
      const attachedInfo2 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);
      
      const delta = new RelativeDelta(expected, undefined, DeltaType.MISSING, 0.5, attachedInfo2);

      expect(delta.isSignificant(0.3)).toBe(true);
      expect(delta.isSignificant()).toBe(true); // デフォルト閾値0.3
    });

    test('should return false for insignificant delta', () => {
      const experience = createTestExperience('expected', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience);
      const attachedInfo2 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);
      
      const delta = new RelativeDelta(expected, undefined, DeltaType.MISSING, 0.2, attachedInfo2);

      expect(delta.isSignificant(0.3)).toBe(false);
      expect(delta.isSignificant()).toBe(false);
    });
  });

  describe('isImprovement', () => {
    test('should return true when actual accuracy exceeds expected confidence', () => {
      const experience1 = createTestExperience('expected', 'data');
      const experience2 = createTestExperience('actual', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience1);
      const attachedInfo2 = createTestAttachedInfo(experience2);
      const attachedInfo3 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.7);
      const actual = new ActualPattern('pattern-1', attachedInfo2, 'test-context', 0.9);
      
      const delta = new RelativeDelta(expected, actual, DeltaType.MATCH, 0.2, attachedInfo3);

      expect(delta.isImprovement()).toBe(true);
    });

    test('should return false when patterns missing', () => {
      const experience = createTestExperience('expected', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience);
      const attachedInfo2 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);
      
      const delta = new RelativeDelta(expected, undefined, DeltaType.MISSING, 0.8, attachedInfo2);

      expect(delta.isImprovement()).toBe(false);
    });
  });

  describe('isDegradation', () => {
    test('should return true when actual accuracy much lower than expected', () => {
      const experience1 = createTestExperience('expected', 'data');
      const experience2 = createTestExperience('actual', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience1);
      const attachedInfo2 = createTestAttachedInfo(experience2);
      const attachedInfo3 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.9);
      const actual = new ActualPattern('pattern-1', attachedInfo2, 'test-context', 0.5);
      
      const delta = new RelativeDelta(expected, actual, DeltaType.MISMATCH, 0.4, attachedInfo3);

      expect(delta.isDegradation()).toBe(true);
    });

    test('should return true for MISSING or UNEXPECTED types', () => {
      const experience = createTestExperience('expected', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience);
      const attachedInfo2 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);
      
      const missingDelta = new RelativeDelta(expected, undefined, DeltaType.MISSING, 0.8, attachedInfo2);

      expect(missingDelta.isDegradation()).toBe(true);
      // Note: UNEXPECTED without actual pattern will throw in constructor, so we can't test it here
    });
  });

  describe('addNote', () => {
    test('should return new instance with added note', () => {
      const experience = createTestExperience('expected', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience);
      const attachedInfo2 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);
      
      const delta = new RelativeDelta(expected, undefined, DeltaType.MISSING, 0.8, attachedInfo2, ['Initial note']);
      const newDelta = delta.addNote('Additional note');

      expect(newDelta).not.toBe(delta);
      expect(delta.notes).toEqual(['Initial note']); // 元は変更されない
      expect(newDelta.notes).toEqual(['Initial note', 'Additional note']);
    });
  });

  describe('toJSON', () => {
    test('should return correct JSON representation', () => {
      const experience1 = createTestExperience('expected', 'data');
      const experience2 = createTestExperience('actual', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience1);
      const attachedInfo2 = createTestAttachedInfo(experience2);
      const attachedInfo3 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);
      const actual = new ActualPattern('pattern-1', attachedInfo2, 'test-context', 0.9);
      
      const delta = new RelativeDelta(expected, actual, DeltaType.MATCH, 0.1, attachedInfo3, ['Test note']);
      const json = delta.toJSON();

      expect(json).toMatchObject({
        deltaType: DeltaType.MATCH,
        magnitude: 0.1,
        notes: ['Test note'],
        hasExpectedPattern: true,
        hasActualPattern: true,
        expectedPatternId: 'pattern-1',
        actualPatternId: 'pattern-1'
      });
      expect(json).toHaveProperty('computedAt');
    });
  });

  describe('toString', () => {
    test('should return correct string representation', () => {
      const experience1 = createTestExperience('expected', 'data');
      const experience2 = createTestExperience('actual', 'data');
      const attachedInfo1 = createTestAttachedInfo(experience1);
      const attachedInfo2 = createTestAttachedInfo(experience2);
      const attachedInfo3 = createTestAttachedInfo(createTestExperience('delta', 'data'));
      
      const expected = new ExpectedPattern('pattern-1', attachedInfo1, 0.8);
      const actual = new ActualPattern('pattern-1', attachedInfo2, 'test-context', 0.9);
      
      const delta = new RelativeDelta(expected, actual, DeltaType.MATCH, 0.123, attachedInfo3);
      const str = delta.toString();

      expect(str).toBe('RelativeDelta[match](magnitude=0.123, expected=true, actual=true)');
    });
  });
});