


// get html elements used by the test / demo
const storageFrame = document.getElementById('sharedStorage');
const msgBtn = document.getElementById('msg');


// set up client
sharedStorage.targetOrigin = 'http://127.0.0.1:8080';
sharedStorage.hostFrame = document.getElementById('sharedStorage');
// set up a listener for incoming messages, pass them to the client;
// make sure the references inside the sharedStorage stay correct by using .bind()
window.addEventListener("message", sharedStorage.messageListener.bind(sharedStorage), false);



msgBtn.addEventListener('click', async function () {
  console.log('TEST RUNNER: Shared Storage Host and Client e2e test starting...');
  let tmpValue;

  // check pre-conditions
  tmpValue = await sharedStorage.getKeys();
  if (JSON.stringify(tmpValue) === JSON.stringify([])) {
    console.log('TEST RUNNER: Shared Storage key list is empty, starting tests...');
  } else {
    console.error('TEST RUNNER: key list is not empty; test can not be executed...');
    console.warn('TEST RUNNER: please clear the local storage of the host\'s domain before running it again!');
    return;
  }

  // ping
  console.log('TEST RUNNER: execute ping()');
  try {
    tmpValue = await sharedStorage.ping();
    if (tmpValue === true) {
      console.log('TEST SUCCESS: ping()');
    }
  } catch (error) {
    console.error('TEST FAILED: ping()');
    console.log(error);
  }


  // set new key & value
  console.log('TEST RUNNER: execute setValue() for new key');
  try {
    tmpValue = await sharedStorage.setValue('test1', {content: 'test'});
    if (tmpValue === true) {
      console.log('TEST SUCCESS: setValue()');
    }
  } catch (error) {
    console.error('TEST FAILED: setValue()');
    console.log(error);
  }

  // set existing key's value - should fail
  console.log('TEST RUNNER: execute setValue() for exiting key');
  try {
    tmpValue = await sharedStorage.setValue('test1', {content: 'test set existing'});
    if (tmpValue === true) {
      console.error('TEST FAILED: setValue() allowed writing to already existing key');
    }
  } catch (error) {
    console.log('TEST SUCCESS: setValue() blocked writing to already existing key');
    console.log(error);
  }

  // set keylist key's value - should fail
  console.log('TEST RUNNER: execute setValue() for internal keylist key');
  try {
    tmpValue = await sharedStorage.setValue('___sshKeyList___', {content: 'test break the system'});
    if (tmpValue === true) {
      console.error('TEST FAILED: setValue() allowed writing to internal keylist key');
    }
  } catch (error) {
    console.log('TEST SUCCESS: setValue() blocked writing to internal keylist key');
    console.log(error);
  }

  // update existing key's value
  console.log('TEST RUNNER: execute updateValue() for exiting key');
  try {
    tmpValue = await sharedStorage.updateValue('test1', {content: 'test updated'});
    if (tmpValue === true) {
      console.log('TEST SUCCESS: updateValue()');
    }
  } catch (error) {
    console.error('TEST FAILED: updateValue()');
    console.log(error);
  }
  
  // update non existing key's value - should fail
  console.log('TEST RUNNER: execute updateValue() for new key');
  try {
    tmpValue = await sharedStorage.updateValue('test_missing', {content: 'test fails hopefully'});
    if (tmpValue === true) {
      console.log('TEST FAILED: updateValue() allowed updating of not existing value');
    }
  } catch (error) {
    console.log('TEST SUCCESS: updateValue() blocked updating of a not existing key');
    console.log(error);
  }

  // update internal keylist key's value - should fail
  console.log('TEST RUNNER: execute updateValue() for internal keylist key');
  try {
    tmpValue = await sharedStorage.updateValue('___sshKeyList___', {content: 'test fails hopefully'});
    if (tmpValue === true) {
      console.log('TEST FAILED: updateValue() allowed updating internal keylist value');
    }
  } catch (error) {
    console.log('TEST SUCCESS: updateValue() blocked updating internal keylist key');
    console.log(error);
  }

  // read existing key's value
  console.log('TEST RUNNER: execute getValue() for previously set and updated value');
  try {
    tmpValue = await sharedStorage.getValue('test1');
    if (JSON.stringify(tmpValue) === JSON.stringify({content: 'test updated'})) {
      console.log('TEST SUCCESS: getValue()');
    } else {
      console.error('TEST FAILED: getValue() returned wrong result');
      console.log(tmpValue);
    }
  } catch (error) {
    console.error('TEST FAILED: getValue()');
    console.log(error);
  }

  // read not existing key's value - should return null
  console.log('TEST RUNNER: execute getValue() for not existing value');
  try {
    tmpValue = await sharedStorage.getValue('test_missing');
    if (tmpValue === null) {
      console.log('TEST SUCCESS: getValue() returned null');
    } else {
      console.error('TEST FAILED: getValue() returned wrong value');
      console.log(error);  
    }
  } catch (error) {
    console.error('TEST FAILED: getValue() exception');
    console.log(error);
  }

  // read the list of keys
  console.log('TEST RUNNER: execute getKeys() and check for expected content');
  try {
    tmpValue = await sharedStorage.getKeys();
    if (JSON.stringify(tmpValue) === JSON.stringify(['test1'])) {
      console.log('TEST SUCCESS: getKeys()');
    } else {
      console.error('TEST FAILED: getKeys() returned wrong result');
      console.log(tmpValue);
    }
  } catch (error) {
    console.error('TEST FAILED: getKeys()');
    console.log(error);
  }

  // delete test key and value again
  console.log('TEST RUNNER: execute deleteValue() for existing key');
  try {
    tmpValue = await sharedStorage.deleteValue('test1');
    if (tmpValue === true) {
      console.log('TEST SUCCESS: deleteValue()');
    }
  } catch (error) {
    console.error('TEST FAILED: deleteValue()');
    console.log(error);
  }

  // delete not existing key and value again - should fail
  console.log('TEST RUNNER:  execute deleteValue() for not existing key');
  try {
    tmpValue = await sharedStorage.deleteValue('test_missing');
    if (tmpValue === true) {
      console.error('TEST FAILED: deleteValue() of not existing key worked');
    }
  } catch (error) {
    console.log('TEST SUCCESS: deleteValue() failed to delete not existing key');
    console.log(error);
  }

  // delete keylist key and value - should fail
  console.log('TEST RUNNER: execute deleteValue() for internal keylist key');
  try {
    tmpValue = await sharedStorage.deleteValue('___sshKeyList___');
    if (tmpValue === true) {
      console.error('TEST FAILED: deleteValue() of keylist key worked');
    }
  } catch (error) {
    console.log('TEST SUCCESS: deleteValue() failed to delete keylist key');
    console.log(error);
  }
  
  console.log('TEST RUNNER: test execution finished...');
});
