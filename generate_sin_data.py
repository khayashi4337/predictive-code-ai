import numpy as np
import csv
import os
import math

# Sin波データ生成スクリプト
np.random.seed(42)

# パラメータ設定
n_samples = 1000
frequency = 1.0
amplitude = 1.0
noise_level = 0.02

# Sin波データ生成
time_steps = np.linspace(0, 4 * np.pi, n_samples)
sin_values = amplitude * np.sin(frequency * time_steps)
noise = np.random.normal(0, noise_level, n_samples)
noisy_sin_values = sin_values + noise

# CSVファイルとして保存
os.makedirs('data', exist_ok=True)

with open('data/sin_wave.csv', 'w', newline='') as csvfile:
    writer = csv.writer(csvfile)
    # ヘッダー行
    writer.writerow(['time', 'sin_clean', 'sin_noisy', 'value'])
    
    # データ行
    for i in range(n_samples):
        writer.writerow([
            time_steps[i], 
            sin_values[i], 
            noisy_sin_values[i], 
            noisy_sin_values[i]  # 学習用のメインカラム
        ])

print(f"Sin波データを生成しました: {n_samples}サンプル")
print(f"時間範囲: {time_steps[0]:.2f} - {time_steps[-1]:.2f}")
print(f"周波数: {frequency}, 振幅: {amplitude}, ノイズレベル: {noise_level}")
print("ファイル: data/sin_wave.csv")