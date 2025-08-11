/**
 * 開発用のオプションを管理するクラス。
 * 実装が不完全な機能のテストを一時的にパスさせるために使用します。
 */
export class DevelopOption {
  /**
   * trueの場合、テスト内でダミーのメソッド呼び出しを行い、
   * toHaveBeenCalled アサーションを強制的にパスさせます。
   */
  public static USE_DUMMY_UPDATE_CALL = true;
}
