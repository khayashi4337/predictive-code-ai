import { Tag } from './Tag';
import { TagType } from './TagType';

describe('Tag', () => {
  describe('createTimestamp', () => {
    test('should create timestamp tag correctly', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const tag = Tag.createTimestamp('createdAt', date);

      expect(tag.type).toBe(TagType.TIMESTAMP);
      expect(tag.key).toBe('createdAt');
      expect(tag.timestampValue).toEqual(date);
      expect(tag.stringValue).toBeUndefined();
      expect(tag.numberValue).toBeUndefined();
    });

    test('should return timestamp value via getValue', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const tag = Tag.createTimestamp('createdAt', date);
      
      expect(tag.getValue()).toEqual(date);
    });
  });

  describe('createString', () => {
    test('should create string tag correctly', () => {
      const tag = Tag.createString('filename', 'test.ts');

      expect(tag.type).toBe(TagType.STRING);
      expect(tag.key).toBe('filename');
      expect(tag.stringValue).toBe('test.ts');
      expect(tag.timestampValue).toBeUndefined();
      expect(tag.numberValue).toBeUndefined();
    });

    test('should return string value via getValue', () => {
      const tag = Tag.createString('filename', 'test.ts');
      
      expect(tag.getValue()).toBe('test.ts');
    });
  });

  describe('createNumber', () => {
    test('should create number tag correctly', () => {
      const tag = Tag.createNumber('lineCount', 42);

      expect(tag.type).toBe(TagType.NUMBER);
      expect(tag.key).toBe('lineCount');
      expect(tag.numberValue).toBe(42);
      expect(tag.timestampValue).toBeUndefined();
      expect(tag.stringValue).toBeUndefined();
    });

    test('should return number value via getValue', () => {
      const tag = Tag.createNumber('lineCount', 42);
      
      expect(tag.getValue()).toBe(42);
    });
  });

  describe('equals', () => {
    test('should return true for identical timestamp tags', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const tag1 = Tag.createTimestamp('createdAt', date);
      const tag2 = Tag.createTimestamp('createdAt', date);

      expect(tag1.equals(tag2)).toBe(true);
    });

    test('should return false for timestamp tags with different values', () => {
      const date1 = new Date('2024-01-01T00:00:00Z');
      const date2 = new Date('2024-01-02T00:00:00Z');
      const tag1 = Tag.createTimestamp('createdAt', date1);
      const tag2 = Tag.createTimestamp('createdAt', date2);

      expect(tag1.equals(tag2)).toBe(false);
    });

    test('should return true for identical string tags', () => {
      const tag1 = Tag.createString('filename', 'test.ts');
      const tag2 = Tag.createString('filename', 'test.ts');

      expect(tag1.equals(tag2)).toBe(true);
    });

    test('should return false for string tags with different keys', () => {
      const tag1 = Tag.createString('filename', 'test.ts');
      const tag2 = Tag.createString('extension', 'test.ts');

      expect(tag1.equals(tag2)).toBe(false);
    });

    test('should return true for identical number tags', () => {
      const tag1 = Tag.createNumber('lineCount', 42);
      const tag2 = Tag.createNumber('lineCount', 42);

      expect(tag1.equals(tag2)).toBe(true);
    });

    test('should return false for tags of different types', () => {
      const stringTag = Tag.createString('value', '42');
      const numberTag = Tag.createNumber('value', 42);

      expect(stringTag.equals(numberTag)).toBe(false);
    });
  });

  describe('toString', () => {
    test('should return correct string representation for timestamp tag', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const tag = Tag.createTimestamp('createdAt', date);

      expect(tag.toString()).toBe(`Tag[timestamp:createdAt=${date}]`);
    });

    test('should return correct string representation for string tag', () => {
      const tag = Tag.createString('filename', 'test.ts');

      expect(tag.toString()).toBe('Tag[string:filename=test.ts]');
    });

    test('should return correct string representation for number tag', () => {
      const tag = Tag.createNumber('lineCount', 42);

      expect(tag.toString()).toBe('Tag[number:lineCount=42]');
    });
  });
});