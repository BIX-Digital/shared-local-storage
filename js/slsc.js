// To consider:
// make npm package
// https://humanwhocodes.com/snippets/2020/10/create-typescript-declarations-from-javascript-jsdoc/
// proper use of https://jsdoc.app/

// abstraction layer for the shared storage - client object

/**
 * Shared Storage client object - abstraction of the communication based on postMessage
 * @namespace
 */
const sharedStorage = {
  // --- CONFIGURATION VALUES ---
  /**
   * The target origins that should be allowed to listen to the messages - default is '*'.
   * For security reasons you should always limit this to the URL that runs your Shared Storage "Host"!
   */
  targetOrigin: '*',
  // generate an instance GUID to have a base for message assigning
  /**
   * GUID-like ID of the instance - this way multiple instances will not mix up their messages.
   * The value is auto-generated; you should NOT change this without a good reason!
   */
  instanceGuid: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }),
  /**
   * Window / Frame with the Shared Storage "Host" where messages should be sent to.
   */
  hostFrame: null,
  /**
   * Timeout for messages that are sent in milliseconds - after this time frame is over the promise
   * will be rejected with a timeout error...
   */
  timeout: 500,
  // --- PUBLIC FUNCTIONS ---
  //
  /**
   * Ping function - use this to check if the Host is loaded and answers messages.
   * Intended to be used while an application is starting - or if every request creates an
   * error and you want to know if you should maybe reload a potentially crashed host...
   */
  ping: function() {
    const msgId = this.instanceGuid + '_' + this._msgCounter.next();
    let msg = this._createBaseMessage(msgId, 'ping', 'ping');
    return this._sendMessage(msgId, msg);
  },
  /**
   * The read function to get a value from the shared storage
   * @param {string} key The key of the value that you want to request
   */
  getValue: function(key) {
    const msgId = this.instanceGuid + '_' + this._msgCounter.next();
    let msg = this._createBaseMessage(msgId, 'storage', {cmd: 'get', key: key});
    return this._sendMessage(msgId, msg);
  },
  /**
   * Save a value with a previously not existing key (create or insert).
   * If save is successful it will resolve 'true', else reject with an error-object
   * @param {string} key The key to create for storing the value
   * @param {*} value The value that should be stored in the new key
   */
  setValue: function(key, value) {
    const msgId = this.instanceGuid + '_' + this._msgCounter.next();
    let msg = this._createBaseMessage(msgId, 'storage', {cmd: 'set', key: key, value: value});
    return this._sendMessage(msgId, msg);
  },
  /**
   * Update a value of an existing key (update).
   * If update is successful it will resolve 'true', else reject with an error-object
   * @param {string} key The key to be updated with the value
   * @param {*} value The value that should be stored in the existing key
   */
  updateValue: function(key, value) {
    const msgId = this.instanceGuid + '_' + this._msgCounter.next();
    let msg = this._createBaseMessage(msgId, 'storage', {cmd: 'update', key: key, value: value});
    return this._sendMessage(msgId, msg);
  },
  /**
   * Delete an existing key-value pair from the shared storage.
   * If the deletion is successful it will resolve 'true', else reject with an error-object
   * @param {string} key The key of the key-value pair that should be deleted form the shared storage
   */
  deleteValue: function(key) {
    const msgId = this.instanceGuid + '_' + this._msgCounter.next();
    let msg = this._createBaseMessage(msgId, 'storage', {cmd: 'delete', key: key});
    return this._sendMessage(msgId, msg);
  },
  /**
   * Get the list of keys that are available in the shared storage
   */
  getKeys: function() {
    const msgId = this.instanceGuid + '_' + this._msgCounter.next();
    let msg = this._createBaseMessage(msgId, 'storage', {cmd: 'keys'});
    return this._sendMessage(msgId, msg);
  },
  /**
   * The message handler that needs to be added as listener to the "message" event
   * make sure you use the .bind(thisReference) as below to have correct references
   * window.addEventListener("message", sharedStorage.messageListener.bind(sharedStorage), false);
   * @param {*} event The postMessage event object that is passed on that event
   */
  messageListener: function(event) {
    let conversation = this._conversationStore.finalizeConversation(event.data.id);
    if (conversation !== null) {
      switch (conversation.msg.type) {
        case 'ping':
          if (event.data.type === 'ping') {
            conversation.resolve(true);
          } else { // if there is anything that's not a ping answer this is an error
            conversation.reject(event.data.payload)
          }
          break;
        case 'storage':
          this._storageResultHandler(event, conversation);
          break;
        default:
          // ToDo: handle unknown types?
          //conversation.resolve(event.data);
          break;
      }
      
    }
  },
  // private elements

  _msgCounter: {
    value: 0,
    next: function() {
      this.value++;
      if (this.value > 1023) {
        this.value = 0;
      }
      return this.value;
    }
  },

  _sendMessage: function(msgId, msg) {
    return new Promise((resolve, reject) => {
      this._conversationStore.openConversation(msg, resolve, reject);
      // execute message
      this.hostFrame.contentWindow.postMessage(msg, this.targetOrigin);
      // start timeoutTimer
      this._startTimeoutCheck(msgId);
    });
  },

  _conversationStore: {
    // this object deals with all conversations (open requests without replies)
    openConversation: function(msg, resolve, reject) {
      this.conversations.push({msg: msg, resolve: resolve, reject: reject});
    },
    finalizeConversation: function(msgId) {
      let pos = this.findConversationIndex(msgId);
      if (pos !== -1) {
        let conversation = this.conversations.splice(pos, 1);
        return conversation[0];
      } else {
        return null;
      }
    },
    rejectConversation: function(msgId) {
      let pos = this.findConversationIndex(msgId);
      if (pos !== -1) {
        let conversation = this.conversations.splice(pos, 1);
        return conversation[0].reject;
      } else {
        return null;
      }
    },
    // internals
    conversations: [],
    findConversationIndex: function(msgId) {
      for (let idx=0; idx < this.conversations.length; idx++) {
        if (this.conversations[idx].msg.id === msgId) {
          return idx;
        }
      }
      return -1;
    }
  },

  _startTimeoutCheck: function(msgId) {
    setTimeout(function () {
      let reject = this._conversationStore.rejectConversation(msgId);
      if (reject !== null) {
        reject('request timed out');
      }  
    }.bind(this), this.timeout);
  },
  // function to create the basic message
  _createBaseMessage: function(uuid, messageType, messagePayload) {
    return {id: uuid, type: messageType, payload: messagePayload};
  },

  // storage answer handler
  _storageResultHandler: function(event, conversation) {
    switch (conversation.msg.payload.cmd) {
      case 'get':
        if (event.data.type === 'storage_content') {
          if (conversation.msg.payload.key === event.data.payload.key) {
            conversation.resolve(event.data.payload.value);
          } else {
            conversation.reject({id: -2, message: 'wrong key in result message, messages mixed up...'});
          }
        } else {
          conversation.reject({id: -1, message: 'unexpected result type...'});
        }
        break;
      case 'set':
        if (event.data.type === 'storage_content') {
          if (conversation.msg.payload.key === event.data.payload.key) {
            // it's required to stringify potential object data to avoid compare issues
            if (JSON.stringify(conversation.msg.payload.value) ===
                 JSON.stringify(event.data.payload.value)) {
              // set worked properly
              conversation.resolve(true);
            } else {
              conversation.reject({id: -10, message: 'wrong value in result message, set failed...'});
            }  
          } else {
            conversation.reject({id: -2, message: 'wrong key in result message, messages mixed up...'});
          }
        } else if (event.data.type === 'storage_error') {
          // return error details
          conversation.reject(event.data.payload);
        } else {
          conversation.reject({id: -1, message: 'unexpected result type...'});
        }
        break;
      case 'update':
        if (event.data.type === 'storage_content') {
          if (conversation.msg.payload.key === event.data.payload.key) {
            // it's required to stringify potential object data to avoid compare issues
            if (JSON.stringify(conversation.msg.payload.value) ===
                 JSON.stringify(event.data.payload.value)) {
              // update worked properly
              conversation.resolve(true);
            } else {
              conversation.reject({id: -20, message: 'wrong value in result message, update failed...'});
            }  
          } else {
            conversation.reject({id: -2, message: 'wrong key in result message, messages mixed up...'});
          }
        } else if (event.data.type === 'storage_error') {
          // return error details
          conversation.reject(event.data.payload);
        } else {
          conversation.reject({id: -1, message: 'unexpected result type...'});
        }
        break;
      case 'delete':
        if (event.data.type === 'storage_delete') {
          if (conversation.msg.payload.key === event.data.payload.key) {
            if (event.data.payload.success === true) {
              // delete worked properly
              conversation.resolve(true);
            } else {
              // return error details
              conversation.reject(event.data.payload.error);
            }
          } else {
            conversation.reject({id: -2, message: 'wrong key in result message, messages mixed up...'});
          }
        } else {
          conversation.reject({id: -1, message: 'unexpected result type...'});
        }
        break;
      case 'keys':
        if (event.data.type === 'storage_keys') {
          conversation.resolve(event.data.payload.keys);
        } else {
          conversation.reject({id: -1, message: 'unexpected result type...'});
        }
        break;
      default:
        conversation.reject({id: -90, message: 'unknown storage command...'});
        break;
    }
  }
}
