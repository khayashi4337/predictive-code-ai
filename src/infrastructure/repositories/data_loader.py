import csv
import torch
import numpy as np
from torch.utils.data import Dataset, DataLoader
from typing import Tuple, Optional
import os


class SinWaveDataset(Dataset):
    """Sin波データセットクラス"""
    
    def __init__(self, csv_file: str, input_size: int = 10, target_size: int = 1):
        """
        Args:
            csv_file: CSVファイルのパス
            input_size: 入力シーケンスの長さ
            target_size: 予測対象の長さ
        """
        self.input_size = input_size
        self.target_size = target_size
        
        # CSVファイルを読み込み
        self.data = self._load_csv(csv_file)
        
        # シーケンスデータを作成
        self.X, self.y = self._create_sequences(self.data)
        
    def _load_csv(self, csv_file: str) -> np.ndarray:
        """CSVファイルを読み込む"""
        if not os.path.exists(csv_file):
            raise FileNotFoundError(f"CSVファイルが見つかりません: {csv_file}")
        
        values = []
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # 'value'カラムを使用（ノイズ付きSin波）
                values.append(float(row['value']))
        
        return np.array(values, dtype=np.float32)
    
    def _create_sequences(self, data: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """時系列データからシーケンスを作成"""
        X, y = [], []
        
        for i in range(len(data) - self.input_size - self.target_size + 1):
            # 過去input_size個のデータポイント
            X.append(data[i:(i + self.input_size)])
            # 次のtarget_size個のデータポイント
            if self.target_size == 1:
                y.append(data[i + self.input_size])
            else:
                y.append(data[i + self.input_size:(i + self.input_size + self.target_size)])
        
        return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)
    
    def __len__(self) -> int:
        return len(self.X)
    
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        """データセットのアイテムを取得"""
        return torch.tensor(self.X[idx]), torch.tensor(self.y[idx])
    
    def get_data_info(self) -> dict:
        """データセット情報を返す"""
        return {
            'total_samples': len(self),
            'input_size': self.input_size,
            'target_size': self.target_size,
            'data_range': (float(self.data.min()), float(self.data.max())),
            'sequence_range': (float(self.y.min()), float(self.y.max()))
        }


class SinWaveDataLoader:
    """Sin波データローダー管理クラス"""
    
    def __init__(self, csv_file: str, input_size: int = 10, batch_size: int = 32, 
                 train_ratio: float = 0.8, shuffle: bool = True):
        """
        Args:
            csv_file: CSVファイルのパス
            input_size: 入力シーケンスの長さ
            batch_size: バッチサイズ
            train_ratio: 訓練データの割合
            shuffle: データをシャッフルするかどうか
        """
        self.csv_file = csv_file
        self.input_size = input_size
        self.batch_size = batch_size
        self.train_ratio = train_ratio
        self.shuffle = shuffle
        
        # データセットを作成
        self.dataset = SinWaveDataset(csv_file, input_size)
        
        # 訓練・テスト分割
        self.train_loader, self.test_loader = self._create_data_loaders()
        
    def _create_data_loaders(self) -> Tuple[DataLoader, DataLoader]:
        """訓練・テスト用データローダーを作成"""
        dataset_size = len(self.dataset)
        train_size = int(dataset_size * self.train_ratio)
        test_size = dataset_size - train_size
        
        # データセットを分割
        train_dataset, test_dataset = torch.utils.data.random_split(
            self.dataset, [train_size, test_size]
        )
        
        # データローダーを作成
        train_loader = DataLoader(
            train_dataset, 
            batch_size=self.batch_size, 
            shuffle=self.shuffle
        )
        
        test_loader = DataLoader(
            test_dataset,
            batch_size=self.batch_size,
            shuffle=False
        )
        
        return train_loader, test_loader
    
    def get_data_info(self) -> dict:
        """データローダー情報を返す"""
        base_info = self.dataset.get_data_info()
        
        train_batches = len(self.train_loader)
        test_batches = len(self.test_loader)
        
        loader_info = {
            'batch_size': self.batch_size,
            'train_batches': train_batches,
            'test_batches': test_batches,
            'train_samples': train_batches * self.batch_size,
            'test_samples': test_batches * self.batch_size,
            'train_ratio': self.train_ratio
        }
        
        return {**base_info, **loader_info}


# 便利関数
def load_sin_wave_data(csv_file: str = "data/sin_wave.csv", **kwargs) -> SinWaveDataLoader:
    """Sin波データを簡単に読み込むための関数"""
    return SinWaveDataLoader(csv_file, **kwargs)


if __name__ == "__main__":
    # テスト用コード
    try:
        # データローダーを作成
        data_loader = load_sin_wave_data("data/sin_wave.csv", input_size=10, batch_size=16)
        
        # データ情報を表示
        info = data_loader.get_data_info()
        print("データローダー情報:")
        for key, value in info.items():
            print(f"  {key}: {value}")
        
        # サンプルバッチを取得
        for X_batch, y_batch in data_loader.train_loader:
            print(f"\nサンプルバッチ:")
            print(f"  入力形状: {X_batch.shape}")
            print(f"  目標形状: {y_batch.shape}")
            print(f"  入力サンプル: {X_batch[0][:5].tolist()}")
            print(f"  目標サンプル: {y_batch[0].item()}")
            break
            
    except FileNotFoundError as e:
        print(f"エラー: {e}")
        print("まずgenerate_sin_data.pyを実行してデータを生成してください。")