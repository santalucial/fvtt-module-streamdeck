
import {ENTITY_PERMISSIONS} from '../constants'
import {mergeObject} from '../utils'
import {Entity} from './entity'
const vtt = "Foundry VTT";


/**
 * A reusable storage concept which blends the functionality of an Array with the efficient key-based lookup of a Map.
 * This concept is reused throughout Foundry VTT where a collection of uniquely identified elements is required.
 * @extends {Map}
 */
class Collection extends Map {

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

/**
 * An iterable container of Entity objects within the Foundry Virtual Tabletop framework.
 * Each Entity type has it's own subclass of EntityCollection, which defines the abstract interface.
 * @abstract
 * @extends {Collection}
 *
 * @param {Array} data      An Array of Entity data from which to create instances
 */
export class EntityCollection extends Collection {
    constructor(data) {
      super();
  
      /**
       * The source data is, itself, a mapping of IDs to data objects
       * @type {Array}
       */
      this._source = data;
  
      /**
       * An Array of application references which will be automatically updated when the collection content changes
       * @type {Array}
       */
      this.apps = [];
  
      // Initialize data
      this._initialize(data);
      // if(this instanceof window.CONFIG['Combat'].collection){
      //   console.log(data)
      // }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Initialize the Map object and all its contained entities
     * @param {Entity[]} data
     * @private
     */
    _initialize(data) {
      this.clear();
      for ( let d of data ) {
        this.set(d._id, new this.object(d));
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * An array of all the Entities in the EntityCollection.
     * @alias {Collection#entries}
     * @return {Entity[]}
     */
    get entities() {
      return this.entries;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Render any Applications associated with this EntityCollection
     * @return {this}     A reference to the rendered EntityCollection
     */
    render(...args) {
      for (let a of this.apps) a.render(...args);
      return this;
    }
  
    /* -------------------------------------------- */
    /*  EntityCollection Properties                       */
    /* -------------------------------------------- */
  
    /**
     * The EntityCollection name
     * @type {string}
     */
    get name() {
      return this.constructor.name;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Return a reference to the singleton instance of this EntityCollection, or null if it has not yet been created.
     * @type {EntityCollection|null}
     */
    static get instance() {
      return window.game[this.name.toLowerCase()] || null;
    }
  
    /* -------------------------------------------- */
  
  
    /* -------------------------------------------- */
  
    /**
     * Return a reference to the Entity subclass which should be used when creating elements of this EntityCollection.
     * This should always be an explicit reference to the class which is used in this game to represent the entity,
     * and not the base implementation of that entity type. For example :class:`Actor5e` not :class:`Actor`.
     * @abstract
     * @type {Entity}
     */
    get object() {
      return Entity;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Return a reference to the base Entity name which is contained within this EntityCollection.
     * @type {string}
     */
    get entity() {
      return this.object.entity;
    }
  
    /* -------------------------------------------- */
    /*  EntityCollection Management Methods         */
    /* -------------------------------------------- */
  
    /**
     * Get an Entity from the EntityCollection by name
     * @param {string} name     The name of the Entity to retrieve
     * @param {boolean} strict  Throw an Error if the requested id does not exist, otherwise return null. Default false.
     * @return {Entity|null}    The retrieved Entity, if one was found, otherwise null;
     */
    getName(name, {strict = false} = {}) {
      const entity = this.find(e => e.name === name);
      if ( !entity && strict ) {
        throw new Error(`The ${this.object.name} ${name} does not exist in the ${this.constructor.name} collection`);
      }
      return entity || null;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Add a new Entity to the EntityCollection, asserting that they are of the correct type.
     * @param entity {Entity}   The entity instance to add to the collection
     */
    insert(entity) {
      if (!(entity instanceof this.object)) {
        throw new Error(`You may only push instances of ${this.object.name} to the ${this.name} collection`);
      }
      this._source.push(entity.data);
      this.set(entity.id, entity);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Remove an Entity from the EntityCollection by its ID.
     * @param id {string}   The entity ID which should be removed
     */
    remove(id) {
      this._source.findSplice(e => e._id === id);
      this.delete(id);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Import an Entity from a compendium collection, adding it to the current World.
     * @param {string} collection     The name of the pack from which to import
     * @param {string} entryId        The ID of the compendium entry to import
     * @param {Object} [updateData]   Optional additional data used to modify the imported Entity before it is created
     * @param {Object} [options]      Optional arguments passed to the Entity.create method
     * @return {Promise.<Entity>}     A Promise containing the imported Entity
     */
    async importFromCollection(collection, entryId, updateData={}, options={}) {
      const entName = this.object.entity;
      const pack = window.game.packs.get(collection);
      if (pack.metadata.entity !== entName) return;
  
      // Prepare the source data from which to create the Entity
      const source = await pack.getEntity(entryId);
      const createData = mergeObject(this.fromCompendium(source.data), updateData);
      delete createData._id;
  
      // Create the Entity
      console.log(`${vtt} | Importing ${entName} ${source.name} from ${collection}`);
      this.directory.activate();
      return await this.object.create(createData, options);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Apply data transformations when importing an Entity from a Compendium pack
     * @param {Object} data           The original Compendium entry data
     * @return {Object}               The processed data ready for Entity creation
     */
    fromCompendium(data) {
      const nullKeys = ["_id", "folder", "sort"];
      for ( let k of nullKeys ) {
        data[k] = null;
      }
      data.permissions = {[window.game.user._id]: ENTITY_PERMISSIONS.OWNER};
      return data;
    }
  }

  Array.prototype.findSplice = function(find) {
    const idx = this.findIndex(find);
    if ( idx === -1 ) return null;
    const item = this[idx];
    this.splice(idx, 1);
    return item;
  };
  