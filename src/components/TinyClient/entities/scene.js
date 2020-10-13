import { Entity } from "./entity";

export class Scene extends Entity {
  constructor(...args) {
    super(...args);

    /**
     * Track whether the scene is the active view
     * @type {Boolean}
     */
    this._view = this.data.active;

    /**
     * Track the viewed position of each scene (while in memory only, not persisted)
     * When switching back to a previously viewed scene, we can automatically pan to the previous position.
     * Object with keys: x, y, scale
     * @type {Object}
     */
    this._viewPosition = {};
  }

  /* -------------------------------------------- */

  /** @extends {EntityCollection.config} */
  static get config() {
    return {
      baseEntity: Scene,
      collection: window.game.scenes,
      embeddedEntities: {
        AmbientLight: "lights",
        AmbientSound: "sounds",
        Drawing: "drawings",
        Note: "notes",
        MeasuredTemplate: "templates",
        Tile: "tiles",
        Token: "tokens",
        Wall: "walls",
      },
      label: "ENTITY.Scene",
    };
  }

  /* -------------------------------------------- */

  /** @override */
  prepareEmbeddedEntities() {}

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * A convenience accessor for the background image of the Scene
   * @type {string}
   */
  get img() {
    return this.data.img;
  }

  /* -------------------------------------------- */

  /**
   * A convenience accessor for whether the Scene is currently active
   * @type {boolean}
   */
  get active() {
    return this.data.active;
  }

  /* -------------------------------------------- */

  /**
   * A convenience accessor for whether the Scene is currently viewed
   * @type {boolean}
   */
  get isView() {
    return this._view;
  }

  /* -------------------------------------------- */

  /**
   * A reference to the JournalEntry entity associated with this Scene, or null
   * @return {JournalEntry|null}
   */
  get journal() {
    return this.data.journal
      ? window.game.journal.get(this.data.journal)
      : null;
  }

  /* -------------------------------------------- */

  /**
   * A reference to the Playlist entity for this Scene, or null
   * @type {Playlist|null}
   */
  get playlist() {
    return this.data.playlist
      ? window.game.playlists.get(this.data.playlist)
      : null;
  }

  /* -------------------------------------------- */

  /**
   * Set this scene as the current view
   */
  async view() {
    // Do not switch if the loader is still running
    //   if ( canvas.loading ) {
    //     return ui.notifications.warn(`You cannot switch Scenes until resources finish loading for your current view.`);
    //   }

    // Switch the viewed scene
    this.collection.entities.forEach((scene) => {
      scene._view = scene._id === this._id;
    });

    // Re-draw the canvas if the view is different
    //   if ( canvas.id !== this._id ) {
    //     console.log(`Foundry VTT | Viewing Scene ${this.name}`);
    //     await canvas.draw();
    //   }

    // Render apps for the collection
    //   this.collection.render();
    //   ui.combat.initialize();
  }

  /* -------------------------------------------- */

  /**
   * Set this scene as currently active
   * @return {Promise}  A Promise which resolves to the current scene once it has been successfully activated
   */
  async activate() {
    if (this.active) return this;
    return this.update({ active: true });
  }

  /* -------------------------------------------- */
  /*  Socket Listeners and Handlers               */
  /* -------------------------------------------- */

  /** @override */
  async clone(createData = {}, options = {}) {
    createData["active"] = false;
    createData["navigation"] = false;
    return super.clone(createData, options);
  }

  /* -------------------------------------------- */

  /** @override */
  async update(data, options = {}) {


    // Call the Entity update
    return super.update(data, options);
  }

  /* -------------------------------------------- */

  /** @override */
  _onCreate(data, ...args) {
    super._onCreate(data, ...args);
    if (data.active === true) this._onActivate(true);
  }

  /* -------------------------------------------- */

  /** @override */
  _onUpdate(data, options, userId, context) {
    super._onUpdate(data, options, userId, context);

    // Get the changed attributes
    let changed = new Set(Object.keys(data).filter((k) => k !== "_id"));

    // If the Scene became active, go through the full activation procedure
    if (changed.has("active")) this._onActivate(data.active);

    // If the Thumbnail was updated, bust the image cache
    if (changed.has("thumb") && this.data.thumb) {
      this.data.thumb = this.data.thumb.split("?")[0] + `?${Date.now()}`;
    }

    // If the scene is already active, maybe re-draw the canvas
    
  }

  /* -------------------------------------------- */

  /** @override */
  _onDelete(...args) {
    super._onDelete(...args);
  }

  /* -------------------------------------------- */

  /**
   * Handle Scene activation workflow if the active state is changed to true
   * @private
   */
  _onActivate(active) {
    const collection = this.collection;
    if (active) {
      collection.entities.forEach(
        (scene) => (scene.data.active = scene._id === this._id)
      );
      return this.view();
    }  
  }

  /* -------------------------------------------- */

  /** @override */
  _onCreateEmbeddedEntity(embeddedName, child, options, userId) {
    
  }

  /* -------------------------------------------- */

  /** @override */
  _onUpdateEmbeddedEntity(embeddedName, child, updateData, options, userId) {
   
  }

  /* -------------------------------------------- */

  /** @override */
  _onDeleteEmbeddedEntity(embeddedName, child, options, userId) {
    
  }

  /* -------------------------------------------- */

  /** @override */
  _onModifyEmbeddedEntity(...args) {
  }

  /* -------------------------------------------- */
  /*  History Storage Handlers                    */
  /* -------------------------------------------- */

  /** @override */
  static _handleCreateEmbeddedEntity({ request, result = [], userId } = {}) {
   
    return super._handleCreateEmbeddedEntity({ request, result, userId });
  }

  /* -------------------------------------------- */

  /** @override */
  static _handleUpdateEmbeddedEntity({ request, result = [], userId } = {}) {
    
    return super._handleUpdateEmbeddedEntity({ request, result, userId });
  }

  /* -------------------------------------------- */

  /** @override */
  static _handleDeleteEmbeddedEntity({ request, result = [], userId } = {}) {
    
    return super._handleDeleteEmbeddedEntity({ request, result, userId });
  }

  /* -------------------------------------------- */
  /*  Importing and Exporting                     */
  /* -------------------------------------------- */

  /** @override */
  async toCompendium() {
    const data = await super.toCompendium();
    data.active = false;
    data.navigation = false;
    data.navOrder = null;
    data.fogReset = null;
    return data;
  }
}
