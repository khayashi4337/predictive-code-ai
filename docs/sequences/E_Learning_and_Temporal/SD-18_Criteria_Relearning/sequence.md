# SD-18 判定基準の再学習

**目的**: 運用履歴に基づいて基準パターンを調整

**登場クラス**:
- `海馬自律モジュール`
- `判定履歴`
- `基準パターン`

```plantuml
@startuml
title SD-18 判定基準の再学習

participant "海馬自律モジュール" as Hippocampus
participant "判定履歴" as History
participant "基準パターン" as Criteria

' 通常運用で判定履歴が蓄積される
note over History: 判定履歴が蓄積されている

' 定期的な再学習プロセス
activate Hippocampus

Hippocampus -> History: getHistory()
activate History
History --> Hippocampus: 判定履歴データ
deactivate History

Hippocampus -> Criteria: 参照

Hippocampus -> Hippocampus: 判定基準再学習(履歴)

note left: 履歴から、どのような場合に
差分が大きく/小さくなったかを分析し、
基準パターンの許容差や重みづけを調整する

Hippocampus -> Criteria: 更新(新しい許容差, 重み)

deactivate Hippocampus

@enduml
```
