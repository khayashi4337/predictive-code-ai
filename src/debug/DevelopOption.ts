/**
 * 開発用のオプションを管理するクラス。
 * 各テストケースの実行を個別に制御するための静的フラグを提供します。
 */
export class DevelopOption {
  /**
   * SD-01: 概念→パターンの基本往復
   * このフラグを true にすると、対応するテストが実行されます。
   */
  public static isExecute_SD_01 = true;

  /**
   * SD-02: (将来のテストケース用のプレースホルダ)
   */
  public static isExecute_SD_02 = false;

  // --- 今後、テストケースを追加するたびに、ここにフラグを追加します --- //
  public static isExecute_SD_03 = true;

  public static readonly isExecute_SD_04 = true;
  public static readonly isSkip_SD_04_mock_tests = true;

  /**
   * SD-05: 海馬の判定基準の分散化
   * シーケンス図の流れに対応するテストケース用フラグ
   */
  public static readonly isExecute_SD_05_create_basis = true;
  public static readonly isExecute_SD_05_decentralize = true;
  public static readonly isExecute_SD_05_delegate = true;

  /**
   * SD-06: スキップ三値分岐
   * シーケンス図の流れに対応するテストケース用フラグ
   */
  public static readonly isExecute_SD_06_full_skip = true;
  public static readonly isExecute_SD_06_partial_update = true;
  public static readonly isExecute_SD_06_focused_calculation = true;

  /**
   * SD-07: 学習率動的調整＋更新スコープ配布
   * シーケンス図の流れに対応するテストケース用フラグ
   */
  public static readonly isExecute_SD_07_learning_rate_adjust = true;
  public static readonly isExecute_SD_07_scope_distribution = true;
  public static readonly isExecute_SD_07_signal_notification = true;

  /**
   * SD-08: 距離メトリクス動的切替
   * シーケンス図の流れに対応するテストケース用フラグ
   */
  public static readonly isExecute_SD_08_factory_resolve = true;
  public static readonly isExecute_SD_08_metric_switching = true;
  public static readonly isExecute_SD_08_difference_generation = true;

  /**
   * SD-09: 低Δの省エネ（早期終了）
   * シーケンス図の流れに対応するテストケース用フラグ
   */
  public static readonly isExecute_SD_09_skip_judgment = true;
  public static readonly isExecute_SD_09_early_termination = true;
  public static readonly isExecute_SD_09_threshold_evaluation = true;

  /**
   * SD-10: 行動計画の相対判定（行動↔概念）
   * シーケンス図の流れに対応するテストケース用フラグ
   */
  public static readonly isExecute_SD_10_action_plan_propagation = true;
  public static readonly isExecute_SD_10_execution_and_capture = true;
  public static readonly isExecute_SD_10_difference_calculation = true;
  public static readonly isExecute_SD_10_concept_integration = true;

  /**
   * SD-11: 行動→外界→感覚/自己受容の往復
   * シーケンス図の流れに対応するテストケース用フラグ
   */
  public static readonly isExecute_SD_11_action_to_world = true;
  public static readonly isExecute_SD_11_world_to_sense = true;
  public static readonly isExecute_SD_11_proprioception_feedback = true;
  public static readonly isExecute_SD_11_sense_to_action_feedback = true;

  /**
   * SD-12: 運動予測コピーによる視床ゲート調整
   * シーケンス図の流れに対応するテストケース用フラグ
   */
  public static readonly isExecute_SD_12_efference_copy_emission = true;
  public static readonly isExecute_SD_12_thalamus_gate_adjustment = true;
  public static readonly isExecute_SD_12_threshold_update = true;

  /**
   * SD-13: 巨大Δの非常導線（驚愕→介入）
   * シーケンス図の流れに対応するテストケース用フラグ
   */
  public static readonly isExecute_SD_13_huge_delta_detection = true;
  public static readonly isExecute_SD_13_emergency_intervention = true;
  public static readonly isExecute_SD_13_hippocampus_alert = true;
  public static readonly isExecute_SD_13_thalamus_gate_override = true;

  /**
   * SD-14: Δストーム時のバックプレッシャ制御
   * シーケンス図の流れに対応するテストケース用フラグ
   */
  public static readonly isExecute_SD_14_event_queue_monitoring = true;
  public static readonly isExecute_SD_14_backpressure_control = true;
  public static readonly isExecute_SD_14_priority_processing = true;

  /**
   * SD-15: コールドスタート（期待未成熟）
   * シーケンス図の流れに対応するテストケース用フラグ
   */
  public static readonly isExecute_SD_15_cold_start_initialization = true;
  public static readonly isExecute_SD_15_pattern_buffering = true;
  public static readonly isExecute_SD_15_expectation_formation = true;

  /**
   * generateExpectedPattern のモック実装を有効にするフラグ
   * true の場合、渡されたコンテキストをそのまま返すモック実装を使用します。
   */
  public static isGenerateExpectedPatternMock = true;
}
