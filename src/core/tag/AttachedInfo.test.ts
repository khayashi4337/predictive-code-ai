import { AttachedInfo, StatisticalInfo } from './AttachedInfo';
import { Tag } from './Tag';
import { Experience } from './Experience';

// テスト用のExperience実装
interface TestExperience extends Experience {
  name: string;
  data: string;
}

describe('AttachedInfo', () => {
  const createTestExperience = (name: string, data: string): TestExperience => ({
    name,
    data
  });

  describe('constructor', () => {
    test('should create instance with minimal parameters', () => {
      const experience = createTestExperience('test', 'data');
      const info = new AttachedInfo(experience);

      expect(info.body).toBe(experience);
      expect(info.tags.size).toBe(0);
      expect(info.statistics.count).toBe(1);
      expect(info.statistics.confidenceScore).toBe(0.5);
      expect(info.statistics.usageFrequency).toBe(0);
    });

    test('should create instance with tags', () => {
      const experience = createTestExperience('test', 'data');
      const tag1 = Tag.createString('type', 'test');
      const tag2 = Tag.createNumber('version', 1);
      const tags = new Set([tag1, tag2]);
      
      const info = new AttachedInfo(experience, tags);

      expect(info.body).toBe(experience);
      expect(info.tags.size).toBe(2);
      expect(info.tags.has(tag1)).toBe(true);
      expect(info.tags.has(tag2)).toBe(true);
    });

    test('should create instance with custom statistics', () => {
      const experience = createTestExperience('test', 'data');
      const customStats: Partial<StatisticalInfo> = {
        count: 10,
        confidenceScore: 0.8,
        usageFrequency: 5
      };
      
      const info = new AttachedInfo(experience, new Set(), customStats);

      expect(info.statistics.count).toBe(10);
      expect(info.statistics.confidenceScore).toBe(0.8);
      expect(info.statistics.usageFrequency).toBe(5);
    });
  });

  describe('addTag', () => {
    test('should return new instance with added tag', () => {
      const experience = createTestExperience('test', 'data');
      const info = new AttachedInfo(experience);
      const tag = Tag.createString('category', 'unit-test');

      const newInfo = info.addTag(tag);

      expect(newInfo).not.toBe(info); // 新しいインスタンス
      expect(info.tags.size).toBe(0); // 元のインスタンスは変更されない
      expect(newInfo.tags.size).toBe(1);
      expect(newInfo.tags.has(tag)).toBe(true);
    });

    test('should update lastUpdated timestamp when adding tag', () => {
      const experience = createTestExperience('test', 'data');
      const info = new AttachedInfo(experience);
      const originalTime = info.statistics.lastUpdated;

      // 時間の経過を確保
      setTimeout(() => {
        const tag = Tag.createString('category', 'unit-test');
        const newInfo = info.addTag(tag);

        expect(newInfo.statistics.lastUpdated.getTime()).toBeGreaterThan(originalTime.getTime());
      }, 1);
    });
  });

  describe('removeTag', () => {
    test('should return new instance with tag removed', () => {
      const experience = createTestExperience('test', 'data');
      const tag = Tag.createString('category', 'unit-test');
      const info = new AttachedInfo(experience, new Set([tag]));

      const newInfo = info.removeTag(tag);

      expect(newInfo).not.toBe(info);
      expect(info.tags.size).toBe(1); // 元のインスタンスは変更されない
      expect(newInfo.tags.size).toBe(0);
    });

    test('should remove tag by equality check', () => {
      const experience = createTestExperience('test', 'data');
      const tag1 = Tag.createString('category', 'unit-test');
      const tag2 = Tag.createString('category', 'unit-test'); // 同じ値の別インスタンス
      const info = new AttachedInfo(experience, new Set([tag1]));

      const newInfo = info.removeTag(tag2);

      expect(newInfo.tags.size).toBe(0); // equals()による比較で削除される
    });

    test('should not modify if tag does not exist', () => {
      const experience = createTestExperience('test', 'data');
      const existingTag = Tag.createString('category', 'unit-test');
      const nonExistentTag = Tag.createString('type', 'integration-test');
      const info = new AttachedInfo(experience, new Set([existingTag]));

      const newInfo = info.removeTag(nonExistentTag);

      expect(newInfo.tags.size).toBe(1);
      expect(newInfo.tags.has(existingTag)).toBe(true);
    });
  });

  describe('hasTagWithKey', () => {
    test('should return true when tag with key exists', () => {
      const experience = createTestExperience('test', 'data');
      const tag = Tag.createString('category', 'unit-test');
      const info = new AttachedInfo(experience, new Set([tag]));

      expect(info.hasTagWithKey('category')).toBe(true);
    });

    test('should return false when tag with key does not exist', () => {
      const experience = createTestExperience('test', 'data');
      const tag = Tag.createString('category', 'unit-test');
      const info = new AttachedInfo(experience, new Set([tag]));

      expect(info.hasTagWithKey('type')).toBe(false);
    });
  });

  describe('getTagsByKey', () => {
    test('should return tags with matching key', () => {
      const experience = createTestExperience('test', 'data');
      const tag1 = Tag.createString('category', 'unit-test');
      const tag2 = Tag.createString('category', 'integration-test');
      const tag3 = Tag.createString('type', 'functional');
      const tags = new Set([tag1, tag2, tag3]);
      const info = new AttachedInfo(experience, tags);

      const categoryTags = info.getTagsByKey('category');

      expect(categoryTags).toHaveLength(2);
      expect(categoryTags).toContain(tag1);
      expect(categoryTags).toContain(tag2);
      expect(categoryTags).not.toContain(tag3);
    });

    test('should return empty array when no tags match key', () => {
      const experience = createTestExperience('test', 'data');
      const info = new AttachedInfo(experience);

      const tags = info.getTagsByKey('nonexistent');

      expect(tags).toEqual([]);
    });
  });

  describe('updateStatistics', () => {
    test('should return new instance with updated statistics', () => {
      const experience = createTestExperience('test', 'data');
      const info = new AttachedInfo(experience);

      const newInfo = info.updateStatistics({
        confidenceScore: 0.9,
        usageFrequency: 10
      });

      expect(newInfo).not.toBe(info);
      expect(info.statistics.confidenceScore).toBe(0.5); // 元は変更されない
      expect(newInfo.statistics.confidenceScore).toBe(0.9);
      expect(newInfo.statistics.usageFrequency).toBe(10);
    });

    test('should update lastUpdated when updating statistics', () => {
      const experience = createTestExperience('test', 'data');
      const info = new AttachedInfo(experience);
      const originalTime = info.statistics.lastUpdated;

      setTimeout(() => {
        const newInfo = info.updateStatistics({ confidenceScore: 0.9 });

        expect(newInfo.statistics.lastUpdated.getTime()).toBeGreaterThan(originalTime.getTime());
      }, 1);
    });
  });

  describe('incrementUsage', () => {
    test('should increment usage frequency and count by default', () => {
      const experience = createTestExperience('test', 'data');
      const info = new AttachedInfo(experience);

      const newInfo = info.incrementUsage();

      expect(newInfo.statistics.usageFrequency).toBe(1);
      expect(newInfo.statistics.count).toBe(2);
    });

    test('should increment by specified amount', () => {
      const experience = createTestExperience('test', 'data');
      const info = new AttachedInfo(experience);

      const newInfo = info.incrementUsage(5);

      expect(newInfo.statistics.usageFrequency).toBe(5);
      expect(newInfo.statistics.count).toBe(2);
    });
  });

  describe('toString', () => {
    test('should return correct string representation', () => {
      const experience = createTestExperience('test', 'data');
      const tag = Tag.createString('category', 'unit-test');
      const info = new AttachedInfo(experience, new Set([tag]));

      const str = info.toString();

      expect(str).toMatch(/AttachedInfo\[tags=1, confidence=0\.5\]/);
    });
  });
});