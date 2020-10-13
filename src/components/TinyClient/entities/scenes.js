import { EntityCollection } from "./entityCollection";
import { Scene } from "./scene";

export class Scenes extends EntityCollection {
  /** @override */
  get object() {
    return Scene;
  }

  /* -------------------------------------------- */

  /**
   * Return a reference to the Scene which is currently active
   * @return {Scene}
   */
  get active() {
    return this.entities.find((s) => s.active);
  }

  /* -------------------------------------------- */

  /**
   * Return a reference to the Scene which is currently viewed
   * @return {Scene}
   */
  get viewed() {
    return this.entities.find((s) => s.isView);
  }

  /* -------------------------------------------- */
  /*  Socket Listeners and Handlers               */
  /* -------------------------------------------- */

  /** @override */
  static socketListeners(socket) {
    socket.on("modifyDocument", this._resetFog.bind(this));
    socket.on("preloadScene", (sceneId) => this.instance.preload(sceneId));
    socket.on("pullToScene", this._pullToScene);
  }

  /* -------------------------------------------- */

  /**
   * Augment the standard modifyDocument listener to flush fog exploration
   * @private
   */
  static _resetFog(response) {}

  /* -------------------------------------------- */

  /**
   * Handle pre-loading the art assets for a Scene
   * @param {string} sceneId    The Scene id to begin loading
   * @param {boolean} push      Trigger other connected clients to also pre-load Scene resources
   */
  preload(sceneId, push = false) {
    if (push)
      return window.game.socket.emit("preloadScene", sceneId, () =>
        this.preload(sceneId)
      );
    let scene = this.get(sceneId);
    //   return TextureLoader.loadSceneTextures(scene);
  }

  /* -------------------------------------------- */

  /**
   * Handle requests pulling the current User to a specific Scene
   * @param {string} sceneId
   * @private
   */
  static _pullToScene(sceneId) {
    const scene = window.game.scenes.get(sceneId);
    if (scene) scene.view();
  }

  /* -------------------------------------------- */

  /** @override */
  fromCompendium(data) {
    data = super.fromCompendium(data);
    data.active = false;
    data.navigation = false;
    return data;
  }
}

if (window.CONFIG === undefined) {
  window.CONFIG = {};
}
window.CONFIG["Scene"] = {
  entityClass: Scene,
  collection: Scenes,
};
