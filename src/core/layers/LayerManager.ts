import { AutonomousLayer } from './AutonomousLayer';
import { Context } from '../tag/Context';

/**
 * Manages all autonomous layers in the system.
 * Provides a centralized way to access any layer by its ID.
 * @template T - The context type for the layers.
 */
export class LayerManager<T extends Context> {
  private layers: Map<string, AutonomousLayer<T>> = new Map();

  /**
   * Registers a new layer with the manager.
   * @param layer - The layer to register.
   */
  public registerLayer(layer: AutonomousLayer<T>): void {
    if (this.layers.has(layer.getLayerId())) {
      console.warn(`Layer with ID ${layer.getLayerId()} is already registered. Overwriting.`);
    }
    this.layers.set(layer.getLayerId(), layer);
  }

  /**
   * Retrieves a layer by its unique ID.
   * @param layerId - The ID of the layer to retrieve.
   * @returns The layer instance, or undefined if not found.
   */
  public getLayerById(layerId: string): AutonomousLayer<T> | undefined {
    return this.layers.get(layerId);
  }

  /**
   * Retrieves all registered layers.
   * @returns An array of all layer instances.
   */
  public getAllLayers(): AutonomousLayer<T>[] {
    return Array.from(this.layers.values());
  }
}
