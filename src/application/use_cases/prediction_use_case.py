import torch
import numpy as np
import csv
import sys
import os
from typing import List, Dict, Tuple, Optional

# プロジェクトルートをPythonパスに追加
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))

from src.domain.entities.simple_model import SimpleSinPredictor, ImprovedSinPredictor, ModelConfig


class PredictionUseCase:
    """予測実行のユースケース"""
    
    def __init__(self, model: SimpleSinPredictor, config: ModelConfig):
        self.model = model
        self.config = config
        self.device = config.device
        
        # 評価モードに設定
        self.model.eval()
        
    def predict_single(self, input_sequence: List[float]) -> float:
        """
        単一の予測を実行
        
        Args:
            input_sequence: 入力シーケンス（過去のデータポイント）
            
        Returns:
            予測値
        """
        if len(input_sequence) != self.config.input_size:
            raise ValueError(f"入力シーケンスの長さは{self.config.input_size}である必要があります")
        
        # テンソルに変換
        input_tensor = torch.tensor(input_sequence, dtype=torch.float32).unsqueeze(0)
        input_tensor = input_tensor.to(self.device)
        
        # 予測実行
        with torch.no_grad():
            prediction = self.model(input_tensor)
            
        return prediction.cpu().item()
    
    def predict_sequence(self, initial_sequence: List[float], 
                        steps: int) -> List[float]:
        """
        複数ステップの予測を実行（自己回帰的予測）
        
        Args:
            initial_sequence: 初期シーケンス
            steps: 予測ステップ数
            
        Returns:
            予測シーケンス
        """
        if len(initial_sequence) != self.config.input_size:
            raise ValueError(f"初期シーケンスの長さは{self.config.input_size}である必要があります")
        
        predictions = []
        current_sequence = initial_sequence.copy()
        
        for _ in range(steps):
            # 1ステップ予測
            next_pred = self.predict_single(current_sequence)
            predictions.append(next_pred)
            
            # シーケンスを更新（最古の要素を削除、新しい予測を追加）
            current_sequence = current_sequence[1:] + [next_pred]
        
        return predictions
    
    def predict_from_csv(self, csv_file: str, 
                        start_index: int = 0, 
                        prediction_steps: int = 50) -> Dict:
        """
        CSVファイルからデータを読み込んで予測
        
        Args:
            csv_file: CSVファイルパス
            start_index: 予測開始インデックス
            prediction_steps: 予測ステップ数
            
        Returns:
            予測結果の辞書
        """
        # CSVファイルを読み込み
        data = self._load_csv_data(csv_file)
        
        if start_index + self.config.input_size >= len(data):
            raise ValueError("開始インデックスが大きすぎます")
        
        # 初期シーケンスを取得
        initial_sequence = data[start_index:start_index + self.config.input_size]
        
        # 予測実行
        predictions = self.predict_sequence(initial_sequence, prediction_steps)
        
        # 実際の値を取得（比較用）
        actual_end = min(start_index + self.config.input_size + prediction_steps, len(data))
        actual_values = data[start_index + self.config.input_size:actual_end]
        
        return {
            'initial_sequence': initial_sequence,
            'predictions': predictions,
            'actual_values': actual_values,
            'start_index': start_index,
            'prediction_steps': len(predictions),
            'input_size': self.config.input_size
        }
    
    def evaluate_predictions(self, predictions: List[float], 
                           actual_values: List[float]) -> Dict:
        """
        予測精度を評価
        
        Args:
            predictions: 予測値リスト
            actual_values: 実際の値リスト
            
        Returns:
            評価メトリクス
        """
        min_length = min(len(predictions), len(actual_values))
        pred = np.array(predictions[:min_length])
        actual = np.array(actual_values[:min_length])
        
        # 誤差計算
        errors = pred - actual
        abs_errors = np.abs(errors)
        
        # 基本統計量
        mse = np.mean(errors ** 2)
        mae = np.mean(abs_errors)
        rmse = np.sqrt(mse)
        
        # 誤差の統計的特性
        error_std = np.std(errors)
        error_var = np.var(errors)
        max_error = np.max(abs_errors)
        min_error = np.min(abs_errors)
        
        # パーセンタイル誤差
        error_95th = np.percentile(abs_errors, 95)
        error_75th = np.percentile(abs_errors, 75)
        error_median = np.median(abs_errors)
        
        # 相関係数
        correlation = np.corrcoef(pred, actual)[0, 1] if min_length > 1 else 0
        
        # 決定係数 (R²)
        ss_res = np.sum(errors ** 2)
        ss_tot = np.sum((actual - np.mean(actual)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        # 正規化誤差 (データ範囲に対する相対誤差)
        data_range = np.max(actual) - np.min(actual)
        normalized_rmse = rmse / data_range if data_range != 0 else float('inf')
        
        # 許容精度判定
        accuracy_assessment = self._assess_accuracy(
            correlation, r_squared, normalized_rmse, mae, data_range
        )
        
        return {
            'mse': float(mse),
            'mae': float(mae),
            'rmse': float(rmse),
            'correlation': float(correlation),
            'r_squared': float(r_squared),
            'error_std': float(error_std),
            'error_var': float(error_var),
            'max_error': float(max_error),
            'min_error': float(min_error),
            'error_95th_percentile': float(error_95th),
            'error_75th_percentile': float(error_75th),
            'error_median': float(error_median),
            'normalized_rmse': float(normalized_rmse),
            'data_range': float(data_range),
            'samples': min_length,
            'accuracy_assessment': accuracy_assessment
        }
    
    def _assess_accuracy(self, correlation: float, r_squared: float, 
                        normalized_rmse: float, mae: float, data_range: float) -> Dict:
        """
        予測精度の許容可能性を判定
        
        Args:
            correlation: 相関係数
            r_squared: 決定係数
            normalized_rmse: 正規化RMSE
            mae: 平均絶対誤差
            data_range: データ範囲
            
        Returns:
            精度評価結果
        """
        # 判定基準
        excellent_thresholds = {
            'correlation': 0.95,
            'r_squared': 0.90,
            'normalized_rmse': 0.05,
            'mae_ratio': 0.02  # データ範囲に対するMAEの割合
        }
        
        good_thresholds = {
            'correlation': 0.80,
            'r_squared': 0.70,
            'normalized_rmse': 0.10,
            'mae_ratio': 0.05
        }
        
        acceptable_thresholds = {
            'correlation': 0.60,
            'r_squared': 0.50,
            'normalized_rmse': 0.20,
            'mae_ratio': 0.10
        }
        
        mae_ratio = mae / data_range if data_range != 0 else float('inf')
        
        # 各メトリクスの評価
        correlation_score = self._get_metric_score(
            abs(correlation), excellent_thresholds['correlation'], 
            good_thresholds['correlation'], acceptable_thresholds['correlation']
        )
        
        r_squared_score = self._get_metric_score(
            r_squared, excellent_thresholds['r_squared'],
            good_thresholds['r_squared'], acceptable_thresholds['r_squared']
        )
        
        normalized_rmse_score = self._get_metric_score(
            1 - normalized_rmse, 1 - excellent_thresholds['normalized_rmse'],
            1 - good_thresholds['normalized_rmse'], 1 - acceptable_thresholds['normalized_rmse']
        )
        
        mae_ratio_score = self._get_metric_score(
            1 - mae_ratio, 1 - excellent_thresholds['mae_ratio'],
            1 - good_thresholds['mae_ratio'], 1 - acceptable_thresholds['mae_ratio']
        )
        
        # 総合評価（最も低いスコアで決定）
        overall_score = min(correlation_score, r_squared_score, 
                           normalized_rmse_score, mae_ratio_score)
        
        # 評価レベルの決定
        if overall_score >= 3:
            level = "優秀"
            acceptable = True
            recommendation = "予測精度は非常に優秀です。実用レベルに達しています。"
        elif overall_score >= 2:
            level = "良好"
            acceptable = True
            recommendation = "予測精度は良好です。実用に適していますが、さらなる改善の余地があります。"
        elif overall_score >= 1:
            level = "許容可能"
            acceptable = True
            recommendation = "予測精度は最低限許容可能ですが、実用には注意が必要です。改善を推奨します。"
        else:
            level = "不十分"
            acceptable = False
            recommendation = "予測精度が不十分です。モデルの大幅な改善が必要です。"
        
        return {
            'level': level,
            'acceptable': acceptable,
            'overall_score': overall_score,
            'correlation_score': correlation_score,
            'r_squared_score': r_squared_score,
            'normalized_rmse_score': normalized_rmse_score,
            'mae_ratio_score': mae_ratio_score,
            'mae_ratio': float(mae_ratio),
            'recommendation': recommendation
        }
    
    def _get_metric_score(self, value: float, excellent: float, 
                         good: float, acceptable: float) -> int:
        """
        メトリクス値をスコア（0-3）に変換
        
        Args:
            value: メトリクス値
            excellent: 優秀レベルの閾値
            good: 良好レベルの閾値
            acceptable: 許容レベルの閾値
            
        Returns:
            スコア (0: 不十分, 1: 許容可能, 2: 良好, 3: 優秀)
        """
        if value >= excellent:
            return 3
        elif value >= good:
            return 2
        elif value >= acceptable:
            return 1
        else:
            return 0
    
    def _load_csv_data(self, csv_file: str) -> List[float]:
        """CSVファイルからデータを読み込み"""
        if not os.path.exists(csv_file):
            raise FileNotFoundError(f"CSVファイルが見つかりません: {csv_file}")
        
        values = []
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                values.append(float(row['value']))
        
        return values


def load_trained_model(model_path: str) -> Tuple[torch.nn.Module, ModelConfig]:
    """
    保存されたモデルを読み込み
    
    Args:
        model_path: モデルファイルのパス
        
    Returns:
        (モデル, 設定)
    """
    checkpoint = torch.load(model_path, map_location='cpu')
    
    # 設定を復元
    config_dict = checkpoint['config']
    config = ModelConfig()
    for key, value in config_dict.items():
        setattr(config, key, value)
    
    # モデルタイプを判定して作成
    if getattr(config, 'use_improved_model', True):
        model = ImprovedSinPredictor(
            input_size=config.input_size,
            hidden_size=config.hidden_size,
            output_size=config.output_size,
            num_layers=getattr(config, 'num_layers', 2),
            dropout=getattr(config, 'dropout', 0.1)
        )
    else:
        model = SimpleSinPredictor(
            input_size=config.input_size,
            hidden_size=config.hidden_size,
            output_size=config.output_size
        )
    
    # モデルの重みを読み込み
    model.load_state_dict(checkpoint['model_state_dict'])
    
    return model, config


if __name__ == "__main__":
    # テスト用コード（モデルが学習済みの場合）
    try:
        # モデルファイルが存在するかチェック
        model_path = "models/checkpoints/sin_predictor.pth"
        
        if os.path.exists(model_path):
            print("保存されたモデルを読み込んでテストします...")
            
            # モデル読み込み
            model, config = load_trained_model(model_path)
            
            # 予測実行
            predictor = PredictionUseCase(model, config)
            result = predictor.predict_from_csv("data/sin_wave.csv", 
                                               start_index=100, 
                                               prediction_steps=20)
            
            # 評価
            metrics = predictor.evaluate_predictions(
                result['predictions'], 
                result['actual_values']
            )
            
            print(f"予測結果:")
            print(f"  初期シーケンス長: {len(result['initial_sequence'])}")
            print(f"  予測ステップ数: {result['prediction_steps']}")
            print(f"  MSE: {metrics['mse']:.6f}")
            print(f"  MAE: {metrics['mae']:.6f}")
            print(f"  RMSE: {metrics['rmse']:.6f}")
            print(f"  相関係数: {metrics['correlation']:.6f}")
            
            # 最初の5つの予測と実際の値を表示
            print(f"\n予測値の例 (最初の5つ):")
            for i in range(min(5, len(result['predictions']))):
                pred = result['predictions'][i]
                actual = result['actual_values'][i] if i < len(result['actual_values']) else "N/A"
                print(f"  ステップ{i+1}: 予測={pred:.4f}, 実際={actual}")
                
        else:
            print(f"モデルファイルが見つかりません: {model_path}")
            print("まずtrain_model_use_case.pyを実行してモデルを学習してください。")
            
    except Exception as e:
        print(f"エラー: {e}")