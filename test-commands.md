# シーケンス図テスト実行コマンド集

## 全シーケンス図テスト（SD-01～SD-27）の動作確認

### 1. 全体テスト実行

#### 全てのシーケンス図テスト実行
```bash
npm test -- --testPathPattern="SD-" --verbose
```

#### 範囲指定での実行
```bash
# SD-01～SD-04 (基本IO・往復処理)
npm test -- --testPathPattern="SD-0[1-4]" --verbose

# SD-05～SD-10 (パターン処理・判定関連)
npm test -- --testPathPattern="SD-0[5-9]|SD-10" --verbose

# SD-11～SD-15 (複雑なパターン処理)
npm test -- --testPathPattern="SD-1[1-5]" --verbose

# SD-16～SD-20 (高度な統合機能)
npm test -- --testPathPattern="SD-1[6-9]|SD-20" --verbose

# SD-21～SD-25 (層間統合・競合・同期)
npm test -- --testPathPattern="SD-2[1-5]" --verbose

# SD-26～SD-27 (外部統合機能)
npm test -- --testPathPattern="SD-2[6-7]" --verbose
```

### 2. カテゴリ別個別テスト実行

#### A. 基本IO・往復処理 (SD-01～SD-04)

**SD-01: 概念→パターンの基本往復**
```bash
npm test -- --testPathPattern="SD-01" --verbose
```

**SD-02: パターン→感覚の低位往復**
```bash
npm test -- --testPathPattern="SD-02" --verbose
```

**SD-03: 実際入力注入**
```bash
npm test -- --testPathPattern="SD-03" --verbose
```

**SD-04: 経験統合とバースト**
```bash
npm test -- --testPathPattern="SD-04" --verbose
```

#### B. パターン処理・判定関連 (SD-05～SD-10)

**SD-05: 海馬の判断基準の分散化**
```bash
npm test -- --testPathPattern="SD-05" --verbose
```

**SD-06: スキップ三値分岐**
```bash
npm test -- --testPathPattern="SD-06" --verbose
```

**SD-07: 学習率動的調整＋更新スコープ配布**
```bash
npm test -- --testPathPattern="SD-07" --verbose
```

**SD-08: 距離メトリクス動的切替**
```bash
npm test -- --testPathPattern="SD-08" --verbose
```

**SD-09: 低Δの省エネ（早期終了）**
```bash
npm test -- --testPathPattern="SD-09" --verbose
```

**SD-10: 行動計画の相対判定**
```bash
npm test -- --testPathPattern="SD-10" --verbose
```

#### C. 複雑なパターン処理 (SD-11～SD-15)

**SD-11: 概念→パターンの基本往復**
```bash
npm test -- --testPathPattern="SD-11" --verbose
```

**SD-12: 期待パターン送信**
```bash
npm test -- --testPathPattern="SD-12" --verbose
```

**SD-13: 実際パターン受信**
```bash
npm test -- --testPathPattern="SD-13" --verbose
```

**SD-14: 相対差分計算**
```bash
npm test -- --testPathPattern="SD-14" --verbose
```

**SD-15: 経験統合とバースト**
```bash
npm test -- --testPathPattern="SD-15" --verbose
```

#### D. 高度な統合機能 (SD-16～SD-20)

**SD-16: 学習率バースト**
```bash
npm test -- --testPathPattern="SD-16" --verbose
```

**SD-17: レベルスケジューリング**
```bash
npm test -- --testPathPattern="SD-17" --verbose
```

**SD-18: クラスタリング**
```bash
npm test -- --testPathPattern="SD-18" --verbose
```

**SD-19: 距離閾値管理**
```bash
npm test -- --testPathPattern="SD-19" --verbose
```

**SD-20: レベル最適化**
```bash
npm test -- --testPathPattern="SD-20" --verbose
```

#### E. 層間統合・競合・同期 (SD-21～SD-25)

**SD-21: 上位N：下位M統合**
```bash
npm test -- --testPathPattern="SD-21" --verbose
```

**SD-22: 層内競合・勝者選択**
```bash
npm test -- --testPathPattern="SD-22" --verbose
```

**SD-23: 即時処理vs通常処理**
```bash
npm test -- --testPathPattern="SD-23" --verbose
```

**SD-24: フェーズ同期**
```bash
npm test -- --testPathPattern="SD-24" --verbose
```

**SD-25: 周期オートチューニング**
```bash
npm test -- --testPathPattern="SD-25" --verbose
```

#### F. 外部統合機能 (SD-26～SD-27)

**SD-26: 外部モニタ状態フック**
```bash
npm test -- --testPathPattern="SD-26" --verbose
```

**SD-27: パラメータ調整UI**
```bash
npm test -- --testPathPattern="SD-27" --verbose
```

## 3. DevelopOptionフラグの確認

### 現在有効なフラグ確認
```bash
grep -n "isExecute_SD_" src/debug/DevelopOption.ts
```

### カテゴリ別フラグ確認
```bash
# SD-01～SD-04のフラグ
grep -n "isExecute_SD_0[1-4]" src/debug/DevelopOption.ts

# SD-05～SD-10のフラグ
grep -n "isExecute_SD_0[5-9]\|isExecute_SD_10" src/debug/DevelopOption.ts

# SD-11～SD-15のフラグ  
grep -n "isExecute_SD_1[1-5]" src/debug/DevelopOption.ts

# SD-16～SD-20のフラグ
grep -n "isExecute_SD_1[6-9]\|isExecute_SD_20" src/debug/DevelopOption.ts

# SD-21～SD-25のフラグ
grep -n "isExecute_SD_2[1-5]" src/debug/DevelopOption.ts

# SD-26～SD-27のフラグ
grep -n "isExecute_SD_2[6-7]" src/debug/DevelopOption.ts
```

### 特定のSDのフラグのみ実行
DevelopOption.tsでフラグをfalseにして、特定のテストケースのみを実行できます。

## 4. テスト結果の詳細確認

### カバレッジ付きで実行
```bash
# 全体
npm test -- --coverage --testPathPattern="SD-"

# カテゴリ別
npm test -- --coverage --testPathPattern="SD-0[1-4]"
npm test -- --coverage --testPathPattern="SD-0[5-9]|SD-10"
npm test -- --coverage --testPathPattern="SD-1[1-5]"
npm test -- --coverage --testPathPattern="SD-1[6-9]|SD-20"
npm test -- --coverage --testPathPattern="SD-2[1-5]"
npm test -- --coverage --testPathPattern="SD-2[6-7]"
```

### ウォッチモードで実行（開発時）
```bash
npm test -- --watch --testPathPattern="SD-2[6-7]"
```

## 5. パフォーマンス確認

### 実行時間の測定
```bash
npm test -- --testPathPattern="SD-" --verbose --detectOpenHandles
```

### 特定範囲のパフォーマンス測定
```bash
npm test -- --testPathPattern="SD-2[1-5]" --verbose --detectOpenHandles
```

## 6. エラー確認とデバッグ

### 特定のテストのみ実行してエラー詳細表示
```bash
npm test -- --testPathPattern="SD-26" --verbose --no-coverage
```

### 失敗したテストのみ再実行
```bash
npm test -- --onlyFailures
```

## 実装したテストケース概要

| SD番号 | 名前 | テストケース数 | 主な機能 |
|--------|------|---------------|---------|
| **A. 基本IO・往復処理** |
| SD-01 | 概念→パターンの基本往復 | 1件 | 概念層とパターン層の基本的な往復処理 |
| SD-02 | パターン→感覚の低位往復 | 1件 | 距離メトリクス選好、低位層間の往復 |
| SD-03 | 実際入力注入 | 1件 | 外部からの実際パターン注入処理 |
| SD-04 | 経験統合とバースト | 1件 | 経験データの統合とバースト制御 |
| **B. パターン処理・判定関連** |
| SD-05 | 海馬の判断基準の分散化 | 3件 | 基準パターン作成、分散化、移譲 |
| SD-06 | スキップ三値分岐 | 3件 | 完全スキップ、部分更新、集中計算 |
| SD-07 | 学習率動的調整＋更新スコープ配布 | 3件 | 適応学習率、スコープ生成、学習信号 |
| SD-08 | 距離メトリクス動的切替 | 3件 | ファクトリー解決、メトリクス切替、差分生成 |
| SD-09 | 低Δの省エネ（早期終了） | 3件 | スキップ判定、早期終了、閾値評価 |
| SD-10 | 行動計画の相対判定 | 3件 | 行動計画伝播、実行キャプチャ、差分計算 |
| **C. 複雑なパターン処理** |
| SD-11 | 概念→パターンの基本往復 | 3件 | 概念生成、パターン送信、結果受信 |
| SD-12 | 期待パターン送信 | 3件 | パターン構築、送信処理、確認 |
| SD-13 | 実際パターン受信 | 3件 | 受信処理、バリデーション、統合 |
| SD-14 | 相対差分計算 | 3件 | 差分算出、重み付け、結果生成 |
| SD-15 | 経験統合とバースト | 3件 | 経験蓄積、統合処理、バースト制御 |
| **D. 高度な統合機能** |
| SD-16 | 学習率バースト | 3件 | バースト検出、学習率調整、制御 |
| SD-17 | レベルスケジューリング | 3件 | スケジュール生成、実行制御、最適化 |
| SD-18 | クラスタリング | 3件 | クラスタ形成、分類処理、統合 |
| SD-19 | 距離閾値管理 | 3件 | 閾値計算、適応調整、評価 |
| SD-20 | レベル最適化 | 3件 | 最適化処理、パフォーマンス調整、制御 |
| **E. 層間統合・競合・同期** |
| SD-21 | 上位N：下位M統合 | 3件 | 多層統合、期待集約、差分配布 |
| SD-22 | 層内競合・勝者選択 | 3件 | 候補生成、競合処理、勝者決定 |
| SD-23 | 即時処理vs通常処理 | 3件 | 優先度判定、処理分岐、スケジューリング |
| SD-24 | フェーズ同期 | 3件 | リズム設定、同期処理、位相調整 |
| SD-25 | 周期オートチューニング | 3件 | 負荷検出、周期最適化、設定更新 |
| **F. 外部統合機能** |
| SD-26 | 外部モニタ状態フック | 3件 | 状態フック、データ変換、モニタ送信 |
| SD-27 | パラメータ調整UI | 3件 | UI操作、パラメータ管理、ポリシー更新 |

**合計: 27シーケンス図、計73テスト実装済み**
- SD-01～SD-04: 4テスト (基本IO・往復処理)
- SD-05～SD-27: 69テスト (高度なシーケンス図、各3テストケース)

すべてのテストはDevelopOptionフラグで個別制御可能で、シーケンス図に完全対応した詳細なモック実装を持っています。