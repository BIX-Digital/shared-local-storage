# Shared Local Storage Host

This directory contains the "host application" to enable a local shared storage across (sub-)domains.

## Messages

This section describes the messages that the "system" understands and sends as replies

### Basic message format

```javascript
{
  id: 'UNIQUE_CONVERSATION_ID', // id with a unique id to sort out parallel requests on the client side
  type: 'ping', // string that helps you to switch to the processing code that can handle the payload
  payload: { ... } // can be a primitive as well as a complex object; code needs to decide based on type
}
```

### Ping

The ping is intended to be used as alive or ready check - if you get the reply you know everything is loaded and ready to use

```javascript
// request:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'ping',
  payload: 'ping'
}

// reply:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'ping',
  payload: 'pong'
}
```

### Major Error

```javascript
// reply:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'error',
  payload: {
    id: 0,
    message: 'ERROR TEXT'
  }
}
```

### Storage access

Storage access is done with five different messages. You can `get`, `set`, `update` and `delete` key-value pairs as well as getting a list of available keys.

**You may ask "*why not just replicate the local storage API?*" with simple `get`, `set`, `removeItem` and `clear`. Here's why:**

Because there may be a non-shared storage on the same domain - for whatever reason - we want to make sure that these objects are at least a bit protected. This is why the shared storage host maintains it's own list of known keys internally and only exposes the ones it is aware of (= the ones that were stored by the use of the shared storage host API).

#### get value

```javascript
// request:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'storage',
  payload: {
    cmd: 'get',
    key: 'YOUR_KEY'
  }
}

// reply:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'storage_content',
  payload: {
    key: 'YOUR_KEY',
    value: 'VALUE' // can be null in case the key does not exist
  }
}
```

#### set value

```javascript
// request:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'storage',
  payload: {
    cmd: 'set',
    key: 'YOUR_KEY',
    value: 'YOUR_VALUE'
  }
}

// reply on success:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'storage_content',
  payload: {
    key: 'YOUR_KEY',
    value: 'YOUR_VALUE' // as confirmation that is was stored correctly
  }
}

// reply on error (key exists already):
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'storage_error',
  payload: {
    id: 0,
    message: 'ERROR TEXT'
  }
}
```

#### update value

```javascript
// request:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'storage',
  payload: {
    cmd: 'update',
    key: 'YOUR_KEY',
    value: 'YOUR_VALUE'
  }
}

// reply on success:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'storage_content',
  payload: {
    key: 'YOUR_KEY',
    value: 'YOUR_VALUE' // as confirmation that is was updated correctly
  }
}

// reply on error (key exists already):
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'storage_error',
  payload: {
    id: 0,
    message: 'ERROR TEXT'
  }
}
```

#### delete value

```javascript
// request:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'storage',
  payload: {
    cmd: 'delete',
    key: 'YOUR_KEY'
  }
}

// reply:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'storage_delete',
  payload: {
    key: 'YOUR_KEY',
    success: true
  }
}

// reply:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'storage_delete',
  payload: {
    key: 'YOUR_KEY',
    success: false,
    error: {
      id: 0,
      message: 'ERROR TEXT'
    }
  }
}

```

#### get available keys

```javascript
// request:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'storage',
  payload: {
    cmd: 'keys'
  }
}

// reply:
{
  id: 'UNIQUE_CONVERSATION_ID',
  type: 'storage_keys',
  payload: {
    keys: []
  }
}
```

## Error Codes

| code | meaning and possible solution(s)                                                                                                |
|------|---------------------------------------------------------------------------------------------------------------------------------|
| 403  | the sender of the request is not in the list of allowed origins -> add it to the `allowedOrigins` array enable communication    |
| 405  | the storage command that was submitted is unknown -> make sure you stick to the 5 commands that can be used with type `storage` |
| 415  | the submitted message did not match the required format -> make sure you have sent a valid message                              |
| 417  | the submitted message did match a known type -> make sure you stick to the message types defined above                          |
| 900  | the key could not be saved because it already exists -> use the `update` message for the action                                 |
| 910  | the key could not be updated because it does not exist -> use the `set` message for the action                                  |
| 920  | the key could not be deleted because it does not exist -> no need to take any further action, or? ;-)                           |
| 990  | the command (`cmd`) that was used is unknown -> make sure you used a valid command                                              |
| 999  | the `key` that was submitted to set would override an internal item in the shared storage host -> use a different key           |
