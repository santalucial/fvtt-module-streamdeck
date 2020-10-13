import {EntityCollection} from './entityCollection'
import {ChatMessage} from './chatmessage'
/**
 * A :class:`EntityCollection` of class:`ChatMessage` entities
 * The Messages collection is accessible within the game as `game.messages`.
 *
 * @type {EntityCollection}
 */
export class Messages extends EntityCollection {

    /**
     * Elements of the Messages collection are instances of the ChatMessage class
     * @return {ChatMessage}
     */
    get object() {
      return window.CONFIG.ChatMessage.entityClass;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Don't render any applications for this collection, as rendering is handled at a per-message level
     * @param force
     */
    render(force=false) {
      return;
    }
  
    /* -------------------------------------------- */
  
    /**
     * If requested, dispatch a Chat Bubble UI for the newly created message
     * @param {ChatMessage} message     The ChatMessage entity to say
     * @private
     */
    sayBubble(message) {
    //   const {content, type, speaker} = message.data;
    //   if ( speaker.scene === canvas.scene._id ) {
    //     const token = canvas.tokens.get(speaker.token);
    //     if ( token ) canvas.hud.bubbles.say(token, content, {
    //       emote: type === CONST.CHAT_MESSAGE_TYPES.EMOTE
    //     });
    //   }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle export of the chat log to a text file
     * @private
     */
    export() {
    //   const log = this.entities.map(m => m.export()).join("\n---------------------------\n");
    //   let date = new Date().toDateString().replace(/\s/g, "-");
    //   const filename = `fvtt-log-${date}.txt`;
    //   saveDataToFile(log, "text/plain", filename);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Allow for bulk deletion of all chat messages, confirm first with a yes/no dialog.
     * @see {@link Dialog.confirm}
     */
    async flush() {
    //   return Dialog.confirm({
    //     title: game.i18n.localize("CHAT.FlushTitle"),
    //     content: game.i18n.localize("CHAT.FlushWarning"),
    //     yes: () => this.object.delete([], {deleteAll: true})
    //   }, {
    //     top: window.innerHeight - 150,
    //     left: window.innerWidth - 720,
    //   });
    }
  }

if (window.CONFIG === undefined) {
  window.CONFIG = {};
}
window.CONFIG["ChatMessage"] = {
  entityClass: ChatMessage,
  collection: Messages,
  template: "templates/sidebar/chat-message.html",
  sidebarIcon: "fas fa-comments",
  batchSize: 100,
};
