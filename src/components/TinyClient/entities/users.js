import { EntityCollection } from "./entityCollection";
import { User } from "./user";

export class Users extends EntityCollection {
  constructor(...args) {
    super(...args);

    /**
     * The User entity of the currently connected user
     * @type {User|null}
     */
    this.current = this.current || null;
  }

  /* -------------------------------------------- */

  /**
   * Initialize the Map object and all its contained entities
   * @param {Object[]} data
   * @private
   */
  _initialize(data) {
    super._initialize(data);
    this.current = this.get(window.game.data.userId);
    this.current.active = true;
  }

  /* -------------------------------------------- */

  /** @override */
  get object() {
    return User;
  }

  /**
   * Get the users with player roles
   * @return {Array.<User>}
   */
  get players() {
    return this.entities.filter(
      (u) => u.isRole("PLAYER") || u.isRole("TRUSTED")
    );
  }

  /* -------------------------------------------- */
  /*  Socket Listeners and Handlers               */
  /* -------------------------------------------- */

  /** @override */
  static socketListeners(socket) {
    socket.on("userActivity", this._handleUserActivity);
  }

  /* -------------------------------------------- */

  /**
   * Handle receipt of activity data from another User connected to the window.game session
   * @param {string} userId         The User id who generated the activity data
   * @param {Object} activityData   The object of activity data
   * @private
   */
  static _handleUserActivity(userId, activityData = {}) {
    if (!window.game.ready) return;
    const user = window.game.users.get(userId);
    let active = "active" in activityData ? activityData.active : true;

    // User activity
    if (user.active !== active) {
      user.active = active;
      window.game.users.render();
      // if ( active === false ) ui.nav.render();
    }

    // Set viewed scene
    if ("sceneId" in activityData) {
      user.viewedScene = activityData.sceneId;
      // ui.nav.render();
    }

    // User control deactivation
    if (active === false) {
      // canvas.controls.updateCursor(user, null);
      // canvas.controls.updateRuler(user, null);
      user.updateTokenTargets([]);
      return;
    }

    //   // Cursor position
    //   if ( "cursor" in activityData ) {
    //     canvas.controls.updateCursor(user, activityData.cursor);
    //   }

    //   // Ruler measurement
    //   if ( "ruler" in activityData ) {
    //     canvas.controls.updateRuler(user, activityData.ruler);
    //   }

    // Token targets
    if ("targets" in activityData) {
      user.updateTokenTargets(activityData.targets);
    }

    // Dispatch pings
    if (activityData.ping) {
    }

    // Dispatch focus pulls
    if (activityData.focus) {
    }
  }
}
if (window.CONFIG === undefined) {
  window.CONFIG = {};
}
window.CONFIG["User"] = {
  entityClass: User,
  collection: Users,
  permissions: Users.permissions,
};
