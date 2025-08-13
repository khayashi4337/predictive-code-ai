import { Statistics, StatisticValue } from './Statistics';

describe('Statistics クラス', () => {
  let statistics: Statistics;

  beforeEach(() => {
    statistics = new Statistics();
  });

  describe('基本機能テスト', () => {
    describe('数値統計の設定と取得', () => {
      test('数値統計を設定して取得できる', () => {
        statistics.setNumber('accuracy', 0.95);
        expect(statistics.getNumber('accuracy')).toBe(0.95);
      });

      test('存在しない数値統計はundefinedを返す', () => {
        expect(statistics.getNumber('nonexistent')).toBeUndefined();
      });

      test('数値以外が設定された場合は型安全性が保たれる', () => {
        statistics.setString('accuracy', 'high');
        expect(statistics.getNumber('accuracy')).toBeUndefined();
        expect(statistics.getString('accuracy')).toBe('high');
      });

      test('NaNや無限大も正常に保存される', () => {
        statistics.setNumber('nan_value', NaN);
        statistics.setNumber('infinity', Infinity);
        statistics.setNumber('negative_infinity', -Infinity);
        
        expect(statistics.getNumber('nan_value')).toBeNaN();
        expect(statistics.getNumber('infinity')).toBe(Infinity);
        expect(statistics.getNumber('negative_infinity')).toBe(-Infinity);
      });
    });

    describe('真偽値統計の設定と取得', () => {
      test('真偽値統計を設定して取得できる', () => {
        statistics.setBoolean('enabled', true);
        statistics.setBoolean('disabled', false);
        
        expect(statistics.getBoolean('enabled')).toBe(true);
        expect(statistics.getBoolean('disabled')).toBe(false);
      });

      test('存在しない真偽値統計はundefinedを返す', () => {
        expect(statistics.getBoolean('nonexistent')).toBeUndefined();
      });

      test('真偽値以外が設定された場合は型安全性が保たれる', () => {
        statistics.setNumber('enabled', 1);
        expect(statistics.getBoolean('enabled')).toBeUndefined();
        expect(statistics.getNumber('enabled')).toBe(1);
      });
    });

    describe('文字列統計の設定と取得', () => {
      test('文字列統計を設定して取得できる', () => {
        statistics.setString('model_name', 'GPT-4');
        expect(statistics.getString('model_name')).toBe('GPT-4');
      });

      test('空文字列も正常に保存される', () => {
        statistics.setString('empty', '');
        expect(statistics.getString('empty')).toBe('');
      });

      test('存在しない文字列統計はundefinedを返す', () => {
        expect(statistics.getString('nonexistent')).toBeUndefined();
      });

      test('Unicode文字列も正常に保存される', () => {
        statistics.setString('japanese', '機械学習');
        statistics.setString('emoji', '🤖');
        
        expect(statistics.getString('japanese')).toBe('機械学習');
        expect(statistics.getString('emoji')).toBe('🤖');
      });
    });

    describe('日時統計の設定と取得', () => {
      test('日時統計を設定して取得できる', () => {
        const now = new Date();
        statistics.setDate('created_at', now);
        expect(statistics.getDate('created_at')).toEqual(now);
      });

      test('存在しない日時統計はundefinedを返す', () => {
        expect(statistics.getDate('nonexistent')).toBeUndefined();
      });

      test('日時以外が設定された場合は型安全性が保たれる', () => {
        statistics.setString('created_at', '2023-01-01');
        expect(statistics.getDate('created_at')).toBeUndefined();
        expect(statistics.getString('created_at')).toBe('2023-01-01');
      });

      test('無効な日時も正常に保存される', () => {
        const invalidDate = new Date('invalid');
        statistics.setDate('invalid_date', invalidDate);
        expect(statistics.getDate('invalid_date')).toEqual(invalidDate);
      });
    });

    describe('生の値の取得', () => {
      test('生の値を取得できる', () => {
        statistics.setNumber('number', 42);
        statistics.setBoolean('boolean', true);
        statistics.setString('string', 'test');
        const date = new Date();
        statistics.setDate('date', date);

        expect(statistics.getValue('number')).toBe(42);
        expect(statistics.getValue('boolean')).toBe(true);
        expect(statistics.getValue('string')).toBe('test');
        expect(statistics.getValue('date')).toEqual(date);
        expect(statistics.getValue('nonexistent')).toBeUndefined();
      });
    });
  });

  describe('コレクション操作テスト', () => {
    beforeEach(() => {
      statistics.setNumber('score', 0.8);
      statistics.setBoolean('valid', true);
      statistics.setString('name', 'test');
      statistics.setDate('timestamp', new Date('2023-01-01'));
    });

    describe('存在確認と削除', () => {
      test('統計の存在を確認できる', () => {
        expect(statistics.has('score')).toBe(true);
        expect(statistics.has('nonexistent')).toBe(false);
      });

      test('統計を削除できる', () => {
        expect(statistics.has('score')).toBe(true);
        expect(statistics.delete('score')).toBe(true);
        expect(statistics.has('score')).toBe(false);
        expect(statistics.delete('nonexistent')).toBe(false);
      });

      test('すべての統計をクリアできる', () => {
        expect(statistics.size()).toBe(4);
        statistics.clear();
        expect(statistics.size()).toBe(0);
        expect(statistics.has('score')).toBe(false);
      });
    });

    describe('サイズと一覧取得', () => {
      test('統計の数を取得できる', () => {
        expect(statistics.size()).toBe(4);
        statistics.setNumber('new_metric', 1.0);
        expect(statistics.size()).toBe(5);
      });

      test('すべてのキーを取得できる', () => {
        const keys = statistics.keys();
        expect(keys).toHaveLength(4);
        expect(keys).toContain('score');
        expect(keys).toContain('valid');
        expect(keys).toContain('name');
        expect(keys).toContain('timestamp');
      });

      test('すべての値を取得できる', () => {
        const values = statistics.values();
        expect(values).toHaveLength(4);
        expect(values).toContain(0.8);
        expect(values).toContain(true);
        expect(values).toContain('test');
      });

      test('すべてのエントリを取得できる', () => {
        const entries = statistics.entries();
        expect(entries).toHaveLength(4);
        
        const entryMap = new Map(entries);
        expect(entryMap.get('score')).toBe(0.8);
        expect(entryMap.get('valid')).toBe(true);
        expect(entryMap.get('name')).toBe('test');
        expect(entryMap.has('timestamp')).toBe(true);
      });
    });
  });

  describe('マージ機能テスト', () => {
    test('他のStatisticsとマージできる（上書きあり）', () => {
      statistics.setNumber('score', 0.8);
      statistics.setString('name', 'original');

      const other = new Statistics();
      other.setNumber('score', 0.9); // 同じキー
      other.setBoolean('valid', true); // 新しいキー

      statistics.merge(other, true); // 上書きあり

      expect(statistics.getNumber('score')).toBe(0.9); // 上書きされた
      expect(statistics.getString('name')).toBe('original'); // 保持
      expect(statistics.getBoolean('valid')).toBe(true); // 追加
    });

    test('他のStatisticsとマージできる（上書きなし）', () => {
      statistics.setNumber('score', 0.8);
      statistics.setString('name', 'original');

      const other = new Statistics();
      other.setNumber('score', 0.9); // 同じキー
      other.setBoolean('valid', true); // 新しいキー

      statistics.merge(other, false); // 上書きなし

      expect(statistics.getNumber('score')).toBe(0.8); // 保持
      expect(statistics.getString('name')).toBe('original'); // 保持
      expect(statistics.getBoolean('valid')).toBe(true); // 追加
    });

    test('空のStatisticsとマージしても影響なし', () => {
      statistics.setNumber('score', 0.8);
      const original = statistics.clone();
      
      const empty = new Statistics();
      statistics.merge(empty);

      expect(statistics.size()).toBe(original.size());
      expect(statistics.getNumber('score')).toBe(0.8);
    });
  });

  describe('複製機能テスト', () => {
    test('完全な複製を作成できる', () => {
      statistics.setNumber('score', 0.8);
      statistics.setBoolean('valid', true);
      statistics.setString('name', 'test');
      const date = new Date('2023-01-01');
      statistics.setDate('timestamp', date);

      const cloned = statistics.clone();

      // 内容が同じ
      expect(cloned.size()).toBe(statistics.size());
      expect(cloned.getNumber('score')).toBe(0.8);
      expect(cloned.getBoolean('valid')).toBe(true);
      expect(cloned.getString('name')).toBe('test');
      expect(cloned.getDate('timestamp')).toEqual(date);

      // 独立したオブジェクト
      expect(cloned).not.toBe(statistics);
      cloned.setNumber('score', 0.9);
      expect(statistics.getNumber('score')).toBe(0.8); // 元は変更されない
    });

    test('空のStatisticsの複製も正常に動作', () => {
      const cloned = statistics.clone();
      expect(cloned.size()).toBe(0);
      expect(cloned).not.toBe(statistics);
    });
  });

  describe('JSON シリアライゼーション テスト', () => {
    test('JSONエクスポートが正常に動作', () => {
      statistics.setNumber('score', 0.8);
      statistics.setBoolean('valid', true);
      statistics.setString('name', 'test');
      const date = new Date('2023-01-01T10:00:00.000Z');
      statistics.setDate('timestamp', date);

      const json = statistics.toJSON();

      expect(json).toEqual({
        score: { type: 'number', value: 0.8 },
        valid: { type: 'boolean', value: true },
        name: { type: 'string', value: 'test' },
        timestamp: { type: 'Date', value: '2023-01-01T10:00:00.000Z' }
      });
    });

    test('JSONインポートが正常に動作', () => {
      const json = {
        score: { type: 'number', value: 0.8 },
        valid: { type: 'boolean', value: true },
        name: { type: 'string', value: 'test' },
        timestamp: { type: 'Date', value: '2023-01-01T10:00:00.000Z' }
      };

      const imported = Statistics.fromJSON(json);

      expect(imported.getNumber('score')).toBe(0.8);
      expect(imported.getBoolean('valid')).toBe(true);
      expect(imported.getString('name')).toBe('test');
      expect(imported.getDate('timestamp')).toEqual(new Date('2023-01-01T10:00:00.000Z'));
    });

    test('不正なJSONデータは無視される', () => {
      const json = {
        valid_entry: { type: 'number', value: 42 },
        invalid_entry1: { value: 'missing_type' },
        invalid_entry2: { type: 'number' }, // missing value
        invalid_entry3: 'not_an_object',
        invalid_entry4: { type: 'unknown_type', value: 'test' }
      };

      const imported = Statistics.fromJSON(json);

      expect(imported.size()).toBe(1);
      expect(imported.getNumber('valid_entry')).toBe(42);
      expect(imported.has('invalid_entry1')).toBe(false);
      expect(imported.has('invalid_entry2')).toBe(false);
      expect(imported.has('invalid_entry3')).toBe(false);
      expect(imported.has('invalid_entry4')).toBe(false);
    });

    test('JSON往復変換で一貫性が保たれる', () => {
      statistics.setNumber('score', 0.8);
      statistics.setBoolean('valid', true);
      statistics.setString('name', 'test');
      const date = new Date('2023-01-01T10:00:00.000Z');
      statistics.setDate('timestamp', date);

      const json = statistics.toJSON();
      const restored = Statistics.fromJSON(json);

      expect(restored.size()).toBe(statistics.size());
      expect(restored.getNumber('score')).toBe(statistics.getNumber('score'));
      expect(restored.getBoolean('valid')).toBe(statistics.getBoolean('valid'));
      expect(restored.getString('name')).toBe(statistics.getString('name'));
      expect(restored.getDate('timestamp')).toEqual(statistics.getDate('timestamp'));
    });
  });

  describe('文字列変換とデバッグ機能テスト', () => {
    test('文字列表現が正常に生成される', () => {
      statistics.setNumber('score', 0.8);
      statistics.setBoolean('valid', true);
      
      const str = statistics.toString();
      expect(str).toContain('Statistics{');
      expect(str).toContain('score: 0.8 (number)');
      expect(str).toContain('valid: true (boolean)');
    });

    test('空のStatisticsの文字列表現', () => {
      const str = statistics.toString();
      expect(str).toBe('Statistics{}');
    });

    test('複雑な値を持つ統計の文字列表現', () => {
      const date = new Date('2023-01-01');
      statistics.setDate('created', date);
      statistics.setString('unicode', '🤖');
      
      const str = statistics.toString();
      expect(str).toContain('created: ');
      expect(str).toContain('(object)'); // Date型はobjectとして表示
      expect(str).toContain('unicode: 🤖 (string)');
    });
  });

  describe('イテレータ機能テスト', () => {
    beforeEach(() => {
      statistics.setNumber('score', 0.8);
      statistics.setBoolean('valid', true);
      statistics.setString('name', 'test');
    });

    test('for...of ループが動作する', () => {
      const entries: [string, StatisticValue][] = [];
      for (const entry of statistics) {
        entries.push(entry);
      }

      expect(entries).toHaveLength(3);
      const entryMap = new Map(entries);
      expect(entryMap.get('score')).toBe(0.8);
      expect(entryMap.get('valid')).toBe(true);
      expect(entryMap.get('name')).toBe('test');
    });

    test('Array.fromでエントリを配列に変換できる', () => {
      const entries = Array.from(statistics);
      expect(entries).toHaveLength(3);
      
      const keys = entries.map(([key]) => key);
      expect(keys).toContain('score');
      expect(keys).toContain('valid');
      expect(keys).toContain('name');
    });

    test('分割代入で値を取得できる', () => {
      const [firstEntry] = statistics;
      expect(firstEntry).toHaveLength(2); // [key, value]のペア
      expect(typeof firstEntry[0]).toBe('string'); // key
      expect(firstEntry[1]).toBeDefined(); // value
    });

    test('Object.fromEntriesで通常のオブジェクトに変換できる', () => {
      const obj = Object.fromEntries(statistics);
      expect(obj.score).toBe(0.8);
      expect(obj.valid).toBe(true);
      expect(obj.name).toBe('test');
    });
  });

  describe('エッジケース・境界条件テスト', () => {
    test('同じキーに異なる型の値を上書きできる', () => {
      statistics.setNumber('value', 42);
      expect(statistics.getNumber('value')).toBe(42);
      
      statistics.setString('value', 'forty-two');
      expect(statistics.getNumber('value')).toBeUndefined();
      expect(statistics.getString('value')).toBe('forty-two');
      
      statistics.setBoolean('value', true);
      expect(statistics.getString('value')).toBeUndefined();
      expect(statistics.getBoolean('value')).toBe(true);
    });

    test('特殊な文字を含むキーも正常に動作', () => {
      const specialKeys = ['', ' ', '\n', '\t', '特殊文字', '🔑', 'key with spaces', 'dot.key'];
      
      specialKeys.forEach((key, index) => {
        statistics.setNumber(key, index);
      });

      expect(statistics.size()).toBe(specialKeys.length);
      
      specialKeys.forEach((key, index) => {
        expect(statistics.getNumber(key)).toBe(index);
      });
    });

    test('非常に大きな数値も正常に保存される', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      const smallNumber = Number.MIN_SAFE_INTEGER;
      const epsilon = Number.EPSILON;
      
      statistics.setNumber('large', largeNumber);
      statistics.setNumber('small', smallNumber);
      statistics.setNumber('epsilon', epsilon);
      
      expect(statistics.getNumber('large')).toBe(largeNumber);
      expect(statistics.getNumber('small')).toBe(smallNumber);
      expect(statistics.getNumber('epsilon')).toBe(epsilon);
    });

    test('大量のデータも正常に処理される', () => {
      const dataSize = 1000;
      
      // 大量のデータを追加
      for (let i = 0; i < dataSize; i++) {
        statistics.setNumber(`metric_${i}`, i * 0.001);
      }
      
      expect(statistics.size()).toBe(dataSize);
      
      // ランダムなインデックスで確認
      const testIndices = [0, 100, 500, 999];
      testIndices.forEach(i => {
        expect(statistics.getNumber(`metric_${i}`)).toBe(i * 0.001);
      });
    });

    test('複雑なメタデータのマージ', () => {
      // 複数の統計オブジェクトをマージ
      const stats1 = new Statistics();
      stats1.setNumber('a', 1);
      stats1.setString('b', 'first');
      
      const stats2 = new Statistics();
      stats2.setNumber('b', 2); // 異なる型で同じキー
      stats2.setBoolean('c', true);
      
      const stats3 = new Statistics();
      stats3.setDate('d', new Date('2023-01-01'));
      
      statistics.merge(stats1);
      statistics.merge(stats2, true); // 上書きあり
      statistics.merge(stats3);
      
      expect(statistics.size()).toBe(4);
      expect(statistics.getNumber('a')).toBe(1);
      expect(statistics.getNumber('b')).toBe(2); // 上書きされた
      expect(statistics.getString('b')).toBeUndefined(); // 型が変わった
      expect(statistics.getBoolean('c')).toBe(true);
      expect(statistics.getDate('d')).toEqual(new Date('2023-01-01'));
    });
  });

  describe('パフォーマンステスト（軽量）', () => {
    test('大量のsetNumber操作が高速に完了する', () => {
      const start = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        statistics.setNumber(`perf_test_${i}`, i);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // 100ms以内
      expect(statistics.size()).toBe(10000);
    });

    test('大量のget操作が高速に完了する', () => {
      // 事前にデータを設定
      for (let i = 0; i < 1000; i++) {
        statistics.setNumber(`get_test_${i}`, i);
      }
      
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        statistics.getNumber(`get_test_${i}`);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50); // 50ms以内
    });

    test('大きなオブジェクトのcloneが合理的な時間で完了する', () => {
      // 1000個のエントリを準備
      for (let i = 0; i < 1000; i++) {
        statistics.setNumber(`clone_test_${i}`, Math.random());
        statistics.setString(`clone_str_${i}`, `value_${i}`);
      }
      
      const start = performance.now();
      const cloned = statistics.clone();
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(50); // 50ms以内
      expect(cloned.size()).toBe(statistics.size());
    });
  });
});