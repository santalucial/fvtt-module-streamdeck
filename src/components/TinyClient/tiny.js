// import{Combat} from './entities/combat'
import io from "socket.io-client";
import {Actors} from './entities/actors'
import {Entity} from './entities/entity'
import {CombatEncounters} from './entities/combatEncounters'
import {Scenes} from './entities/scenes'
import {Users} from './entities/users'
import {Messages} from './entities/messages'


// import Compendium from './models/compendium'
const ROUTE_PREFIX = undefined
const vtt = "Foundry VTT";
/**
 * The core Game instance which encapsulates the data, settings, and states relevant for managing the game experience.
 * The singleton instance of the Game class is available as the global variable ``game``.
 *
 * @param {Object} worldData    An object of all the World data vended by the server when the client first connects
 * @param {string} sessionId    The ID of the currently active client session retrieved from the browser cookie
 * @param {Socket} socket       The open web-socket which should be used to transact game-state data
 */
class Game {
    constructor(worldData, sessionId, socket, stateUpdate) {
  
     
      /**
       * The object of world data passed from the server
       * @type {Object}
       */
      this.data = worldData;
  
      /**
       * The Keyboard Manager
       * @type {KeyboardManager}
       */
      this.keyboard = null;
  
      /**
       * A mapping of installed modules
       * @type {Map}
       */
      this.modules = new Map(worldData.modules.map(m => [m.id, m]));
  
      /**
       * The user role permissions setting
       * @type {Object}
       */
      this.permissions = null;
  
      /**
       * The client session id which is currently active
       * @type {string}
       */
      this.sessionId = sessionId;

      this.stateUpdate =stateUpdate;
  
    //   /**
    //    * Client settings which are used to configure application behavior
    //    * @type {ClientSettings}
    //    */
    //  this.settings = new ClientSettings(this.data.settings || []);
  
      /**
       * A reference to the open Socket.io connection
       * @type {WebSocket}
       */
      this.socket = socket;
  
      /**
       * The id of the active World user, if any
       * @type {string}
       */
      this.userId = worldData.userId || null;
  
      
      /**
       * Whether the Game is running in debug mode
       * @type {Boolean}
       */
      this.debug = false;
  
      /**
       * A flag for whether texture assets for the game canvas are currently loading
       * @type {boolean}
       */
      this.loading = false;
  
      /**
       * A flag for whether the Game has successfully reached the "ready" hook
       * @type {boolean}
       */
      this.ready = false;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Fetch World data and return a Game instance
     * @return {Promise}  A Promise which resolves to the created Game instance
     */
    static async create( stateUpdate) {
  
      // Display ASCII welcome
      console.log(`_______________________________________________________________
   _____ ___  _   _ _   _ ____  ______   __ __     _______ _____ 
  |  ___/ _ \\| | | | \\ | |  _ \\|  _ \\ \\ / / \\ \\   / |_   _|_   _|
  | |_ | | | | | | |  \\| | | | | |_) \\ V /   \\ \\ / /  | |   | |  
  |  _|| |_| | |_| | |\\  | |_| |  _ < | |     \\ V /   | |   | |  
  |_|   \\___/ \\___/|_| \\_|____/|_| \\_\\|_|      \\_/    |_|   |_|  
  ===============================================================`);
  


      // Retrieve the client session from cookies
      const cookies = Game.getCookies();
      const sessionId = cookies.session;
      if ( !sessionId ) {
        console.error(`No client session ID available, redirecting to login`);
        // window.location.href = ROUTE_PREFIX ? `/${ROUTE_PREFIX}/join` : "/join";
      }
      console.log(`${vtt} | Attempting connection using session ${sessionId}`);
  
      // // Connect to the game socket, passing the client session ID to handshake
      const socket = await this.connect(sessionId);
      // console.log(`${vtt} | Connected to server socket using session ${sessionId}`);
  


      // Fetch World data, or Setup data if no world is configured
      let gameData = await this.getWorldData(socket);
      
      if ( !gameData.world ) gameData = await this.getSetupData(socket);
  
      // Create the Game instance
      return new Game(gameData, sessionId, socket, stateUpdate);
    }
  
    /* -------------------------------------------- */
  
    hookUpdate(stateUpdate){
      this.stateUpdate = stateUpdate
    }
    /**
     * Establish a live connection to the game server through the socket.io URL
     * @param {string} sessionId  The client session ID with which to establish the connection
     * @return {Promise}          A promise which resolves to the connected socket, if successful
     */
    static async connect(sessionId) {
       const socketPath = ROUTE_PREFIX ? `/${ROUTE_PREFIX}/socket.io` : "/socket.io";
      // const socketPath = "/";
      return new Promise((resolve, reject) => {
        const socket = io.connect({
          path: socketPath,
          transports: (process.env.NODE_ENV === 'development' && ['polling', 'websocket']) || ["websocket"],    // Require websocket transport instead of XHR polling
          upgrade: false,               // Prevent "upgrading" to websocket since it is enforced
          reconnection: true,           // Automatically reconnect
          reconnectionDelay: 1000,
          reconnectionAttempts: 3,
          reconnectionDelayMax: 5000,
          query: { session: sessionId } // Pass session info
        });
        // const socket = io.connect(window.location.origin, {
        //   reconnection: false,
        //   query: { session: sessionId },
        // });
        socket.on("connect", () => resolve(socket));
        socket.on("connectTimeout", timeout => {
          reject(new Error("Failed to establish a socket connection within allowed timeout."))
        });
        socket.on("connectError", err => reject(err));
      });
    }
  
  
    /* -------------------------------------------- */
  
    /**
     * Retrieve the cookies which are attached to the client session
     * @return {Object}   The session cookies
     */
    static getCookies() {
      const cookies = {};
      for (let cookie of document.cookie.split('; ')) {
        let [name, value] = cookie.split("=");
        cookies[name] = decodeURIComponent(value);
      }
      return cookies;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Request World data from server and return it
     * @return {Promise}
     */
    static async getWorldData(socket) {
      return await new Promise(resolve => {
        console.log(`${vtt} | requesting world data`);
        socket.emit("world", resolve);
      })
    }
  
    /* -------------------------------------------- */
  
    /**
     * Request setup data from server and return it
     * @return {Promise}
     */
    static async getSetupData(socket) {
      return new Promise(resolve => {
        console.log(`${vtt} | requesting setup data`);
        socket.emit("getSetupData", resolve);
      })
    }
  
    /* -------------------------------------------- */
  
    /**
     * Initialize the Game for the current window location
     */
    async initialize() {
      console.log(` | Initializing session`);
      this.ready = false;
    //   Hooks.callAll('init');
  
      // Begin loading fonts
      // loadFont("Signika");
      // loadFont("FontAwesome");
  
      // Register game settings
      // this.registerSettings();
      this.setupGame();
  
    }

  
  
    /* -------------------------------------------- */
    /*  Primary Game Initialization
    /* -------------------------------------------- */
  
    /**
     * Fully set up the game state, initializing Entities, UI applications, and the Canvas
     */
    async setupGame() {
  
      // Store permission settings
      // this.permissions = await this.settings.get("core", "permissions");
  
      // Initialization Steps
      this.initializeEntities();
      this.openSockets();
      this.stateUpdate()
  
    //   // If the player is not a GM and does not have an impersonated character, prompt for selection
    //   if (!this.user.isGM && !this.user.character) {
    //     new PlayerConfig(this.user).render(true);
    //   }
  
      // Call all game ready hooks
      this.ready = true;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Initialize game state data by creating EntityCollection instances for every Entity types
     */
    initializeEntities() {
      this.users = new Users(this.data.users);
      this.messages = new Messages(this.data.messages);
      this.scenes = new Scenes(this.data.scenes);
      this.actors = new Actors(this.data.actors);
      // this.items = new Items(this.data.items);
      // this.journal = new Journal(this.data.journal);
      // this.macros = new Macros(this.data.macros);
      // this.playlists = new Playlists(this.data.playlists);
      this.combats = new CombatEncounters(this.data.combat);
      // this.tables = new RollTables(this.data.tables);
      // this.folders = new Folders(this.data.folders);
    }

  
  
 
    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */
  
    /**
     * Is the current session user authenticated as an application administrator?
     * @type {boolean}
     */
    get isAdmin() {
      return this.data.isAdmin;
    }
  
    /* -------------------------------------------- */
  
    /**
     * The currently connected User entity, or null if Users is not yet initialized
     * @type {User|null}
     */
    get user() {
      return this.users ? this.users.current : null;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Metadata regarding the current game World
     * @type {Object}
     */
    get world() {
      return this.data.world;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Metadata regarding the game System which powers this World
     * @type {Object}
     */
    get system() {
      return this.data.system;
    }
  
    /* -------------------------------------------- */
  
    /**
     * A convenience accessor for the currently viewed Combat encounter
     * @type {Combat}
     */
    get combat() {
      return this.combats.viewed;
    }
  
    /* -------------------------------------------- */
  
    /**
     * A state variable which tracks whether or not the game session is currently paused
     * @type {Boolean}
     */
    get paused() {
      return this.data.paused;
    }
  
    
    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Log out of the game session by returning to the Join screen
     */
    logOut() {
      if ( this.socket ) this.socket.disconnect();
      window.location.href = ROUTE_PREFIX ? `/${ROUTE_PREFIX}/join` : "/join";
    }
  
    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */
  
    /**
     * Open socket listeners which transact game state data
     */
    openSockets() {
  
      // Helper Listeners
      Game.socketListeners(this.socket);

      // Database Listeners
      Entity.activateSocketListeners(this.socket);
      Scenes.socketListeners(this.socket);
    }
  
    /* -------------------------------------------- */
  
    /**
     * General game-state socket listeners and event handlers
     * @param socket
     */
    static socketListeners(socket) {
  
      // Disconnection and reconnection attempts
      socket.on('disconnect', (reason) => {
        console.error("You have lost connection to the server, attempting to re-establish.");
      });
  
      // Reconnect failed
      socket.on('reconnect_failed', () => {
        console.error("Server connection lost.");
        // window.location.href = ROUTE_PREFIX+"/no";
      });
  
      // Reconnect succeeded
      socket.on('reconnect', (attemptNumber) => {
        console.info("Server connection re-established.");
      });
  
      // Handle pause
      socket.on('pause', pause => {
        window.game.togglePause(pause, false);
      });
    }
  

    togglePause(pause, push = false) {
      this.data.paused = pause
      if (push && this.user.isGM) this.socket.emit("pause", this.data.paused);
      // Render the paused UI
      // ui.pause.render();
  
      // Call API hooks
      // Hooks.callAll("pauseGame", this.data.paused);
    }
   
  }


  export {Game}