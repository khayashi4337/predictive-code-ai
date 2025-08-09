# PredictiveCodeAI

自由エネルギー原理に基づく予測符号化AIによる時系列異常検知とFX投資戦略検証の研究プロジェクト

## 概要

本プロジェクトは、脳科学の自由エネルギー原理（Free Energy Principle）を応用した予測符号化AIシステムを実装し、時系列データの異常検知とFX投資戦略の検証を行う研究プロジェクトです。VUS（Volume Under Surface）指標を用いた包括的な評価システムにより、従来手法を超える性能の実現を目指しています。

## 主な機能

### 🧠 予測符号化AIエンジン
- 自由エネルギー原理に基づく階層的生成モデル
- トップダウン予測とボトムアップ誤差処理の循環システム
- 予測誤差最小化による自律学習機能

### 📊 時系列異常検知
- VUS（Volume Under Surface）による3次元評価
- リアルタイム異常検知アルゴリズム
- 時間遅延を考慮した包括的性能評価

### 💹 FX投資戦略
- モメンタム反転戦略の実装
- ポジション・ロット管理システム
- 投資成果の定量的評価

### 🔧 汎用時系列予測
- Sin波から実データまで対応
- 拡張可能なアーキテクチャ設計
- テスト駆動開発による品質保証

## システム構成

```
汎用時系列予測AI（自由エネルギー原理）
├── 予測符号化エンジン
├── 階層的生成モデル
└── 自由エネルギー最小化

異常検知システム（VUS評価）
├── 3次元ROC解析
├── 時間遅延評価
└── 包括的性能指標

FX投資戦略（モメンタム反転）
├── 異常検知ベース判定
├── ポジション管理
└── 損益計算
```

## 技術スタック

- **言語**: Python 3.9+
- **数値計算**: NumPy, SciPy
- **データベース**: SQLite3
- **テスト**: pytest
- **開発環境**: Claude Code
- **バージョン管理**: Git/GitHub

## インストール

```bash
# リポジトリのクローン
git clone https://github.com/khayashi4337/predictive-code-ai.git
cd predictive-code-ai

# 仮想環境の作成
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係のインストール
pip install -r requirements.txt
```

## 使用方法

### 基本的な使用例

```bash
# Sin波予測の実行
python main.py --mode predict --data data/sin_wave.csv

# 異常検知の実行
python main.py --mode detect --data data/fx_data.csv

# 投資戦略の実行
python main.py --mode trade --data data/fx_data.csv --strategy momentum_reversal
```

### 設定ファイル

```json
{
    "model": {
        "learning_rate": 0.01,
        "batch_size": 32,
        "max_epochs": 100,
        "layers": [64, 32, 16]
    },
    "anomaly_detection": {
        "threshold": 2.0,
        "window_size": 60,
        "detection_delay_max": 3
    },
    "trading": {
        "strategy": "momentum_reversal",
        "lot_size": 0.1,
        "stop_loss": 0.02,
        "take_profit": 0.05
    }
}
```

## テスト実行

```bash
# 全テストの実行
pytest

# カバレッジ付きテスト
pytest --cov=src

# 特定テストの実行
pytest tests/test_predictive_coding.py
```

## 評価指標

### VUS（Volume Under Surface）
3次元ROC曲線の体積を計算し、異常検知の包括的性能を評価
- **X軸**: False Positive Rate (FPR)
- **Y軸**: True Positive Rate (TPR)
- **Z軸**: 検出時間遅延

### 投資成果指標
- **総利益/損失**: 投資戦略の収益性
- **シャープレシオ**: リスク調整後リターン
- **最大ドローダウン**: 最大累積損失
- **勝率**: 利益取引の割合

## 研究背景

### 自由エネルギー原理
生命システムが「驚き（予測誤差）」を最小化することで適応・学習を行うという脳科学理論。本プロジェクトでは、この原理を金融市場の異常検知に応用し、従来手法を超える性能の実現を目指しています。

### 予測符号化
階層的な生成モデルにより、トップダウン予測とボトムアップ誤差処理を循環させることで効率的な学習を実現するアルゴリズム。

### VUS指標の革新性
従来のAUC指標では評価できない「時間的要素」を含む3次元評価により、実用的な異常検知システムの性能を適切に評価可能。

## 開発フェーズ

### Phase 1: 基本実装（3ヶ月）
- [x] プロジェクト設計
- [ ] Sin波予測システム
- [ ] 自由エネルギー計算
- [ ] VUS評価システム
- [ ] 基本異常検知

### Phase 2: FX特化（3ヶ月）
- [ ] リアルタイム処理
- [ ] 投資戦略実装
- [ ] パフォーマンス最適化
- [ ] 実データ検証

### Phase 3: 研究発展（6ヶ月）
- [ ] 多層階層モデル
- [ ] Attention機構統合
- [ ] 論文執筆
- [ ] 学会発表

## 貢献

Issues、Pull Requestを歓迎します。開発に参加される際は、以下をご確認ください：

1. テスト駆動開発の実践
2. コードスタイルの遵守（PEP8）
3. ドキュメントの更新
4. 適切なコミットメッセージ

## ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 開発者

**林邦行** (khayashi4337)
- Email: khayashi4337@gmail.com
- GitHub: [@khayashi4337](https://github.com/khayashi4337)

---

*このプロジェクトは自由エネルギー原理の金融応用という新しい研究領域を開拓し、AIによる時系列異常検知の可能性を探求します。*