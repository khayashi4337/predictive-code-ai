@startuml
title 層間相対判定（概念層→パターン層）改良版
autonumber

participant 概念層 as Upper
participant 層間相対判定リンク as Link
participant パターン層 as Lower
participant 差分距離メトリクス as Metric
participant 学習率ポリシー as LR
participant スキップポリシー as Skip

== 期待の下降 ==
Upper -> Upper: 期待パターン生成()\n<<期待パターン>>
Upper -> Link: 期待パターン

== 実際の上行 ==
Lower -> Lower: 実際パターン観測(実際入力)\n<<実際パターン>>
Lower -> Link: 実際パターン

== 相対判定 ==
activate Link
Link -> Metric: 距離(期待, 実際)
activate Metric
Metric --> Link: 距離{値, 測度}
deactivate Metric

Link -> Link: 相対差分を構築(距離)\n<<相対差分 Δ>>

Link -> Skip: スキップ判定(Δ)
activate Skip
Skip --> Link: スキップEnum
deactivate Skip

alt 完全スキップ
  Link --> Upper: 学習信号{学習率=0, 参照差分=Δ, 更新対象=∅}
  note right of Upper: 勾配計算・更新をスキップ
else 軽更新
  Link -> LR: 学習率(Δ)
  activate LR
  LR --> Link: η(小)
  deactivate LR
  Link -> Link: 更新スコープ選定(Δ)\n<<更新スコープ Scope(疎)>>
  Link --> Upper: 学習信号{学習率=η(小), 参照差分=Δ, 更新対象=Scope}
  Upper -> Upper: 予測モデル更新(学習信号)\n(軽い更新)
else 集中計算
  Link -> LR: 学習率(Δ)
  activate LR
  LR --> Link: η(大)
  deactivate LR
  Link -> Link: 更新スコープ選定(Δ)\n<<更新スコープ Scope(広)>>
  Link --> Upper: 学習信号{学習率=η(大), 参照差分=Δ, 更新対象=Scope}
  Upper -> Upper: 予測モデル更新(学習信号)\n(集中計算)
end
deactivate Link

opt テレメトリ/デバッグ
  Link -> Link: ログ{Δ.大きさ, 測度, スキップレベル, η}
end

note over Upper,Lower
  上位→下位：期待パターン
  下位→上位：実際パターン
  相対判定は「リンク（関係）」が担う
end note
@enduml