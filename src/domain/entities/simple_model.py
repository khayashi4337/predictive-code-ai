import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np


class ImprovedSinPredictor(nn.Module):
    """
    Sin波予測のための改良されたニューラルネットワークモデル
    シンプルながら効果的なアーキテクチャ
    """
    
    def __init__(self, input_size: int = 10, hidden_size: int = 128, output_size: int = 1, 
                 num_layers: int = 2, dropout: float = 0.1):
        """
        Args:
            input_size: 入力シーケンスの長さ（過去何時点のデータを見るか）
            hidden_size: 隠れ層のニューロン数
            output_size: 出力サイズ（通常は1：次の値を予測）
            num_layers: LSTM層の数
            dropout: ドロップアウト率
        """
        super(ImprovedSinPredictor, self).__init__()
        
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.output_size = output_size
        self.num_layers = num_layers
        self.dropout = dropout
        
        # LSTM層 - 双方向で時系列パターンをより効果的に学習
        self.lstm = nn.LSTM(
            input_size=1,  # 各時点の特徴数
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0,
            batch_first=True,
            bidirectional=True  # 双方向LSTM
        )
        
        # 双方向LSTMの出力サイズは hidden_size * 2
        lstm_output_size = hidden_size * 2
        
        # 畳み込み層でローカル特徴を抽出
        self.conv_layers = nn.Sequential(
            nn.Conv1d(in_channels=1, out_channels=64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.BatchNorm1d(64),
            nn.Conv1d(in_channels=64, out_channels=32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.BatchNorm1d(32),
            nn.AdaptiveAvgPool1d(output_size=1)
        )
        
        # 特徴結合層
        combined_features = lstm_output_size + 32  # LSTM出力 + Conv出力
        
        # 予測ヘッド
        self.predictor = nn.Sequential(
            nn.Linear(combined_features, hidden_size * 2),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_size * 2),
            nn.Dropout(dropout),
            nn.Linear(hidden_size * 2, hidden_size),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_size),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Linear(hidden_size // 2, output_size)
        )
        
        # 残差接続
        self.residual = nn.Linear(input_size, output_size)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        前向き伝播
        
        Args:
            x: 入力テンソル (batch_size, input_size)
            
        Returns:
            予測値テンソル (batch_size, output_size)
        """
        batch_size = x.size(0)
        
        # 残差接続用
        residual = self.residual(x)
        
        # LSTM用に次元を調整 (batch_size, sequence_length, features)
        x_lstm = x.unsqueeze(-1)  # (batch_size, input_size, 1)
        
        # LSTM処理（双方向）
        lstm_out, _ = self.lstm(x_lstm)  # (batch_size, input_size, hidden_size*2)
        
        # 最後のタイムステップの出力を使用
        lstm_features = lstm_out[:, -1, :]  # (batch_size, hidden_size*2)
        
        # Conv1D処理
        x_conv = x.unsqueeze(1)  # (batch_size, 1, input_size) 
        conv_out = self.conv_layers(x_conv)  # (batch_size, 32, 1)
        conv_features = conv_out.squeeze(-1)  # (batch_size, 32)
        
        # 特徴を結合
        combined_features = torch.cat([lstm_features, conv_features], dim=1)
        
        # 予測実行
        output = self.predictor(combined_features)
        
        # 残差接続
        output = output + residual
        
        return output
    
    def predict(self, x: torch.Tensor) -> torch.Tensor:
        """
        予測実行（評価モード）
        
        Args:
            x: 入力テンソル
            
        Returns:
            予測値
        """
        self.eval()
        with torch.no_grad():
            return self.forward(x)
    
    def get_model_summary(self) -> str:
        """
        モデル構造の概要を返す
        """
        total_params = sum(p.numel() for p in self.parameters())
        trainable_params = sum(p.numel() for p in self.parameters() if p.requires_grad)
        
        summary = f"""
ImprovedSinPredictor Model Summary:
- Input size: {self.input_size}
- Hidden size: {self.hidden_size}
- Output size: {self.output_size}
- LSTM layers: {self.num_layers}
- Bidirectional: True
- Dropout: {self.dropout}
- Total parameters: {total_params:,}
- Trainable parameters: {trainable_params:,}
- Architecture: Bidirectional LSTM + Conv1D + Residual
        """
        return summary.strip()


class SimpleSinPredictor(nn.Module):
    """
    Sin波を予測する簡単なニューラルネットワークモデル（後方互換性のため残す）
    """
    
    def __init__(self, input_size: int = 10, hidden_size: int = 64, output_size: int = 1):
        """
        Args:
            input_size: 入力シーケンスの長さ（過去何時点のデータを見るか）
            hidden_size: 隠れ層のニューロン数
            output_size: 出力サイズ（通常は1：次の値を予測）
        """
        super(SimpleSinPredictor, self).__init__()
        
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.output_size = output_size
        
        # 多層パーセプトロン構造
        self.layers = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Linear(hidden_size // 2, output_size),
            nn.Tanh()  # 出力を-1〜1に制限
        )
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        前向き伝播
        
        Args:
            x: 入力テンソル (batch_size, input_size)
            
        Returns:
            予測値テンソル (batch_size, output_size)
        """
        return self.layers(x)
    
    def predict(self, x: torch.Tensor) -> torch.Tensor:
        """
        予測実行（評価モード）
        
        Args:
            x: 入力テンソル
            
        Returns:
            予測値
        """
        self.eval()
        with torch.no_grad():
            return self.forward(x)
    
    def get_model_summary(self) -> str:
        """
        モデル構造の概要を返す
        """
        total_params = sum(p.numel() for p in self.parameters())
        trainable_params = sum(p.numel() for p in self.parameters() if p.requires_grad)
        
        summary = f"""
SimpleSinPredictor Model Summary:
- Input size: {self.input_size}
- Hidden size: {self.hidden_size}
- Output size: {self.output_size}
- Total parameters: {total_params:,}
- Trainable parameters: {trainable_params:,}
        """
        return summary.strip()


class ModelConfig:
    """モデル設定クラス"""
    
    def __init__(self):
        self.input_size = 20  # より長いコンテキストを使用
        self.hidden_size = 128  # より大きな隠れ層
        self.output_size = 1
        self.num_layers = 2  # LSTM層数
        self.dropout = 0.1  # ドロップアウト率
        self.learning_rate = 0.0005  # より低い学習率で安定した学習
        self.batch_size = 64  # より大きなバッチサイズ
        self.max_epochs = 200  # より多くのエポック
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.use_improved_model = True  # 改良モデルを使用するかどうか
        self.early_stopping_patience = 20  # 早期停止の設定


def create_sequences(data: np.ndarray, input_size: int, target_size: int = 1) -> tuple:
    """
    時系列データからシーケンスデータを作成
    
    Args:
        data: 時系列データ
        input_size: 入力シーケンスの長さ
        target_size: 予測対象の長さ
        
    Returns:
        (input_sequences, target_sequences): 入力と目標のシーケンス
    """
    X, y = [], []
    
    for i in range(len(data) - input_size - target_size + 1):
        # 過去input_size個のデータポイント
        X.append(data[i:(i + input_size)])
        # 次のtarget_size個のデータポイント（通常は1個）
        y.append(data[i + input_size:(i + input_size + target_size)])
    
    return np.array(X), np.array(y).squeeze()


if __name__ == "__main__":
    # テスト用コード
    config = ModelConfig()
    model = SimpleSinPredictor(
        input_size=config.input_size,
        hidden_size=config.hidden_size,
        output_size=config.output_size
    )
    
    print(model.get_model_summary())
    
    # ダミーデータでテスト
    dummy_input = torch.randn(5, config.input_size)
    output = model(dummy_input)
    print(f"\nTest input shape: {dummy_input.shape}")
    print(f"Test output shape: {output.shape}")