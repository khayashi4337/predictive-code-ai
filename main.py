#!/usr/bin/env python3
"""
Sin波予測AI - メイン実行ファイル
自由エネルギー原理に基づく予測符号化AIの基本実装
"""

import argparse
import os
import sys
from typing import Dict

# プロジェクトルートをPythonパスに追加
sys.path.append(os.path.dirname(__file__))

from src.domain.entities.simple_model import ModelConfig
from src.application.use_cases.train_model_use_case import TrainModelUseCase
from src.application.use_cases.prediction_use_case import PredictionUseCase, load_trained_model


def train_mode(args) -> Dict:
    """学習モード"""
    print("Sin波予測AIの学習を開始します...")
    
    # 設定
    config = ModelConfig()
    config.max_epochs = args.epochs
    config.batch_size = args.batch_size
    config.learning_rate = args.learning_rate
    config.input_size = args.input_size
    config.hidden_size = args.hidden_size
    
    # データファイルが存在しない場合は生成
    if not os.path.exists(args.data):
        print(f"データファイルが見つかりません: {args.data}")
        print("Sin波データを生成しています...")
        
        # データ生成スクリプトを実行
        os.system("python generate_sin_data.py")
        
        if not os.path.exists(args.data):
            print("データファイルの生成に失敗しました")
            return {'success': False}
    
    # 学習実行
    trainer = TrainModelUseCase(config)
    try:
        result = trainer.train(args.data)
        
        # モデル保存
        model_path = args.model or "models/checkpoints/sin_predictor.pth"
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        trainer.save_model(result['model'], model_path)
        
        print(f"学習完了! モデルを保存しました: {model_path}")
        return {'success': True, 'result': result, 'model_path': model_path}
        
    except Exception as e:
        print(f"学習中にエラーが発生しました: {e}")
        return {'success': False, 'error': str(e)}


def predict_mode(args) -> Dict:
    """予測モード"""
    print("Sin波予測を実行します...")
    
    model_path = args.model or "models/checkpoints/sin_predictor.pth"
    
    if not os.path.exists(model_path):
        print(f"モデルファイルが見つかりません: {model_path}")
        print("まず --mode train でモデルを学習してください")
        return {'success': False}
    
    try:
        # モデル読み込み
        model, config = load_trained_model(model_path)
        predictor = PredictionUseCase(model, config)
        
        # 予測実行
        result = predictor.predict_from_csv(
            args.data, 
            start_index=args.start_index,
            prediction_steps=args.steps
        )
        
        # 評価
        metrics = predictor.evaluate_predictions(
            result['predictions'], 
            result['actual_values']
        )
        
        # 結果表示
        print(f"\n予測結果:")
        print(f"  開始インデックス: {args.start_index}")
        print(f"  予測ステップ数: {len(result['predictions'])}")
        print(f"  データ範囲: {metrics['data_range']:.4f}")
        
        print(f"\n基本統計:")
        print(f"  MSE: {metrics['mse']:.6f}")
        print(f"  MAE: {metrics['mae']:.6f}")
        print(f"  RMSE: {metrics['rmse']:.6f}")
        print(f"  相関係数: {metrics['correlation']:.6f}")
        print(f"  決定係数 (R²): {metrics['r_squared']:.6f}")
        
        print(f"\n誤差統計:")
        print(f"  誤差標準偏差: {metrics['error_std']:.6f}")
        print(f"  誤差分散: {metrics['error_var']:.6f}")
        print(f"  最大誤差: {metrics['max_error']:.6f}")
        print(f"  最小誤差: {metrics['min_error']:.6f}")
        print(f"  誤差中央値: {metrics['error_median']:.6f}")
        print(f"  95%タイル誤差: {metrics['error_95th_percentile']:.6f}")
        print(f"  75%タイル誤差: {metrics['error_75th_percentile']:.6f}")
        
        print(f"\n正規化指標:")
        print(f"  正規化RMSE: {metrics['normalized_rmse']:.4f}")
        print(f"  MAE/データ範囲比: {metrics['accuracy_assessment']['mae_ratio']:.4f}")
        
        # 精度評価
        assessment = metrics['accuracy_assessment']
        print(f"\n精度評価:")
        print(f"  総合評価: {assessment['level']}")
        print(f"  許容可能: {'はい' if assessment['acceptable'] else 'いいえ'}")
        print(f"  総合スコア: {assessment['overall_score']}/3")
        print(f"  - 相関スコア: {assessment['correlation_score']}/3")
        print(f"  - 決定係数スコア: {assessment['r_squared_score']}/3")  
        print(f"  - RMSE正規化スコア: {assessment['normalized_rmse_score']}/3")
        print(f"  - MAE比率スコア: {assessment['mae_ratio_score']}/3")
        print(f"  推奨: {assessment['recommendation']}")
        
        # サンプル表示
        print(f"\n予測値サンプル (最初の10個):")
        for i in range(min(10, len(result['predictions']))):
            pred = result['predictions'][i]
            actual = result['actual_values'][i] if i < len(result['actual_values']) else "N/A"
            error = abs(pred - actual) if isinstance(actual, float) else "N/A"
            print(f"  {i+1:2d}: 予測={pred:7.4f}, 実際={actual:7.4f}, 誤差={error}")
        
        print(f"予測完了!")
        return {'success': True, 'result': result, 'metrics': metrics}
        
    except Exception as e:
        print(f"予測中にエラーが発生しました: {e}")
        return {'success': False, 'error': str(e)}


def generate_data_mode(args) -> Dict:
    """データ生成モード"""
    print("Sin波データを生成します...")
    
    try:
        # データ生成スクリプトを実行
        os.system("python generate_sin_data.py")
        
        if os.path.exists("data/sin_wave.csv"):
            print("Sin波データを生成しました: data/sin_wave.csv")
            return {'success': True}
        else:
            print("データファイルの生成に失敗しました")
            return {'success': False}
            
    except Exception as e:
        print(f"データ生成中にエラーが発生しました: {e}")
        return {'success': False, 'error': str(e)}


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(
        description="Sin波予測AI - 自由エネルギー原理に基づく予測符号化AIの基本実装",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # 基本引数
    parser.add_argument('--mode', choices=['train', 'predict', 'generate'], 
                       required=True, help='実行モード')
    parser.add_argument('--data', default='data/sin_wave.csv', 
                       help='データファイルのパス')
    parser.add_argument('--model', default='models/checkpoints/sin_predictor.pth',
                       help='モデルファイルのパス')
    
    # 学習用引数
    parser.add_argument('--epochs', type=int, default=50, 
                       help='学習エポック数')
    parser.add_argument('--batch-size', type=int, default=32, 
                       help='バッチサイズ')
    parser.add_argument('--learning-rate', type=float, default=0.001, 
                       help='学習率')
    parser.add_argument('--input-size', type=int, default=10, 
                       help='入力シーケンス長')
    parser.add_argument('--hidden-size', type=int, default=64, 
                       help='隠れ層サイズ')
    
    # 予測用引数
    parser.add_argument('--start-index', type=int, default=100, 
                       help='予測開始インデックス')
    parser.add_argument('--steps', type=int, default=50, 
                       help='予測ステップ数')
    
    args = parser.parse_args()
    
    # ヘッダー表示
    print("=" * 60)
    print("Sin波予測AI - 自由エネルギー原理ベース実装")
    print("=" * 60)
    
    # モード別実行
    if args.mode == 'train':
        result = train_mode(args)
    elif args.mode == 'predict':
        result = predict_mode(args)
    elif args.mode == 'generate':
        result = generate_data_mode(args)
    else:
        print("不正なモードが指定されました")
        result = {'success': False}
    
    # 終了
    if result['success']:
        print("\n処理が正常に完了しました!")
        sys.exit(0)
    else:
        print("\n処理が失敗しました")
        sys.exit(1)


if __name__ == "__main__":
    main()