
// /**
//  * The Compendium class provides an interface for interacting with compendium packs which are 
//  * collections of similar Entities which are stored outside of the world database but able to
//  * be easily imported into an active session.
//  * 
//  * When the game session is initialized, each available compendium pack is constructed and 
//  * added to the ``game.packs``.
//  *
//  * Each Compendium is distinctly referenced using its canonical "collection" name which is a 
//  * unique string that contains the package name which provides the compendium as well as the
//  * name of the pack within that package. For example, in the D&D5e system, the compendium pack
//  * which provides the spells available within the SRD has the collection name "dnd5e.spells".
//  *
//  * @type {Application}
//  *
//  * @param metadata {Object}   The compendium metadata, an object provided by game.data
//  * @param options {Object}    Application rendering options
//  *
//  * @example
//  * // Let's learn the collection names of all the compendium packs available within a game
//  * game.packs.keys();
//  *
//  * // Suppose we are working with a particular pack named "dnd5e.spells"
//  * const pack = game.packs.get("dnd5e.spells");
//  * 
//  * // We can load the index of the pack which contains all entity IDs, names, and image icons
//  * pack.getIndex().then(index => console.log(index));
//  * 
//  * // We can find a specific entry in the compendium by its name
//  * let entry = pack.index.find(e => e.name === "Acid Splash");
//  * 
//  * // Given the entity ID of "Acid Splash" we can load the full Entity from the compendium
//  * pack.getEntity(entry.id).then(spell => console.log(spell));
//  * 
//  * @example
//  * // We often may want to programmatically create new Compendium content
//  * // Let's start by creating a custom spell as an Item instance
//  * let itemData = {name: "Custom Death Ray", type: "Spell"};
//  * let item = new Item(itemData);
//  * 
//  * // Once we have an entity for our new Compendium entry we can import it, if the pack is unlocked
//  * pack.importEntity(item);
//  * 
//  * // When the entity is imported into the compendium it will be assigned a new ID, so let's find it
//  * pack.getIndex().then(index => {
//  *   let entry = index.find(e => e.name === itemData.name));
//  *   console.log(entry);
//  * });
//  *
//  * // If we decide to remove an entry from the compendium we can do that by the entry ID
//  * pack.removeEntry(entry.id);
//  */
// export default class Compendium {
//     constructor(metadata, options) {
//       super(options);
  
//       /**
//        * The compendium metadata which defines the compendium content and location
//        * @type {Object}
//        */
//       this.metadata = metadata;
  
//       /**
//        * Track whether the compendium pack is locked for editing
//        * @type {boolean}
//        */
//       this.locked = metadata.package !== "world";
  
//       /**
//        * Track whether the compendium pack is private
//        * @type {Boolean}
//        */
//       this.private = false;
  
//       /**
//        * The most recently retrieved index of the Compendium content
//        * This index is not guaranteed to be current - call getIndex() to reload the index
//        * @type {Array}
//        */
//       this.index = [];
  
//       // Internal flags
//       this.searchString = null;
  
//       /**
//        * A filtering timeout function reference used to rate limit string filtering operations
//        * @type {number|null}
//        */
//       this._filterTimeout = null;
//     }
  
//       /* -------------------------------------------- */
  
//     /** @override */
//       static get defaultOptions() {
//         return mergeObject(super.defaultOptions, {
//           template: "templates/apps/compendium.html",
//         width: 350,
//         height: window.innerHeight - 100,
//         top: 70,
//         left: 120,
//         scrollY: [".directory-list"],
//         dragDrop: [{ dragSelector: ".directory-item", dropSelector: ".directory-list" }]
//       });
//     }
  
//     /* ----------------------------------------- */
  
//     /** @override */
//     get title() {
//       return [this.metadata.label, this.locked ? "[Locked]" : null].filterJoin(" ");
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * The canonical Compendium name - comprised of the originating package and the pack name
//      * @return {string}     The canonical collection name
//      */
//     get collection() {
//       return `${this.metadata.package}.${this.metadata.name}`
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * The Entity type which is allowed to be stored in this collection
//      * @type {String}
//      */
//     get entity() {
//       return this.metadata.entity;
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * A reference to the Entity class object contained within this Compendium pack
//      * @return {*}
//      */
//     get cls() {
//       return CONFIG[this.entity].entityClass;
//     }
  
//     /* ----------------------------------------- */
//     /*  Rendering                                */
//     /* ----------------------------------------- */
  
//     /** @override */
//     async getData(options) {
//       await this.getIndex();
//       return {
//         collection: this.collection,
//         searchString: this.searchString,
//         cssClass: this.entity.toLowerCase(),
//         index: this.index.map(i => {
//           i.img = i.img || CONST.DEFAULT_TOKEN;
//           return i;
//         })
//       };
//     }
  
//     /* -------------------------------------------- */
  
//     /** @override */
//     async close() {
//       await super.close();
//       let li = $(`.compendium-pack[data-pack="${this.collection}"]`);
//       li.attr("data-open", "0");
//       li.find("i.folder").removeClass("fa-folder-open").addClass("fa-folder");
//     }
  
//     /* ----------------------------------------- */
//     /*  Methods
//     /* ----------------------------------------- */
  
//     /**
//      * Create a new Compendium pack using provided
//      * @param {Object} metadata   The compendium metadata used to create the new pack
//      * @param {Options} options   Additional options which modify the Compendium creation request
//      * @return {Promise.<Compendium>}
//      */
//     static async create(metadata, options={}) {
//       if ( !game.user.isGM ) return ui.notifications.error("You do not have permission to modify this compendium pack");
//       const response = await SocketInterface.dispatch("manageCompendium", {
//         action: "create",
//         data: metadata,
//         options: options
//       });
  
//       // Add the new pack to the World
//       game.data.packs.push(response.result);
//       game.initializePacks().then(() => ui.compendium.render());
//       return new Compendium(response.result);
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * Assign configuration metadata settings to the compendium pack
//      * @param {Object} settings   The object of compendium settings to define
//      * @return {Promise}          A Promise which resolves once the setting is updated
//      */
//     configure(settings={}) {
//       this._assertUserCanModify({requireUnlocked: false});
//       const config = game.settings.get("core", this.constructor.CONFIG_SETTING);
//       const pack = config[this.collection] || {private: false, locked: this.metadata.package !== "world"};
//       config[this.collection] = mergeObject(pack, settings);
//       return game.settings.set("core", this.constructor.CONFIG_SETTING, config);
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * Delete a world Compendium pack
//      * This is only allowed for world-level packs by a GM user
//      * @return {Promise.<Compendium>}
//      */
//     async delete() {
//       this._assertUserCanModify();
//       await SocketInterface.dispatch("manageCompendium", {
//         action: "delete",
//         data: this.metadata.name
//       });
  
//       // Remove the pack from the game World
//       game.data.packs.findSplice(p => (p.package === "world") && (p.name === this.metadata.name) );
//       game.initializePacks().then(() => ui.compendium.render());
//       return this;
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * Duplicate a compendium pack to the current World
//      * @param label
//      * @return {Promise<Compendium>}
//      */
//     async duplicate({label}={}) {
//       this._assertUserCanModify({requireUnlocked: false});
//       label = label || this.metadata.label;
//       const metadata = mergeObject(this.metadata, {
//         name: label.slugify({strict: true}),
//         label: label
//       }, {inplace: false});
//       return this.constructor.create(metadata, {source: this.collection});
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * Get the Compendium index
//      * Contains names and IDs of all data in the compendium
//      *
//      * @return {Promise}    A Promise containing an index of all compendium entries
//      */
//     async getIndex() {
//       const response = await SocketInterface.dispatch("modifyCompendium", {
//         type: this.collection,
//         action: "get",
//         data: {},
//         options: {returnType: "index"}
//       });
//       return this.index = response.result;
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * Get the complete set of content for this compendium, loading all entries in full
//      * Returns a Promise that resolves to an Array of entries
//      *
//      * @return {Promise.<Array>}
//      */
//     async getContent() {
//       const response = await SocketInterface.dispatch("modifyCompendium", {
//         type: this.collection,
//         action: "get",
//         data: {},
//         options: {returnType: "content"}
//       });
//       return response.result.map(entry => this._toEntity(entry));
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * Get a single Compendium entry as an Object
//      * @param entryId {String}  The compendium entry ID to retrieve
//      *
//      * @return {Promise.<Object|null>}  A Promise containing the return entry data, or null
//      */
//     async getEntry(entryId) {
//       const response = await SocketInterface.dispatch("modifyCompendium", {
//         type: this.collection,
//         action: "get",
//         data: {_id: entryId},
//         options: {returnType: "entry"}
//       });
//       return response.result[0];
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * Get a single Compendium entry as an Entity instance
//      * @param {string} entryId          The compendium entry ID to load and instantiate
//      * @return {Promise.<Entity|null>}   A Promise containing the returned Entity, if it exists, otherwise null
//      */
//     async getEntity(entryId) {
//       const entry = await this.getEntry(entryId);
//       return entry ? this._toEntity(entry) : null;
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * Cast entry data to an Entity class
//      * @param {Object} entryData
//      * @private
//      */
//     _toEntity(entryData={}) {
//       return new this.cls(entryData, {compendium: this});
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * Import a new Entity into a Compendium pack
//      * @param {Entity} entity     The Entity instance you wish to import
//      * @return {Promise}          A Promise which resolves to the created Entity once the operation is complete
//      */
//     async importEntity(entity) {
//       if ( entity.entity !== this.entity ) {
//         let err = "You are attempting to import the wrong type of entity into this pack";
//         ui.notifications.error(err);
//         throw new Error(err);
//       }
  
//       // Get the data to import
//       const data = await entity.toCompendium();
//       return this.createEntity(data);
//     }
  
//     /* -------------------------------------------- */
  
//     /**
//      * Create a new Entity within this Compendium Pack using provided data
//      * @param {Object} data       Data with which to create the entry
//      * @param {Options} options   Additional options which modify the creation
//      * @return {Promise}          A Promise which resolves to the created Entity once the operation is complete
//      */
//     async createEntity(data, options={}) {
//       this._assertUserCanModify();
//       data = data instanceof Array ? data : [data];
  
//       // Dispatch the Socket request
//       const response = await SocketInterface.dispatch("modifyCompendium", {
//         action: "create",
//         type: this.collection,
//         data: data,
//         options: options
//       });
//       this.render(false);
  
//       // Return the created entities
//       const results = response.result.map(r => this._toEntity(r));
//       return data.length > 1 ? results : results[0];
//     }
  
//     /* -------------------------------------------- */
  
//     /**
//      * Update a single Compendium entry programmatically by providing new data with which to update
//      * @param {Object} data       The incremental update with which to update the Entity. Must contain the _id
//      * @param {Object} options    Additional options which modify the update request
//      * @return {Promise}          A Promise which resolves with the updated Entity once the operation is complete
//      */
//     async updateEntity(data, options={}) {
//       this._assertUserCanModify();
//       if ( !data._id ) throw new Error("You must specify the _id attribute for the data you wish to update");
  
//       // Reference an existing Entity which is already rendered
//       const entity = options["entity"] || null;
//       delete options.entity;
  
//       // Prepare data for update
//       data = data instanceof Array ? data : [data];
//       const updates = data.reduce((arr, d) => {
//         if ( !d._id ) throw new Error(`You must provide an _id for every Compendium entry in the data Array.`);
//         d = expandObject(d);
//         arr.push(d);
//         return arr;
//       }, []);
//       if ( !updates.length ) return [];
  
//       // Dispatch the Socket request
//       const response = await SocketInterface.dispatch("modifyCompendium", {
//         action: "update",
//         type: this.collection,
//         data: updates,
//         options: options
//       });
  
//       // Render updates
//       this.render(false);
//       if ( entity ) {
//         const update = response.result.find(r => r._id === entity.id);
//         mergeObject(entity.data, update);
//         entity._onUpdate(update, options, response.userId);
//       }
  
//       // Return the update entities
//       return response.result;
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * Delete a single Compendium entry by its provided _id
//      * @param {String} id         The entry ID to delete
//      * @param {Object} options    Additional options which modify the deletion request
//      * @return {Promise}          A Promise which resolves to the deleted entry ID once the operation is complete
//      */
//     async deleteEntity(id, options={}) {
//       this._assertUserCanModify();
//       const ids = id instanceof Array ? id : [id];
//       const response = await SocketInterface.dispatch("modifyCompendium", {
//         action: "delete",
//         type: this.collection,
//         data: ids,
//         options: options
//       });
//       this.render(false);
//       return response.result;
//     }
  
//     /* -------------------------------------------- */
  
//     /**
//      * Request that a Compendium pack be migrated to the latest System data template
//      * @return {Promise.<Compendium>}
//      */
//     async migrate(options) {
//       this._assertUserCanModify();
//       ui.notifications.info(`Beginning migration for Compendium pack ${this.collection}, please be patient.`);
//       const response = await SocketInterface.dispatch("manageCompendium", {
//         type: this.collection,
//         action: "migrate",
//         data: this.collection,
//         options: options
//       });
//       ui.notifications.info(`Successfully migrated Compendium pack ${this.collection}.`);
//       return response;
//     }
  
//     /* -------------------------------------------- */
  
//     /**
//      * Filter the results in the Compendium pack to only show ones which match a provided search string
//      * @param {string} searchString    The search string to match
//      */
//     search(searchString) {
//       const query = new RegExp(RegExp.escape(searchString), "i");
//       this.element.find('li.directory-item').each((i, li) => {
//         let name = li.getElementsByClassName('entry-name')[0].textContent;
//         li.style.display = query.test(name) ? "flex" : "none";
//       });
//       this.searchString = searchString;
//     }
  
//     /* ----------------------------------------- */
  
//     /**
//      * Validate that the current user is able to modify content of this Compendium pack
//      * @return {boolean}
//      * @private
//      */
//     _assertUserCanModify({requireGM=true, requireUnlocked=true}={}) {
//       let err = null;
//       if ( requireGM && !game.user.isGM ) err = new Error("You do not have permission to modify this compendium pack");
//       if ( this.locked && requireUnlocked ) {
//         err = new Error(`You cannot modify content in this compendium pack because it is locked.`);
//       }
//       if ( err ) {
//         ui.notifications.error(err.message);
//         throw err;
//       }
//       return true;
//     }
  
//     /* -------------------------------------------- */
//     /*  Event Listeners and Handlers                */
//     /* -------------------------------------------- */
  
//     /**
//      * Register event listeners for Compendium directories
//      * @private
//      */
//     activateListeners(html) {
//       super.activateListeners(html);
//       const directory = html.find('.directory-list');
//       const entries = directory.find('.directory-item');
  
//       // Search filtering
//       html.find('input[name="search"]').keyup(this._onFilterResults.bind(this));
//       if ( this.searchString ) this.search(this.searchString);
  
//       // Open sheets
//       html.find('.entry-name').click(ev => {
//         let li = ev.currentTarget.parentElement;
//         this._onEntry(li.dataset.entryId);
//       });
  
//       // Context menu for each entry
//       this._contextMenu(html);
  
//       // Intersection Observer for Compendium avatars
//       const observer = new IntersectionObserver(SidebarTab.prototype._onLazyLoadImage.bind(this), {root: directory[0]});
//       entries.each((i, li) => observer.observe(li));
//     }
  
//     /* -------------------------------------------- */
  
//     /**
//      * Handle compendium filtering through search field
//      * Toggle the visibility of indexed compendium entries by name (for now) match
//      * @private
//      */
//     _onFilterResults(event) {
//       event.preventDefault();
//       let input = event.currentTarget;
//       if ( this._filterTimeout ) {
//         clearTimeout(this._filterTimeout);
//         this._filterTimeout = null;
//       }
//       this._filterTimeout = setTimeout(() => this.search(input.value), 100);
//     }
  
//     /* -------------------------------------------- */
  
//     /**
//      * Handle opening a single compendium entry by invoking the configured entity class and its sheet
//      * @private
//      */
//     async _onEntry(entryId) {
//       const entity = await this.getEntity(entryId);
//       entity.sheet.render(true);
//     }
  
//     /* -------------------------------------------- */
  
//     /** @override */
//     _canDragStart(selector) {
//       if ( this.cls.entity === "Item" ) return true;
//       return this.cls.can(game.user, "create");
//     }
  
//     /* -------------------------------------------- */
  
//     /** @override */
//     _canDragDrop(selector) {
//       return game.user.isGM;
//     }
  
//     /* -------------------------------------------- */
  
//     /** @override */
//     _onDragStart(event) {
  
//       // Get the Compendium pack
//       const li = event.currentTarget;
//       const packName = li.parentElement.parentElement.getAttribute("data-pack");
//       const pack = game.packs.get(packName);
//       if ( !pack ) return;
  
//       // Set the transfer data
//       event.dataTransfer.setData("text/plain", JSON.stringify({
//         type: pack.entity,
//         pack: pack.collection,
//         id: li.dataset.entryId
//       }));
//     }
  
//     /* -------------------------------------------- */
  
//     /**
//      * Handle data being dropped into a Compendium pack
//      * @private
//      */
//     async _onDrop(event) {
  
//       // Try to extract the data
//       let data;
//       try {
//         data = JSON.parse(event.dataTransfer.getData('text/plain'));
//       }
//       catch (err) {
//         return false;
//       }
  
//       // Ensure an entity type was indicated
//       if ( !data.type ) throw new Error("You must define the type of entity data being dropped");
//       let ent = null;
  
//       // Case 1 - Data explicitly provided
//       if ( data.data ) ent = new this.cls(data.data);
  
//       // Case 2 - Import from other Compendium
//       else if ( data.pack ) {
//         if ( data.pack === this.collection ) return false;
//         const source = game.packs.get(data.pack);
//         ent = await source.getEntity(data.id);
//       }
  
//       // Case 3 - Import from World data
//       else ent = this.cls.collection.get(data.id);
  
//       // Create the new Compendium entry
//       return this.importEntity(ent);
//     }
  
//     /* -------------------------------------------- */
  
//     /**
//      * Render the ContextMenu which applies to each compendium entry
//      * @private
//      */
//     _contextMenu(html) {
//       new ContextMenu(html, ".directory-item", [
//         {
//           name: "Import",
//           icon: '<i class="fas fa-download"></i>',
//           callback: li => {
//             const entryId = li.attr('data-entry-id');
//             const entities = this.cls.collection;
//             return entities.importFromCollection(this.collection, entryId, {}, {renderSheet: true});
//           }
//         },
//         {
//           name: "Delete",
//           icon: '<i class="fas fa-trash"></i>',
//           callback: li => {
//             let entryId = li.attr('data-entry-id');
//             this.getEntity(entryId).then(entry => {
//               new Dialog({
//                 title: `Delete ${entry.name}`,
//                 content: "<h3>Are you sure?</h3>" +
//                          "<p>This compendium entry and its data will be deleted.</p>" +
//                          "<p>If you do not own this compendium, your change could be reverted by future updates.</p>",
//                 buttons: {
//                   yes: {
//                     icon: '<i class="fas fa-trash"></i>',
//                     label: "Delete",
//                     callback: () => this.deleteEntity(entryId)
//                   },
//                   no: {
//                     icon: '<i class="fas fa-times"></i>',
//                     label: "Cancel"
//                   }
//                 },
//                 default: 'yes'
//               }).render(true);
//             })
//           }
//         }
//       ]);
//     }
//   }