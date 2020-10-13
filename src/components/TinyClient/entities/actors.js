
import {EntityCollection} from './entityCollection'
import {CONFIG} from '../constants'
import {Actor} from './actor'
/**
 * The EntityCollection of Actor entities.
 * @extends {EntityCollection}
 *
 * @see {@link Actor} The Actor entity.
 * @see {@link ActorDirectory} All Actors which exist in the world are rendered within the ActorDirectory sidebar tab.
 *
 * @example <caption>Retrieve an existing Actor by its id</caption>
 * let actor = game.actors.get(actorId);
 */


export class Actors extends EntityCollection {
    constructor(...args) {
      super(...args);
  
      /**
       * A mapping of synthetic Token Actors which are currently active within the viewed Scene.
       * Each Actor is referenced by the Token.id.
       * @type {Object}
       */
      this.tokens = {};
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    get object() {
      return Actor;
    }
  
    /* -------------------------------------------- */
    /*  Sheet Registration Methods                  */
    /* -------------------------------------------- */
  
    /**
     * Register an Actor sheet class as a candidate which can be used to display Actors of a given type
     * See EntitySheetConfig.registerSheet for details
     * @static
     *
     * @example <caption>Register a new ActorSheet subclass for use with certain Actor types.</caption>
     * Actors.registerSheet("dnd5e", ActorSheet5eCharacter, { types: ["character"], makeDefault: true });
     */
    static registerSheet(...args) {
    //   EntitySheetConfig.registerSheet(Actor, ...args);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Unregister an Actor sheet class, removing it from the list of avaliable sheet Applications to use
     * See EntitySheetConfig.unregisterSheet for details
     * @static
     *
     * @example <caption>Deregister the default ActorSheet subclass to replace it with others.</caption>
     * Actors.unregisterSheet("core", ActorSheet);
     */
    static unregisterSheet(...args) {
    //   EntitySheetConfig.unregisterSheet(Actor, ...args)
    }
  
    /* -------------------------------------------- */
  
    /**
     * Return an Array of currently registered sheet classes for this Entity type
     * @type {ActorSheet[]}
     */
    static get registeredSheets() {
      const sheets = new Set();
      for (let t of Object.values(CONFIG.Actor.sheetClasses)) {
        for (let s of Object.values(t)) {
          sheets.add(s.cls);
        }
      }
      return Array.from(sheets);
    }
  }
  
  if (window.CONFIG === undefined){
    window.CONFIG = {}
  }
  window.CONFIG['Actor'] =  {
    entityClass: Actor,
    collection: Actors,
  }