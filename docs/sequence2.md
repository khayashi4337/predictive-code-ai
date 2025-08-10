@startuml
title 全体フロー（感覚→皮質→海馬）1サイクル

participant 感覚器官 as Sensor
participant 視床ゲート as Thalamus
participant 感覚層 as S
participant 層間相対判定リンク_PS as LinkPS
participant パターン層 as P
participant 層間相対判定リンク_PC as LinkPC
participant 概念層 as C
participant 経験統合器 as Integrator
participant 海馬 as Hipp

group 実際入力の上行
  Sensor -> Thalamus: 実際入力
  Thalamus -> S: 実際パターン
  S -> LinkPS: 実際パターン(感覚)
end

group 期待の下降
  C -> LinkPC: 期待パターン(パターン向け)
  P -> LinkPS: 期待パターン(感覚向け)
end

group 相対判定(パターン↔感覚)
  LinkPS -> LinkPS: Δ_PS = 相対差分計算
  LinkPS -> LinkPS: スキップ判定 / 学習率調整
  LinkPS --> P: 学習信号(η_PS, Δ_PS, 更新対象)
  P -> P: 予測モデル更新(学習信号)
end

group 相対判定(概念↔パターン)
  P -> LinkPC: 実際パターン(パターン活動)
  LinkPC -> LinkPC: Δ_PC = 相対差分計算
  LinkPC -> LinkPC: スキップ判定 / 学習率調整
  LinkPC --> C: 学習信号(η_PC, Δ_PC, 更新対象)
  C -> C: 予測モデル更新(学習信号)
end

group 経験レベルの統合と海馬
  S --> Integrator: 出力(感覚)
  P --> Integrator: 出力(パターン)
  C --> Integrator: 出力(概念)
  Integrator --> Hipp: 現在経験

  Hipp -> Hipp: 経験相対照合／新奇性指標
  alt 長期記憶化判定 = true
    Hipp -> C: 判定基準の分散化(基準パターン)
    Hipp -> P: 判定基準の分散化(基準パターン)
    Hipp -> S: 学習感度↑(一時)
  else 判定基準の更新なし
    Hipp --> C: 学習感度↑(一時)
  end
end
@enduml
