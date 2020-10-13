import { Entity } from "./entity";
import {DEFAULT_TOKEN,USER_ROLES} from '../constants'

export class User extends Entity {
    constructor(data, options) {
      super(data, options);
  
      /**
       * Track whether the user is currently active in the window.game
       * @type {boolean}
       */
      this.active = data.active || false;
  
      /**
       * Track references to the current set of Tokens which are targeted by the User
       * @type {Set.<Token>}
       */
      this.targets = new UserTargets(this);
  
      /**
       * Track the ID of the Scene that is currently being viewed by the User
       * @type {string|null}
       */
      this.viewedScene = data.viewedScene || null;
  
      /**
       * Define an immutable property for the User's role
       * @type {number}
       */
      Object.defineProperty(this, 'role', {value: data.role, writable: false});
    }
  
    /* ---------------------------------------- */
    /*  Properties                              */
    /* ---------------------------------------- */
  
    /** @override */
    static get config() {
      return {
        baseEntity: User,
        collection: window.game.users,
        embeddedEntities: {},
        label: "ENTITY.User"
      };
    }
  
      /* -------------------------------------------- */
  
    /**
     * Return the User avatar icon or the controlled actor's image
     * @type {String}
     */
    get avatar() {
      return this.data.avatar || (this.character ? this.character.img : DEFAULT_TOKEN);
    }
  
    /**
     * Return the Actor instance of the user's impersonated character (or undefined)
     * @type {Actor}
     */
    get character() {
      return window.game.actors.get(this.data.character);
    }
  
    /**
     * A convenience shortcut for the permissions object of the current User
     * @type {Object}
     */
    get permissions() {
      return this.data.permissions;
    }
  
    /* ---------------------------------------- */
  
    /**
     * A flag for whether the current User is a Trusted Player
     * @return {Boolean}
     */
    get isTrusted() {
      return this.hasRole("TRUSTED");
    }
  
    /* ---------------------------------------- */
  
    /**
     * A flag for whether the current User has Assistant window.gameMaster or full window.gameMaster role
     * @return {Boolean}
     */
    get isGM() {
      return this.hasRole("ASSISTANT");
    }
  
    /* ---------------------------------------- */
  
    /**
     * A flag for whether this User is the connected client
     * @return {Boolean}
     */
    get isSelf() {
      return window.game.userId === this._id;
    }
  
    /* ---------------------------------------- */
    /*  User Methods                            */
    /* ---------------------------------------- */
  
    /**
     * Test whether the User is able to perform a certain permission action. window.game Master users are always allowed to
     * perform every action, regardless of permissions.
     *
     * @param {string} permission     The action to test
     * @return {boolean}              Does the user have the ability to perform this action?
     */
    can(permission) {
      return this.hasRole("window.gameMASTER") || this.hasPermission(permission);
    }
  
      /* -------------------------------------------- */
  
    /**
     * Test whether the User has a specific permission entitled .This differs from user#can because it does not always
     * return true for window.game Master users and should be used in cases where a permission could be withheld even from
     * a GM player (for example cursor display, or A/V audio).
     *
     * @param {string} permission     The action to test
     * @return {boolean}              Does the user have explicit permission to perform this action?
     */
    hasPermission(permission) {
      if ( permission in this.data.permissions ) return this.data.permissions[permission];
      const rolePerms = window.game.permissions[permission];
      return rolePerms ? rolePerms.includes(this.role) : false;
    }
  
    /* ---------------------------------------- */
  
    /**
     * Test whether the User has at least the permission level of a certain role
     * @param {string|number} role     The role name from USER_ROLES to test
     * @return {boolean}               Does the user have at least this role level?
     */
    hasRole(role) {
      const level = typeof role === "string" ? USER_ROLES[role] : role;
      return level && (this.role >= level);
    }
  
    /* ---------------------------------------- */
  
    /**
     * Test whether the User has exactly the permission level of a certain role
     * @param {string|number} role     The role name from USER_ROLES to test
     * @return {boolean}               Does the user have exactly this role level?
     */
    isRole(role) {
      const level = typeof role === "string" ? USER_ROLES[role] : role;
      return level && this.role === level;
    }
  
      /* -------------------------------------------- */
  
    /**
     * Sets a user's permission
     * Modifies the user permissions to grant or restrict access to a feature.
     *
     * @param {String} permission    The permission name from USER_PERMISSIONS
     * @param {Boolean} allowed      Whether to allow or restrict the permission
     */
    setPermission(permission, allowed) {
      this.update({ permissions: { [permission]: allowed } });
    }
  
      /* -------------------------------------------- */
  
    /**
     * Submit User activity data to the server for broadcast to other players.
     * This type of data is transient, persisting only for the duration of the session and not saved to any database.
     *
     * @param {Object} activityData             An object of User activity data to submit to the server for broadcast.
     * @param {Object} activityData.cursor      The coordinates of the user's cursor
     * @param {boolean} activityData.focus      Is the user pulling focus to the cursor coordinates?
     * @param {boolean} activityData.ping       Is the user emitting a ping at the cursor coordinates?
     * @param {string} activityData.ruler       Serialized Ruler coordinate data in JSON format
     * @param {string} activityData.sceneId     The id of the Scene currently being viewed by the User
     * @param {Array} activityData.targets      An id of Token ids which are targeted by the User
     */
    broadcastActivity(activityData={}) {
      if ( !this.active ) {
        this.active = true;
        // ui.players.render();
      }
      if (( "sceneId" in activityData ) && ( this.viewedScene !== activityData.sceneId )) {
        this.viewedScene = activityData.sceneId;
        // ui.nav.render();
      }
      window.game.socket.emit('userActivity', this.id, activityData);
    }
  
  
  
      /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
      /* -------------------------------------------- */
  
    /** @override */
    _onCreate(...args) {}
  
      /* -------------------------------------------- */
  
    /**
     * Additional updating steps for the User entity when new data is saved which trigger some related updates.
     *
     * Re-draw the active cursor and toggle visibility
     * Re-draw navigation if the active or viewed scenes have changed
     * Render the players UI if activity status or other player features have changed
     * Update the canvas if the player's impersonated character has changed
     *
     * @private
     */
    _onUpdate(data, ...args) {
      super._onUpdate(data, ...args);
  
      // Get the changed attributes
      let changed = Object.keys(data).filter(k => k !== "_id");
  
      // If your own password or role changed - you must re-authenticate
      const isSelf = data._id === window.game.userId;
      if ( isSelf && changed.some(p => ["password", "role"].includes(p) ) ) return window.game.logOut();
    }
  }

  class UserTargets extends Set {
    constructor(user) {
      super();
      if ( user.targets ) throw new Error(`User ${user.id} already has a targets set defined`);
      this.user = user;
    }
  
    /**
     * Return the Token IDs which are user targets
     * @return {Array.<string>}
     */
    get ids() {
      return Array.from(this).map(t => t.id);
    }
  
    /** @override */
    add(token) {
      super.add(token);
      this._hook(token, true);
    }
  
    /** @override */
    clear() {
      const tokens = Array.from(this);
      super.clear();
      tokens.forEach(t => this._hook(t, false));
    }
  
    /** @override */
    delete(token) {
      super.delete(token);
      this._hook(token, false);
    }
  
    /**
     * Dispatch the targetToken hook whenever the user's target set changes
     */
    _hook(token, targeted) {
    }
  }