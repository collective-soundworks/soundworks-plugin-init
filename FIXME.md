```
Service.js:175 Uncaught (in promise) Error: service "platform" cannot be "ready" twice
    at Platform.ready (Service.js:175)
    at Platform._callee2$ (service-platform.js:270)
    at tryCatch (runtime.js:45)
    at Generator.invoke [as _invoke] (runtime.js:271)
    at Generator.prototype.<computed> [as next] (runtime.js:97)
    at asyncGeneratorStep (player.js:6)
    at _next (player.js:28)
```

`onUserGesture` should prevent to be called twice

> to be fixed in template too...

// sometimes blocked into "initializing state"...
