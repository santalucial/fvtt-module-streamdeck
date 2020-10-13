
import {Entity} from './entity'
import {DEFAULT_TOKEN} from '../constants'


/**
 * The Item entity.
 * This base Item refers primarily to items which are not currently owned.
 * @type {Entity}
 */
export class Item extends Entity {

    /**
     * Configure the attributes of the ChatMessage Entity
     *
     * @returns {Entity} baseEntity       The parent class which directly inherits from the Entity interface.
     * @returns {EntityCollection} collection   The EntityCollection class to which Entities of this type belong.
     * @returns {Array} embeddedEntities  The names of any Embedded Entities within the Entity data structure.
     */
    static get config() {
      return {
        baseEntity: Item,
        collection: window.game.items,
        embeddedEntities: {},
        label: "ENTITY.Item",
        permissions: {
          create: "ITEM_CREATE"
        }
      };
    }
  
      /* -------------------------------------------- */
  
    /** @override */
    get uuid() {
      if ( this.actor ) return `Actor.${this.actor.id}.OwnedItem.${this.id}`;
      return super.uuid;
    }
  
    /* -------------------------------------------- */
  
    prepareData() {
      super.prepareData();
      if (!this.data.img) this.data.img = DEFAULT_TOKEN;
    }
  
    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */
  
    /**
     * A convenience reference to the Actor entity which owns this item, if any
     * @type {Actor|null}
     */
    get actor() {
      return this.options.actor || null;
    }
  
    /* -------------------------------------------- */
  
    /**
     * A convenience reference to the image path (data.img) used to represent this Item
     * @type {string}
     */
    get img() {
      return this.data.img;
    }
  
    /* -------------------------------------------- */
  
    /**
     * A convenience reference to the item type (data.type) of this Item
     * @type {string}
     */
    get type() {
      return this.data.type;
    }
  
    /* -------------------------------------------- */
  
    /**
     * A boolean indicator for whether the current window.game user has ONLY limited visibility for this Entity.
     * @return {boolean}
     */
    get limited() {
      if (this.isOwned) return this.actor.limited;
      else return super.limited;
    }
  
    /* -------------------------------------------- */
  
    /**
     * A flag for whether the item is owned by an Actor entity
     * @return {boolean}
     */
    get isOwned() {
      return this.actor !== null;
    }
  
    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */
  
    /**
     * Override the standard permission test for Item entities as we need to apply a special check for owned items
     * OwnedItems have permission that the player has for the parent Actor.
     * @return {Boolean}            Whether or not the user has the permission for this item
     */
    hasPerm(...args) {
      if (this.actor) return this.actor.hasPerm(...args);
      else return super.hasPerm(...args);
    }
  
    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */
  
    /** @override */
    async update(data, options) {
  
      // Case 1 - Update an OwnedItem within an Actor
      if (this.isOwned) {
        data._id = this.data._id;
        return this.actor.updateEmbeddedEntity("OwnedItem", data, options);
      }
  
      // Case 2 - Standard Entity update procedure
      else return super.update(data, options);
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    async delete(options) {
      if ( this.isOwned ) return this.actor.deleteEmbeddedEntity("OwnedItem", this.data._id, options);
      return super.delete(options);
    }
  
    /* -------------------------------------------- */
  
    /**
     * A convenience constructor method to create an Item instance which is owned by an Actor
     * @param {Object} itemData
     * @param {Actor} actor
     */
    static createOwned(itemData, actor) {
    //   let Item = Item;
      return new Item(itemData, {actor: actor});
    }
  }