---
name: ストラテジー設計議論
about: Policy実装におけるストラテジーパターンの設計議論用テンプレート
title: "[STRATEGY] "
labels: ["strategy", "design", "discussion"]
assignees: ""

---

## 背景

SD-01実装において、以下のPolicyクラスでストラテジーパターンを導入しました：
- `BaseLearningRatePolicy`
- `BaseUpdateScopePolicy` 
- `BaseSkipPolicy`

現在は要件が詳細化されていない箇所について、シンプル版の実装で暫定対応していますが、本格運用に向けて設計議論が必要です。

## 現状の実装

### DevelopOptionによる切り替え制御
```typescript
// シンプル計算 vs コンテキスト利用計算の切り替え
isUseSimpleStrategy_SD_01_learningRate = true;
isUseSimpleStrategy_SD_01_updateScope = true;
isUseSimpleStrategy_SD_01_skip = true;
```

### シンプル版の実装内容
- **学習率**: 差分の大きさに基づく `η = η_base * scaling * sqrt(|diff|)`
- **更新スコープ**: 閾値による3段階判定（focused/default/full）
- **スキップ判定**: 2閾値による3段階判定（FullSkip/PartialUpdate/FocusedCalculation）

### 未実装部分
コンテキスト利用計算では以下が例外となっています：
```typescript
throw new Error('Context-based calculation is not yet implemented. Please set DevelopOption.isUseSimpleStrategy_SD_01_xxx to true.');
```

## 議論すべき論点

### 1. 学習率ポリシー
- [ ] コンテキストのタグ情報をどう活用するか？
- [ ] 統計情報（statistics）による動的調整方針は？
- [ ] 比例係数・曲げ指数の具体的な数式・パラメータは？
- [ ] 学習率の時間的変化の考慮方法は？

### 2. 更新スコープポリシー
- [ ] Top-K選択の具体的実装方針は？
- [ ] コンテキストによるスコープ絞り込みロジックは？
- [ ] 階層的更新（layer-wise update）の必要性は？
- [ ] パフォーマンス要件とのトレードオフは？

### 3. スキップポリシー
- [ ] コンテキスト情報を用いたスキップ判定の詳細は？
- [ ] 動的閾値調整の必要性は？
- [ ] 計算コスト削減効果の測定方法は？
- [ ] スキップによる精度劣化の許容範囲は？

### 4. 横断的課題
- [ ] 各ポリシー間の連携・依存関係は？
- [ ] 設定パラメータの自動調整機能の必要性は？
- [ ] デバッグ・モニタリング機能の要件は？
- [ ] テストケースの網羅性は十分か？

## 提案・アイデア

（ここに具体的な提案やアイデアを記載）

## 関連資料

- クラス図: `docs/ClassDiagram.md`
- シーケンス図: `docs/sequences/A_Basic_Learning/SD-01_*/`
- 実装コード: `src/core/links/Base*Policy.ts`
- テストコード: `src/core/integration/SD-01_*.spec.ts`

## 決定事項

（議論の結果決定された事項を記録）

## TODO

- [ ] 要件詳細化
- [ ] プロトタイプ実装
- [ ] 性能評価
- [ ] テストケース拡充