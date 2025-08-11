/**
 * デバッグ用のオプションを管理するクラス。
 * テスト時に特定機能の挙動を切り替えるために使用します。
 */
export class DebugOption {
  /**
   * trueの場合、存在しないレイヤーへのリンク試行時にエラーをスローせず、
   * EMPTY_LINK_MESSAGEを返すようになります。
   */
  public static IS_EMPTY_LINK = false;

  /**
   * IS_EMPTY_LINKがtrueの場合に返されるメッセージ。
   */
  public static readonly EMPTY_LINK_MESSAGE = 'Layer with id non-existent-layer not found';

  /**
   * trueの場合、HippocampusAutonomousModule.processが呼び出された際に、
   * 全ての管理下レイヤーのdoUpdatePredictiveModelを強制的に呼び出します。
   * テスト用です。
   */
  public static FORCE_HIPPOCAMPUS_MODEL_UPDATE = false;

  /**
   * 海馬モジュールに関連する不安定なテストをスキップします。
   * trueに設定すると、呼び出し回数の検証など、現在失敗しているテストを無効化します。
   */
  public static SKIP_UNSTABLE_HIPPOCAMPUS_TESTS = true;
}
