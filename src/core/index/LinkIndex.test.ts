import { LinkIndex } from './LinkIndex';
import { Tag, Experience } from '../tag';

// テスト用の Experience 実装
interface TestExperience extends Experience {
  id: string;
  description: string;
}

// テスト用の Link 実装
interface TestLink {
  id: string;
  data: string;
  experience: TestExperience;
}

describe('LinkIndex', () => {
  let linkIndex: LinkIndex<TestExperience, TestLink>;
  let testExperience: TestExperience;
  let testLink1: TestLink;
  let testLink2: TestLink;
  let testLink3: TestLink;

  beforeEach(() => {
    linkIndex = new LinkIndex<TestExperience, TestLink>();
    testExperience = { id: 'exp1', description: 'Test experience' };
    testLink1 = { id: 'link1', data: 'data1', experience: testExperience };
    testLink2 = { id: 'link2', data: 'data2', experience: testExperience };
    testLink3 = { id: 'link3', data: 'data3', experience: testExperience };
  });

  describe('register and get', () => {
    it('should register and retrieve links by timestamp tag', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      const tag = Tag.createTimestamp('event', date);

      linkIndex.register(tag, testLink1);
      linkIndex.register(tag, testLink2);

      const results = linkIndex.get(tag);
      expect(results).toHaveLength(2);
      expect(results).toContain(testLink1);
      expect(results).toContain(testLink2);
    });

    it('should register and retrieve links by string tag', () => {
      const tag = Tag.createString('category', 'test');

      linkIndex.register(tag, testLink1);
      linkIndex.register(tag, testLink3);

      const results = linkIndex.get(tag);
      expect(results).toHaveLength(2);
      expect(results).toContain(testLink1);
      expect(results).toContain(testLink3);
    });

    it('should register and retrieve links by number tag', () => {
      const tag = Tag.createNumber('score', 100);

      linkIndex.register(tag, testLink2);
      linkIndex.register(tag, testLink3);

      const results = linkIndex.get(tag);
      expect(results).toHaveLength(2);
      expect(results).toContain(testLink2);
      expect(results).toContain(testLink3);
    });

    it('should return empty array for non-existent tag', () => {
      const tag = Tag.createString('nonexistent', 'value');
      const results = linkIndex.get(tag);
      expect(results).toEqual([]);
    });

    it('should handle multiple different tags correctly', () => {
      const timeTag = Tag.createTimestamp('time', new Date('2023-01-01'));
      const stringTag = Tag.createString('name', 'test');
      const numberTag = Tag.createNumber('value', 42);

      linkIndex.register(timeTag, testLink1);
      linkIndex.register(stringTag, testLink2);
      linkIndex.register(numberTag, testLink3);

      expect(linkIndex.get(timeTag)).toEqual([testLink1]);
      expect(linkIndex.get(stringTag)).toEqual([testLink2]);
      expect(linkIndex.get(numberTag)).toEqual([testLink3]);
    });
  });

  describe('remove', () => {
    it('should remove specific link from timestamp tag', () => {
      const tag = Tag.createTimestamp('event', new Date('2023-01-01'));
      linkIndex.register(tag, testLink1);
      linkIndex.register(tag, testLink2);

      const removed = linkIndex.remove(tag, testLink1);
      expect(removed).toBe(true);

      const results = linkIndex.get(tag);
      expect(results).toHaveLength(1);
      expect(results).toContain(testLink2);
      expect(results).not.toContain(testLink1);
    });

    it('should remove all links when no specific link is provided', () => {
      const tag = Tag.createString('category', 'test');
      linkIndex.register(tag, testLink1);
      linkIndex.register(tag, testLink2);

      const removed = linkIndex.remove(tag);
      expect(removed).toBe(true);

      const results = linkIndex.get(tag);
      expect(results).toEqual([]);
    });

    it('should return false when trying to remove non-existent link', () => {
      const tag = Tag.createNumber('score', 100);
      linkIndex.register(tag, testLink1);

      const removed = linkIndex.remove(tag, testLink2);
      expect(removed).toBe(false);

      const results = linkIndex.get(tag);
      expect(results).toEqual([testLink1]);
    });

    it('should return false when trying to remove from non-existent tag', () => {
      const tag = Tag.createString('nonexistent', 'value');
      const removed = linkIndex.remove(tag, testLink1);
      expect(removed).toBe(false);
    });
  });

  describe('getByTimeRange', () => {
    it('should retrieve links within time range', () => {
      const date1 = new Date('2023-01-01T00:00:00Z');
      const date2 = new Date('2023-01-02T00:00:00Z');
      const date3 = new Date('2023-01-03T00:00:00Z');

      const tag1 = Tag.createTimestamp('event', date1);
      const tag2 = Tag.createTimestamp('event', date2);
      const tag3 = Tag.createTimestamp('event', date3);

      linkIndex.register(tag1, testLink1);
      linkIndex.register(tag2, testLink2);
      linkIndex.register(tag3, testLink3);

      const startTime = date1.getTime();
      const endTime = date2.getTime();
      const results = linkIndex.getByTimeRange(startTime, endTime);

      expect(results).toHaveLength(2);
      expect(results).toContain(testLink1);
      expect(results).toContain(testLink2);
      expect(results).not.toContain(testLink3);
    });

    it('should return empty array when no links in time range', () => {
      const results = linkIndex.getByTimeRange(0, 1000);
      expect(results).toEqual([]);
    });
  });

  describe('getByNumberRange', () => {
    it('should retrieve links within number range', () => {
      const tag1 = Tag.createNumber('score', 10);
      const tag2 = Tag.createNumber('score', 20);
      const tag3 = Tag.createNumber('score', 30);

      linkIndex.register(tag1, testLink1);
      linkIndex.register(tag2, testLink2);
      linkIndex.register(tag3, testLink3);

      const results = linkIndex.getByNumberRange(15, 25);
      expect(results).toHaveLength(1);
      expect(results).toContain(testLink2);
    });

    it('should include boundary values in range', () => {
      const tag1 = Tag.createNumber('value', 10);
      const tag2 = Tag.createNumber('value', 20);

      linkIndex.register(tag1, testLink1);
      linkIndex.register(tag2, testLink2);

      const results = linkIndex.getByNumberRange(10, 20);
      expect(results).toHaveLength(2);
      expect(results).toContain(testLink1);
      expect(results).toContain(testLink2);
    });
  });

  describe('getByStringPattern', () => {
    it('should retrieve links matching string pattern', () => {
      const tag1 = Tag.createString('name', 'testfile');
      const tag2 = Tag.createString('name', 'example');
      const tag3 = Tag.createString('name', 'test_data');

      linkIndex.register(tag1, testLink1);
      linkIndex.register(tag2, testLink2);
      linkIndex.register(tag3, testLink3);

      const results = linkIndex.getByStringPattern('test');
      expect(results).toHaveLength(2);
      expect(results).toContain(testLink1);
      expect(results).toContain(testLink3);
      expect(results).not.toContain(testLink2);
    });

    it('should support case-insensitive search', () => {
      const tag1 = Tag.createString('name', 'TestFile');
      const tag2 = Tag.createString('name', 'EXAMPLE');

      linkIndex.register(tag1, testLink1);
      linkIndex.register(tag2, testLink2);

      const results = linkIndex.getByStringPattern('test', true);
      expect(results).toHaveLength(1);
      expect(results).toContain(testLink1);
    });

    it('should be case-sensitive by default', () => {
      const tag = Tag.createString('name', 'TestFile');
      linkIndex.register(tag, testLink1);

      const results = linkIndex.getByStringPattern('test');
      expect(results).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all indexes', () => {
      const timeTag = Tag.createTimestamp('time', new Date());
      const stringTag = Tag.createString('name', 'test');
      const numberTag = Tag.createNumber('value', 42);

      linkIndex.register(timeTag, testLink1);
      linkIndex.register(stringTag, testLink2);
      linkIndex.register(numberTag, testLink3);

      linkIndex.clear();

      expect(linkIndex.get(timeTag)).toEqual([]);
      expect(linkIndex.get(stringTag)).toEqual([]);
      expect(linkIndex.get(numberTag)).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return correct size information', () => {
      const timeTag = Tag.createTimestamp('time', new Date());
      const stringTag = Tag.createString('name', 'test');
      const numberTag = Tag.createNumber('value', 42);

      linkIndex.register(timeTag, testLink1);
      linkIndex.register(timeTag, testLink2);
      linkIndex.register(stringTag, testLink3);
      linkIndex.register(numberTag, testLink1);

      const size = linkIndex.size();
      expect(size.time).toBe(2);
      expect(size.string).toBe(1);
      expect(size.number).toBe(1);
      expect(size.total).toBe(4);
    });

    it('should return zero size for empty index', () => {
      const size = linkIndex.size();
      expect(size.time).toBe(0);
      expect(size.string).toBe(0);
      expect(size.number).toBe(0);
      expect(size.total).toBe(0);
    });
  });

  describe('type utilities', () => {
    it('should return correct type information', () => {
      const typeInfo = linkIndex.getTypeInfo();
      expect(typeInfo).toBe('LinkIndex<T extends Experience, TLink>');
    });

    it('should validate experience objects', () => {
      const isValid = linkIndex.validateExperience(testExperience);
      expect(isValid).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error for unsupported tag type in register', () => {
      // タグの型を無効な値に変更するためのハック
      const invalidTag = Tag.createString('test', 'value');
      // @ts-ignore - TypeScriptの型チェックを無効にしてテストする
      (invalidTag as any)._type = 'invalid';

      expect(() => {
        linkIndex.register(invalidTag, testLink1);
      }).toThrow('Unsupported tag type: invalid');
    });

    it('should throw error for unsupported tag type in get', () => {
      const invalidTag = Tag.createString('test', 'value');
      // @ts-ignore
      (invalidTag as any)._type = 'invalid';

      expect(() => {
        linkIndex.get(invalidTag);
      }).toThrow('Unsupported tag type: invalid');
    });

    it('should throw error for unsupported tag type in remove', () => {
      const invalidTag = Tag.createString('test', 'value');
      // @ts-ignore
      (invalidTag as any)._type = 'invalid';

      expect(() => {
        linkIndex.remove(invalidTag);
      }).toThrow('Unsupported tag type: invalid');
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large number of links efficiently', () => {
      const tag = Tag.createString('bulk', 'test');
      const links: TestLink[] = [];

      // 大量のリンクを登録
      for (let i = 0; i < 1000; i++) {
        const link = { id: `link${i}`, data: `data${i}`, experience: testExperience };
        links.push(link);
        linkIndex.register(tag, link);
      }

      const results = linkIndex.get(tag);
      expect(results).toHaveLength(1000);
      expect(results).toEqual(expect.arrayContaining(links));
    });

    it('should handle duplicate link registration', () => {
      const tag = Tag.createString('duplicate', 'test');
      
      linkIndex.register(tag, testLink1);
      linkIndex.register(tag, testLink1); // 同じリンクを再登録

      const results = linkIndex.get(tag);
      expect(results).toHaveLength(2); // 重複登録を許可
      expect(results[0]).toBe(testLink1);
      expect(results[1]).toBe(testLink1);
    });

    it('should handle floating point numbers correctly', () => {
      const tag1 = Tag.createNumber('float', 3.14159);
      const tag2 = Tag.createNumber('float', 3.14159);

      linkIndex.register(tag1, testLink1);
      
      const results = linkIndex.get(tag2);
      expect(results).toHaveLength(1);
      expect(results).toContain(testLink1);
    });

    it('should handle special string characters', () => {
      const specialStrings = ['', ' ', '\n', '\t', '🎉', '特殊文字'];
      
      specialStrings.forEach((str, index) => {
        const tag = Tag.createString('special', str);
        const link = { id: `link${index}`, data: str, experience: testExperience };
        linkIndex.register(tag, link);
        
        const results = linkIndex.get(tag);
        expect(results).toHaveLength(1);
        expect(results[0]).toBe(link);
      });
    });

    it('should handle extreme date values', () => {
      const extremeDates = [
        new Date(0), // Unix epoch
        new Date(Date.now()), // Current time
        new Date('1900-01-01'), // Old date
        new Date('2099-12-31'), // Future date
      ];

      extremeDates.forEach((date, index) => {
        const tag = Tag.createTimestamp('extreme', date);
        const link = { id: `link${index}`, data: date.toString(), experience: testExperience };
        linkIndex.register(tag, link);
        
        const results = linkIndex.get(tag);
        expect(results).toHaveLength(1);
        expect(results[0]).toBe(link);
      });
    });
  });
});