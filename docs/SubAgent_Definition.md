# サブエージェント定義書

## 概要

適応的差分検出理論プロジェクトにおいて、効率的な開発とメンテナンスを実現するため、専門領域ごとにサブエージェントを定義します。各エージェントは独立した専門性を持ちながら、PMエージェントの統括の下で連携します。

---

## エージェント構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                        PM Agent                                │
│              (Project Management Agent)                        │
│    • プロジェクト全体統括                                         │
│    • タスク割り振り・進捗管理                                      │
│    • 品質保証・リリース管理                                        │
└─────────────┬───────────────┬───────────────┬───────────────┘
              │               │               │
              ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │  Backend Agent  │ │Frontend Agent│ │Document Agent   │
    │     (BE)        │ │     (FE)     │ │     (DOC)       │
    └─────────────────┘ └─────────────┘ └─────────────────┘
              │               │               │
              ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │  ML/AI Agent    │ │  Test Agent  │ │  Config Agent   │
    │     (ML)        │ │    (TEST)    │ │    (CONFIG)     │
    └─────────────────┘ └─────────────┘ └─────────────────┘
              │               │               │
              ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │Database Agent   │ │Security Agent│ │DevOps Agent     │
    │     (DB)        │ │    (SEC)     │ │    (DEVOPS)     │
    └─────────────────┘ └─────────────┘ └─────────────────┘
```

---

## 1. PM Agent (プロジェクト管理エージェント)

### 1.1 役割と責任
- **プロジェクト統括**: 全体進捗管理、リソース配分、スケジュール調整
- **品質管理**: コード品質、アーキテクチャ整合性、ベストプラクティス遵守
- **リスク管理**: 技術的リスク識別、対策立案、エスカレーション
- **ステークホルダー調整**: 要件調整、方針決定、報告書作成

### 1.2 主な機能
```python
class PMAgent:
    def coordinate_project_phases(self) -> ProjectPhaseCoordination
    def assign_tasks_to_agents(self, tasks: List[Task]) -> TaskAssignment
    def monitor_overall_progress(self) -> ProgressReport
    def conduct_quality_reviews(self) -> QualityAssessment
    def manage_risks_and_issues(self) -> RiskAssessment
    def generate_status_reports(self) -> StatusReport
```

### 1.3 判断基準
- WBSとの整合性
- アーキテクチャ設計への適合
- 工数・品質・スケジュールのバランス
- 技術的負債の最小化

---

## 2. Backend Agent (バックエンドエージェント)

### 2.1 専門領域
- **Core Logic**: ドメインサービス、ビジネスロジック、Use Case実装
- **API Design**: REST API、GraphQL、WebSocket エンドポイント設計
- **Integration**: PyTorch統合、外部API連携、データパイプライン
- **Performance**: パフォーマンス最適化、メモリ管理、並行処理

### 2.2 担当クラス群
```python
# Domain Layer
- AnomalyDetectionService
- LearningRateAdjustmentService  
- SurpriseDetector
- TrainingOrchestrationService
- ExperimentOrchestrationService

# Application Layer
- TrainModelUseCase
- PredictionExecutionUseCase
- RunExperimentUseCase

# Infrastructure Layer  
- SQLiteModelRepository
- AdaptiveOptimizer
- HookManager
```

### 2.3 品質基準
- テストカバレッジ ≥ 90%
- APIレスポンス時間 < 100ms (予測API)
- メモリリーク防止
- 例外ハンドリングの徹底

---

## 3. Frontend Agent (フロントエンドエージェント)

### 3.1 専門領域
- **UI/UX Design**: ダッシュボード、チャート、フォーム設計
- **Real-time Features**: WebSocket通信、リアルタイム更新
- **Data Visualization**: グラフ、ヒートマップ、アニメーション
- **User Experience**: レスポンシブ対応、アクセシビリティ

### 3.2 担当領域
```typescript
// Components
- DashboardComponent
- TrainingMonitorComponent  
- PredictionVisualizerComponent
- ExperimentComparatorComponent

// Services
- RealtimeDataService
- ChartRenderingService
- NotificationService
- StateManagementService

// Pages
- DashboardPage
- ModelManagementPage
- TrainingExecutionPage
- AnalysisPage
```

### 3.3 技術要件
- React/Vue.js + TypeScript
- Chart.js/D3.js for visualization
- WebSocket for real-time updates
- Mobile-responsive design

---

## 4. ML/AI Agent (機械学習エージェント)

### 4.1 専門領域
- **Model Architecture**: Transformer実装、カスタムレイヤー
- **Training Logic**: 学習アルゴリズム、最適化手法
- **Anomaly Detection**: VUS実装、統計的手法
- **Model Evaluation**: メトリクス計算、性能評価

### 4.2 担当クラス群
```python
# Core ML Components
- AdaptiveTransformerModel
- VUSAnomalyDetectionStrategy
- StatisticalAnomalyDetectionStrategy
- ModelPerformanceEvaluator

# PyTorch Integration
- HookManager
- AdaptiveOptimizer
- DataPreprocessingService

# Research Components
- SurpriseDetector
- UnexpectedBehaviorAnalyzer
```

### 4.3 研究開発要件
- 最新論文の調査・実装
- 実験設計・検証
- ハイパーパラメータ最適化
- モデル説明可能性

---

## 5. Test Agent (テストエージェント)

### 5.1 専門領域
- **Unit Testing**: 個別クラス・メソッドのテスト
- **Integration Testing**: API、データベース統合テスト
- **E2E Testing**: UI自動化テスト
- **Performance Testing**: 負荷テスト、ベンチマーク

### 5.2 テスト戦略
```python
# Test Categories
class TestAgent:
    def create_unit_tests(self) -> UnitTestSuite
    def create_integration_tests(self) -> IntegrationTestSuite  
    def create_performance_tests(self) -> PerformanceTestSuite
    def create_ml_model_tests(self) -> MLModelTestSuite
    def run_regression_tests(self) -> RegressionTestReport
```

### 5.3 品質メトリクス
- コードカバレッジ ≥ 90%
- テスト実行時間 < 5分
- フレーク率 < 1%
- 自動化率 ≥ 95%

---

## 6. Document Agent (ドキュメントエージェント)

### 6.1 専門領域
- **Technical Documentation**: API仕様、アーキテクチャ設計書
- **User Guides**: 操作マニュアル、チュートリアル
- **Research Documentation**: 実験結果、技術調査レポート
- **Code Documentation**: コメント、docstring、README

### 6.2 ドキュメント体系
```markdown
docs/
├── architecture/          # アーキテクチャ設計
├── api/                  # API仕様書
├── user-guide/           # ユーザーガイド
├── development/          # 開発者ガイド
├── research/             # 研究・実験記録
├── deployment/           # デプロイメント手順
└── troubleshooting/      # トラブルシューティング
```

### 6.3 品質基準
- 技術文書の正確性・最新性
- ユーザビリティの向上
- 多言語対応（日本語・英語）
- 検索性・ナビゲーション

---

## 7. Database Agent (データベースエージェント)

### 7.1 専門領域
- **Schema Design**: SQLiteスキーマ設計、マイグレーション
- **Query Optimization**: クエリ最適化、インデックス設計
- **Data Migration**: データ移行、バックアップ・リストア
- **Performance Monitoring**: クエリ性能監視、ボトルネック解析

### 7.2 担当領域
```python
# Repository Pattern
- SQLiteModelRepository
- SQLiteTrainingSessionRepository
- SQLiteExperimentRepository
- SQLiteUserRepository

# Database Services
- DatabaseMigrationService
- BackupRestoreService
- QueryOptimizationService
```

---

## 8. Security Agent (セキュリティエージェント)

### 8.1 専門領域
- **Authentication**: ユーザー認証、セッション管理
- **Authorization**: 権限制御、ロールベースアクセス
- **Data Protection**: 暗号化、秘密情報管理
- **Security Audit**: 脆弱性検査、セキュリティレビュー

### 8.2 セキュリティ要件
```python
# Security Components
- AuthenticationService
- SessionManagementService  
- EncryptionService
- AuditLoggingService
- SecurityPolicyEnforcer
```

---

## 9. DevOps Agent (DevOpsエージェント)

### 9.1 専門領域
- **CI/CD**: ビルド・テスト・デプロイの自動化
- **Infrastructure**: 環境構築、コンテナ化
- **Monitoring**: システム監視、ログ管理
- **Release Management**: バージョン管理、リリース戦略

### 9.2 DevOps Pipeline
```yaml
# CI/CD Pipeline
stages:
  - lint_and_format
  - unit_tests
  - integration_tests
  - security_scan
  - build_docker_image
  - deploy_staging
  - e2e_tests
  - deploy_production
```

---

## 10. Config Agent (設定管理エージェント)

### 10.1 専門領域
- **Configuration Management**: YAML/TOML設定ファイル管理
- **Environment Variables**: 環境変数設定、秘密情報管理
- **Feature Flags**: 機能フラグ管理、A/Bテスト設定
- **Configuration Validation**: 設定値検証、デフォルト値管理

### 10.2 設定管理体系
```python
# Configuration Classes
- ApplicationConfig
- ModelConfig  
- TrainingConfig
- DatabaseConfig
- SecurityConfig

# Configuration Services
- ConfigLoader
- ConfigValidator
- EnvironmentManager
```

---

## エージェント間連携プロトコル

### 連携ルール
1. **PM Agent中心**: すべての重要な決定はPM Agentを経由
2. **専門性尊重**: 各領域の技術判断は専門エージェントに委任
3. **情報共有**: 設計変更は関連エージェントに通知
4. **品質保証**: Test Agentによる品質チェックを必須とする

### コミュニケーション例
```
[PM] → [Backend]: "VUS計算エンジンの実装を依頼"
[Backend] → [ML]: "VUS算出アルゴリズムの設計支援を要求"
[ML] → [Test]: "VUS計算の単体テスト作成を依頼"
[Test] → [PM]: "テスト完了、品質基準達成を報告"
```

### エスカレーションフロー
```
技術的課題 → 専門Agent → PM Agent → ステークホルダー
設計変更   → PM Agent → 関連Agent群 → 実装
品質問題   → Test Agent → PM Agent → 対策検討
```

---

## 実装方針

### Phase 1: コアエージェント
- PM Agent: プロジェクト基盤確立
- Backend Agent: ドメインロジック実装
- ML Agent: 機械学習コア実装

### Phase 2: 統合エージェント  
- Frontend Agent: UI実装
- Test Agent: 品質保証
- Database Agent: データ永続化

### Phase 3: 運用エージェント
- Security Agent: セキュリティ強化
- DevOps Agent: 運用自動化
- Document Agent: ドキュメント整備
- Config Agent: 設定管理最適化

次に、どのエージェントから実装を開始しますか？PM Agentによる全体調整から始めることを推奨します。