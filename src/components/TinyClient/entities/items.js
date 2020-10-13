import {EntityCollection} from './entityCollection'
import {Item} from './item'
/**
 * The EntityCollection of Item entities
 * The items collection is accessible within the game as game.items
 *
 * @type {EntityCollection}
 */
export class Items extends EntityCollection {

    /**
     * Elements of the Items collection are instances of the Item class, or a subclass thereof
     * @return {Item}
     */
    get object() {
      return Item;
    }
  
    /* -------------------------------------------- */
    /*  Methods
    /* -------------------------------------------- */
  
    /**
     * Register an Actor sheet class as a candidate which can be used to display Actors of a given type
     * See EntitySheetConfig.registerSheet for details
     */
    // static registerSheet(...args) {
    //   EntitySheetConfig.registerSheet(Item, ...args);
    // }
  
    /* -------------------------------------------- */
  
    /**
    //  * Unregister an Actor sheet class, removing it from the list of avaliable sheet Applications to use
    //  * See EntitySheetConfig.unregisterSheet for details
      */
    // static unregisterSheet(...args) {
    //   EntitySheetConfig.unregisterSheet(Item, ...args)
    // }
  
    /* -------------------------------------------- */
  
    /**
     * Return an Array of currently registered sheet classes for this Entity type
     * @type {ItemSheet[]}
     */
    static get registeredSheets() {
      const sheets = new Set();
      for (let t of Object.values(Item)) {
        for (let s of Object.values(t)) {
          sheets.add(s.cls);
        }
      }
      return Array.from(sheets);
    }
  }
  