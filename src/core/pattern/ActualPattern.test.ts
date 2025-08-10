import { ActualPattern } from './ActualPattern';
import { AttachedInfo } from '../tag/AttachedInfo';
import { Tag } from '../tag/Tag';
import { Experience } from '../tag/Experience';

// テスト用のExperience実装
interface TestExperience extends Experience {
  name: string;
  data: string;
}

describe('ActualPattern', () => {
  const createTestExperience = (name: string, data: string): TestExperience => ({
    name,
    data
  });

  const createTestAttachedInfo = (experience: TestExperience): AttachedInfo<TestExperience> => {
    const tag = Tag.createString('type', 'actual');
    return new AttachedInfo(experience, new Set([tag]));
  };

  describe('constructor', () => {
    test('should create instance with valid parameters', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const metadata = new Map([['source', 'unit-test']]);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context', 0.9, metadata);

      expect(pattern.patternId).toBe('actual-pattern');
      expect(pattern.patternData).toBe(attachedInfo);
      expect(pattern.executionContext).toBe('test-context');
      expect(pattern.accuracy).toBe(0.9);
      expect(pattern.body).toBe(experience);
      expect(pattern.observedAt).toBeInstanceOf(Date);
      expect(pattern.metadata.get('source')).toBe('unit-test');
    });

    test('should use default values when optional parameters omitted', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context');

      expect(pattern.accuracy).toBe(1.0);
      expect(pattern.metadata.size).toBe(0);
    });

    test('should throw error for invalid accuracy', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);

      expect(() => {
        new ActualPattern('actual-pattern', attachedInfo, 'test-context', -0.1);
      }).toThrow('Accuracy must be between 0 and 1');

      expect(() => {
        new ActualPattern('actual-pattern', attachedInfo, 'test-context', 1.1);
      }).toThrow('Accuracy must be between 0 and 1');
    });
  });

  describe('updateAccuracy', () => {
    test('should return new instance with updated accuracy', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context', 0.7);

      const updatedPattern = pattern.updateAccuracy(0.9);

      expect(updatedPattern).not.toBe(pattern);
      expect(pattern.accuracy).toBe(0.7); // 元は変更されない
      expect(updatedPattern.accuracy).toBe(0.9);
      expect(updatedPattern.patternId).toBe(pattern.patternId);
      expect(updatedPattern.executionContext).toBe(pattern.executionContext);
    });

    test('should throw error for invalid accuracy', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context');

      expect(() => {
        pattern.updateAccuracy(1.1);
      }).toThrow('Accuracy must be between 0 and 1');
    });
  });

  describe('metadata operations', () => {
    test('should add metadata', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context');

      const updatedPattern = pattern.addMetadata('key1', 'value1');

      expect(updatedPattern).not.toBe(pattern);
      expect(pattern.metadata.size).toBe(0); // 元は変更されない
      expect(updatedPattern.metadata.size).toBe(1);
      expect(updatedPattern.getMetadata('key1')).toBe('value1');
    });

    test('should remove metadata', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const metadata = new Map([['key1', 'value1'], ['key2', 'value2']]);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context', 1.0, metadata);

      const updatedPattern = pattern.removeMetadata('key1');

      expect(updatedPattern).not.toBe(pattern);
      expect(pattern.metadata.size).toBe(2); // 元は変更されない
      expect(updatedPattern.metadata.size).toBe(1);
      expect(updatedPattern.hasMetadata('key1')).toBe(false);
      expect(updatedPattern.hasMetadata('key2')).toBe(true);
    });

    test('should check metadata existence', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const metadata = new Map([['existing', 'value']]);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context', 1.0, metadata);

      expect(pattern.hasMetadata('existing')).toBe(true);
      expect(pattern.hasMetadata('nonexistent')).toBe(false);
    });

    test('should get metadata value', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const metadata = new Map([['key', 'value']]);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context', 1.0, metadata);

      expect(pattern.getMetadata('key')).toBe('value');
      expect(pattern.getMetadata('nonexistent')).toBeUndefined();
    });
  });

  describe('isReliable', () => {
    test('should return true when accuracy meets threshold', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context', 0.8);

      expect(pattern.isReliable(0.7)).toBe(true);
      expect(pattern.isReliable()).toBe(true); // デフォルト閾値0.7
    });

    test('should return false when accuracy below threshold', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context', 0.6);

      expect(pattern.isReliable(0.7)).toBe(false);
      expect(pattern.isReliable()).toBe(false);
    });
  });

  describe('isFresh', () => {
    test('should return true for recently observed pattern', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context');

      expect(pattern.isFresh()).toBe(true);
      expect(pattern.isFresh(1000)).toBe(true); // 1秒以内
    });

    test('should return false for old pattern', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context');

      // 十分な時間を待つ
      return new Promise(resolve => {
        setTimeout(() => {
          // 非常に小さな閾値でテスト（1ms）
          expect(pattern.isFresh(1)).toBe(false);
          resolve(undefined);
        }, 10);
      });
    });
  });

  describe('toJSON', () => {
    test('should return correct JSON representation', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const metadata = new Map([['source', 'test']]);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context', 0.9, metadata);

      const json = pattern.toJSON();

      expect(json).toMatchObject({
        patternId: 'actual-pattern',
        executionContext: 'test-context',
        accuracy: 0.9,
        metadata: { source: 'test' }
      });
      expect(json).toHaveProperty('observedAt');
      expect(json).toHaveProperty('patternData');
      expect((json as any).patternData).toHaveProperty('tagsCount', 1);
    });
  });

  describe('toString', () => {
    test('should return correct string representation', () => {
      const experience = createTestExperience('test', 'data');
      const attachedInfo = createTestAttachedInfo(experience);
      const pattern = new ActualPattern('actual-pattern', attachedInfo, 'test-context', 0.9);

      const str = pattern.toString();

      expect(str).toBe('ActualPattern[actual-pattern](accuracy=0.9, context=test-context)');
    });
  });
});