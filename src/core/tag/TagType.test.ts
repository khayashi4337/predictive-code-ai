import { TagType } from './TagType';

describe('TagType', () => {
  test('should have correct enum values', () => {
    expect(TagType.TIMESTAMP).toBe('timestamp');
    expect(TagType.STRING).toBe('string');
    expect(TagType.NUMBER).toBe('number');
  });

  test('should have exactly three enum values', () => {
    const enumValues = Object.values(TagType);
    expect(enumValues).toHaveLength(3);
    expect(enumValues).toContain('timestamp');
    expect(enumValues).toContain('string');
    expect(enumValues).toContain('number');
  });

  test('should be usable as object keys', () => {
    const typeMap: Record<TagType, string> = {
      [TagType.TIMESTAMP]: 'Time based tag',
      [TagType.STRING]: 'Text based tag',
      [TagType.NUMBER]: 'Numeric tag'
    };

    expect(typeMap[TagType.TIMESTAMP]).toBe('Time based tag');
    expect(typeMap[TagType.STRING]).toBe('Text based tag');
    expect(typeMap[TagType.NUMBER]).toBe('Numeric tag');
  });
});