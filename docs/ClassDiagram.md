# 適応的差分検出理論 - クラス設計書

## アーキテクチャ概要

クリーンアーキテクチャに基づいた層分離設計を採用し、テストしやすさと保守性を重視した構成とします。

```
┌─────────────────────────────────────────────────────┐
│                Presentation Layer                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │     CLI     │  │     API     │  │   WebUI     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────┐
│                 Application Layer                   │
│  ┌─────────────────────────────────────────────────┐ │
│  │            Use Case Services                    │ │
│  │  Training / Inference / Experiment / Analysis  │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────┐
│                  Domain Layer                       │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Entities    │  │   Services   │  │   Repos   │ │
│  └───────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────┐
│               Infrastructure Layer                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Database   │  │   File I/O  │  │   PyTorch   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 1. Data Layer (Value Objects & Entities)

### 1.1 ID管理
```python
# domain/value_objects/ids.py
@dataclass(frozen=True)
class ModelId:
    value: str = field(default_factory=lambda: str(uuid4()))

@dataclass(frozen=True)
class ExperimentId:
    value: str = field(default_factory=lambda: str(uuid4()))

@dataclass(frozen=True)
class LayerId:
    value: str = field(default_factory=lambda: str(uuid4()))

@dataclass(frozen=True)
class TrainingSessionId:
    value: str = field(default_factory=lambda: str(uuid4()))
```

### 1.2 Configuration Value Objects
```python
# domain/value_objects/config.py
@dataclass(frozen=True)
class ModelConfig:
    d_model: int = 512
    n_heads: int = 8
    n_layers: int = 6
    dropout: float = 0.1
    max_seq_len: int = 1000
    
@dataclass(frozen=True)
class VUSConfig:
    window_size: int = 100
    threshold_percentile: float = 0.95
    min_samples: int = 50
    
@dataclass(frozen=True)
class LearningRateConfig:
    base_lr: float = 0.001
    neighbor_influence_radius: int = 2
    adjustment_factor: float = 0.5
    min_lr: float = 1e-6
    max_lr: float = 0.1

@dataclass(frozen=True)
class SurpriseDetectionConfig:
    baseline_window_size: int = 1000
    surprise_threshold: float = 0.8
    pattern_deviation_threshold: float = 2.0
    confidence_threshold: float = 0.7
    update_frequency: int = 100

@dataclass(frozen=True)
class UnexpectedBehaviorThresholds:
    drift_threshold: float = 0.3
    pattern_change_threshold: float = 0.5
    behavior_anomaly_threshold: float = 0.8
    stability_window: int = 500

@dataclass(frozen=True)
class AlertConfig:
    email_notifications: bool = True
    slack_notifications: bool = False
    severity_levels: Dict[str, float] = field(default_factory=dict)
    cooldown_minutes: int = 30
    max_alerts_per_hour: int = 10

@dataclass(frozen=True)
class DatabaseConfig:
    db_path: str = "predictive_ai.db"
    connection_pool_size: int = 10
    query_timeout: int = 30
    backup_frequency_hours: int = 24

@dataclass(frozen=True)
class TrainingConfig:
    batch_size: int = 32
    epochs: int = 100
    validation_split: float = 0.2
    early_stopping_patience: int = 10
    checkpoint_frequency: int = 10

@dataclass(frozen=True)
class PredictionConfig:
    batch_size: int = 64
    confidence_threshold: float = 0.8
    max_sequence_length: int = 1000
    output_format: str = "json"

# ユーザー管理設定 (将来対応)
@dataclass(frozen=True)
class AuthenticationConfig:
    session_timeout_hours: int = 24
    max_login_attempts: int = 3
    password_min_length: int = 8
    require_2fa: bool = False
    jwt_secret_key: str = ""

@dataclass(frozen=True)
class UserManagementConfig:
    registration_enabled: bool = True
    email_verification_required: bool = True
    default_user_role: str = "viewer"
    max_users_per_organization: int = 100
```

### 1.3 Data Transfer Objects
```python
# domain/value_objects/data.py
@dataclass(frozen=True)
class LayerOutput:
    layer_id: LayerId
    timestamp: datetime
    tensor_data: torch.Tensor
    shape: Tuple[int, ...]
    statistics: Dict[str, float]
    
@dataclass(frozen=True)
class AnomalyScore:
    layer_id: LayerId
    neuron_index: int
    score: float
    threshold: float
    is_anomalous: bool
    timestamp: datetime
    
@dataclass(frozen=True)
class LearningRateAdjustment:
    layer_id: LayerId
    neuron_index: int
    original_lr: float
    adjusted_lr: float
    adjustment_reason: str
    timestamp: datetime

@dataclass(frozen=True)
class SurpriseEvent:
    layer_id: LayerId
    surprise_score: float
    severity_level: SurpriseSeverityLevel
    pattern_deviation: float
    timestamp: datetime
    description: str

@dataclass(frozen=True)
class SurpriseScore:
    layer_id: LayerId
    score: float
    threshold: float
    is_surprising: bool
    confidence: float
    timestamp: datetime

@dataclass(frozen=True)
class PredictionInputData:
    sequence_data: torch.Tensor
    metadata: Dict[str, Any]
    timestamp: datetime
    data_source: str

@dataclass(frozen=True)
class PredictionResult:
    prediction_id: str
    predicted_values: torch.Tensor
    confidence_scores: List[float]
    surprise_events: List[SurpriseEvent]
    processing_time: float
    timestamp: datetime

@dataclass(frozen=True)
class BatchPredictionData:
    batch_sequences: List[torch.Tensor]
    batch_metadata: List[Dict[str, Any]]
    batch_size: int
    timestamp: datetime

@dataclass(frozen=True)
class BehaviorAnalysisResult:
    session_id: TrainingSessionId
    behavior_patterns: List[BehaviorPattern]
    drift_indicators: List[DriftIndicator]
    anomaly_summary: AnomalySummary
    timestamp: datetime

@dataclass(frozen=True)
class AnomalyAlert:
    alert_id: str
    layer_id: LayerId
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    suggested_actions: List[str]
    timestamp: datetime

@dataclass(frozen=True)
class SurpriseAlert:
    alert_id: str
    surprise_event: SurpriseEvent
    impact_assessment: ImpactAssessment
    recommended_response: str
    timestamp: datetime

# ユーザー管理関連 (将来対応)
@dataclass(frozen=True)
class UserId:
    value: str = field(default_factory=lambda: str(uuid4()))

@dataclass(frozen=True)
class UserCredentials:
    username: str
    password_hash: str

@dataclass(frozen=True)
class UserProfile:
    user_id: UserId
    username: str
    email: str
    full_name: str
    role: UserRole
    created_at: datetime
    last_login: Optional[datetime]

@dataclass(frozen=True)
class SessionToken:
    token: str
    user_id: UserId
    expires_at: datetime
    created_at: datetime
```

---

## 2. Domain Layer (Entities & Domain Services)

### 2.1 Core Entities
```python
# domain/entities/model.py
class AdaptiveTransformerModel:
    def __init__(self, model_id: ModelId, config: ModelConfig):
        self.model_id = model_id
        self.config = config
        self.layer_hooks: Dict[LayerId, HookManager] = {}
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
    
    def register_layer_hook(self, layer_id: LayerId, hook: HookManager) -> None
    def get_layer_outputs(self) -> List[LayerOutput]
    def update_config(self, config: ModelConfig) -> None

# domain/entities/experiment.py
class Experiment:
    def __init__(self, experiment_id: ExperimentId, name: str, description: str):
        self.experiment_id = experiment_id
        self.name = name
        self.description = description
        self.training_sessions: List[TrainingSessionId] = []
        self.status = ExperimentStatus.CREATED
        self.created_at = datetime.now()
        self.results: Dict[str, Any] = {}
    
    def add_training_session(self, session_id: TrainingSessionId) -> None
    def update_status(self, status: ExperimentStatus) -> None
    def add_result(self, key: str, value: Any) -> None

# domain/entities/training_session.py
class TrainingSession:
    def __init__(self, session_id: TrainingSessionId, model_id: ModelId):
        self.session_id = session_id
        self.model_id = model_id
        self.layer_outputs: List[LayerOutput] = []
        self.anomaly_scores: List[AnomalyScore] = []
        self.lr_adjustments: List[LearningRateAdjustment] = []
        self.metrics: Dict[str, List[float]] = {}
        self.started_at = datetime.now()
        self.completed_at: Optional[datetime] = None
    
    def add_layer_output(self, output: LayerOutput) -> None
    def add_anomaly_score(self, score: AnomalyScore) -> None
    def add_lr_adjustment(self, adjustment: LearningRateAdjustment) -> None
    def complete_session(self) -> None
```

### 2.2 Domain Services
```python
# domain/services/anomaly_detection.py
class AnomalyDetectionService:
    def __init__(self, strategy: AnomalyDetectionStrategy):
        self.strategy = strategy
    
    def detect_anomalies(self, layer_outputs: List[LayerOutput]) -> List[AnomalyScore]
    def update_baseline(self, layer_outputs: List[LayerOutput]) -> None
    def set_strategy(self, strategy: AnomalyDetectionStrategy) -> None

# domain/services/learning_rate_adjustment.py
class LearningRateAdjustmentService:
    def __init__(self, config: LearningRateConfig):
        self.config = config
    
    def calculate_adjustments(self, anomaly_scores: List[AnomalyScore]) -> List[LearningRateAdjustment]
    def apply_neighbor_influence(self, adjustments: List[LearningRateAdjustment]) -> List[LearningRateAdjustment]

# domain/services/training_orchestration_service.py
class TrainingOrchestrationService:
    def __init__(self, 
                 model_service: ModelService,
                 anomaly_service: AnomalyDetectionService,
                 lr_service: LearningRateAdjustmentService,
                 surprise_detector: SurpriseDetector):
        self.model_service = model_service
        self.anomaly_service = anomaly_service
        self.lr_service = lr_service
        self.surprise_detector = surprise_detector
    
    def execute_training(self, training_config: TrainingConfig) -> TrainingResult
    def monitor_training_progress(self, session_id: TrainingSessionId) -> TrainingProgress

# domain/services/prediction_orchestration_service.py
class PredictionOrchestrationService:
    def __init__(self,
                 model_service: ModelService,
                 preprocessing_service: DataPreprocessingService,
                 surprise_detector: SurpriseDetector):
        self.model_service = model_service
        self.preprocessing_service = preprocessing_service
        self.surprise_detector = surprise_detector
    
    def execute_prediction(self, model_id: ModelId, input_data: PredictionInputData) -> PredictionResult
    def execute_batch_prediction(self, model_id: ModelId, batch_data: BatchPredictionData) -> BatchPredictionResult

# domain/services/experiment_orchestration_service.py
class ExperimentOrchestrationService:
    def __init__(self, 
                 training_orchestrator: TrainingOrchestrationService,
                 comparison_analyzer: ExperimentComparisonAnalyzer,
                 performance_evaluator: ModelPerformanceEvaluator):
        self.training_orchestrator = training_orchestrator
        self.comparison_analyzer = comparison_analyzer
        self.performance_evaluator = performance_evaluator
    
    def run_experiment(self, experiment_id: ExperimentId) -> ExperimentResult
    def compare_strategies(self, strategies: List[AnomalyDetectionStrategy]) -> ComparisonResult

# domain/services/surprise_detector.py
class SurpriseDetector:
    def __init__(self, config: SurpriseDetectionConfig):
        self.config = config
        self.baseline_patterns: Dict[LayerId, BaselinePattern] = {}
    
    def detect_surprise(self, layer_outputs: List[LayerOutput]) -> List[SurpriseEvent]
    def calculate_surprise_score(self, layer_output: LayerOutput) -> SurpriseScore
    def update_baseline_patterns(self, layer_outputs: List[LayerOutput]) -> None

# domain/services/unexpected_behavior_analyzer.py
class UnexpectedBehaviorAnalyzer:
    def __init__(self, threshold_config: UnexpectedBehaviorThresholds):
        self.threshold_config = threshold_config
    
    def analyze_behavior_patterns(self, training_session: TrainingSession) -> BehaviorAnalysisResult
    def detect_model_drift(self, historical_sessions: List[TrainingSession]) -> ModelDriftDetectionResult
    def generate_behavior_alerts(self, analysis_result: BehaviorAnalysisResult) -> List[BehaviorAlert]

# domain/services/anomaly_alert_manager.py
class AnomalyAlertManager:
    def __init__(self, notification_service: NotificationService):
        self.notification_service = notification_service
        self.alert_rules: List[AlertRule] = []
    
    def process_anomaly_scores(self, scores: List[AnomalyScore]) -> List[AnomalyAlert]
    def process_surprise_events(self, events: List[SurpriseEvent]) -> List[SurpriseAlert]
    def send_alerts(self, alerts: List[Alert]) -> None
```

---

## 3. Strategy Pattern (Anomaly Detection)

```python
# domain/strategies/anomaly_detection_strategy.py
from abc import ABC, abstractmethod

class AnomalyDetectionStrategy(ABC):
    @abstractmethod
    def calculate_anomaly_scores(self, layer_outputs: List[LayerOutput]) -> List[AnomalyScore]:
        pass
    
    @abstractmethod
    def update_baseline(self, layer_outputs: List[LayerOutput]) -> None:
        pass

# domain/strategies/vus_strategy.py
class VUSAnomalyDetectionStrategy(AnomalyDetectionStrategy):
    def __init__(self, config: VUSConfig):
        self.config = config
        self.baseline_distributions: Dict[LayerId, StatisticalDistribution] = {}
    
    def calculate_anomaly_scores(self, layer_outputs: List[LayerOutput]) -> List[AnomalyScore]:
        # VUS計算ロジック実装
        pass
    
    def update_baseline(self, layer_outputs: List[LayerOutput]) -> None:
        # ベースライン更新ロジック実装
        pass

# domain/strategies/statistical_strategy.py
class StatisticalAnomalyDetectionStrategy(AnomalyDetectionStrategy):
    def __init__(self, threshold_sigma: float = 2.0):
        self.threshold_sigma = threshold_sigma
        self.layer_statistics: Dict[LayerId, LayerStatistics] = {}
    
    def calculate_anomaly_scores(self, layer_outputs: List[LayerOutput]) -> List[AnomalyScore]:
        # 統計的手法による異常検知実装
        pass
```

---

## 4. Application Layer (Use Cases)

```python
# application/use_cases/train_model.py
class TrainModelUseCase:
    def __init__(self,
                 model_repo: ModelRepository,
                 session_repo: TrainingSessionRepository,
                 anomaly_service: AnomalyDetectionService,
                 lr_service: LearningRateAdjustmentService):
        self.model_repo = model_repo
        self.session_repo = session_repo
        self.anomaly_service = anomaly_service
        self.lr_service = lr_service
    
    def execute(self, model_id: ModelId, training_data: TrainingData) -> TrainingResult:
        # 学習実行ロジック
        pass

# application/use_cases/prediction_execution.py
class PredictionExecutionUseCase:
    def __init__(self,
                 model_repo: ModelRepository,
                 prediction_service: PredictionOrchestrationService,
                 surprise_detector: SurpriseDetector):
        self.model_repo = model_repo
        self.prediction_service = prediction_service
        self.surprise_detector = surprise_detector
    
    def execute(self, model_id: ModelId, input_data: PredictionInputData) -> PredictionResult:
        # 予測実行ロジック
        pass

# application/use_cases/run_experiment.py
class RunExperimentUseCase:
    def __init__(self,
                 experiment_repo: ExperimentRepository,
                 orchestrator: ExperimentOrchestrationService):
        self.experiment_repo = experiment_repo
        self.orchestrator = orchestrator
    
    def execute(self, experiment_config: ExperimentConfig) -> ExperimentResult:
        # 実験実行ロジック
        pass

# application/use_cases/analyze_results.py
class AnalyzeResultsUseCase:
    def __init__(self,
                 session_repo: TrainingSessionRepository,
                 analysis_service: ExperimentComparisonAnalyzer,
                 visualization_service: VisualizationService):
        self.session_repo = session_repo
        self.analysis_service = analysis_service
        self.visualization_service = visualization_service
    
    def execute(self, session_ids: List[TrainingSessionId]) -> AnalysisResult:
        # 結果分析ロジック
        pass

# application/use_cases/user_management.py (将来対応)
class UserRegistrationUseCase:
    def __init__(self, user_repo: UserRepository, auth_service: AuthenticationService):
        self.user_repo = user_repo
        self.auth_service = auth_service
    
    def execute(self, user_data: UserRegistrationData) -> UserRegistrationResult:
        # ユーザー登録ロジック
        pass

class UserAuthenticationUseCase:
    def __init__(self, user_repo: UserRepository, session_service: SessionManagementService):
        self.user_repo = user_repo
        self.session_service = session_service
    
    def execute(self, credentials: UserCredentials) -> AuthenticationResult:
        # ユーザー認証ロジック
        pass
```

---

## 5. Infrastructure Layer

### 5.1 Repository Implementations
```python
# infrastructure/repositories/sqlite_model_repository.py
class SQLiteModelRepository(ModelRepository):
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    def save(self, model: AdaptiveTransformerModel) -> None:
        # SQLite保存ロジック
        pass
    
    def find_by_id(self, model_id: ModelId) -> Optional[AdaptiveTransformerModel]:
        # SQLite検索ロジック
        pass
    
    def find_all(self) -> List[AdaptiveTransformerModel]:
        # SQLite全件取得ロジック
        pass

# infrastructure/repositories/sqlite_training_session_repository.py
class SQLiteTrainingSessionRepository(TrainingSessionRepository):
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    def save(self, session: TrainingSession) -> None
    def find_by_id(self, session_id: TrainingSessionId) -> Optional[TrainingSession]
    def find_by_experiment_id(self, experiment_id: ExperimentId) -> List[TrainingSession]
```

### 5.2 PyTorch Integration
```python
# infrastructure/pytorch/hook_manager.py
class HookManager:
    def __init__(self, layer_id: LayerId):
        self.layer_id = layer_id
        self.forward_hooks: List[torch.utils.hooks.RemovableHandle] = []
        self.backward_hooks: List[torch.utils.hooks.RemovableHandle] = []
        self.outputs: List[LayerOutput] = []
    
    def register_forward_hook(self, module: nn.Module) -> None
    def register_backward_hook(self, module: nn.Module) -> None
    def get_latest_output(self) -> Optional[LayerOutput]
    def clear_outputs(self) -> None

# infrastructure/pytorch/adaptive_optimizer.py
class AdaptiveOptimizer(torch.optim.Optimizer):
    def __init__(self, params, lr_adjustments: List[LearningRateAdjustment]):
        super().__init__(params, {})
        self.lr_adjustments = {adj.layer_id: adj for adj in lr_adjustments}
    
    def step(self, closure=None) -> Optional[float]:
        # カスタム学習率調整ロジック
        pass
    
    def update_learning_rates(self, adjustments: List[LearningRateAdjustment]) -> None:
        # 学習率更新ロジック
        pass

# infrastructure/services/data_preprocessing_service.py
class DataPreprocessingService:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
    
    def normalize_data(self, data: torch.Tensor) -> torch.Tensor
    def apply_moving_average(self, data: torch.Tensor, window: int) -> torch.Tensor
    def remove_outliers(self, data: torch.Tensor, threshold: float) -> torch.Tensor
    def create_sequences(self, data: torch.Tensor, seq_length: int) -> torch.Tensor

# infrastructure/services/model_performance_evaluator.py
class ModelPerformanceEvaluator:
    def __init__(self, metrics_config: Dict[str, Any]):
        self.metrics_config = metrics_config
    
    def evaluate_model(self, model: nn.Module, test_data: torch.Tensor) -> PerformanceMetrics
    def calculate_accuracy(self, predictions: torch.Tensor, targets: torch.Tensor) -> float
    def calculate_f1_score(self, predictions: torch.Tensor, targets: torch.Tensor) -> float
    def generate_performance_report(self, metrics: PerformanceMetrics) -> PerformanceReport

# infrastructure/services/experiment_comparison_analyzer.py
class ExperimentComparisonAnalyzer:
    def __init__(self, comparison_config: ComparisonConfig):
        self.comparison_config = comparison_config
    
    def compare_experiments(self, experiment_ids: List[ExperimentId]) -> ComparisonResult
    def analyze_performance_differences(self, results: List[ExperimentResult]) -> PerformanceDifference
    def generate_comparison_report(self, comparison: ComparisonResult) -> ComparisonReport

# infrastructure/services/visualization_service.py
class VisualizationService:
    def __init__(self, chart_config: ChartConfig):
        self.chart_config = chart_config
    
    def create_training_progress_chart(self, session: TrainingSession) -> ChartData
    def create_anomaly_heatmap(self, anomaly_scores: List[AnomalyScore]) -> ChartData
    def create_comparison_charts(self, comparison_result: ComparisonResult) -> List[ChartData]
    def create_surprise_timeline(self, surprise_events: List[SurpriseEvent]) -> ChartData

# infrastructure/services/realtime_monitoring_service.py
class RealtimeMonitoringService:
    def __init__(self, websocket_config: WebSocketConfig):
        self.websocket_config = websocket_config
        self.active_connections: Set[WebSocket] = set()
    
    def broadcast_training_progress(self, progress: TrainingProgress) -> None
    def broadcast_anomaly_alert(self, alert: AnomalyAlert) -> None
    def broadcast_surprise_event(self, event: SurpriseEvent) -> None
    def add_connection(self, websocket: WebSocket) -> None

# infrastructure/services/notification_service.py
class NotificationService:
    def __init__(self, notification_config: NotificationConfig):
        self.notification_config = notification_config
    
    def send_email_notification(self, alert: Alert) -> NotificationResult
    def send_slack_notification(self, alert: Alert) -> NotificationResult
    def send_webhook_notification(self, alert: Alert) -> NotificationResult

# infrastructure/user_management (将来対応)
class AuthenticationService:
    def __init__(self, auth_config: AuthenticationConfig):
        self.auth_config = auth_config
    
    def authenticate_user(self, credentials: UserCredentials) -> AuthenticationResult
    def generate_session_token(self, user_id: UserId) -> SessionToken
    def validate_session_token(self, token: str) -> SessionValidationResult
    def logout_user(self, token: str) -> None

class SessionManagementService:
    def __init__(self, session_config: Dict[str, Any]):
        self.session_config = session_config
        self.active_sessions: Dict[str, SessionToken] = {}
    
    def create_session(self, user_id: UserId) -> SessionToken
    def validate_session(self, token: str) -> bool
    def refresh_session(self, token: str) -> SessionToken
    def destroy_session(self, token: str) -> None
```

---

## 6. Presentation Layer

```python
# presentation/cli/commands.py
class TrainCommand:
    def __init__(self, train_use_case: TrainModelUseCase):
        self.train_use_case = train_use_case
    
    def execute(self, args: argparse.Namespace) -> None:
        # CLI実行ロジック
        pass

class ExperimentCommand:
    def __init__(self, experiment_use_case: RunExperimentUseCase):
        self.experiment_use_case = experiment_use_case
    
    def execute(self, args: argparse.Namespace) -> None:
        # 実験実行ロジック
        pass

# presentation/api/endpoints.py (FastAPI使用想定)
class ModelEndpoints:
    def __init__(self, 
                 train_use_case: TrainModelUseCase,
                 prediction_use_case: PredictionExecutionUseCase):
        self.train_use_case = train_use_case
        self.prediction_use_case = prediction_use_case
    
    @router.post("/models/{model_id}/train")
    async def train_model(self, model_id: str, request: TrainRequest) -> TrainResponse:
        # 学習実行API
        pass
    
    @router.post("/models/{model_id}/predict")
    async def predict(self, model_id: str, request: PredictionRequest) -> PredictionResponse:
        # 予測実行API
        pass
    
    @router.get("/models/{model_id}/status")
    async def get_model_status(self, model_id: str) -> ModelStatusResponse:
        # モデル状態取得API
        pass

class DataEndpoints:
    def __init__(self, data_management_use_case: DataManagementUseCase):
        self.data_management_use_case = data_management_use_case
    
    @router.post("/data/upload")
    async def upload_data(self, file: UploadFile) -> DataUploadResponse:
        # データアップロードAPI
        pass
    
    @router.get("/data")
    async def list_datasets(self) -> DataListResponse:
        # データ一覧取得API
        pass

class ExperimentEndpoints:
    def __init__(self, experiment_use_case: RunExperimentUseCase):
        self.experiment_use_case = experiment_use_case
    
    @router.post("/experiments")
    async def create_experiment(self, request: CreateExperimentRequest) -> ExperimentResponse:
        # 実験作成API
        pass
    
    @router.get("/experiments/{experiment_id}/results")
    async def get_experiment_results(self, experiment_id: str) -> ExperimentResultsResponse:
        # 実験結果取得API
        pass

# presentation/websocket/realtime_endpoints.py
class RealtimeEndpoints:
    def __init__(self, monitoring_service: RealtimeMonitoringService):
        self.monitoring_service = monitoring_service
    
    @router.websocket("/ws/training/{session_id}")
    async def training_progress_websocket(self, websocket: WebSocket, session_id: str):
        # 学習進捗リアルタイム配信
        pass
    
    @router.websocket("/ws/alerts")
    async def alerts_websocket(self, websocket: WebSocket):
        # アラートリアルタイム配信
        pass

# presentation/webui/dashboard_controller.py
class DashboardController:
    def __init__(self,
                 model_service: ModelService,
                 training_service: TrainingOrchestrationService,
                 alert_manager: AnomalyAlertManager):
        self.model_service = model_service
        self.training_service = training_service
        self.alert_manager = alert_manager
    
    async def get_dashboard_data(self) -> DashboardData:
        # ダッシュボードデータ取得
        pass
    
    async def get_active_models(self) -> List[ModelSummary]:
        # アクティブモデル取得
        pass

# presentation/webui/training_controller.py
class TrainingController:
    def __init__(self, 
                 training_use_case: TrainModelUseCase,
                 visualization_service: VisualizationService):
        self.training_use_case = training_use_case
        self.visualization_service = visualization_service
    
    async def start_training(self, request: StartTrainingRequest) -> TrainingResponse:
        # 学習開始
        pass
    
    async def get_training_charts(self, session_id: str) -> List[ChartData]:
        # 学習チャートデータ取得
        pass

# presentation/webui/prediction_controller.py
class PredictionController:
    def __init__(self, 
                 prediction_use_case: PredictionExecutionUseCase,
                 surprise_detector: SurpriseDetector):
        self.prediction_use_case = prediction_use_case
        self.surprise_detector = surprise_detector
    
    async def execute_prediction(self, request: WebPredictionRequest) -> WebPredictionResponse:
        # Web予測実行
        pass
    
    async def get_prediction_history(self, model_id: str) -> PredictionHistoryResponse:
        # 予測履歴取得
        pass

# presentation/webui/analysis_controller.py
class AnalysisController:
    def __init__(self,
                 analysis_use_case: AnalyzeResultsUseCase,
                 comparison_analyzer: ExperimentComparisonAnalyzer):
        self.analysis_use_case = analysis_use_case
        self.comparison_analyzer = comparison_analyzer
    
    async def compare_experiments(self, request: ComparisonRequest) -> ComparisonResponse:
        # 実験比較実行
        pass
    
    async def generate_analysis_report(self, experiment_ids: List[str]) -> AnalysisReportResponse:
        # 分析レポート生成
        pass
```

---

## 7. Configuration Management

```python
# infrastructure/config/config_loader.py
class ConfigLoader:
    @staticmethod
    def load_from_yaml(file_path: str) -> ApplicationConfig:
        # YAML読み込みロジック
        pass
    
    @staticmethod  
    def load_from_toml(file_path: str) -> ApplicationConfig:
        # TOML読み込みロジック
        pass

# domain/value_objects/application_config.py
@dataclass(frozen=True)
class ApplicationConfig:
    model_config: ModelConfig
    vus_config: VUSConfig
    lr_config: LearningRateConfig
    surprise_detection_config: SurpriseDetectionConfig
    alert_config: AlertConfig
    database_config: DatabaseConfig
    training_config: TrainingConfig
    prediction_config: PredictionConfig
    # 将来対応
    authentication_config: Optional[AuthenticationConfig] = None
    user_management_config: Optional[UserManagementConfig] = None

# Enum型定義
from enum import Enum

class SurpriseSeverityLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertType(Enum):
    ANOMALY = "anomaly"
    SURPRISE = "surprise"
    PERFORMANCE = "performance"
    SYSTEM = "system"

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class ExperimentStatus(Enum):
    CREATED = "created"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class UserRole(Enum):
    ADMIN = "admin"
    RESEARCHER = "researcher"
    VIEWER = "viewer"
    GUEST = "guest"

class ModelStatus(Enum):
    CREATED = "created"
    TRAINING = "training"
    READY = "ready"
    FAILED = "failed"
    ARCHIVED = "archived"
```

---

## 8. Dependency Injection Container

```python
# infrastructure/di/container.py
class DIContainer:
    def __init__(self, config: ApplicationConfig):
        self.config = config
        self._instances: Dict[Type, Any] = {}
    
    def get_model_repository(self) -> ModelRepository:
        if ModelRepository not in self._instances:
            self._instances[ModelRepository] = SQLiteModelRepository(self.config.database_config.db_path)
        return self._instances[ModelRepository]
    
    def get_train_use_case(self) -> TrainModelUseCase:
        return TrainModelUseCase(
            model_repo=self.get_model_repository(),
            session_repo=self.get_session_repository(),
            anomaly_service=self.get_anomaly_service(),
            lr_service=self.get_lr_service()
        )
```

---

## テスト戦略

### 単体テスト例
```python
# tests/unit/domain/test_training_session.py
class TestTrainingSession:
    def test_add_layer_output(self):
        session_id = TrainingSessionId()
        model_id = ModelId()
        session = TrainingSession(session_id, model_id)
        
        layer_output = LayerOutput(
            layer_id=LayerId(),
            timestamp=datetime.now(),
            tensor_data=torch.randn(10, 512),
            shape=(10, 512),
            statistics={"mean": 0.1, "std": 1.0}
        )
        
        session.add_layer_output(layer_output)
        assert len(session.layer_outputs) == 1
        assert session.layer_outputs[0] == layer_output
```

### インテグレーションテスト例
```python
# tests/integration/test_train_use_case.py
class TestTrainModelUseCase:
    def test_execute_training(self):
        container = DIContainer(test_config)
        use_case = container.get_train_use_case()
        
        model_id = ModelId()
        training_data = create_test_training_data()
        
        result = use_case.execute(model_id, training_data)
        
        assert result.success
        assert result.session_id is not None
```

---

---

## 9. クラス命名規則とクラス一覧

### 9.1 命名規則
- **ID系**: `{Entity}Id` (例: ModelId, UserId)
- **Config系**: `{Domain}Config` (例: ModelConfig, VUSConfig)
- **Service系**: `{Domain}{Operation}Service` (例: AnomalyDetectionService)
- **Repository系**: `{Entity}Repository` (例: ModelRepository)
- **UseCase系**: `{Action}{Entity}UseCase` (例: TrainModelUseCase)
- **Controller系**: `{Domain}Controller` (例: TrainingController)
- **Strategy系**: `{Domain}Strategy` (例: VUSAnomalyDetectionStrategy)
- **Event系**: `{Domain}Event` (例: SurpriseEvent)
- **Alert系**: `{Domain}Alert` (例: AnomalyAlert, SurpriseAlert)

### 9.2 全クラス一覧（アルファベット順）

#### A
- AdaptiveOptimizer
- AdaptiveTransformerModel
- AlertConfig
- AnalysisController
- AnalyzeResultsUseCase
- AnomalyAlert
- AnomalyAlertManager
- AnomalyDetectionService
- AnomalyDetectionStrategy
- AnomalyScore
- ApplicationConfig
- AuthenticationConfig
- AuthenticationService

#### B
- BatchPredictionData
- BehaviorAnalysisResult

#### C
- ConfigLoader

#### D
- DashboardController
- DataEndpoints
- DataManagementUseCase
- DatabaseConfig
- DataPreprocessingService
- DIContainer

#### E
- Experiment
- ExperimentComparisonAnalyzer
- ExperimentEndpoints
- ExperimentId
- ExperimentOrchestrationService
- ExperimentStatus (Enum)

#### H
- HookManager

#### L
- LayerId
- LayerOutput
- LearningRateAdjustment
- LearningRateAdjustmentService
- LearningRateConfig

#### M
- ModelConfig
- ModelEndpoints
- ModelId
- ModelPerformanceEvaluator
- ModelStatus (Enum)

#### N
- NotificationService

#### P
- PredictionConfig
- PredictionController
- PredictionExecutionUseCase
- PredictionInputData
- PredictionOrchestrationService
- PredictionResult

#### R
- RealtimeEndpoints
- RealtimeMonitoringService
- RunExperimentUseCase

#### S
- SessionManagementService
- SessionToken
- SQLiteModelRepository
- SQLiteTrainingSessionRepository
- StatisticalAnomalyDetectionStrategy
- SurpriseAlert
- SurpriseDetectionConfig
- SurpriseDetector
- SurpriseEvent
- SurpriseScore
- SurpriseSeverityLevel (Enum)

#### T
- TrainingConfig
- TrainingController
- TrainingOrchestrationService
- TrainingSession
- TrainingSessionId
- TrainingSessionRepository
- TrainModelUseCase

#### U
- UnexpectedBehaviorAnalyzer
- UnexpectedBehaviorThresholds
- UserAuthenticationUseCase
- UserCredentials
- UserId
- UserManagementConfig
- UserProfile
- UserRegistrationUseCase
- UserRole (Enum)

#### V
- VisualizationService
- VUSAnomalyDetectionStrategy
- VUSConfig

### 9.3 重複回避のための予約語
以下の名前は既に使用されているため、新規クラス作成時は避けること：

- **Model関連**: Model, ModelService, ModelManager
- **Training関連**: Trainer, TrainingManager, TrainingService
- **Prediction関連**: Predictor, PredictionManager, PredictionService
- **Anomaly関連**: AnomalyDetector, AnomalyManager, AnomalyProcessor
- **Surprise関連**: SurpriseManager, SurpriseProcessor, SurpriseService
- **Data関連**: DataManager, DataService, DataProcessor

---

**設計のポイント:**
1. **ID管理**: 各エンティティにUUID-based IDを付与し、テスト時の独立性を確保
2. **層分離**: クリーンアーキテクチャによる依存関係の明確化
3. **Strategy Pattern**: 異常検知手法の切り替えを容易に
4. **Repository Pattern**: データ永続化の抽象化
5. **DI Container**: テストしやすい依存関係管理
6. **Value Objects**: 不変オブジェクトによる安全性確保
7. **WebUI統合**: リアルタイム監視とインタラクティブな操作を支援
8. **驚き検出**: 予期しない動作パターンの検出とアラート機能
9. **将来拡張**: ユーザー管理・認証機能への対応準備

**技術スタック:**
- Backend: FastAPI + SQLite + PyTorch
- Frontend: React/Vue.js + WebSocket
- Configuration: YAML/TOML
- Testing: pytest + mock

次に、具体的な実装に入りましょうか？どのクラスから開始しますか？