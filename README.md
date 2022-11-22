# Shared Local Storage Client

The shared storage client is a piece of code to connect to the [**Shared Local Storage Host**](store/README.md) without bothering about the internal details.
It is written in pure JavaScript (so you can easily use it anywhere) and currently just a `.js` file to include.
It may become a full npm module package in the future if we see enough demand...

To use it the page where you include the script also needs to include an `iframe` that loads the actual **Shared Local Storage Host** - it is located under `/store/` in the source repository of the client. There you can also find more details about the host - this document only covers the basics you have to consider when you use the client code.

## What problem does this solve

Local storage access in Browsers is limited to the same origin (origin = protocol + (sub)domain + port). This is for security reasons and make sense, but sometimes you may actually want to be able to share some information across your sub-domains.

The way how this script achieves this is to embed one page on the "main" domain via `<iframe>`. This embedded page contains code to listen to messages sent by the **Shared Local Storage Client** and answers them. This way the embedding page can access the local storage of the embedded page.

## What to consider

For security reasons (e.g. to avoid that any page that embeds your host can read values) you should limit the origins and **not** allow the origin `'*'`. Neither in the host nor in the client.

This is prepared in the scripts - but you need to configure it.

Also, this way operations on this shared local storage become an asynchronous operation that may actually fail because something went wrong in the host. So the added flexibility comes at the cost of a bit more complexity compared to plain local storage of the browser.

## Develop and test

To develop you should have a working node environment on your machine. In addition an installed `jsdoc3` is needed to generate the documentation.

Having it installed globally via npm (`npm install -g jsdoc`) enables you to run the `npm run gen-doc` script in the `package.json` of this project. If you want to install it locally you will have to adjust the script command before you can run it.

To develop and test you can use the `npm run test` script. This is not really a fully automated test, but it starts up a small http-server via `npx` and opens the the browser. The code is prepared to operate nicely with this setup.

As the page that opens with the `npm run test` command also states the output of the test script will be in the developer / JavaScript console of your browser...

### Directory structure

*(The table below only contains files that are required to run the solution; documentation, source control configuration and other "scaffolding" parts are not mentioned)*

|file|description|
|-|-|
| `.\index.html` | the example plage that also contains the test button |
| `.\css\primitive.css` | default styles used in the example page; not really needed |
| `.\js\slsc.js` | the Shared Local Storage Client code |
| `.\js\scripts.js` | the demo-code; showing how to wire up things and containing the test code |
| `.\store\index.html` | example Shared Local Storage Host usage |
| `.\store\slsh.js` | the actual Shared Local Storage Host code |

## Your custom setup

### Install the host

Make sure that the `slsh.js` is part of a simple website you can easily embed in a hidden `iframe`. To avoid any crazy loading times and overhead it's recommended to have one dedicated `html` file that has next to no content beside the *Shared Storage Host*. It's up to you if you want to do this in a subdirectory or an a separate subdomain of your system.

Before you publish the `slsh.js` make sure you add all origins that should be able to work with it to the `allowedOrigins` array. By default it contains only one element: `http://127.0.0.1:8080`.  
You have to adjust it to all origins you embed this in. And if you also just have one origin in there you should maybe consider to use native localStorage directly... ;-)

### Install the client

The client page needs two things in your using website: the `iframe` with the host and the actual client script.

#### The iframe

To be able to access the host it needs to be in an `iframe` that is part of the DOM of the using page (in theory you could also open it in a separate window or tab, but for better control the invisible iframe is recommended):

```html
<iframe id="sharedStorage" src="YOUR_HOST_URL" height="0" width="0"></iframe>
```

Replace *YOUR_HOST_URL* with the full URL to the page with the shared storage host...

#### The script

The client code is in the file `slsc.js`. All code is inside of a "namespace-object" called `sharedStorage`. So once you have loaded the script file you can access the client as part ov this object.

Similar to the host you need to define the origin (you really should do so, even if you can just set it to `*`). This is done via the `targetOrigin` member / property:

```javascript
sharedStorage.targetOrigin = 'YOUR_HOST_ORIGIN';
```

Replace *YOUR_HOST_ORIGIN* with the origin where you have set up the host.

Next you need to pass a reference to the ìframe`with the host to the client. Do this via

```javascript
sharedStorage.hostFrame = document.getElementById('sharedStorage');
```

Last but not least you have to add a message listener that reacts on the incoming replies from the host with

```javascript
window.addEventListener("message", sharedStorage.messageListener.bind(sharedStorage), false);
```

**Please make sure you use the `.messageListener.bind(sharedStorage)` and do not just pass the `.messageListener` function directly in there - else you will have broken `this` references inside of the shared storage client!**

Now you should be able to use the public methods that are part of the `sharedStorage` object.

## Difference to `localStorage`

When creating this we decided to have more explicit methods for set and update - instead of just overriding existing values with set. This way the process of updating something is more explicit - what hopefully helps to prevent from avoids accidental overrides...

To check what is already existing the client provides a `.getKeys()` method; you can use this one to find out if a key you want to set already exists and then use the according method (`.setValue()` or `.updateValue()`).

We also did not implement the `.clear()` method - similar to the update we want to make deletion of elements a more conscious thing as you may affect other sub-applications of your system...

## Known limits

- maximum of 1024 unanswered messages can be handled per instance
- the GUID generation of each instance is not really a fully blown GUID generator but should be good enough to run quite some instances in parallel
- there is no real concurrency; if you go too crazy regarding the sending frequency you may have issues with the internal conversation store that puts messages into and out of the array used for storing them
- if a user has multiple applications with shared storage operating on the same value at the same time you may face race conditions
