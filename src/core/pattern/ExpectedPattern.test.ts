import { ExpectedPattern } from './ExpectedPattern';
import { AttachedInfo } from '../tag/AttachedInfo';
import { Tag } from '../tag/Tag';
import { Experience } from '../tag/Experience';

// テスト用のExperience実装
interface TestExperience extends Experience {
  name: string;
  data: string;
}

describe('ExpectedPattern', () => {
  const createTestExperience = (name: string, data: string): TestExperience => ({
    name,
    data
  });

  const createTestAttachedInfo = (experience: TestExperience): AttachedInfo<TestExperience> => {
    const tag = Tag.createString('type', 'test');
    return new AttachedInfo(experience, new Set([tag]));
  };

  describe('constructor', () => {
    test('should create instance with valid parameters', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ExpectedPattern('test-pattern', attachedInfo, 0.8, 5);

      expect(pattern.patternId).toBe('test-pattern');
      expect(pattern.patternData).toBe(attachedInfo);
      expect(pattern.confidence).toBe(0.8);
      expect(pattern.priority).toBe(5);
      expect(pattern.body).toBe(experience);
      expect(pattern.createdAt).toBeInstanceOf(Date);
    });

    test('should use default values when optional parameters omitted', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ExpectedPattern('test-pattern', attachedInfo);

      expect(pattern.confidence).toBe(0.5);
      expect(pattern.priority).toBe(1);
    });

    test('should throw error for invalid confidence', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);

      expect(() => {
        new ExpectedPattern('test-pattern', attachedInfo, -0.1);
      }).toThrow('Confidence must be between 0 and 1');

      expect(() => {
        new ExpectedPattern('test-pattern', attachedInfo, 1.1);
      }).toThrow('Confidence must be between 0 and 1');
    });

    test('should throw error for negative priority', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);

      expect(() => {
        new ExpectedPattern('test-pattern', attachedInfo, 0.5, -1);
      }).toThrow('Priority must be non-negative');
    });
  });

  describe('updateConfidence', () => {
    test('should return new instance with updated confidence', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ExpectedPattern('test-pattern', attachedInfo, 0.5);

      const updatedPattern = pattern.updateConfidence(0.8);

      expect(updatedPattern).not.toBe(pattern);
      expect(pattern.confidence).toBe(0.5); // 元は変更されない
      expect(updatedPattern.confidence).toBe(0.8);
      expect(updatedPattern.patternId).toBe(pattern.patternId);
      expect(updatedPattern.priority).toBe(pattern.priority);
    });
  });

  describe('updatePriority', () => {
    test('should return new instance with updated priority', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ExpectedPattern('test-pattern', attachedInfo, 0.5, 1);

      const updatedPattern = pattern.updatePriority(10);

      expect(updatedPattern).not.toBe(pattern);
      expect(pattern.priority).toBe(1); // 元は変更されない
      expect(updatedPattern.priority).toBe(10);
      expect(updatedPattern.patternId).toBe(pattern.patternId);
      expect(updatedPattern.confidence).toBe(pattern.confidence);
    });
  });

  describe('updatePatternData', () => {
    test('should return new instance with updated pattern data', () => {
      const experience1 = createTestExperience('test1', 'data1');
      const experience2 = createTestExperience('test2', 'data2');
      const attachedInfo1 = createTestAttachedInfo(experience1);
      const attachedInfo2 = createTestAttachedInfo(experience2);
      const pattern = new ExpectedPattern('test-pattern', attachedInfo1);

      const updatedPattern = pattern.updatePatternData(attachedInfo2);

      expect(updatedPattern).not.toBe(pattern);
      expect(pattern.patternData).toBe(attachedInfo1); // 元は変更されない
      expect(updatedPattern.patternData).toBe(attachedInfo2);
      expect(updatedPattern.body).toBe(experience2);
    });
  });

  describe('isValid', () => {
    test('should return true when confidence meets threshold', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ExpectedPattern('test-pattern', attachedInfo, 0.5);

      expect(pattern.isValid(0.3)).toBe(true);
      expect(pattern.isValid(0.5)).toBe(true);
    });

    test('should return false when confidence below threshold', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ExpectedPattern('test-pattern', attachedInfo, 0.2);

      expect(pattern.isValid(0.3)).toBe(false);
      expect(pattern.isValid()).toBe(false); // デフォルト閾値0.3
    });
  });

  describe('hasHigherPriorityThan', () => {
    test('should compare priority first', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern1 = new ExpectedPattern('pattern1', attachedInfo, 0.5, 10);
      const pattern2 = new ExpectedPattern('pattern2', attachedInfo, 0.9, 5);

      expect(pattern1.hasHigherPriorityThan(pattern2)).toBe(true);
      expect(pattern2.hasHigherPriorityThan(pattern1)).toBe(false);
    });

    test('should compare confidence when priority is equal', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern1 = new ExpectedPattern('pattern1', attachedInfo, 0.8, 5);
      const pattern2 = new ExpectedPattern('pattern2', attachedInfo, 0.6, 5);

      expect(pattern1.hasHigherPriorityThan(pattern2)).toBe(true);
      expect(pattern2.hasHigherPriorityThan(pattern1)).toBe(false);
    });

    test('should return false when both priority and confidence are equal', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern1 = new ExpectedPattern('pattern1', attachedInfo, 0.8, 5);
      const pattern2 = new ExpectedPattern('pattern2', attachedInfo, 0.8, 5);

      expect(pattern1.hasHigherPriorityThan(pattern2)).toBe(false);
      expect(pattern2.hasHigherPriorityThan(pattern1)).toBe(false);
    });
  });

  describe('toJSON', () => {
    test('should return correct JSON representation', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ExpectedPattern('test-pattern', attachedInfo, 0.8, 5);

      const json = pattern.toJSON();

      expect(json).toMatchObject({
        patternId: 'test-pattern',
        confidence: 0.8,
        priority: 5
      });
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('patternData');
      expect((json as any).patternData).toHaveProperty('tagsCount', 1);
    });
  });

  describe('toString', () => {
    test('should return correct string representation', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ExpectedPattern('test-pattern', attachedInfo, 0.8, 5);

      const str = pattern.toString();

      expect(str).toBe('ExpectedPattern[test-pattern](confidence=0.8, priority=5)');
    });
  });
});