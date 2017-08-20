# AdvancedWebGLBrowserInteraction
This example project demonstrates advanced use of jslib in unity when interacting with browser through emscripten layer

You can learn basics of Unity <--> browser interaction here https://docs.unity3d.com/Manual/webgl-interactingwithbrowserscripting.html

This repository serves as an example how to set up more advanced communication
* Passing callback from c# to javascript so that we can call c# method directly instead of using SendMessage 
* Using methods with more than one parameter or methods with struct parameter
* Extracting texture data from WebGL context and displaying them in HTML image element


### Helpful links
- https://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html
- https://kripken.github.io/emscripten-site/docs/api_reference/module.html
- https://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#calling-compiled-c-functions-from-javascript-using-ccall-cwrap
- https://forum.unity3d.com/threads/c-jslib-2-way-communication.323629/
