import {Entity} from './entity'
import {DEFAULT_TOKEN, ENTITY_PERMISSIONS} from '../constants'
import {mergeObject, duplicate, getProperty, diffObject, expandObject, isObjectEmpty, hasProperty} from '../utils'
import {Item} from './item'
const vtt = "Foundry VTT";

/**
 * The Actor Entity which represents the protagonists, characters, enemies, and more that inhabit and take actions
 * within the World.
 * @extends {Entity}
 *
 * @see {@link Actors} Each Actor belongs to the Actors collection.
 * @see {@link ActorSheet} Each Actor is edited using the ActorSheet application or a subclass thereof.
 * @see {@link ActorDirectory} All Actors which exist in the world are rendered within the ActorDirectory sidebar tab.
 *
 *
 * @example <caption>Create a new Actor</caption>
 * let actor = await Actor.create({
 *   name: "New Test Actor",
 *   type: "character",
 *   img: "artwork/character-profile.jpg",
 *   folder: folder.data._id,
 *   sort: 12000,
 *   data: {},
 *   token: {},
 *   items: [],
 *   flags: {}
 * });
 *
 * @example <caption>Retrieve an existing Actor</caption>
 * let actor = window.game.actors.get(actorId);
 */
export class Actor extends Entity {



    constructor(...args) {
      super(...args);
  
      /**
       * A reference to a placed Token which creates a synthetic Actor
       * @type {Token}
       */
      this.token = this.options.token || null;
  
      /**
       * Construct the Array of Item instances for the Actor
       * Items are prepared by the Actor.prepareEmbeddedEntities() method
       * @type {Collection<string,OwnedItem>}
       */
      this.items = null;
  
      /**
       * Cache an Array of allowed Token images if using a wildcard path
       * @type {Array}
       * @private
       */
      this._tokenImages = null;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    static get config() {
      return {
        baseEntity: Actor,
        collection: window.game.actors,
        embeddedEntities: {"OwnedItem": "items"},
        label: "ENTITY.Actor",
        permissions: {
          create: "ACTOR_CREATE"
        }
      };
    }
  
    /* -------------------------------------------- */
  
/** @override */
prepareEmbeddedEntities() {
  const prior = this.items;
  const items = new Collection();
  for ( let i of this.data.items ) {
    let item = null;

    // Update existing items
    if ( prior && prior.has(i._id ) ) {
      item = prior.get(i._id);
      item.data = i;
      item.prepareData();
    }

    // Construct new items
    else item = Item.createOwned(i, this);
    items.set(i._id, item);
  }

  // Assign Items to the Actor
  this.items = items;
}

    /** @override */
    prepareData() {
      super.prepareData();
      if (!this.data.img) this.data.img = DEFAULT_TOKEN;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    // prepareEmbeddedEntities() {
    //   const prior = this.items;
    //   const items = new Collection();
    //   for ( let i of this.data.items ) {
    //     let item = null;
  
    //     // Update existing items
    //     if ( prior && prior.has(i._id ) ) {
    //       item = prior.get(i._id);
    //       item.data = i;
    //       item.prepareData();
    //     }
  
    //     // Construct new items
    //     else item = Item.createOwned(i, this);
    //     items.set(i._id, item);
    //   }
  
    //   // Assign Items to the Actor
    //   this.items = items;
    // }
  
    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */
  
    /**
     * A convenient reference to the file path of the Actor's profile image
     * @type {string}
     */
    get img() {
      return this.data.img;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Classify Owned Items by their type
     * @type {Object<string,Array>}
     */
    get itemTypes() {
      const types = Object.fromEntries(window.game.system.entityTypes.Item.map(t => [t, []]));
      for ( let i of this.items.values() ) {
        types[i.data.type].push(i);
      }
      return types;
    }
  
    /* -------------------------------------------- */
  
  
    /**
     * A boolean flag for whether this Actor is a player-owned character.
     * True if any User who is not a GM has ownership rights over the Actor entity.
     * @type {boolean}
     */
    get isPC() {
      const nonGM = window.game.users.entities.filter(u => !u.isGM);
      return nonGM.some(u => {
        if (this.data.permission["default"] >= ENTITY_PERMISSIONS["OWNER"]) return true;
        return this.data.permission[u._id] >= ENTITY_PERMISSIONS["OWNER"]
      });
    }
  
    /* -------------------------------------------- */
  
    /**
     * Test whether an Actor entity is a synthetic representation of a Token (if true) or a full Entity (if false)
     * @type {boolean}
     */
    get isToken() {
      if (!this.token) return false;
      return !this.token.data.actorLink;
    }
  
    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */
  
    /**
     * Create a synthetic Actor using a provided Token instance
     * If the Token data is linked, return the true Actor entity
     * If the Token data is not linked, create a synthetic Actor using the Token's actorData override
     * @param {Token} token
     * @return {Actor}
     */
    static fromToken(token) {
      let actor = window.game.actors.get(token.actorId);
      if (!actor) return null;
      if (!token._id) return actor;
      // if (!token.data.actorLink) actor = actor.constructor.createTokenActor(actor, token);
      return actor;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Create a synthetic Token Actor instance which is used in place of an actual Actor.
     * Cache the result in Actors.tokens.
     * @param {Actor} baseActor
     * @param {Token} token
     * @return {Actor}
     */
    static createTokenActor(baseActor, token) {
      let actor = this.collection.tokens[token.id];
      if ( actor ) return actor;
      const actorData = mergeObject(baseActor.data, token.data.actorData, {inplace: false});
      actor = new this(actorData, {token: token});
      return this.collection.tokens[token.id] = actor;
    }
  
    /* -------------------------------------------- */
  
  
  
    /* -------------------------------------------- */
  
    /**
     * Prepare a data object which defines the data schema used by dice roll commands against this Actor
     * @return {Object}
     */
    getRollData() {
      return duplicate(this.data.data);
    }
  
    /* -------------------------------------------- */
  
    
    /* -------------------------------------------- */
  
    /**
     * Handle how changes to a Token attribute bar are applied to the Actor.
     * This allows for window.game systems to override this behavior and deploy special logic.
     * @param {string} attribute    The attribute path
     * @param {number} value        The target attribute value
     * @param {boolean} isDelta     Whether the number represents a relative change (true) or an absolute change (false)
     * @param {boolean} isBar       Whether the new value is part of an attribute bar, or just a direct value
     * @return {Promise}
     */
    async modifyTokenAttribute(attribute, value, isDelta=false, isBar=true) {
      const current = getProperty(this.data.data, attribute);
      if ( isBar ) {
        if (isDelta) value = Math.clamped(0, Number(current.value) + value, current.max);
        return this.update({[`data.${attribute}.value`]: value});
      } else {
        if ( isDelta ) value = Number(current) + value;
        return this.update({[`data.${attribute}`]: value});
      }
    }
  
    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers
    /* -------------------------------------------- */
  
    /** @override */
    async update(data, options = {}) {
      if ( this.isToken ) return ActorTokenHelpers.prototype.update.bind(this)(data, options);
  
      // Update the default Token image when an Actor avatar is assigned
      if ( data.img && !hasProperty(data, "token.img") ) {
        if ( !this.data.token.img || (this.data.token.img === DEFAULT_TOKEN) ) {
          data["token.img"] = data.img;
        }
      }
  
      // Call the main Entity update logic
      return super.update(data, options);
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    async delete(options) {
      if ( this.isToken ) return this.token.delete(options);
      return super.delete(options);
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    async createEmbeddedEntity(...args) {
      if ( this.isToken ) return ActorTokenHelpers.prototype.createEmbeddedEntity.call(this, ...args);
      return super.createEmbeddedEntity(...args);
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    async updateEmbeddedEntity(...args) {
      if ( this.isToken ) return ActorTokenHelpers.prototype.updateEmbeddedEntity.call(this, ...args);
      return super.updateEmbeddedEntity(...args);
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    async deleteEmbeddedEntity(...args) {
      if ( this.isToken ) return ActorTokenHelpers.prototype.deleteEmbeddedEntity.call(this, ...args);
      return super.deleteEmbeddedEntity(...args);
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _onUpdate(data, options, userId, context) {
  
      // Get the changed attributes
      const keys = Object.keys(data).filter(k => k !== "_id");
      const changed = new Set(keys);
  
      // Re-prepare Actor data
      if (changed.has("items")) this.prepareEmbeddedEntities();
      this.prepareData();
  
      
      // Additional options only apply to Actors which are not synthetic Tokens
      if (this.isToken) return;
  
      // Update default token data
      const token = this.data.token;
      if (data.img && data.img !== token.img && (!token.img || token.img === DEFAULT_TOKEN)) {
        data["token.img"] = data.img;
      }
      if (data.name && data.name !== token.name && (!token.name || token.name === "New Actor")) {
        data["token.name"] = data.name;
      }
  
      // If the prototype token was changed, expire any cached token images
      if (changed.has("token")) this._tokenImages = null;
  
      // Update Token representations of this Actor
      // this.getActiveTokens().forEach(token => token._onUpdateBaseActor(this.data, data));
  
      // // If ownership changed for an actor with an active token, re-initialize sight
      // if (changed.has("permission")) {
      //   if (this.getActiveTokens().length) {
      //     canvas.tokens.releaseAll();
      //     canvas.tokens.cycleTokens(1, true);
      //   }
      // }
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _onCreateEmbeddedEntity(embeddedName, child, options, userId) {
      // const item = Item.createOwned(child, this);
      // this.items.set(item.id, item);
      // if (options.renderSheet && (userId === window.game.user._id)) {
      //   item.sheet.render(true, {
      //     renderContext: "create" + embeddedName,
      //     renderData: child
      //   });
      // }
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _onUpdateEmbeddedEntity(embeddedName, child, updateData, options, userId) {
      const item = this.getOwnedItem(child._id);
      item.prepareData();
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _onDeleteEmbeddedEntity(embeddedName, child, options, userId) {
      const item = this.getOwnedItem(child._id);
      this.items.delete(item.id);
      item.sheet.close({submit: false});
    }
  
    /* -------------------------------------------- */
    /*  Owned Item Management                       */
    /* -------------------------------------------- */
  
    /**
     * Import a new owned Item from a compendium collection
     * The imported Item is then added to the Actor as an owned item.
     *
     * @param collection {String}     The name of the pack from which to import
     * @param entryId {String}        The ID of the compendium entry to import
     */
    importItemFromCollection(collection, entryId) {
      const pack = window.game.packs.get(collection);
      if (pack.metadata.entity !== "Item") return;
      return pack.getEntity(entryId).then(ent => {
        console.log(`${vtt} | Importing Item ${ent.name} from ${collection}`);
        delete ent.data._id;
        return this.createOwnedItem(ent.data);
      });
    }
  
    /* -------------------------------------------- */
  
    /**
     * Get an Item instance corresponding to the Owned Item with a given id
     * @param {string} itemId   The OwnedItem id to retrieve
     * @return {Item}           An Item instance representing the Owned Item within the Actor entity
     */
    getOwnedItem(itemId) {
      return this.items.get(itemId);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Create a new item owned by this Actor. This redirects its arguments to the createEmbeddedEntity method.
     * @see {Entity#createEmbeddedEntity}
     *
     * @param {Object} itemData     Data for the newly owned item
     * @param {Object} options      Item creation options
     * @param {boolean} options.renderSheet Render the Item sheet for the newly created item data
     * @return {Promise.<Object>}   A Promise resolving to the created Owned Item data
     */
    async createOwnedItem(itemData, options = {}) {
      return this.createEmbeddedEntity("OwnedItem", itemData, options);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Update an owned item using provided new data. This redirects its arguments to the updateEmbeddedEntity method.
     * @see {Entity#updateEmbeddedEntity}
     *
     * @param {Object} itemData     Data for the item to update
     * @param {Object} options      Item update options
     * @return {Promise.<Object>}   A Promise resolving to the updated Owned Item data
     */
    async updateOwnedItem(itemData, options = {}) {
      return this.updateEmbeddedEntity("OwnedItem", itemData, options);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Delete an owned item by its id. This redirects its arguments to the deleteEmbeddedEntity method.
     * @see {Entity#deleteEmbeddedEntity}
     *
     * @param {string} itemId       The ID of the item to delete
     * @param {Object} options      Item deletion options
     * @return {Promise.<Object>}   A Promise resolving to the deleted Owned Item data
     */
    async deleteOwnedItem(itemId, options = {}) {
      return this.deleteEmbeddedEntity("OwnedItem", itemId, options);
    }
  }

  /**
 * A collection of replacement functions which are used in Actor socket workflows to replace default behaviors.
 * @ignore
 */
class ActorTokenHelpers {

  /** @override */
  async update(data, options = {}) {
    const token = this.token;
    const changed = diffObject(this.data, expandObject(data));
    if ( isObjectEmpty(changed ) ) return this;
    return token.update({actorData: changed}, options);
  }

  /* -------------------------------------------- */

  /** @override */
  async createEmbeddedEntity(embeddedName, data, options={}) {
    if ( embeddedName !== "OwnedItem" ) return;
    if ( options.temporary ) return null;
    let created = await Entity.prototype.createEmbeddedEntity.call(this, "OwnedItem", data, {temporary: true});
    const items = duplicate(this.data.items).concat(created instanceof Array ? created : [created]);
    return this.token.update({"actorData.items": items}, options);
  }

  /* -------------------------------------------- */

  /** @override */
  updateEmbeddedEntity(embeddedName, data, options={}) {
    if ( embeddedName !== "OwnedItem" ) return;
    const items = duplicate(this.data.items);
    data = data instanceof Array ? data : [data];
    for ( let update of data ) {
      const item = items.find(i => i._id === update._id);
      mergeObject(item, update, {inplace: true});
    }
    return this.token.update({"actorData.items": items}, options);
  }

  /* -------------------------------------------- */

  /** @override */
  async deleteEmbeddedEntity(embeddedName, data, options={}) {
    if ( embeddedName !== "OwnedItem" ) return;
    data = data instanceof Array ? data : [data];
    const items = duplicate(this.data.items).filter(i => !data.includes(i._id));
    return this.token.update({"actorData.items": items}, options);
  }
}

class Collection extends Map {
  constructor(entries) {
    super(entries);
  }

  /* -------------------------------------------- */

  /**
   * When iterating over a Collection, we should iterate over its values instead of over its entries
   */
  [Symbol.iterator]() {
    return this.values();
  }

  /* -------------------------------------------- */

  /**
   * Return an Array of all the entry values in the Collection
   * @return {V[]}
   */
  get entries() {
    return Array.from(this.values());
  }

  /* -------------------------------------------- */

  /**
   * Find an entry in the Map using an functional condition.
   * @see {Array#find}
   *
   * @param {Function} condition  The functional condition to test
   * @return {V|null}             The value, if found, otherwise null
   *
   * @example
   * let c = new Collection([["a", "A"], ["b", "B"], ["c", "C"]]);
   * let a = c.find(entry => entry === "A");
   */
  find(condition) {
    let entry = null;
    for ( let e of this.values() ) {
      if ( condition(e) ) {
        return entry = e;
      }
    }
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Filter the Collection, returning an Array of entries which match a functional condition.
   * @see {Array#filter}
   * @param {Function} condition  The functional condition to test
   * @return {V[]}                An Array of matched values
   *
   * @example
   * let c = new Collection([["a", "AA"], ["b", "AB"], ["c", "CC"]]);
   * let hasA = c.filters(entry => entry.slice(0) === "A");
   */
  filter(condition) {
    const entries = [];
    for ( let e of this.values() ) {
      if ( condition(e) ) {
        entries.push(e);
      }
    }
    return entries;
  }

  /* -------------------------------------------- */

  /**
   * Get an element from the Collection by its key.
   * @param {string} key      The key of the entry to retrieve
   * @param {boolean} strict  Throw an Error if the requested id does not exist, otherwise return null. Default false
   * @return {V|null}         The retrieved entry value, if the key exists, otherwise null
   *
   * @example
   * let c = new Collection([["a", "A"], ["b", "B"], ["c", "C"]]);
   * c.get("a"); // "A"
   * c.get("d"); // null
   * c.get("d", {strict: true}); // throws Error
   */
  get(key, {strict=false}={}) {
    const entry = super.get(key);
    if ( strict && !entry ) {
      throw new Error(`The key ${key} does not exist in the ${this.constructor.name} Collection`);
    }
    return entry || null;
  }

  /* -------------------------------------------- */

  /**
   * Transform each element of the Collection into a new form, returning an Array of transformed values
   * @param {Function} transformer  The transformation function to apply to each entry value
   * @return {V[]}                  An Array of transformed values
   */
  map(transformer) {
    const transformed = [];
    for ( let e of this.values() ) {
      transformed.push(transformer(e));
    }
    return transformed;
  }

  /* -------------------------------------------- */

  /**
   * Reduce the Collection by applying an evaluator function and accumulating entries
   * @see {Array#reduce}
   * @param {Function} evaluator    A function which mutates the accumulator each iteration
   * @param {any} initial           An initial value which accumulates with each iteration
   * @return {any}                  The accumulated result
   *
   * @example
   * let c = new Collection([["a", "A"], ["b", "B"], ["c", "C"]]);
   * let letters = c.reduce((s, l) => {
   *   return s + l;
   * }, ""); // "ABC"
   */
  reduce(evaluator, initial) {
    let accumulator = initial;
    for ( let e of this.values() ) {
      accumulator = evaluator(accumulator, e)
    }
    return accumulator;
  }
}




