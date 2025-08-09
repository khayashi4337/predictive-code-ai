#!/usr/bin/env python3
"""
Sin波予測結果の可視化ツール
"""

import sys
import os
import csv

# プロジェクトルートをPythonパスに追加
sys.path.append(os.path.dirname(__file__))

from src.application.use_cases.prediction_use_case import PredictionUseCase, load_trained_model


def create_simple_plot(title: str, data_dict: dict, filename: str):
    """
    matplotlibを使わずにASCIIアートでのシンプルなプロット
    """
    print(f"\n📊 {title}")
    print("=" * 60)
    
    # データを取得
    if 'predictions' in data_dict and 'actual_values' in data_dict:
        predictions = data_dict['predictions'][:20]  # 最初の20個
        actual_values = data_dict['actual_values'][:20]
        
        print("インデックス | 予測値   | 実際値   | 差分")
        print("-" * 45)
        
        total_error = 0
        count = 0
        
        for i in range(min(len(predictions), len(actual_values))):
            pred = predictions[i]
            actual = actual_values[i]
            diff = abs(pred - actual)
            total_error += diff
            count += 1
            
            print(f"{i+1:8d} | {pred:8.4f} | {actual:8.4f} | {diff:8.4f}")
        
        if count > 0:
            avg_error = total_error / count
            print("-" * 45)
            print(f"平均絶対誤差: {avg_error:.6f}")
    
    # CSVファイルに結果を保存
    if 'predictions' in data_dict and 'actual_values' in data_dict:
        with open(filename, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['index', 'prediction', 'actual', 'error'])
            
            for i in range(min(len(data_dict['predictions']), len(data_dict['actual_values']))):
                pred = data_dict['predictions'][i]
                actual = data_dict['actual_values'][i]
                error = abs(pred - actual)
                writer.writerow([i+1, pred, actual, error])
        
        print(f"📁 詳細結果を保存しました: {filename}")


def visualize_training_history(history: dict):
    """学習履歴の簡単な表示"""
    if not history or 'train_loss' not in history:
        print("学習履歴データがありません")
        return
    
    print("\n📈 学習履歴")
    print("=" * 40)
    print("エポック | 訓練損失 | 検証損失")
    print("-" * 35)
    
    epochs = history.get('epoch', [])
    train_losses = history.get('train_loss', [])
    val_losses = history.get('val_loss', [])
    
    # 10エポックごと、または最後の5エポックを表示
    display_indices = []
    for i in range(0, len(epochs), max(1, len(epochs) // 10)):
        display_indices.append(i)
    
    # 最後の5エポックを追加
    for i in range(max(0, len(epochs) - 5), len(epochs)):
        if i not in display_indices:
            display_indices.append(i)
    
    for i in sorted(display_indices):
        if i < len(epochs):
            epoch = epochs[i]
            train_loss = train_losses[i] if i < len(train_losses) else 0
            val_loss = val_losses[i] if i < len(val_losses) else 0
            print(f"{epoch:6d} | {train_loss:8.6f} | {val_loss:8.6f}")


def main():
    """メイン実行関数"""
    print("🎨 Sin波予測結果可視化ツール")
    print("=" * 50)
    
    model_path = "models/checkpoints/sin_predictor.pth"
    data_path = "data/sin_wave.csv"
    
    # ファイルの存在チェック
    if not os.path.exists(model_path):
        print(f"❌ モデルファイルが見つかりません: {model_path}")
        print("まず main.py --mode train でモデルを学習してください")
        return
    
    if not os.path.exists(data_path):
        print(f"❌ データファイルが見つかりません: {data_path}")
        print("まず python generate_sin_data.py でデータを生成してください")
        return
    
    try:
        # モデル読み込み
        print("🔄 モデルを読み込んでいます...")
        model, config = load_trained_model(model_path)
        predictor = PredictionUseCase(model, config)
        
        # 複数の開始点で予測を実行
        start_points = [50, 200, 400, 600]
        
        for start_idx in start_points:
            print(f"\n🔮 開始インデックス {start_idx} からの予測:")
            
            try:
                # 予測実行
                result = predictor.predict_from_csv(
                    data_path,
                    start_index=start_idx,
                    prediction_steps=30
                )
                
                # 評価
                metrics = predictor.evaluate_predictions(
                    result['predictions'],
                    result['actual_values']
                )
                
                # 結果表示
                print(f"  予測ステップ数: {len(result['predictions'])}")
                print(f"  MSE: {metrics['mse']:.6f}")
                print(f"  MAE: {metrics['mae']:.6f}")
                print(f"  相関係数: {metrics['correlation']:.6f}")
                
                # 詳細可視化
                output_file = f"results/prediction_{start_idx}.csv"
                os.makedirs("results", exist_ok=True)
                create_simple_plot(
                    f"予測結果 (開始:{start_idx})",
                    result,
                    output_file
                )
                
            except Exception as e:
                print(f"  ❌ 開始インデックス {start_idx} での予測に失敗: {e}")
        
        print("\n✅ 可視化処理完了!")
        print("📁 結果ファイルは results/ フォルダに保存されました")
        
    except Exception as e:
        print(f"❌ 可視化処理中にエラーが発生しました: {e}")


if __name__ == "__main__":
    main()