import {
  BASE_ENTITY_TYPE,
  ENTITY_PERMISSIONS,
  ENTITY_TYPES,
} from "../constants";
import {
  mergeObject,
  diffObject,
  isObjectEmpty,
  expandObject,
  SortingHelpers,
  duplicate,
} from "../utils";
import { SocketInterface } from "../socketInterface";
// import {Actors} from './actors'
// import {Actor} from './actor'
// import {Combat} from './combat'
// import {CombatEncounters} from './combatEncounters'
// import {Scene} from './scene'
// import {Scenes} from './scenes'
// import {User} from './user'
// import {Users} from './users'

const vtt = "Foundry VTT";

// export const CONFIG = {
//   /**
//    * Configure debugging flags to display additional information
//    */
//   debug: {
//     hooks: false,
//     sight: false,
//     av: false,
//     avclient: false,
//     mouseInteraction: false
//   },

//   /**
//    * Configuration for the default Actor entity class
//    */
//   Actor: {
//     entityClass: Actor,
//     collection: Actors,
//     sheetClasses: {},
//     sidebarIcon: "fas fa-user"
//   },

//   /**
//    * Configuration for the Combat entity
//    */
//   Combat: {
//     entityClass: Combat,
//     collection: CombatEncounters,
//     sidebarIcon: "fas fa-fist-raised",
//     initiative: {
//       formula: null,
//       decimals: 0
//     }
//   },

//   /**
//    * Configuration for the default Scene entity class
//    */
//   Scene: {
//     entityClass: Scene,
//     collection: Scenes,
//     sidebarIcon: "fas fa-map"
//   },

//   /**
//    * Configuration for the User entity, it's roles, and permissions
//    */
//   User: {
//     entityClass: User,
//     collection: Users,
//     permissions: Users.permissions
//   },

// };

/**
 * An abstract class pattern for all primary data entities within the Foundry VTT Framework. An entity represents a
 * primary data concept, for example: Actor, Item, Scene, or ChatMessage. Each Entity type in Foundry Virtual
 * Tabletop extends this base Entity class which ensures similar behavior and workflow across all entity types.
 *
 * Documentation for this class is provided for reference, but developers should not extend this class directly,
 * instead work with or extend the Entity implementations that are referenced in this section of the API documentation.
 *
 * Entities are instantiated by providing their base data, and an optional Array of Application instances which should
 * be automatically refreshed when the Entity experiences an update.
 * @abstract
 *
 * @see {@link EntityCollection} The EntityCollection abstract class which contains Entity instances.
 * @see {@link Actor} The Actor Entity.
 * @see {@link Combat} The Combat Encounter Entity.
 * @see {@link Folder} The Folder Entity.
 * @see {@link Item} The Item Entity.
 * @see {@link JournalEntry} The Journal Entry Entity.
 * @see {@link ChatMessage} The Chat Message Entity.
 * @see {@link Playlist} The Audio Playlist Entity.
 * @see {@link Scene} The Scene Entity.
 * @see {@link RollTable} The Rollable Table Entity.
 * @see {@link User} The User Entity.
 * @see {@link Compendium} The Compendium which may contain Entities in a compendium pack.
 *
 * @param {Object} data       The data Object with which to create the Entity
 * @param {Object} options    Additional options which modify the created Entity behavior
 * @param {Compendium} [options.compendium] A reference to the Compendium pack from which this Entity was drawn.
 *
 * @example
 * let actorData = {name: "John Doe", type: "character", img: "icons/mystery-man.png"};
 * let actor = new Actor(actorData);
 */
export class Entity {
  constructor(data, options) {
    /**
     * The original source data for the object provided at initialization.
     * @type {Object}
     */
    this.data = data || {};

    /**
     * The options object that was used to configure the Entity upon initialization.
     * @type {Object}
     */
    this.options = options || {};

    /**
     * A collection of Application instances which should be re-rendered whenever this Entity experiences an update to
     * its data. The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Entity#render}.
     * @type {Object.<Application>}
     * @see {Entity#render}
     */
    this.apps = {};

    /**
     * The Entity may optionally belong to a parent Compendium pack. If so this attribute will contain a reference
     * to that Compendium object. Otherwise null.
     * @type {Compendium|null}
     */
    this.compendium = this.options.compendium || null;

    // Initialize Entity data
    // if (this instanceof window.CONFIG["Combat"].entityClass) {
    //   console.log(data);
    // }
      this.initialize();
      
    
  }

  /* -------------------------------------------- */

  /**
   * Configure the attributes of this Entity class
   * @type {Object}
   * @property {Entity} baseEntity       The parent class which directly inherits from the Entity interface.
   * @property {EntityCollection} collection   The EntityCollection instance to which Entities of this type belong.
   * @property {Array} embeddedEntities  The names of any Embedded Entities within the Entity data structure.
   */
  static get config() {
    throw new Error(
      `The ${this.name} subclass must define the Entity.config object`
    );
  }

  /* -------------------------------------------- */

  /**
   * A Universally Unique Identifier (uuid) for this Entity instance
   * @type {string}
   */
  get uuid() {
    if (this.compendium)
      return `Compendium.${this.compendium.collection}.${this.id}`;
    return `${this.entity}.${this.id}`;
  }

  /* -------------------------------------------- */

  /**
   * Initialize data structure for the Entity.
   * First initialize any Embedded Entities and prepare their data.
   * Next prepare data for the Entity itself, which may depend on Embedded Entities.
   */
  initialize() {
    try {
      this.prepareData(); // TODO - I should try and improve this, but chicken-egg problem for now
      this.prepareEmbeddedEntities();
      this.prepareData();
    } catch (err) {
      console.error(
        `Failed to initialize data for ${this.constructor.name} ${this.id}:`
      );
      console.error(err);
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for the Entity whenever the instance is first created or later updated.
   * This method can be used to derive any internal attributes which are computed in a formulaic manner.
   * For example, in a d20 system - computing an ability modifier based on the value of that ability score.
   */
  prepareData() {
    const data = this.data;
    if (data.hasOwnProperty("name") && !data.name) {
      data.name = "New " + this.entity;
    }
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare Embedded Entities which exist within this parent Entity.
   * For example, in the case of an Actor, this method is responsible for preparing the Owned Items the Actor contains.
   */
  prepareEmbeddedEntities() {
    for (let [name, collection] of Object.entries(
      this.constructor.config.embeddedEntities
    )) {
      this[collection] = this.data[collection].map((d) =>
        this._constructEmbeddedEntity(name, d)
      );
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for a single Embedded Entity which exists within the parent Entity.
   * @private
   * @param {string} embeddedName   The name of the Embedded Entity type
   * @param {Object} data           The data used to initialize it
   * @returns                       The Embedded Entity object
   */
  _constructEmbeddedEntity(embeddedName, data) {
    throw new Error(
      `The ${this.constructor.name} subclass must define the _constructEmbeddedEntity() method`
    );
  }

  /* -------------------------------------------- */

  /**
   * Obtain a reference to the Array of source data within the data object for a certain Embedded Entity name
   * @param {string} embeddedName   The name of the Embedded Entity type
   * @return {Array}                The Array of source data where Embedded Entities of this type are stored
   */
  getEmbeddedCollection(embeddedName) {
    const collection = this.constructor.config.embeddedEntities[embeddedName];
    if (!collection) {
      throw new Error(
        `${embeddedName} is not a valid Embedded Entity in a ${this.constructor.name}`
      );
    }
    return this.data[collection];
  }

  /* -------------------------------------------- */

  /**
   * Render all of the Application instances which are connected to this Entity by calling their respective
   * {@link Application#render} methods.
   * @param {boolean} force     Force rendering
   * @param {Options} context   Optional context
   */
  render(force, context = {}) {
    const permChange = context.data && "permission" in context.data;
    for (let app of Object.values(this.apps)) {
      if (permChange) app.options.editable = this.owner;
      app.render(force, context);
    }
  }

  /* -------------------------------------------- */
  /*  Properties
      /* -------------------------------------------- */

  /**
   * Return a reference to the EntityCollection instance which stores Entity instances of this type. This property is
   * available as both a static and instance method and should be overridden by subclass Entity implementations.
   * @type {EntityCollection}
   * @static
   */
  static get collection() {
    if (!this.config.collection) {
      throw new Error(
        `An Entity subclass must configure the EntityCollection it belongs to.`
      );
    }
    return this.config.collection;
  }

  /* -------------------------------------------- */

  /** @alias {Entity.collection} */
  get collection() {
    return this.constructor.collection;
  }

  /* -------------------------------------------- */

  /**
   * The class name of the base Entity type, for example "Actor". This is useful in cases where there is an inheritance
   * chain. Many places throughout the framework rely upon the canonical entity name which may not always be equal
   * to the class name. This property is available as both a static and instance method.
   * @type {string}
   *
   * @example
   * class Actor2ndGen extends Actor {...}
   * Actor2ndGen.entity // "Actor"
   */
  static get entity() {
    if (!this.config.baseEntity)
      throw new Error(
        `An Entity subclass must configure the baseEntity it represents.`
      );
    return this.config.baseEntity.name;
  }

  /* -------------------------------------------- */

  /** @alias {Entity.entity} */
  get entity() {
    return this.constructor.entity;
  }

  /* -------------------------------------------- */

  /**
   * A convenience accessor for the _id attribute of the Entity data object.
   * @type {string}
   */
  get id() {
    return this.data._id;
  }

  /* -------------------------------------------- */

  /** @alias {Entity#id} */
  get _id() {
    return this.data._id;
  }

  /* -------------------------------------------- */

  /**
   * A convenience accessor for the name attribute of the Entity data object
   * @type {string}
   */
  get name() {
    return this.data.name;
  }

  /* -------------------------------------------- */

  // /**
  //  * A property which gets or creates a singleton instance of the sheet class used to render and edit data for this
  //  * particular entity type.
  //  * @type {BaseEntitySheet}
  //  *
  //  * @example <caption>A subclass of the Actor entity</caption>
  //  * let actor = window.game.entities.actors[0];
  //  * actor.sheet; // ActorSheet
  //  */
  //   get sheet() {
  //     const cls = this._sheetClass;
  //     if ( !cls ) return null;
  //     let sheet = Object.values(this.apps).find(app => app.constructor === cls);
  //     const editable = this.owner && (!this.compendium  || !this.compendium.locked );
  //     if ( !sheet ) sheet = new cls(this, {editable});
  //     return sheet;
  //   }

  /* -------------------------------------------- */

  // /**
  //  * Obtain a reference to the BaseEntitySheet implementation which should be used to render the Entity instance
  //  * configuration sheet.
  //  * @private
  //  */
  // get _sheetClass() {
  //   const cfg = CONFIG[this.entity];
  //   let cls = null;
  //   if ( !cfg ) return null;

  //   // Case 1 - Dynamic Sheet Classes are supported
  //   if ( cfg.sheetClasses ) {
  //     const type = this.data.type || BASE_ENTITY_TYPE;
  //     const sheets = cfg.sheetClasses[type] || {};
  //     const override = this.getFlag("core", "sheetClass");
  //     if ( sheets[override] ) cls = sheets[override].cls;
  //     else {
  //       let classes = Object.values(sheets);
  //       let def = classes.find(s => s.default) || classes.pop();
  //       if ( def ) cls = def.cls;
  //     }
  //     if ( !cls ) throw new Error(`No valid ${this.entity} sheet found for type ${type}`);
  //   }

  //   // Case 2 - Static sheets only
  //   else cls = cfg.sheetClass;
  //   return cls;
  // }

  /* -------------------------------------------- */

  /**
   * Return a reference to the Folder which this Entity belongs to, if any.
   * @type {Folder|null}
   *
   * @example <caption>Entities may belong to Folders</caption>
   * let folder = window.game.folders.entities[0];
   * let actor = await Actor.create({name: "New Actor", folder: folder.id});
   * console.log(actor.data.folder); // folder.id;
   * console.log(actor.folder); // folder;
   */
  get folder() {
    if (!this.data.folder) return null;
    return window.game.folders.get(this.data.folder);
  }

  /* -------------------------------------------- */

  /**
   * Return the permission level that the current window.game User has over this Entity.
   * See the CONST.ENTITY_PERMISSIONS object for an enumeration of these levels.
   * @type {Number}
   *
   * @example
   * window.game.user.id; // "dkasjkkj23kjf"
   * entity.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
   * entity.permission; // 2
   */
  get permission() {
    // Game-masters and Assistants are always owners
    if (window.game.user.isGM) return ENTITY_PERMISSIONS.OWNER;

    // User-specific permission
    let userPerm = this.data.permission[window.game.user._id];
    return userPerm ? userPerm : this.data.permission["default"];
  }

  /* -------------------------------------------- */

  /**
   * A boolean indicator for whether or not the current window.game User has ownership rights for this Entity.
   * This property has a setter which allows for ownership rights to be temporarily overridden on a per-instance basis.
   * @type {boolean}
   */
  get owner() {
    return this.hasPerm(window.game.user, "OWNER");
  }

  /* -------------------------------------------- */

  /**
   * A boolean indicator for whether or not the current window.game User has at least limited visibility for this Entity.
   * @type {boolean}
   */
  get visible() {
    return this.hasPerm(window.game.user, "LIMITED", false);
  }

  /* -------------------------------------------- */

  /**
   * A boolean indicator for whether the current window.game user has ONLY limited visibility for this Entity.
   * Note that a GM user's perspective of an Entity is never limited.
   * @type {boolean}
   */
  get limited() {
    if (window.game.user.isGM) return false;
    return this.hasPerm(window.game.user, "LIMITED", true);
  }

  /* -------------------------------------------- */
  /*  Permission Controls                         */
  /* -------------------------------------------- */

  /**
   * Test whether a provided User a specific permission level (or greater) over the Entity instance
   * @param {User} user                   The user to test for permission
   * @param {string|number} permission    The permission level or level name to test
   * @param {boolean} exact               Tests for an exact permission level match, by default this method tests for
   *                                      an equal or greater permission level.
   * @return {boolean}                    Whether or not the user has the permission for this Entity.
   *
   * @example <caption>Test whether a specific user has a certain permission</caption>
   * // These two are equivalent
   * entity.hasPerm(window.game.user, "OWNER");
   * entity.owner;
   * // These two are also equivalent
   * entity.hasPerm(window.game.user, "LIMITED", true);
   * entity.limited;
   */
  hasPerm(user, permission, exact = false) {
    // If the entity does not have a permission object (e.g. Folder), only GM has any permission
    if (!this.data.permission) return user.isGM;

    // Get the user's permission level
    let level = this.data.permission[user._id];
    level = Number.isInteger(level) ? level : this.data.permission["default"];
    const perm = ENTITY_PERMISSIONS[permission];

    // Test permission against the target level
    if (exact) return level === perm;
    else if (user.isGM) return true;
    return level >= perm;
  }

  /* -------------------------------------------- */

  /**
   * Test whether a given User has permission to perform some action on this Entity
   * @param {User} user           The User requesting creation
   * @param {string} action       The attempted action
   * @param {Entity} target       The targeted Entity
   * @return {boolean}            Does the User have permission?
   */
  static can(user, action, target) {
    const permissions = this.config.permissions || {};
    switch (action) {
      case "create":
        return (
          (permissions.create && user.can(permissions.create)) || user.isGM
        );
      case "update":
        return target.hasPerm(user, "OWNER");
      case "delete":
        return (
          (permissions.delete && user.can(permissions.delete)) || user.isGM
        );
      default:
        return false;
    }
  }

  /**
   * Test whether a given User has permission to perform some action on this Entity
   * @alias Entity.can
   */
  can(user, action) {
    return this.constructor.can(user, action, this);
  }

  /* -------------------------------------------- */
  /*  Entity Management Methods                   */
  /* -------------------------------------------- */

  /**
   * Activate the Socket event listeners used to receive responses from events which modify database documents
   * @param {Socket} socket   The active window.game socket
   */
  static activateSocketListeners(socket) {
    // Document Management
    socket.on("modifyDocument", (response) => {
      const { request } = response;
      if (!ENTITY_TYPES.includes(request.type)) return;

      try {
        const cls = window.CONFIG[request.type].entityClass;
        switch (request.action) {
          case "create":
            return cls._handleCreate(response);
          case "update":
            return cls._handleUpdate(response);
          case "delete":
            return cls._handleDelete(response);
          default:
            return;
        }
      } catch (e) {
        console.error(request.type);
        // throw e;
      } finally{
        window.game.stateUpdate()
      }
      
    });

    // Embedded Document Management
    socket.on("modifyEmbeddedDocument", (response) => {
      const { request } = response;
      try {
        const cls = window.CONFIG[request.parentType].entityClass;
        switch (request.action) {
          case "create":
            return cls._handleCreateEmbeddedEntity(response);
          case "update":
            return cls._handleUpdateEmbeddedEntity(response);
          case "delete":
            return cls._handleDeleteEmbeddedEntity(response);
          default:
            return;
        }
      } catch (err) {
        console.error("request type not handled, parentType:" + request.parentType + ", Type: " + request.Type);
        console.log(request)
      }finally{
        window.game.stateUpdate()
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Create one or multiple new entities using provided input data.
   * Data may be provided as a single object to create one Entity, or as an Array of Objects.
   * Entities may be temporary (unsaved to the database) by passing the temporary option as true.
   * @static
   *
   * @param {Data|Data[]} data            A Data object or array of Data
   * @param {Options} options             Additional options which customize the creation workflow
   * @param {boolean} [options.temporary]     Create a temporary entity which is not saved to the world database. Default is false.
   * @param {boolean} [options.renderSheet]   Display the sheet for the created entity once it is created. Default is false.
   *
   * @return {Promise<Entity|Entity[]>}   The created Entity or array of Entities
   *
   * @example
   * const data = {name: "New Entity", type: "character", img: "path/to/profile.jpg"};
   * const created = await Entity.create(data); // Returns one Entity, saved to the database
   * const temp = await Entity.create(data, {temporary: true}); // Not saved to the database
   *
   * @example
   * const data = [{name: "Tim", type: "npc"], [{name: "Tom", type: "npc"}];
   * const created = await Entity.create(data); // Returns an Array of Entities, saved to the database
   * const created = await Entity.create(data, {temporary: true}); // Not saved to the database
   */
  static async create(data, options = {}) {
    const entityName = this.entity;
    // const cls = CONFIG[entityName].entityClass;
    const user = window.game.user;
    options = mergeObject({ temporary: false, renderSheet: false }, options);

    // Trigger the Socket workflow
    const response = await SocketInterface.dispatch("modifyDocument", {
      type: entityName,
      action: "create",
      data: data,
      options: options,
    });

    // Call the response handler and return the created Entities
    const entities = this._handleCreate(response);
    return data.length === 1 ? entities[0] : entities;
  }

  /* -------------------------------------------- */

  /**
   * Handle a SocketResponse from the server when one or multiple Entities are created
   * @param {SocketRequest} request     The initial request
   * @param {Data[]} result             An Array of created Entity data
   * @param {string} userId             The id of the requesting User
   * @return {Entity[]}                 An Array of constructed Entity instances
   * @private
   */
  static _handleCreate({ request, result = [], userId } = {}) {
    const { type, options } = request;
    const { temporary } = options;

    // Prepare created Entities
    const entities = result.map((data) => {
      // Create the Entity instance
      let entity = new this(data);
      if (temporary) return entity;

      // Add it to the EntityCollection
      this.collection.insert(entity);

      // Trigger follow-up actions and return
      entity._onCreate(data, options, userId);
      return entity;
    });

    // Log creation
    let msg =
      entities.length === 1
        ? `Created ${type}`
        : `Created ${entities.length} ${type}s`;
    if (entities.length === 1) msg += ` with id ${entities[0].id}`;
    else if (entities.length <= 5)
      msg += ` with ids: [${entities.map((d) => d.id)}]`;
    console.log(`${vtt} | ${msg}`);

    // Re-render the parent EntityCollection
    if (options.render !== false) {
      this.collection.render(false, {
        entityType: this.entity,
        action: "create",
        entities: entities,
        data: result,
      });
    }

    // Return the created Entities
    return entities;
  }

  /* -------------------------------------------- */

  /**
   * Entity-specific actions that should occur when the Entity is first created
   * @private
   */
  _onCreate(data, options, userId) {
    //   if ( options.renderSheet && (userId === window.game.user._id) ) {
    //     if ( this.sheet ) this.sheet.render(true, context);
    //   }
  }

  /* -------------------------------------------- */

  /**
   * Update one or multiple existing entities using provided input data.
   * Data may be provided as a single object to update one Entity, or as an Array of Objects.
   * @static
   *
   * @param {Data|Data[]} data            A Data object or array of Data. Each element must contain the _id of an existing Entity.
   * @param {Options} options             Additional options which customize the update workflow
   * @param {boolean} [options.diff]      Difference the provided data against the current to eliminate unnecessary changes.
   *
   * @return {Promise<Entity|Entity[]>}   The updated Entity or array of Entities
   *
   * @example
   * const data = {_id: "12ekjf43kj2312ds", name: "New Name"}};
   * const updated = await Entity.update(data); // Updated entity saved to the database
   *
   * @example
   * const data = [{_id: "12ekjf43kj2312ds", name: "New Name 1"}, {_id: "kj549dk48k34jk34", name: "New Name 2"}]};
   * const updated = await Entity.update(data); // Returns an Array of Entities, updated in the database
   */
  static async update(data, options = {}) {
    const entityName = this.entity;
    const collection = this.collection;
    const user = window.game.user;
    options = mergeObject({ diff: true }, options);

    // Iterate over requested update data
    data = data instanceof Array ? data : [data];
    const updates = data.reduce((arr, d) => {
      // Get the Entity being updated
      if (!d._id)
        throw new Error(
          `You must provide an _id for every ${entityName} in the data Array.`
        );
      const entity = collection.get(d._id, { strict: true });

      // Diff the update against the current data
      if (options.diff) {
        d = diffObject(entity.data, expandObject(d));
        if (isObjectEmpty(d)) return arr;
        d["_id"] = entity.id;
      }

      // Stage the update
      arr.push(d);
      return arr;
    }, []);
    if (!updates.length) return [];

    // Trigger the Socket workflow
    const response = await SocketInterface.dispatch("modifyDocument", {
      type: entityName,
      action: "update",
      data: updates,
      options: options,
    });

    // Call the response handler and return the created Entities
    const entities = this._handleUpdate(response);
    return data.length === 1 ? entities[0] : entities;
  }

  /* -------------------------------------------- */

  /**
   * Handle a SocketResponse from the server when one or multiple Entities are updated
   * @param {SocketRequest} request     The initial request
   * @param {Data[]} result             An Array of updated Entity data
   * @param {string} userId             The id of the requesting User
   * @return {Entity[]}                 An Array of constructed Entity instances
   * @private
   */
  static _handleUpdate({ request, result = [], userId } = {}) {
    const { type, options } = request;
    const collection = this.collection;

    // Prepare updated Entities
    const entities = result.map((data) => {
      // Get and update the Entity data
      const entity = collection.get(data._id, { strict: true });
      mergeObject(entity.data, data);
      if (data.permission && entity.data.permission)
        entity.data.permission = data.permission;

      // Trigger follow-up actions and return
      entity._onUpdate(data, options, userId);
      return entity;
    });

    // Re-render the parent EntityCollection
    if (options.render !== false) {
      this.collection.render(false, {
        entityType: this.entity,
        action: "update",
        entities: entities,
        data: result,
      });
    }

    // Return the updated Entities
    return entities;
  }

  /* -------------------------------------------- */

  /**
   * Entity-specific actions that should occur when the Entity is updated
   * @private
   */
  _onUpdate(data, options, userId) {
    this.prepareData();
    this.render(false, {
      action: "update",
      data: data,
    });
  }

  /* -------------------------------------------- */

  /**
   * Update the current Entity using provided input data.
   * Data must be provided as a single object which updates the Entity data.
   * @see {Entity.update}
   *
   * @param {Data} data                   A Data object which updates the Entity
   * @param {Options} options             Additional options which customize the update workflow
   * @return {Promise<Entity>}            The updated Entity
   */
  async update(data, options = {}) {
    data._id = this._id;

    // Delegate Compendium updates to the relevant pack
    if (this.compendium) {
      options.entity = this;
      return this.compendium.updateEntity(data, options);
    }

    // Perform World entity updates
    return this.constructor.update(data, options);
  }

  /* -------------------------------------------- */

  /**
     * Delete one or multiple existing entities using provided ids.
     * The target ids may be a single string or an Array of strings.
     * @static
     *
     * @param {string|string[]} data            A single id or Array of ids
     * @param {Options} options                 Additional options which customize the deletion workflow
  
     * @return {Promise<Entity|Entity[]>}       The deleted Entity or array of Entities
     *
     * @example
     * const id = "12ekjf43kj2312ds";
     * const deleted = await Entity.delete(id); // A single deleted entity from the database
     *
     * @example
     * const ids = ["12ekjf43kj2312ds", "kj549dk48k34jk34"];
     * const deleted = await Entity.delete(ids); // Returns an Array of deleted Entities
     */
  static async delete(data, options = {}) {
    const entityName = this.entity;
    const user = window.game.user;
    options = mergeObject({ temporary: false, renderSheet: false }, options);

    // Iterate over data to create
    data = data instanceof Array ? data : [data];
    for (let d of data) {
      const e = this.collection.get(d, { strict: true });
      // const allowed = Hooks.call(`preDelete${entityName}`, e, options, user._id);
      // if ( allowed === false ) {
      //   console.debug(`${vtt} | ${entityName} deletion prevented by preCreate hook`);
      //   return null;
      // }
    }

    // Trigger the Socket workflow
    const response = await SocketInterface.dispatch("modifyDocument", {
      type: entityName,
      action: "delete",
      data: data,
      options: options,
    });

    // Call the response handler and return the deleted Entities
    const entities = this._handleDelete(response);
    return data.length === 1 ? entities[0] : entities;
  }

  /* -------------------------------------------- */

  /**
   * Handle a SocketResponse from the server when one or multiple Entities are deleted
   * @param {SocketRequest} request     The initial request
   * @param {string[]} result           An Array of deleted Entity ids
   * @param {string} userId             The id of the requesting User
   * @return {Entity[]}                 An Array of deleted Entity instances
   * @private
   */
  static _handleDelete({ request, result = [], userId } = {}) {
    const { type, options } = request;
    const collection = this.collection;

    // Handle deleting all
    result = options.deleteAll ? Array.from(collection.keys()) : result;

    // Prepare deleted Entities
    const entities = result.map((id) => {
      // Get and update the Entity data
      const entity = collection.get(id, { strict: true });
      collection.remove(id);

      // Trigger follow-up actions and return
      entity._onDelete(options, userId);
      // Hooks.callAll(`delete${request.type}`, entity, options, userId);
      return entity;
    });

    // Log deletion
    let msg =
      entities.length === 1
        ? `Deleted ${type}`
        : `Deleted ${entities.length} ${type}s`;
    if (entities.length === 1) msg += ` with id ${entities[0].id}`;
    else if (entities.length <= 5)
      msg += ` with ids: [${entities.map((d) => d.id)}]`;
    console.log(`${vtt} | ${msg}`);

    // Re-render the parent EntityCollection
    if (options.render !== false) {
      this.collection.render(false, {
        entityType: this.entity,
        action: "delete",
        entities: entities,
        data: result,
      });
    }

    // Return the deleted Entities
    return entities;
  }

  /* -------------------------------------------- */

  /**
   * Entity-specific actions that should occur when the Entity is deleted
   * @private
   */
  _onDelete(options, userId) {
    Object.values(this.apps).forEach((a) => a.close({ submit: false }));
  }

  /* -------------------------------------------- */

  /**
     * Delete the current Entity.
     * @see {Entity.delete}
  
     * @param {Options} options             Options which customize the deletion workflow
     * @return {Promise<Entity>}            The deleted Entity
     */
  async delete(options = {}) {
    if (this.compendium)
      return this.compendium.deleteEntity(this._id, { entity: this });
    return this.constructor.delete(this._id, options);
  }

  /* -------------------------------------------- */
  /*  Embedded Entity Management                  */
  /* -------------------------------------------- */

  /**
   * Get an Embedded Entity by it's id from a named collection in the parent Entity.
   *
   * @param {string} embeddedName   The name of the Embedded Entity type to retrieve
   * @param {string} id             The numeric ID of the child to retrieve
   * @param {boolean} strict        Throw an Error if the requested id does not exist, otherwise return null. Default false.
   * @return {Object|null}          Retrieved data for the requested child, or null
   */
  getEmbeddedEntity(embeddedName, id, { strict = false } = {}) {
    const collection = this.getEmbeddedCollection(embeddedName);
    const child = collection.find((c) => c._id === id);
    if (!child && strict) {
      throw new Error(
        `The ${embeddedName} ${id} does not exist in ${this.constructor.name} ${this._id}`
      );
    }
    return child || null;
  }

  /* -------------------------------------------- */

  /**
   * Create one or multiple EmbeddedEntities within this parent Entity.
   * Data may be provided as a single Object to create one EmbeddedEntity or as an Array of Objects to create many.
   * Entities may be temporary (unsaved to the database) by passing the temporary option as true.
   *
   * @param {string} embeddedName   The name of the Embedded Entity class to create
   * @param {Data|Data[]} data      A Data object or an Array of Data objects to create
   * @param {Options} options       Additional creation options which modify the request
   * @param {boolean} [options.temporary]     Create a temporary entity which is not saved to the world database. Default is false.
   * @param {boolean} [options.renderSheet]   Display the sheet for each created Embedded Entities once created.
   *
   * @return {Promise<Data|Data[]>} A Promise which resolves to the created embedded Data once the creation request is successful
   *
   * @example
   * const actor = window.game.actors.get("dfv934kj23lk6h9k");
   * const data = {name: "Magic Sword", type: "weapon", img: "path/to/icon.png"};
   * const created = await actor.createEmbeddedEntity("OwnedItem", data); // Returns one EmbeddedEntity, saved to the Actor
   * const temp = await actor.createEmbeddedEntity("OwnedItem", data, {temporary: true}); // Not saved to the Actor
   *
   * @example
   * const actor = window.game.actors.get("dfv934kj23lk6h9k");
   * const data = [{name: "Mace of Crushing", type: "weapon"}, {name: "Shield of Defense", type: "armor"}];
   * const created = await actor.createEmbeddedEntity("OwnedItem", data); // Returns an Array of EmbeddedEntities, saved to the Actor
   * const temp = await actor.createEmbeddedEntity("OwnedItem", data, {temporary: true}); // Not saved to the Actor
   */
  async createEmbeddedEntity(embeddedName, data, options = {}) {
    this.getEmbeddedCollection(embeddedName); // Do this to validate the collection exists
    const user = window.game.user;
    options = mergeObject({ temporary: false, renderSheet: false }, options);

    // Iterate over data to create
    data = data instanceof Array ? data : [data];

    // Trigger the Socket workflow
    const response = await SocketInterface.dispatch("modifyEmbeddedDocument", {
      action: "create",
      type: embeddedName,
      parentType: this.entity,
      parentId: this.id,
      data: data,
      options: options,
    });

    // Call the response handler and return the created Entities
    const embedded = this.constructor._handleCreateEmbeddedEntity(response);
    return data.length === 1 ? embedded[0] : embedded;
  }

  /* -------------------------------------------- */

  /**
   * Handle a SocketResponse from the server when one or multiple Embedded Entities are created
   * @param {SocketRequest} request     The initial request
   * @param {Data[]} result             An Array of created Entity data
   * @param {string} userId             The id of the requesting User
   * @return {Data[]}                   An Array of constructed EmbeddedDocument data
   * @private
   */
  static _handleCreateEmbeddedEntity({ request, result = [], userId } = {}) {
    const { type, parentType, parentId, options } = request;
    const { temporary } = options;
    const parent = this.collection.get(parentId);
    const collection = parent.getEmbeddedCollection(type);

    // Return temporary data directly
    if (temporary) return result;

    // Add the created data into the collection
    collection.push(...result);

    // Trigger follow-up actions for each created EmbeddedEntity
    for (let r of result) {
      parent._onCreateEmbeddedEntity(type, r, options, userId);
      // Hooks.callAll(`create${type}`, parent, r, options, userId);
    }
    parent._onModifyEmbeddedEntity(type, result, options, userId, {
      action: "create",
    });

    // Log creation
    let msg =
      result.length === 1
        ? `Created ${type}`
        : `Created ${result.length} ${type}s`;
    if (result.length === 1) msg += ` ${result[0]._id}`;
    else if (result.length <= 5) msg += ` [${result.map((d) => d._id)}]`;
    msg += ` in parent ${parentType} ${parent.id}`;
    console.log(`${vtt} | ${msg}`);

    // Return the created results
    return result;
  }

  /* -------------------------------------------- */

  /**
   * Handle Embedded Entity creation within this Entity with specific callback steps.
   * This function is triggered once per EmbeddedEntity which is updated.
   * It therefore may run multiple times per creation workflow.
   * Any steps defined here should run on a per-EmbeddedEntity basis.
   * Steps that should run once for the whole batch should go in _onModifyEmbeddedEntity()
   * @private
   */
  _onCreateEmbeddedEntity(embeddedName, child, options, userId) {}

  /* -------------------------------------------- */

  /**
   * Update one or multiple existing entities using provided input data.
   * Data may be provided as a single object to update one Entity, or as an Array of Objects.
   * @static
   *
   * @param {string} embeddedName   The name of the Embedded Entity class to create
   * @param {Data|Data[]} data            A Data object or array of Data. Each element must contain the _id of an existing Entity.
   * @param {Options} options             Additional options which customize the update workflow
   * @param {boolean} [options.diff]      Difference the provided data against the current to eliminate unnecessary changes.
   *
   * @return {Promise<Entity|Entity[]>}   The updated Entity or array of Entities
   *
   * @example
   * const actor = window.game.actors.get("dfv934kj23lk6h9k");
   * const item = actor.data.items.find(i => i.name === "Magic Sword");
   * const update = {_id: item._id, name: "Magic Sword +1"};
   * const updated = await actor.updateEmbeddedEntity("OwnedItem", update); // Updates one EmbeddedEntity
   *
   * @example
   * const actor = window.game.actors.get("dfv934kj23lk6h9k");
   * const weapons = actor.data.items.filter(i => i.type === "weapon");
   * const updates = weapons.map(i => {
   *   return {_id: i._id, name: i.name + "+1"};
   * }
   * const updated = await actor.createEmbeddedEntity("OwnedItem", updates); // Updates multiple EmbeddedEntity objects
   */
  async updateEmbeddedEntity(embeddedName, data, options = {}) {
    const collection = this.getEmbeddedCollection(embeddedName);
    const user = window.game.user;
    options = mergeObject({ diff: true }, options);

    // Structure the update data
    const pending = new Map();
    data = data instanceof Array ? data : [data];
    for (let d of data) {
      if (!d._id)
        throw new Error(
          "You must provide an id for every Embedded Entity in an update operation"
        );
      pending.set(d._id, d);
    }

    // Difference each update against existing data
    const updates = collection.reduce((arr, d) => {
      if (!pending.has(d._id)) return arr;
      let update = pending.get(d._id);

      // Diff the update against current data
      if (options.diff) {
        update = diffObject(d, expandObject(update));
        if (isObjectEmpty(update)) return arr;
        update["_id"] = d._id;
      }

      // Call pre-update hooks to ensure the update is allowed to proceed
      // const allowed = Hooks.call(`preUpdate${embeddedName}`, this, d, update, options, user._id);
      // if ( allowed === false ) {
      //   console.debug(`${vtt} | ${embeddedName} update prevented by preUpdate hook`);
      //   return arr;
      // }

      // Stage the update
      arr.push(update);
      return arr;
    }, []);
    if (!updates.length) return [];

    // Trigger the Socket workflow
    const response = await SocketInterface.dispatch("modifyEmbeddedDocument", {
      action: "update",
      type: embeddedName,
      parentType: this.entity,
      parentId: this.id,
      data: updates,
      options: options,
    });

    // Call the response handler and return the created Entities
    const embedded = this.constructor._handleUpdateEmbeddedEntity(response);
    return data.length === 1 ? embedded[0] : embedded;
  }

  /* -------------------------------------------- */

  /**
   * Handle a SocketResponse from the server when one or multiple Embedded Entities are updated
   * @param {SocketRequest} request     The initial request
   * @param {Data[]} result             An Array of updated Entity data
   * @param {string} userId             The id of the requesting User
   * @return {Data[]}                   An Array of updated EmbeddedDocument data
   * @private
   */
  static _handleUpdateEmbeddedEntity({ request, result = [], userId } = {}) {
    const { type, parentId, options } = request;
    const parent = this.collection.get(parentId);
    const collection = parent.getEmbeddedCollection(type);

    // Structure the pending updates
    const pending = new Map(result.map((d) => [d._id, d]));

    // Update children in the collection
    for (let doc of collection) {
      // Update the data
      if (!pending.has(doc._id)) continue;
      const update = pending.get(doc._id);
      mergeObject(doc, update);

      // Trigger follow-up actions
      parent._onUpdateEmbeddedEntity(type, doc, update, options, userId);
      // Hooks.callAll(`update${type}`, parent, doc, update, options, userId);
    }

    // Trigger overall modification of the parent
    parent._onModifyEmbeddedEntity(type, result, options, userId, {
      action: "update",
    });

    // Return the created results
    return result;
  }

  /* -------------------------------------------- */

  /**
   * Handle Embedded Entity updates within this Entity with specific callback steps.
   * This function is triggered once per EmbeddedEntity which is updated.
   * It therefore may run multiple times per creation workflow.
   * Any steps defined here should run on a per-EmbeddedEntity basis.
   * Steps that should run once for the whole batch should go in _onModifyEmbeddedEntity()
   * @private
   */
  _onUpdateEmbeddedEntity(embeddedName, child, updateData, options, userId) {}

  /* -------------------------------------------- */

  /**
     * Delete one or multiple existing EmbeddedEntity objects using provided input data.
     * Data may be provided as a single id to delete one object or as an Array of string ids.
     * @static
     *
     * @param {string} embeddedName   The name of the Embedded Entity class to create
     * @param {string|string[]} data        A Data object or array of Data. Each element must contain the _id of an existing Entity.
     * @param {Options} options             Additional options which customize the update workflow
  
     * @return {Promise<Data|Data[]>}       The deleted Embedded Entities
     *
     * @example
     * const actor = window.game.actors.get("dfv934kj23lk6h9k");
     * const item = actor.data.items.find(i => i.name === "Magic Sword");
     * const deleted = await actor.deleteEmbeddedEntity("OwnedItem", item._id); // Deletes one EmbeddedEntity
     *
     * @example
     * const actor = window.game.actors.get("dfv934kj23lk6h9k");
     * const weapons = actor.data.items.filter(i => i.type === "weapon");
     * const deletions = weapons.map(i => i._id);
     * const updated = await actor.deleteEmbeddedEntity("OwnedItem", deletions); // Deletes multiple EmbeddedEntity objects
  
     */
  async deleteEmbeddedEntity(embeddedName, data, options = {}) {
    const collection = this.getEmbeddedCollection(embeddedName);
    const user = window.game.user;

    // Structure the input data
    data = data instanceof Array ? data : [data];
    const ids = new Set(data);

    // Iterate over elements of the collection
    const deletions = collection.reduce((arr, d) => {
      if (!ids.has(d._id)) return arr;

      // Call pre-update hooks to ensure the update is allowed to proceed
      // const allowed = Hooks.call(`preDelete${embeddedName}`, this, d, options, user._id);
      // if ( allowed === false ) {
      //   console.debug(`${vtt} | ${embeddedName} update prevented by preUpdate hook`);
      //   return arr;
      // }

      // Add the id to the pending array
      arr.push(d._id);
      return arr;
    }, []);
    if (!deletions.length) return [];

    // Trigger the Socket workflow
    const response = await SocketInterface.dispatch("modifyEmbeddedDocument", {
      action: "delete",
      type: embeddedName,
      parentType: this.entity,
      parentId: this.id,
      data: deletions,
      options: options,
    });

    // Call the response handler and return the created Entities
    const embedded = this.constructor._handleDeleteEmbeddedEntity(response);
    return deletions.length === 1 ? embedded[0] : embedded;
  }

  /* -------------------------------------------- */

  /**
   * Handle a SocketResponse from the server when one or multiple Embedded Entities are deleted
   * @param {SocketRequest} request     The initial request
   * @param {string[]} result           An Array of deleted EmbeddedEntity ids
   * @param {string} userId             The id of the requesting User
   * @return {Data[]}                   An Array of deleted EmbeddedDocument data
   * @private
   */
  static _handleDeleteEmbeddedEntity({ request, result = [], userId } = {}) {
    const { type, parentType, parentId, options } = request;
    const parent = this.collection.get(parentId);
    const collection = parent.getEmbeddedCollection(type);

    // Structure the pending updates
    const deletions = new Set(result);

    // Update children in the collection
    const [deleted, surviving] = collection.partition((doc) => {
      if (!deletions.has(doc._id)) return true;
      parent._onDeleteEmbeddedEntity(type, doc, options, userId);
      // Hooks.callAll(`delete${type}`, parent, doc, options, userId);
      return false;
    });

    // Assign the updated collection
    const collectionName = this.config.embeddedEntities[type];
    parent.data[collectionName] = surviving;

    // Trigger overall modification of the parent
    parent._onModifyEmbeddedEntity(type, result, options, userId, {
      action: "update",
    });

    // Log deletion
    let msg =
      deleted.length === 1
        ? `Deleted ${type}`
        : `Deleted ${result.length} ${type}s`;
    if (deleted.length === 1) msg += ` ${result[0]}`;
    else if (!options.deleteAll && deleted.length <= 5) msg += ` [${result}]`;
    msg += ` from parent ${parentType} ${parent.id}`;
    console.log(`${vtt} | ${msg}`);
    return deleted;
  }

  /* -------------------------------------------- */

  /**
   * Handle Embedded Entity deletion within this Entity with specific callback steps.
   * This function is triggered once per EmbeddedEntity which is updated.
   * It therefore may run multiple times per creation workflow.
   * Any steps defined here should run on a per-EmbeddedEntity basis.
   * Steps that should run once for the whole batch should go in _onModifyEmbeddedEntity()
   * @private
   */
  _onDeleteEmbeddedEntity(embeddedName, child, options, userId) {}

  /* -------------------------------------------- */

  /**
   * A generic helper since we take the same actions for every type of Embedded Entity update
   * Unlike the specific _onCreate, _onUpdate, and _onDelete methods this only runs once per updated batch
   * @private
   */
  _onModifyEmbeddedEntity(
    embeddedName,
    changes,
    options,
    userId,
    context = {}
  ) {
    this.prepareData();
    this.render(false, context);
  }

  /* -------------------------------------------- */
  /*  Data Flags                                  */
  /* -------------------------------------------- */

  /**
   * Get the value of a "flag" for this Entity
   * See the setFlag method for more details on flags
   *
   * @param {String} scope    The flag scope which namespaces the key
   * @param {String} key      The flag key
   * @return {*}              The flag value
   */
  getFlag(scope, key) {
    console.error("not implemented");
    //   const scopes = SetupConfiguration.getPackageScopes();
    //   if ( !scopes.includes(scope) ) throw new Error(`Invalid scope for flag ${key}`);
    //   key = `${scope}.${key}`;
    //   return getProperty(this.data.flags, key);
  }

  /* -------------------------------------------- */

  /**
   * Assign a "flag" to this Entity.
   * Flags represent key-value type data which can be used to store flexible or arbitrary data required by either
   * the core software, window.game systems, or user-created modules.
   *
   * Each flag should be set using a scope which provides a namespace for the flag to help prevent collisions.
   *
   * Flags set by the core software use the "core" scope.
   * Flags set by window.game systems or modules should use the canonical name attribute for the module
   * Flags set by an individual world should "world" as the scope.
   *
   * Flag values can assume almost any data type. Setting a flag value to null will delete that flag.
   *
   * @param {String} scope    The flag scope which namespaces the key
   * @param {String} key      The flag key
   * @param {*} value         The flag value
   *
   * @return {Promise.<Entity>} A Promise resolving to the updated Entity
   */
  async setFlag(scope, key, value) {
    //   const scopes = SetupConfiguration.getPackageScopes();
    //   if ( !scopes.includes(scope) ) throw new Error(`Invalid scope for flag ${key}`);
    //   key = `flags.${scope}.${key}`;
    //   return this.update({[key]: value});
    console.error("not implemented");
  }

  /* -------------------------------------------- */

  /**
   * Remove a flag assigned to the Entity
   * @param {string} scope    The flag scope which namespaces the key
   * @param {string} key      The flag key
   * @return {Promise}        A Promise resolving to the updated Entity
   */
  async unsetFlag(scope, key) {
    console.error("not implemented");
    //   const scopes = SetupConfiguration.getPackageScopes();
    //   if ( !scopes.includes(scope) ) throw new Error(`Invalid scope for flag ${key}`);
    //   key = `flags.${scope}.-=${key}`;
    //   return this.update({[key]: null});
  }

  /* -------------------------------------------- */
  /*  Sorting                                     */
  /* -------------------------------------------- */

  /**
   * Sort this Entity relative a target by providing the target, an Array of siblings and other options.
   * If the Entity has an rendered sheet, record the sort change as part of a form submission
   * See SortingHelper.performIntegerSort for more details
   */
  async sortRelative({
    target = null,
    siblings = [],
    sortKey = "sort",
    sortBefore = true,
    updateData = {},
  } = {}) {
    const updates = SortingHelpers.performIntegerSort(this, {
      target,
      siblings,
      sortKey,
      sortBefore,
    });
    for (let u of updates) {
      const ent = u.target;
      const update = mergeObject(updateData, u.update, { inplace: false });
      if (ent.sheet && ent.sheet.rendered)
        await ent.sheet.submit({ updateData: update });
      else await ent.update(update);
    }
  }

  /* -------------------------------------------- */
  /*  Saving and Loading
    /* -------------------------------------------- */

  /**
   * Clone an Entity, creating a new Entity using the current data as well as provided creation overrides.
   *
   * @param {Object} createData     Additional data which overrides current Entity data at the time of creation
   * @param {Object} options        Additional creation options passed to the Entity.create method
   * @returns {Promise.<Entity>}    A Promise which resolves to the created clone Entity
   */
  async clone(createData = {}, options = {}) {
    createData = mergeObject(this.data, createData, { inplace: false });
    return this.constructor.create(createData, options);
  }

  /* -------------------------------------------- */

  /**
   * Serializing an Entity should simply serialize it's inner data, not the entire instance
   * @return {Object}
   */
  toJSON() {
    return this.data;
  }

  /* -------------------------------------------- */

  /**
   * Export entity data to a JSON file which can be saved by the client and later imported into a different session
   */
  exportToJSON() {
    //   // Prepare export data
    //   const data = duplicate(this.data);
    //   delete data.folder;
    //   delete data.permission;

    //   // Flag some metadata about where the entity was exported some - in case migration is needed later
    //   data.flags["exportSource"] = {
    //     world: window.game.world.id,
    //     system: window.game.system.id,
    //     coreVersion: window.game.data.version,
    //     systemVersion: window.game.system.data.version
    //   };

    //   // Trigger file save procedure
    //   const filename = `fvtt-${this.entity}-${this.name.replace(/\s/g, "_")}.json`;
    //   saveDataToFile(JSON.stringify(data, null, 2), "text/json", filename);
    console.error("not implemented");
  }

  /* -------------------------------------------- */

  /**
   * Import data and update this entity
   * @param {String} json         JSON data string
   * @return {Promise.<Entity>}   The updated Entity
   */
  async importFromJSON(json) {
    const data = JSON.parse(json);
    delete data._id;
    return this.update(data);
  }

  /* -------------------------------------------- */

  /**
   * Render an import dialog for updating the data related to this Entity through an exported JSON file
   * @return {Promise.<void>}
   */
  async importFromJSONDialog() {
    console.error("not implemented");
    //   new Dialog({
    //     title: `Import Data: ${this.name}`,
    //     content: await renderTemplate("templates/apps/import-data.html", {entity: this.entity, name: this.name}),
    //     buttons: {
    //       import: {
    //         icon: '<i class="fas fa-file-import"></i>',
    //         label: "Import",
    //         callback: html => {
    //           const form = html.find("form")[0];
    //           if ( !form.data.files.length ) return ui.notifications.error("You did not upload a data file!");
    //           readTextFromFile(form.data.files[0]).then(json => this.importFromJSON(json));
    //         }
    //       },
    //       no: {
    //         icon: '<i class="fas fa-times"></i>',
    //         label: "Cancel"
    //       }
    //     },
    //     default: "import"
    //   }, {
    //     width: 400
    //   }).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Transform the Entity data to be stored in a Compendium pack.
   * Remove any features of the data which are world-specific.
   * This function is asynchronous in case any complex operations are required prior to exporting.
   *
   * @return {Object}   A data object of cleaned data ready for compendium import
   */
  async toCompendium() {
    const data = duplicate(this.data);
    const deleteKeys = ["_id", "permission", "folder", "sort", "active"];
    for (let k of deleteKeys) {
      delete data[k];
    }
    return data;
  }
}
