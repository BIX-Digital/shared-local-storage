/*
Shared Storage Host Script
==========================
v. 0.1 - initial release -> by Manuel Feller for BI X / Medicoach
*/

/* ------ CONFIGURATION START ------ */
// basic elements of the code
const allowedOrigins = [
  'http://127.0.0.1:8080'
];
// set 'true' to activate or 'false' to deactivate debug outputs in the developer console
const debugOutputs = false;
// optional change: define the name where the array with key names is saved
const sshKeyListKeyName = '___sshKeyList___';
/* ------ CONFIGURATION END ------ */

// script starts here, you should not change anything here as long as you do not find a bug

// check if the message origin is valid
const checkOrigin = (origin) => {
  return (allowedOrigins.indexOf(origin) !== -1);
}

// function to create the basic message
const createBaseMessage = (uuid, messageType, messagePayload) => {
  return {id: uuid, type: messageType, payload: messagePayload};
}
// functions to create the higher level message objects
const createGeneralErrorMessage = (uuid, errorId, errorMessage) => {
  return createBaseMessage(uuid, 'error', {id: errorId, message: errorMessage});
}
const createPingReplyMessage = (uuid) => {
  return createBaseMessage(uuid, 'ping', 'pong');
}
const createStorageContentMessage = (uuid, messageKey, messageValue) => {
  return createBaseMessage(uuid, 'storage_content', {key: messageKey, value: messageValue});
}
const createStorageErrorMessage = (uuid, errorId, errorMessage) => {
  return createBaseMessage(uuid, 'storage_error', {id: errorId, message: errorMessage});
}
const createStorageDeleteSuccessMessage = (uuid, messageKey) => {
  return createBaseMessage(uuid, 'storage_delete', {key: messageKey, success: true});
}
const createStorageDeleteFailMessage = (uuid, messageKey, errorId, errorMessage) => {
  return createBaseMessage(uuid, 'storage_delete', {key: messageKey, success: false, error: {id: errorId, message: errorMessage}});
}
const createStorageKeysMessage = (uuid, messageKeys) => {
  return createBaseMessage(uuid, 'storage_keys', {keys: messageKeys});
}

// handlers for the different message types
const handlePingMessage = (uuid, payload, origin) => {
  if (debugOutputs) {console.log('SHARED STORAGE HOST | processing ping message');}
  if (debugOutputs && payload !== 'ping') {console.warn('SHARED STORAGE HOST | non-standard ping payload');}
  window.parent.postMessage(createPingReplyMessage(uuid), origin);
}

const handleStorageMessage = (uuid, payload, origin) => {
  if (debugOutputs) {console.log('SHARED STORAGE HOST | processing storage message');}
  // ToDo: add logic for executing the storage commands here
  if (payload.hasOwnProperty('cmd')) {
    // command in there
    switch (payload.cmd) {
      case 'get':
        window.parent.postMessage(getValue(uuid, payload.key), origin);
        break;
      case 'set':
        window.parent.postMessage(setValue(uuid, payload.key, payload.value), origin);
        break;
      case 'update':
        window.parent.postMessage(updateValue(uuid, payload.key, payload.value), origin);
        break;
      case 'delete':
        window.parent.postMessage(deleteValue(uuid, payload.key), origin);
        break;
      case 'keys':
        window.parent.postMessage(createStorageKeysMessage(uuid, knownKeys), origin);
        break;
      default:
        if (debugOutputs) {console.error('SHARED STORAGE HOST | unknown storage command received');}
        window.parent.postMessage(createStorageErrorMessage(uuid, 990, 'unknown storage command'), origin);
        break;
    }
  } else {
    if (debugOutputs) {console.error('SHARED STORAGE HOST | command is missing');}
    window.parent.postMessage(createGeneralErrorMessage(uuid, 405, 'command in the storage request is not known'), origin);
  }
}

// storage access code
const deleteValue = (uuid, key) => {
  let keyIndex = knownKeys.indexOf(key);
  if (keyIndex !== -1) { // key known, delete (in storage and in list of known keys)
    localStorage.removeItem(key);
    knownKeys.splice(keyIndex, 1);
    persistKnownKeysList();
    return createStorageDeleteSuccessMessage(uuid, key);
  } else { // key exists; use of update is needed
    if (debugOutputs) {console.warn('SHARED STORAGE HOST | attempt to delete not existing key, operation aborted');}
    return createStorageDeleteFailMessage(uuid, key, 920, 'delete of a not existing key is not possible');
  }
}

const updateValue = (uuid, key, value) => {
  if (knownKeys.indexOf(key) !== -1) { // key known, update
    localStorage.setItem(key, JSON.stringify(value));
    // return message with value read from the updated item
    return createStorageContentMessage(uuid, key, JSON.parse(localStorage.getItem(key)));
  } else { // key exists; use of update is needed
    if (debugOutputs) {console.warn('SHARED STORAGE HOST | attempt to set already existing key, operation aborted');}
    return createStorageErrorMessage(uuid, 910, 'update of a not existing key is not allowed, please use set');
  }
}

const setValue = (uuid, key, value) => {
  // protect internal list of keys from being set by the interface
  if (key === sshKeyListKeyName) {
    if (debugOutputs) {console.error('SHARED STORAGE HOST | attempt to manipulate the internal key list directly, operation aborted');}
    return createStorageErrorMessage(uuid, 999, 'key equals an internal key used by the shared storage host and is protected, please use a different key');
  }
  // actual logic
  if (knownKeys.indexOf(key) === -1) { // key unknown, create and safe (value as well as key)
    localStorage.setItem(key, JSON.stringify(value));
    knownKeys.push(key);
    persistKnownKeysList();
    // return message with value read from the newly created item
    return createStorageContentMessage(uuid, key, JSON.parse(localStorage.getItem(key)));
  } else { // key exists; use of update is needed
    if (debugOutputs) {console.warn('SHARED STORAGE HOST | attempt to set already existing key, operation aborted');}
    return createStorageErrorMessage(uuid, 900, 'set of an existing key is not allowed, please use update');
  }
}

const getValue = (uuid, key) => {
  // read value for key
  let tmpResult = null;
  // check if it is a key known to the shared storage host
  if (knownKeys.indexOf(key) !== -1) { // key known, return content
    tmpResult = JSON.parse(localStorage.getItem(key));
  } else { // unknown key, no access
    if (debugOutputs) {console.warn('SHARED STORAGE HOST | attempt to read unknown key, access blocked (returning null)');}
  }
  return createStorageContentMessage(uuid, key, tmpResult);
}

// helper to persists the list of keys
const persistKnownKeysList = () => {
  localStorage.setItem(sshKeyListKeyName, JSON.stringify(knownKeys));
}
// basic message handler
const processMessage = (event) => {
  // get message ID (null by default)
  let msgUuid = null;
  if (event.data.hasOwnProperty('id')) {
    msgUuid = event.data.id;
  }
  // process message
  if (checkOrigin(event.origin)) {
    //
    if (debugOutputs) {
      console.log('SHARED STORAGE HOST | Received message:');
      console.log(event);
    }

    if (event.data.hasOwnProperty('type') && event.data.hasOwnProperty('payload')) {
      // valid base message
      switch (event.data.type) {
        case 'ping':
          handlePingMessage(msgUuid, event.data.payload, event.origin);
          break;
        case 'storage':
          handleStorageMessage(msgUuid, event.data.payload, event.origin);
          break;
        default:
          if (debugOutputs) {console.error('SHARED STORAGE HOST | invalid message type');}
          window.parent.postMessage(msgUuid, createGeneralErrorMessage(417, 'the message does not contain a known type'), event.origin);
          break;
      }
    } else {
      if (debugOutputs) {console.error('SHARED STORAGE HOST | invalid base message');}
      window.parent.postMessage(msgUuid, createGeneralErrorMessage(415, 'the message does not have a valid format'), event.origin);
    }
  } else {
    if (debugOutputs) {console.error('SHARED STORAGE HOST | origin not allowed');}
    window.parent.postMessage(msgUuid, createGeneralErrorMessage(403, 'sender is not in the list of allowed origins'), event.origin);
  }
}

// finally, the script init and run

// initialize list of known keys
if (debugOutputs) {console.log('SHARED STORAGE HOST | initial read of list with known keys');}
let knownKeys = JSON.parse(localStorage.getItem(sshKeyListKeyName));
if (knownKeys === null) {
  if (debugOutputs) {console.warn('SHARED STORAGE HOST | known key list does not exist yet, creating empty array');}
  knownKeys = [];
  persistKnownKeysList();
}

// set up a listener for incoming messages
if (debugOutputs) {console.log('SHARED STORAGE HOST | registering message listener');}
window.addEventListener("message", (event) => {
  // hand over message to the main function for this
  processMessage(event);
}, false);
if (debugOutputs) {console.log('SHARED STORAGE HOST | ready to use...');}
