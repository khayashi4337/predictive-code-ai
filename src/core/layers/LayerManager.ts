import { AutonomousLayer } from './AutonomousLayer';
import { Context } from '../tag/Context';
import { InterLayerRelativeJudgementLink } from '../links/InterLayerRelativeJudgementLink';
import { DebugOption } from '../../debug/DebugOption';
import { DifferenceDistanceMetric } from '../metrics/interfaces';
import { LearningRatePolicy, UpdateScopePolicy, SkipPolicy } from '../links/PolicyInterfaces';

/**
 * システム内のすべての自律レイヤーを管理します。
 * IDによって任意のレイヤーにアクセスするための一元的な方法を提供します。
 * @template T - レイヤーのコンテキスト型。
 */
export class LayerManager<T extends Context> {
  private layers: Map<string, AutonomousLayer<T>> = new Map();

  /**
   * 新しいレイヤーをマネージャーに登録します。
   * @param layer - 登録するレイヤー。
   */
  public registerLayer(layer: AutonomousLayer<T>): void {
    if (this.layers.has(layer.getLayerId())) {
      console.warn(`Layer with ID ${layer.getLayerId()} is already registered. Overwriting.`);
    }
    this.layers.set(layer.getLayerId(), layer);
  }

  /**
   * 一意のIDでレイヤーを取得します。
   * @param layerId - 取得するレイヤーのID。
   * @returns レイヤーのインスタンス。見つからない場合はundefined。
   */
  public getLayerById(layerId: string): AutonomousLayer<T> | undefined {
    const layer = this.layers.get(layerId);
    if (!layer) {
      if (DebugOption.IS_EMPTY_LINK) {
        return undefined;
      }
      throw new Error(`Layer with id ${layerId} not found`);
    }
    return layer;
  }

  /**
   * 登録されているすべてのレイヤーを取得します。
   * @returns すべてのレイヤーインスタンスの配列。
   */
  public getAllLayers(): AutonomousLayer<T>[] {
    return Array.from(this.layers.values());
  }

  /**
   * 2つのレイヤー間を双方向にリンクします。
   *
   * @param upperLayerId - 上位層のID
   * @param lowerLayerId - 下位層のID
   * @param distanceMetric - 距離メトリクス
   * @param learningRatePolicy - 学習率ポリシー
   * @param updateScopePolicy - 更新スコープポリシー
   * @param skipPolicy - スキップポリシー
   * @param metadata - リンクに付与するメタデータ
   */
  public linkLayers(
    upperLayerId: string,
    lowerLayerId: string,
    distanceMetric: DifferenceDistanceMetric<T>,
    learningRatePolicy: LearningRatePolicy<T>,
    updateScopePolicy: UpdateScopePolicy<T>,
    skipPolicy: SkipPolicy<T>,
    metadata: Map<string, any> = new Map()
  ): void {
    const upperLayer = this.getLayerById(upperLayerId);
    const lowerLayer = this.getLayerById(lowerLayerId);

    if (!upperLayer || !lowerLayer) {
      throw new Error('Both layers must be registered before linking.');
    }

    const link = new InterLayerRelativeJudgementLink(
      upperLayerId,
      lowerLayerId,
      distanceMetric,
      learningRatePolicy,
      updateScopePolicy,
      skipPolicy,
      undefined, // linkId is auto-generated
      metadata
    );

    // @ts-ignore - We know these methods exist, but they are protected.
    upperLayer.addDownstreamLink(link);
    // @ts-ignore - We know these methods exist, but they are protected.
    lowerLayer.addUpstreamLink(link);
  }
}
