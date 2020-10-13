import {Combat} from './combat'
import {EntityCollection} from './entityCollection'

export class CombatEncounters extends EntityCollection {
    constructor(...args) {
      super(...args);
  
      /**
       * A reference to the world combat configuration settings
       * @type {Object}
       */
      // this.settings = window.game.settings.get("core", Combat.CONFIG_SETTING);
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    get object() {
      return Combat;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Get an Array of Combat instances which apply to the current canvas scene
     * @type {Array}
     */
    get combats() {
      let scene = window.game.scenes.active;
      if ( !scene ) return [];
      return this.entities.filter(c => c.data.scene === scene._id);
    }
  
    /* -------------------------------------------- */
  
    /**
     * The currently active Combat instance
     * @return {Combat}
     */
    get active() {
      return this.combats.find(c => c.data.active);
    }
  
  
    /** @override */
    static get instance() {
      return window.game.combats;
    }
  
    /* -------------------------------------------- */
  
    /**
     * When a Token is deleted, remove it as a combatant from any combat encounters which included the Token
     * @param {string} sceneId
     * @param {string} tokenId
     * @private
     */
    async _onDeleteToken(sceneId, tokenId) {
      const combats = window.game.combats.entities.filter(c => c.sceneId = sceneId);
      for ( let c of combats ) {
        let combatant = c.getCombatantByToken(tokenId);
        if ( combatant ) await c.deleteCombatant(combatant.id);
      }
    }
  }


  if (window.CONFIG === undefined){
    window.CONFIG = {}
  }
  window.CONFIG['Combat'] =  {
      entityClass: Combat,
      collection: CombatEncounters,
      initiative: {
        formula: null,
        decimals: 0
      }
  }