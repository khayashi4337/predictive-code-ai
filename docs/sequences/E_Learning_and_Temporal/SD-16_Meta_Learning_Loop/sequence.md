# SD-16 メタ学習ループ（ポリシー更新）

**目的**: 履歴Δに基づく学習率ポリシーの自己更新

**登場クラス**:
- `差分履歴バッファ`
- `学習率メタ学習器`
- `学習率ポリシー`
- `適応可能ポリシー`
- `層間相対判定リンク`

```plantuml
@startuml
title SD-16 メタ学習ループ（ポリシー更新）

participant "層間相対判定リンク" as Link
participant "差分履歴バッファ" as HistoryBuffer
participant "学習率メタ学習器" as MetaLearner
participant "学習率ポリシー" as LrPolicy <<interface>>
participant "適応可能ポリシー" as AdaptivePolicy

LrPolicy <|.. AdaptivePolicy

' 通常の差分計算ループ
activate Link
Link -> Link: 相対差分計算
create "相対差分" as Delta
Link -> Delta: new
Link -> HistoryBuffer: add(差分)
Link -> LrPolicy: 学習率(差分)
activate LrPolicy
LrPolicy --> Link: 学習率
deactivate LrPolicy
deactivate Link

' 定期的なメタ学習
activate MetaLearner
MetaLearner -> HistoryBuffer: getHistory()
activate HistoryBuffer
HistoryBuffer --> MetaLearner: 差分履歴
deactivate HistoryBuffer

MetaLearner -> AdaptivePolicy: ポリシー更新(差分履歴)
activate AdaptivePolicy
AdaptivePolicy -> AdaptivePolicy: 内部パラメータを調整
deactivate AdaptivePolicy

deactivate MetaLearner

@enduml
```
