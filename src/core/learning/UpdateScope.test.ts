import { UpdateScope, ParameterRange } from './UpdateScope';

describe('UpdateScope', () => {
  describe('constructor', () => {
    test('should create instance with default values', () => {
      const scope = new UpdateScope();

      expect(scope.parameterIds.size).toBe(0);
      expect(scope.mask).toHaveLength(0);
      expect(scope.ranges).toHaveLength(0);
      expect(scope.scopeId).toMatch(/^scope_/);
      expect(scope.createdAt).toBeInstanceOf(Date);
    });

    test('should create instance with provided parameters', () => {
      const parameterIds = new Set(['param1', 'param2']);
      const mask = [true, false, true];
      const ranges: ParameterRange[] = [
        { startIndex: 0, endIndex: 5, description: 'First range' }
      ];
      const scopeId = 'test-scope';

      const scope = new UpdateScope(parameterIds, mask, ranges, scopeId);

      expect(scope.parameterIds.size).toBe(2);
      expect(scope.parameterIds.has('param1')).toBe(true);
      expect(scope.mask).toEqual([true, false, true]);
      expect(scope.ranges).toHaveLength(1);
      expect(scope.ranges[0].description).toBe('First range');
      expect(scope.scopeId).toBe('test-scope');
    });

    test('should throw error for invalid range', () => {
      const invalidRanges: ParameterRange[] = [
        { startIndex: -1, endIndex: 5 }
      ];

      expect(() => {
        new UpdateScope(new Set(), [], invalidRanges);
      }).toThrow('Range start index must be non-negative');

      const invalidRanges2: ParameterRange[] = [
        { startIndex: 5, endIndex: 3 }
      ];

      expect(() => {
        new UpdateScope(new Set(), [], invalidRanges2);
      }).toThrow('Range end index must be greater than start index');
    });
  });

  describe('static factory methods', () => {
    test('should create full scope', () => {
      const scope = UpdateScope.createFullScope(10, 'full-scope');

      expect(scope.scopeId).toBe('full-scope');
      expect(scope.mask).toHaveLength(10);
      expect(scope.mask.every(Boolean)).toBe(true);
      expect(scope.ranges).toHaveLength(1);
      expect(scope.ranges[0].startIndex).toBe(0);
      expect(scope.ranges[0].endIndex).toBe(10);
    });

    test('should create parameter scope', () => {
      const parameterIds = ['param1', 'param2', 'param3'];
      const scope = UpdateScope.createParameterScope(parameterIds, 'param-scope');

      expect(scope.scopeId).toBe('param-scope');
      expect(scope.parameterIds.size).toBe(3);
      expect(scope.parameterIds.has('param2')).toBe(true);
      expect(scope.mask).toHaveLength(0);
      expect(scope.ranges).toHaveLength(0);
    });

    test('should create range scope', () => {
      const ranges: ParameterRange[] = [
        { startIndex: 0, endIndex: 5 },
        { startIndex: 10, endIndex: 15 }
      ];
      const scope = UpdateScope.createRangeScope(ranges, 20, 'range-scope');

      expect(scope.scopeId).toBe('range-scope');
      expect(scope.mask).toHaveLength(20);
      expect(scope.mask.slice(0, 5).every(Boolean)).toBe(true);
      expect(scope.mask.slice(5, 10).every(val => !val)).toBe(true);
      expect(scope.mask.slice(10, 15).every(Boolean)).toBe(true);
      expect(scope.ranges).toHaveLength(2);
    });
  });

  describe('parameter operations', () => {
    test('should add parameter ID', () => {
      const scope = new UpdateScope(new Set(['param1']));
      const newScope = scope.addParameterId('param2');

      expect(newScope).not.toBe(scope);
      expect(scope.parameterIds.size).toBe(1); // 元は変更されない
      expect(newScope.parameterIds.size).toBe(2);
      expect(newScope.parameterIds.has('param2')).toBe(true);
    });

    test('should remove parameter ID', () => {
      const scope = new UpdateScope(new Set(['param1', 'param2']));
      const newScope = scope.removeParameterId('param1');

      expect(newScope).not.toBe(scope);
      expect(scope.parameterIds.size).toBe(2); // 元は変更されない
      expect(newScope.parameterIds.size).toBe(1);
      expect(newScope.parameterIds.has('param1')).toBe(false);
      expect(newScope.parameterIds.has('param2')).toBe(true);
    });

    test('should add range', () => {
      const scope = new UpdateScope(new Set(), [false, false, false, false, false]);
      const newRange: ParameterRange = { startIndex: 1, endIndex: 4 };
      const newScope = scope.addRange(newRange);

      expect(newScope).not.toBe(scope);
      expect(newScope.ranges).toHaveLength(1);
      expect(newScope.mask).toEqual([false, true, true, true, false]);
    });
  });

  describe('inclusion checks', () => {
    test('should check parameter inclusion', () => {
      const scope = new UpdateScope(new Set(['param1', 'param2']));

      expect(scope.includesParameter('param1')).toBe(true);
      expect(scope.includesParameter('param3')).toBe(false);
    });

    test('should check index inclusion with mask', () => {
      const mask = [true, false, true, false, true];
      const scope = new UpdateScope(new Set(), mask);

      expect(scope.includesIndex(0)).toBe(true);
      expect(scope.includesIndex(1)).toBe(false);
      expect(scope.includesIndex(2)).toBe(true);
      expect(scope.includesIndex(5)).toBe(false); // out of bounds
    });

    test('should check index inclusion with ranges', () => {
      const ranges: ParameterRange[] = [
        { startIndex: 0, endIndex: 3 },
        { startIndex: 10, endIndex: 15 }
      ];
      const scope = new UpdateScope(new Set(), [], ranges);

      expect(scope.includesIndex(0)).toBe(true);
      expect(scope.includesIndex(2)).toBe(true);
      expect(scope.includesIndex(3)).toBe(false);
      expect(scope.includesIndex(12)).toBe(true);
      expect(scope.includesIndex(20)).toBe(false);
    });
  });

  describe('set operations', () => {
    test('should perform union operation', () => {
      const scope1 = new UpdateScope(new Set(['param1']), [true, false]);
      const scope2 = new UpdateScope(new Set(['param2']), [false, true]);

      const unionScope = scope1.union(scope2, 'union-scope');

      expect(unionScope.scopeId).toBe('union-scope');
      expect(unionScope.parameterIds.size).toBe(2);
      expect(unionScope.parameterIds.has('param1')).toBe(true);
      expect(unionScope.parameterIds.has('param2')).toBe(true);
      expect(unionScope.mask).toEqual([true, true]);
    });

    test('should perform intersection operation', () => {
      const scope1 = new UpdateScope(new Set(['param1', 'param2']), [true, true, false]);
      const scope2 = new UpdateScope(new Set(['param1', 'param3']), [true, false, false]);

      const intersectionScope = scope1.intersection(scope2, 'intersection-scope');

      expect(intersectionScope.scopeId).toBe('intersection-scope');
      expect(intersectionScope.parameterIds.size).toBe(1);
      expect(intersectionScope.parameterIds.has('param1')).toBe(true);
      expect(intersectionScope.mask).toEqual([true, false, false]);
    });
  });

  describe('utility methods', () => {
    test('should detect empty scope', () => {
      const emptyScope = new UpdateScope();
      const nonEmptyScope = new UpdateScope(new Set(['param1']));

      expect(emptyScope.isEmpty()).toBe(true);
      expect(nonEmptyScope.isEmpty()).toBe(false);
    });

    test('should count affected parameters', () => {
      const scope = new UpdateScope(
        new Set(['param1', 'param2']),
        [true, false, true],
        [{ startIndex: 10, endIndex: 15 }]
      );

      // 2 (parameterIds) + 2 (mask true values) + 5 (range)
      expect(scope.getAffectedParameterCount()).toBe(9);
    });
  });

  describe('toJSON', () => {
    test('should return correct JSON representation', () => {
      const parameterIds = new Set(['param1']);
      const mask = [true, false, true];
      const ranges: ParameterRange[] = [
        { startIndex: 0, endIndex: 5, description: 'Test range' }
      ];
      const scope = new UpdateScope(parameterIds, mask, ranges, 'test-scope');

      const json = scope.toJSON();

      expect(json).toMatchObject({
        scopeId: 'test-scope',
        parameterIds: ['param1'],
        maskLength: 3,
        maskTrueCount: 2,
        ranges: ranges
      });
      expect(json).toHaveProperty('createdAt');
    });
  });

  describe('toString', () => {
    test('should return correct string representation', () => {
      const scope = new UpdateScope(
        new Set(['param1']),
        [true, false],
        [{ startIndex: 0, endIndex: 5 }],
        'test-scope'
      );

      const str = scope.toString();

      expect(str).toBe('UpdateScope[test-scope](params=1, mask=1, ranges=1)');
    });
  });
});