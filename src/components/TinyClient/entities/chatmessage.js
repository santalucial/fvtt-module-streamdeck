import {Entity} from './entity'
import { Roll} from '../dice/roll'
import {DICE_ROLL_MODES, CHAT_MESSAGE_TYPES,ENTITY_PERMISSIONS,ENTITY_LINK_TYPES} from '../constants'
import {duplicate,mergeObject} from '../utils'
import {User} from './user'
import {Actor} from './actor'
import {Scene} from './scene'

/**
 * The Chat Message class is a type of :class:`Entity` which represents individual messages in the chat log.
 *
 * @type {Entity}
 */
export class ChatMessage extends Entity {
    constructor(...args) {
      super(...args);
  
      /**
       * Get a reference to the user who sent the chat message
       */
      this.user = window.game.users.get(this.data.user);
  
      /**
       * If the Message contains a dice roll, store it here
       */
      this._roll = null;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Configure the attributes of the ChatMessage Entity
     *
     * @returns {Entity} baseEntity       The parent class which directly inherits from the Entity interface.
     * @returns {EntityCollection} collection   The EntityCollection class to which Entities of this type belong.
     * @returns {Array} embeddedEntities  The names of any Embedded Entities within the Entity data structure.
     */
    static get config() {
      return {
        baseEntity: ChatMessage,
        collection: window.game.messages,
        embeddedEntities: {},
        label: "ENTITY.ChatMessage"
      };
    }
  
    /* -------------------------------------------- */
    /*  Properties and Attributes
    /* -------------------------------------------- */
  
    /**
     * Return the recommended String alias for this message.
     * The alias could be a Token name in the case of in-character messages or dice rolls.
     * Alternatively it could be a User name in the case of OOC chat or whispers.
     * @type {string}
     */
    get alias() {
      const speaker = this.data.speaker;
      if ( speaker.alias ) return speaker.alias;
      else if ( speaker.actor ) return window.game.actors.get(speaker.actor).name;
      else return this.user ? this.user.name : "";
    }
  
    /* -------------------------------------------- */
  
    /**
     * Return whether the ChatMessage is visible to the current user
     * Messages may not be visible if they are private whispers
     * @type {boolean}
     */
    get visible() {
      if ( this.data.whisper.length ) {
        if ( this.data.type === CHAT_MESSAGE_TYPES.ROLL ) return true;
        return (this.data.user === window.game.user._id) || (this.data.whisper.indexOf(window.game.user._id ) !== -1 );
      }
      return true;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Is the current User the author of this message?
     * @type {boolean}
     */
    get isAuthor() {
      return window.game.user._id === this.user._id;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Test whether the chat message contains a dice roll
     * @type {boolean}
     */
    get isRoll() {
      return this.data.type === CHAT_MESSAGE_TYPES.ROLL;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Return whether the content of the message is visible to the current user
     * @type {boolean}
     */
    get isContentVisible() {
      if ( this.isRoll ) {
        const whisper = this.data.whisper || [];
        const isBlind = whisper.length && this.data.blind;
        if ( whisper.length ) return whisper.includes(window.game.user._id) || (this.isAuthor && !isBlind);
        return true;
      }
      else return this.visible;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    get permission() {
      if ( window.game.user.isGM || this.isAuthor ) return ENTITY_PERMISSIONS.OWNER;
      else return ENTITY_PERMISSIONS.LIMITED;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Return the Roll instance contained in this chat message, if one is present
     * @type {Roll}
     */
    get roll() {
      if ( this._roll === null ) {
        try {
          this._roll = Roll.fromJSON(this.data.roll);
        } catch(err) {
          this._roll = false;
        }
      }
      return this._roll;
    }
  
    /* -------------------------------------------- */
    /*  HTML Rendering
    /* -------------------------------------------- */
  
    /**
     * Render the HTML for the ChatMessage which should be added to the log
     * @return {Promise.<HTMLElement>}
     */
    // async render(force, options) {
  
    //   // Determine some metadata
    //   const data = duplicate(this.data);
    //   const isWhisper = this.data.whisper.length;
    //   const isVisible = this.isContentVisible;
  
    //   // Construct message data
    //   const messageData = {
    //     message: data,
    //     user: window.game.user,
    //     author: this.user,
    //     alias: this.alias,
    //     cssClass: [
    //       this.data.type === CHAT_MESSAGE_TYPES.IC ? "ic" : null,
    //       this.data.type === CHAT_MESSAGE_TYPES.EMOTE ? "emote" : null,
    //       isWhisper ? "whisper" : null,
    //       this.data.blind ? "blind": null
    //     ].filter(c => c !== null).join(" "),
    //     isWhisper: this.data.whisper.some(id => id !== window.game.user._id),
    //     whisperTo: this.data.whisper.map(u => {
    //       let user = window.game.users.get(u);
    //       return user ? user.name : null;
    //     }).filter(n => n !== null).join(", ")
    //   };
  
    //   // Enrich some data for dice rolls
    //   if ( this.isRoll ) {
  
    //     // Render public rolls if they do not already start with valid HTML
    //     const hasHTMLContent = data.content.slice(0, 1) === "<";
    //     if ( isVisible && !hasHTMLContent ) {
    //       data.content = await this.roll.render();
    //     }
  
    //     // Conceal some private roll information
    //     if ( !isVisible ) {
    //       data.content = await this.roll.render({isPrivate: !isVisible});
    //       data.flavor = `${this.user.name} privately rolled some dice`;
    //       messageData.isWhisper = false;
    //       messageData.alias = this.user.name;
    //     }
    //   }
  
    //   // Define a border color
    //   if ( this.data.type === CHAT_MESSAGE_TYPES.OOC ) {
    //     messageData.borderColor = this.user.color;
    //   }
  
    //   // Render the chat message
    //   let html = await renderTemplate(window.CONFIG.ChatMessage.template, messageData);
    //   html = $(html);
  
    //   // Call a hook for the rendered ChatMessage data
    //   Hooks.call("renderChatMessage", this, html, messageData);
    //   return html;
    // }
  
    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers
    /* -------------------------------------------- */
  
    /** @override */
    static async create(data, options) {
      data = data instanceof Array ? data : [data];
      data = data.map(d => this._preprocessCreateData(d, options));
      return super.create(data, options);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Preprocess the data object used to create a new Chat Message to automatically convert some Objects to the
     * data format expected by the database handler.
     * @param {Object} data       Single ChatMessage creation data
     * @param {string} [rollMode] The visibility mode applied to all dice rolls
     * @return {Object}           Processed message creation data
     * @private
     */
    static _preprocessCreateData(data, {rollMode=null}={}) {
  
      // Message creator
      if ( data.user instanceof User ) data.user = data.user._id;
      if ( !data.user ) data.user = window.game.user._id;
  
      // Ensure to pass IDs rather than objects
      if ( data.speaker && data.speaker.actor instanceof Actor ) data.speaker.actor = data.speaker.actor._id;
      if ( data.speaker && data.speaker.scene instanceof Scene ) data.speaker.scene = data.speaker.scene._id;
    //    if ( data.speaker && data.speaker.token instanceof Token ) data.speaker.token = data.speaker.token.id;
        console.log( data.speaker && data.speaker.token)
      // Whisper targets
      if ( data.whisper ) data.whisper = data.whisper.map(w => w instanceof User ? w._id : w);
  
      // Serialize Roll data and apply roll modes
      if ( data.roll ) {
        data.roll =  (data.roll instanceof Roll) ? JSON.stringify(data.roll) : data.roll;
        rollMode = rollMode || data.rollMode || 'roll';
        if ( ["gmroll", "blindroll"].includes(rollMode) ) data.whisper = ChatMessage.getWhisperRecipients("GM");
        if ( rollMode === "blindroll" ) data.blind = true;
        if ( rollMode === "selfroll" ) data.whisper = [window.game.user.id];
      }
  
      // Enrich message content
      //const actor = this.getSpeakerActor(data.speaker) || window.game.users.get(data.user).character;
      

      const actor = window.game.actors.find((actor) => {
        return actor.permission === 3;
      })
      const rollData = actor ? actor.getRollData() : {};
      data.content = TextEditor.enrichHTML(data.content, {rollData});
  
      // Return the ChatMessage creation data
      return data;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Specific actions that should occur be when the ChatMessage is first created
     * @private
     */
      _onCreate(data, options, userId) {
        super._onCreate(data, options, userId);
  
        // Chat log notification
        let notify = this.data.user._id !== window.game.user._id;
        // ui.chat.postOne(this, notify);
  
        // Speech bubbles
    //   if ( options.chatBubble && canvas.ready ) {
    //     this.collection.sayBubble(this);
    //   }
      }
  
    /* -------------------------------------------- */
  
    /**
     * Specific actions that should occur be when an existing ChatMessage is updated
     * @private
     */
      _onUpdate(data, options, userId) {
        super._onUpdate(data, options, userId);
    //   ui.chat.updateMessage(this);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Specific actions that should occur be when an existing ChatMessage is deleted
     * @private
     */
      _onDelete(...args) {
        super._onDelete(...args);
    //   ui.chat.deleteMessage(this.id, ...args);
    }
  
    /* -------------------------------------------- */
    /*  Saving and Loading
    /* -------------------------------------------- */
  
    /**
     * Export the content of the chat message into a standardized log format
     * @return {String}
     */
    // export() {
    //   let content = [];
  
    //   // Handle Roll content
    //   if ( this.isRoll ) {
    //     let r = this.roll;
    //     if ( this.data.content && (this.data.content !== "undefined")) {
    //       content.push($(`<div>${this.data.content}</div>`).text().trim());
    //     }
    //     let flavor = this.data.flavor;
    //     if ( flavor && flavor !== r.formula ) content.push(flavor);
    //     content.push(`${r.formula} = ${r.result} = ${r.total}`);
    //   }
  
    //   // Handle HTML content
    //   else {
    //     const html = $("<article>").html(this.data["content"].replace(/<\/div>/g, "</div>|n"));
    //     const text = html.length ? html.text() : this.data["content"];
    //     const lines = text.replace(/\n/g, "").split("  ").filter(p => p !== "").join(" ");
    //     content = lines.split("|n").map(l => l.trim());
    //   }
  
    //   // Author and timestamp
    //   const time = new Date(this.data.timestamp).toLocaleDateString('en-US', {
    //     hour: "numeric",
    //     minute: "numeric",
    //     second: "numeric"
    //   });
  
    //   // Format logged result
    //   return `[${time}] ${this.alias}\n${content.filterJoin("\n")}`;
    // }
  
    /* -------------------------------------------- */
  
    /**
     * Given a string whisper target, return an Array of the user IDs which should be targeted for the whisper
     *
     * @param {String} name   The target name of the whisper target
     * @return {User[]}       An array of User instances
     */
    static getWhisperRecipients(name) {
  
      // Whisper to groups
      if (["GM", "DM"].includes(name.toUpperCase())) {
        return window.game.users.entities.filter(u => u.isGM);
      }
      else if (name.toLowerCase() === "players") {
        return window.game.users.players;
      }
  
      // Match against lowercase name
      const lname = name.toLowerCase();
  
      // Whisper to a single person
      let user = window.game.users.entities.find(u => u.name.toLowerCase() === lname);
      if (user) return [user];
      let actor = window.game.users.entities.find(a => a.character && a.character.name.toLowerCase() === lname);
      if (actor) return [actor];
  
      // Otherwise return an empty array
      return [];
    }
  
    /* -------------------------------------------- */
  
    /**
     * Backwards compatibility, now deprecated. Move to getWhisperRecipients
     * @deprecated since 0.5.2 and will be removed in 0.6.2
     * @param {string} name     The target name of the whisper
     * @return {string[]}       An Array of string User IDs
     */
    static getWhisperIDs(name) {
      console.warn("You are using ChatMessage.getWhisperIDs which is deprecated. You must move to ChatMessage.getWhisperRecipients by version 0.7.0");
      return this.getWhisperRecipients(name).map(u => u._id);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Attempt to determine who is the speaking character (and token) for a certain Chat Message
     * First assume that the currently controlled Token is the speaker
     * @returns {Object}  The identified speaker data
     */
    // static getSpeaker({scene, actor, token, alias}={}) {
    //   let speaker = null;
  
    //   // CASE 1 - A Token is explicitly provided
    //   if ( token instanceof Token ) speaker = this._getSpeakerFromToken({token, alias});
  
    //   // CASE 2 - An Actor is explicitly provided
    //   else if ( actor instanceof Actor ) {
    //     alias = alias || actor.name;
    //     const tokens = actor.getActiveTokens();
    //     if ( !tokens.length ) speaker = this._getSpeakerFromActor({scene, actor, alias});
    //     else {
    //       const controlled = tokens.filter(t => t._controlled);
    //       token = controlled.length ? controlled.shift() : tokens.shift();
    //       speaker = this._getSpeakerFromToken({token, alias});
    //     }
    //   }
  
    //   // CASE 3 - Not the viewed Scene
    //   else if ( ( scene instanceof Scene ) && !scene.isView ) {
    //     const char = window.game.user.character;
    //     if ( char ) speaker = this._getSpeakerFromActor({scene, actor: char, alias});
    //     else speaker = this._getSpeakerFromUser({scene, user: window.game.user, alias});
    //   }
  
    //   // Remaining cases - infer from the viewed Scene
    //   else {
    //     const char = window.game.user.character;
  
    //     // CASE 4 - Infer from controlled tokens
    //     let controlled = canvas.tokens.controlled;
    //     if ( controlled.length ) speaker = this._getSpeakerFromToken({token: controlled.shift(), alias});
  
    //     // CASE 5 - Infer from impersonated Actor
    //     else if ( char ) {
    //       const tokens = char.getActiveTokens();
    //       if ( tokens.length ) speaker = this._getSpeakerFromToken({token: tokens.shift(), alias});
    //       else speaker = this._getSpeakerFromActor({actor: char, alias});
    //     }
  
    //     // CASE 6 - From the alias and User
    //     else speaker = this._getSpeakerFromUser({scene, user: window.game.user, alias});
    //   }
  
    //   // Clean data and return
    //   return {
    //     scene: speaker.scene instanceof Scene ? speaker.scene.id : speaker.scene,
    //     actor: speaker.actor instanceof Actor ? speaker.actor.id : speaker.actor,
    //     token: speaker.token instanceof Token ? speaker.token.id : speaker.token,
    //     alias: speaker.alias
    //   }
    // }
  
    /* -------------------------------------------- */
  
    /**
     * A helper to prepare the speaker object based on a target Token
     * @private
     */
    static _getSpeakerFromToken({token, alias}) {
      return {
        scene: token.scene,
        token: token,
        actor: token.actor,
        alias: alias || token.name
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * A helper to prepare the speaker object based on a target Actor
     * @private
     */
    // static _getSpeakerFromActor({scene, actor, alias}) {
    //   return {
    //     scene: scene || canvas.scene,
    //     actor: actor,
    //     token: null,
    //     alias: alias || actor.name
    //   }
    // }
  
    /* -------------------------------------------- */
  
    /**
     * A helper to prepare the speaker object based on a target User
     * @private
     */
    // static _getSpeakerFromUser({scene, user, alias}) {
    //   return {
    //     scene: scene || canvas.scene,
    //     actor: null,
    //     token: null,
    //     alias: alias || user.name
    //   }
    // }
  
    /* -------------------------------------------- */
    /*  Roll Data Preparation                       */
    /* -------------------------------------------- */
  
    /**
     * Obtain a data object used to evaluate any dice rolls associated with this particular chat message
     * @return {Object}
     */
    getRollData() {
      const actor = this.constructor.getSpeakerActor(this.data.speaker);
      return actor ? actor.getRollData() : {};
    }
  
    /* -------------------------------------------- */
  
    /**
     * Obtain an Actor instance which represents the speaker of this message (if any)
     * @param {Object} speaker    The speaker data object
     * @return {Actor|null}
     */
    static getSpeakerActor(speaker) {
      if ( !speaker ) return null;
      let actor = null;
  
      // Case 1 - Token actor
      if ( speaker.scene && speaker.token ) {
        const scene = window.game.scenes.get(speaker.scene);
        const tokenData = scene ? scene.getEmbeddedEntity("Token", speaker.token) : null;
        // const token = tokenData ? new Token(tokenData) : null;
        // actor = token ? token.actor : null;
      }
  
      // Case 2 - explicit actor
      if ( speaker.actor && !actor ) {
        actor = window.game.actors.get(speaker.actor);
      }
      return actor || null;
    }
  }

  /**
 * A collection of helper functions and utility methods related to the rich text editor
 */
class TextEditor {

    /**
     * Create a Rich Text Editor. The current implementation uses TinyMCE
     * @param {Object} options          Configuration options provided to the Editor init
     * @param {string} content          Initial HTML or text content to populate the editor with
     * @return {tinyMCE.Editor}         The editor instance.
     */
    static create(options, content) {
      let defaultOptions = {
        branding: false,
        menubar: false,
        statusbar: false,
        plugins: window.CONFIG.TinyMCE.plugins,
        toolbar: window.CONFIG.TinyMCE.toolbar,
        // content_css: window.CONFIG.TinyMCE.css.map(c => ROUTE_PREFIX ? `/${ROUTE_PREFIX}${c}` : c).join(","),
        save_enablewhendirty: true,
        table_default_styles: {},
  
        // Style Dropdown Formats
        style_formats: [
          {
            title: "Custom",
            items: [
              {
                title: "Secret",
                block: 'section',
                classes: 'secret',
                wrapper: true
              }
            ]
          }
        ],
        style_formats_merge: true,
  
        // Bind callback events
        init_instance_callback: editor => {
          const window = editor.getWin();
  
          // Set initial content
          if ( content ) editor.setContent(content);
  
          // Prevent window zooming
          window.addEventListener("wheel", event => {
            if ( event.ctrlKey ) event.preventDefault();
          }, {passive: false});
  
          // Handle dropped Entity data
          window.addEventListener("drop", ev => this._onDropEditorData(ev, editor))
        }
      };
  
      const mceConfig = mergeObject(defaultOptions, options);
      mceConfig.target = options.target;
    //   return tinyMCE.init(mceConfig);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Safely decode an HTML string, removing invalid tags and converting entities back to unicode characters.
     * @param {string} html     The original encoded HTML string
     * @return {string}         The decoded unicode string
     */
    static decodeHTML(html) {
      const txt = this._decoder;
      txt.innerHTML = html;
      return txt.value;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Enrich HTML content by replacing or augmenting components of it
     * @param {string} content        The original HTML content (as a string)
     * @param {boolean} secrets       Remove secret tags?
     * @param {boolean} entities      Replace dynamic entity links?
     * @param {boolean} links         Replace hyperlink content?
     * @param {boolean} rolls         Replace inline dice rolls?
     * @param {Object} rollData       The data object providing context for inline rolls
     * @return {String}               The enriched HTML content
     */
    static enrichHTML(content, {secrets=false, entities=true, links=true, rolls=true, rollData=null}={}) {
      content = String(content);
  
      // Match content links
      if ( entities ) {
        const entityTypes = ENTITY_LINK_TYPES.concat("Compendium");
        const entityMatchRgx = `@(${entityTypes.join("|")})\\[([^\\]]+)\\](?:{([^}]+)})?`;
        const rgx = new RegExp(entityMatchRgx, 'g');
  
        // Find and preload compendium indices
        const matches = Array.from(content.matchAll(rgx));
        if ( matches.length ) this._preloadCompendiumIndices(matches);
  
        // Replace content links
        content = content.replace(rgx, this._replaceContentLinks.bind(this));
      }
  
      // Replace hyperlinks
      if ( links ) {
        // Match hyperlinks which are not immediately preceded by a quote
        const hyperlinkRgx = /(^|\s)((?:https?:\/\/)(?:www\.)?(?:[^\s<]+))/gi;
        content = content.replace(hyperlinkRgx, this._replaceHyperlinks);
      }
  
      // Process inline dice rolls
      if ( rolls ) {
        const inlineRollRgx = /\[\[(\/[a-zA-Z]+\s)?([^\]]+)\]\]/gi;
        content = content.replace(inlineRollRgx, (...args) => this._replaceInlineRolls(...args, rollData));
      }
  
      // Create the HTML element
      let html = document.createElement("div");
      html.innerHTML = content;
  
      // Strip secrets
      if ( !secrets ) {
        let elements = html.querySelectorAll("section.secret");
        elements.forEach(e => e.parentNode.removeChild(e));
      }
  
      // Return the enriched HTML
      return html.innerHTML;
    };
  
    /* -------------------------------------------- */
  
    /**
     * Preview an HTML fragment by constructing a substring of a given length from its inner text.
     * @param {string} content    The raw HTML to preview
     * @param {number} length     The desired length
     * @return {string}           The previewed HTML
     */
    static previewHTML(content, length=250) {
      const div = document.createElement("div");
      div.innerHTML = content;
      const short = div.innerText.slice(0, length);
      return div.innerText.length > length ? short.replace(/[\s]+[^\s]+$/, " ...") : short;
    }
  
    /* -------------------------------------------- */
  
    /**
     * If dynamic content links are used from a certain compendium, we will go ahead and preload the index for that
     * Compendium pack in the background so the links can function better.
     * @private
     */
    static async _preloadCompendiumIndices(matches) {
      const collections = new Set([]);
      for ( let m of matches ) {
        if (m[1] !== "Compendium") continue;
        collections.add(m[2].split(".").slice(0, 2).join("."))
      }
      for ( let c of collections ) {
        const pack = window.game.packs.get(c);
        if ( pack && !pack.index.length ) pack.getIndex();
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle replacement of content links within HTML by delegating to different helper methods based on entity type
     * @private
     */
    static _replaceContentLinks(match, entityType, id, name) {
  
      // Match Compendium content
      if ( entityType === "Compendium" ) {
        return this._replaceCompendiumLink(match, id, name);
      }
  
      // Match World content
      else {
        return this._replaceEntityLink(match, entityType, id, name);
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Replace a matched Entity Link with an actual HTML link to that entity
     * Be failure-tolerant, allowing for the possibility that the entity does not exist
     * @param {string} match        The full matched string
     * @param {string} id           The Entity ID or name
     * @param {name} name           A custom text name to display
     * @return {string}             The replacement string
     */
    static  _replaceCompendiumLink(match, id, name) {
      const [scope, packName, target] = id.split(".");
      const pack = window.game.packs.get(`${scope}.${packName}`);
      if ( !pack ) return match;
      const config = window.CONFIG[pack.metadata.entity];
      let icon = config.sidebarIcon;
  
      // Case 1 - the pack Index is already queried
      let entry = null;
      if ( pack.index.length ) {
        entry = pack.index.find(i => (i._id === target) || (i.name === target));
        if ( entry ) {
          name = name || entry.name;
          return `<a class="entity-link" data-pack=${pack.collection} data-id="${entry._id}" draggable="true"><i class="${icon}"></i> ${name}</a>`;
        }
      }
  
      // Case 2 - defer lookup for later, but request the Index now
      name = name || target;
      return `<a class="entity-link" data-pack=${pack.collection} data-lookup="${target}" draggable="true"><i class="${icon}"></i> ${name}</a>`;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Replace a matched Entity Link with an actual HTML link to that entity
     * Be failure-tolerant, allowing for the possibility that the entity does not exist
     * @param {string} match        The full matched string
     * @param {string} entityType   The named type of Entity being embedded
     * @param {string} id           The Entity ID or name
     * @param {name} name           A custom text name to display
     * @return {string}             The replacement string
     */
    static _replaceEntityLink(match, entityType, id, name) {
      const config = window.CONFIG[entityType];
      const collection = config.entityClass.collection;
  
      // Track inline data
      const inline = { cls: "entity-link", icon: config.sidebarIcon, data: { entity: entityType } };
  
      // Match either on ID or by name
      let entity = null;
      if (/^[a-zA-Z0-9]{16}$/.test(id)) entity = collection.get(id);
      if ( !entity ) entity = collection.entities.find(e => e.data.name === id);
  
      // If an entity was found, populate data
      if ( entity ) {
        inline.data.id = entity.id;
        inline.name = name || entity.name;
      }
  
      // Otherwise flag the link as broken
      else {
        inline.cls += ` broken`;
        inline.icon = "fas fa-unlink";
        inline.name = name || id;
      }
  
      // Format an Entity link to the target
      const data = Object.entries(inline.data).reduce((arr, e) => {
        arr.push(`data-${e[0]}="${e[1]}"`);
        return arr;
      }, []);
      return `<a class="${inline.cls}" draggable="true" ${data.join(' ')}><i class="${inline.icon}"></i> ${inline.name}</a>`;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Replace a hyperlink-like string with an actual HTML <a> tag
     * @return {string}   The replacement string
     */
    static _replaceHyperlinks(match, start, url) {
      let href = /^https?:\/\//.test(url) ? url : `http://${url}`;
      return `${start}<a class="hyperlink" href="${href}" target="_blank">${url}</a>`;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Replace an inline roll formula with a rollable button or an eagerly evaluated roll result
     * @param {string} match      The matched string
     * @param {string} command    An optional command
     * @param {string} formula    The matched formula
     * @param {Object} rollData   The data object providing context for inline rolls
     * @return {string}           The replaced match
     */
    // static _replaceInlineRolls(match, command, formula, ...args) {
    //   const isDeferred = !!command;
    //   const rollData = args.pop();
    //   let roll;
  
    //   // Define default inline data
    //   const inline = { cls: "inline-roll", data: {} };
  
    //   // If the roll is deferred, parse it as a chat command
    //   if ( isDeferred ) {
    //     const chatCommand = `${command}${formula}`;
    //     let parsedCommand = null;
    //     try {
    //       parsedCommand = ChatLog.parse(chatCommand);
    //     } catch(err) {
    //       return match;
    //     }
    //     inline.cls += ` ${parsedCommand[0]}`;
    //     inline.data.mode = parsedCommand[0];
  
    //     // Flavor text
    //     const flavor = parsedCommand[1][3];
    //     inline.data.flavor = flavor ? flavor.trim() : "";
  
    //     // Parsed formula
    //     inline.data.formula = parsedCommand[1][2].trim();
    //     inline.result = parsedCommand[1][2].trim();
  
    //     // Tooltip
    //     inline.title = inline.data.flavor || inline.data.formula;
    //   }
  
    //   // Otherwise perform the dice roll
    //   else {
    //     try {
    //       roll = new Roll(formula, rollData).roll();
    //       inline.cls += " inline-result";
    //       inline.result = roll.total;
    //       inline.title = formula;
    //       inline.data.roll = escape(JSON.stringify(roll));
    //     } catch(err) {
    //       return match;
    //     }
    //   }
  
    //   // Return the inline HTML
    //   const data = Object.entries(inline.data).reduce((arr, e) => {
    //     arr.push(`data-${e[0]}="${e[1]}"`);
    //     return arr;
    //   }, []);
    //   return `<a class="${inline.cls}" ${data.join(' ')} title="${inline.title}"><i class="fas fa-dice-d20"></i> ${inline.result}</a>`;
    // }
  
    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */
  
    static activateListeners() {
    //   const body = $("body");
    //   body.on("click", "a.entity-link", this._onClickEntityLink);
    //   body.on('dragstart', "a.entity-link", this._onDragEntityLink);
    //   body.on("click", "a.inline-roll", this._onClickInlineRoll);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle click events on Entity Links
     * @param {Event} event
     * @private
     */
    static async _onClickEntityLink(event) {
      event.preventDefault();
      const  a = event.currentTarget;
      let entity = null;
  
      // Target 1 - Compendium Link
      if ( a.dataset.pack ) {
        const pack = window.game.packs.get(a.dataset.pack);
        let id = a.dataset.id;
        if ( a.dataset.lookup ) {
          if ( !pack.index.length ) await pack.getIndex();
          const entry = pack.index.find(i => (i._id === a.dataset.lookup) || (i.name === a.dataset.lookup));
          id = entry._id;
        }
        entity = id ? await pack.getEntity(id) : null;
      }
  
      // Target 2 - World Entity Link
      else {
        const cls = window.CONFIG[a.dataset.entity].entityClass;
        entity = cls.collection.get(a.dataset.id);
        if ( entity.entity === "Scene" && entity.journal ) entity = entity.journal;
        if ( !entity.hasPerm(window.game.user, "LIMITED") ) {
          return console.warn(`You do not have permission to view this ${entity.entity} sheet.`);
        }
      }
      if ( !entity ) return;
  
      // Action 1 - Execute an Action
      if ( entity.entity === "Macro" ) {
        if ( !entity.hasPerm(window.game.user, "LIMITED") ) {
          return console.warn(`You do not have permission to use this ${entity.entity}.`);
        }
        return entity.execute();
      }
  
      // Action 2 - Render the Entity sheet
      return entity.sheet.render(true);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle left-mouse clicks on an inline roll, dispatching the formula or displaying the tooltip
     * @param {MouseEvent} event    The initiating click event
     * @private
     */
    static async _onClickInlineRoll(event) {
      event.preventDefault();
      const a = event.currentTarget;
  
      // For inline results expand or collapse the roll details
      if ( a.classList.contains("inline-result") ) {
        const roll = Roll.fromJSON(unescape(a.dataset.roll));
        const tooltip = a.classList.contains("expanded") ? roll.total : `${roll.result} = ${roll.total}`;
        a.innerHTML = `<i class="fas fa-dice-d20"></i> ${tooltip}`;
        a.classList.toggle("expanded");
      }
  
      // Otherwise execute the deferred roll
      else {
        const cls = window.CONFIG.ChatMessage.entityClass;
  
        // Get the "speaker" for the inline roll
        const actor = cls.getSpeakerActor(cls.getSpeaker());
        const rollData = actor ? actor.getRollData() : {};
  
        // Execute the roll
        const roll = new Roll(a.dataset.formula, rollData).roll();
        return roll.toMessage({flavor: a.dataset.flavor}, {rollMode: a.dataset.mode});
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Begin a Drag+Drop workflow for a dynamic content link
     * @param {Event} event   The originating drag event
     * @private
     */
    static _onDragEntityLink(event) {
      event.stopPropagation();
      const a = event.currentTarget;
      let dragData = null;
  
      // Case 1 - Compendium Link
      if ( a.dataset.pack ) {
        const pack = window.game.packs.get(a.dataset.pack);
        let id = a.dataset.id;
        if ( a.dataset.lookup && pack.index.length ) {
          const entry = pack.index.find(i => (i._id === a.dataset.lookup) || (i.name === a.dataset.lookup));
          if ( entry ) id = entry._id;
        }
        if ( !id ) return false;
        dragData = { type: pack.entity, pack: pack.collection, id: id };
      }
  
      // Case 2 - World Entity Link
      else dragData = { type: a.dataset.entity, id: a.dataset.id };
      event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }
  
      /* -------------------------------------------- */
  
    /**
     * Begin a a data transfer drag event with default handling
     * @private
     */
      _onDragStart(event) {
        event.stopPropagation();
        let li = event.currentTarget.closest("li.directory-item");
      const dragData = li.classList.contains("folder") ?
        { type: "Folder", id: li.dataset.folderId, entity: this.constructor.entity } :
        { type: this.constructor.entity, id: li.dataset.entityId };
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
      this._dragType = dragData.type;
    }
  
      /* -------------------------------------------- */
  
    /**
     * Handle dropping of transferred data onto the active rich text editor
     * @param {Event} event     The originating drop event which triggered the data transfer
     * @param {tinyMCE} editor  The TinyMCE editor instance being dropped on
     * @private
     */
    static async _onDropEditorData(event, editor) {
      event.preventDefault();
        const data = JSON.parse(event.dataTransfer.getData('text/plain'));
        if ( !data ) return;
  
        // Case 1 - Entity from Compendium Pack
      if ( data.pack ) {
        const pack = window.game.packs.get(data.pack);
        if (!pack) return;
        const entity = await pack.getEntity(data.id);
        const link = `@Compendium[${data.pack}.${data.id}]{${entity.name}}`;
        editor.insertContent(link);
      }
  
      // Case 2 - Entity from World
      else {
        const config = window.CONFIG[data.type];
        if ( !config ) return false;
        const entity = config.collection.instance.get(data.id);
        if ( !entity ) return false;
        const link = `@${data.type}[${entity._id}]{${entity.name}}`;
        editor.insertContent(link);
      }
    }
  }
  
  // Singleton decoder area
  TextEditor._decoder = document.createElement('textarea');
  
  // Global Export
  window.TextEditor = TextEditor;
  