var UnityBridgeLib = {
    //$ here is important for emscripten and it gets stripped so we use it without $ elsewhere
    $UnityBridge: {},
    Initialize: function () {
        try {
            receiveCallback(UnityBridge);
        }
        catch (err) {
            console.error("Failed calling receiveCallback(obj). The error was: " + err);
        }
    },
    RegisterCallback: function (func, funcNamePtr, funcParamsPtr) {
        var funcName = Pointer_stringify(funcNamePtr);
        var funcParams = Pointer_stringify(funcParamsPtr);

        if(UnityBridge[funcName] !== undefined)
            console.warn("UnityBridge: Callback with name " + funcName + "is already registered. Overwriting." );

        for(var i = 0; i < funcParams.length; i++)
            if(funcParams[i] !== 'i' && funcParams[i] !== 'b' && funcParams[i] !== 's' && funcParams[i] !== 'f' && funcParams[i] !== 'd')
                throw "UnityBridge: Can not register callback because it required invalid parameter: " + funcParams[i];
        
        UnityBridge[funcName] = function () {
            if (arguments.length != funcParams.length)
                throw funcName + ": Arguments length mismatch. Expecting " + funcParams.length + " but got " + arguments.length;
            var signarute = "v"; //all callback have void return type
            var parameters = [];
            var pointersToFree = [];
            for (var i = 0; i < funcParams.length; i++) {
                if (arguments[i] === undefined)
                    throw funcName + ": Invalid arguments. At position " + i + " expecting " + funcParams[i] + " but got nothing";
                switch (funcParams[i]) {
                    case 'i':
                        if ((typeof arguments[i]) !== 'number')
                            throw funcName + ": Invalid argument. At position " + i + " excepting number but got " + (typeof arguments[i]);
                        signarute += 'i';
                        parameters.push(arguments[i]);
                        break;
                    case 'b':
                        if ((typeof arguments[i]) !== 'boolean')
                            throw funcName + ": Invalid argument. At position " + i + " excepting boolean but got " + (typeof arguments[i]);
                        signarute += 'i';
                        parameters.push(arguments[i]);
                        break;
                    case 's':
                        if ((typeof arguments[i]) !== 'string' && arguments[i] !== null)
                            throw funcName + ": Invalid argument. At position " + i + " excepting string or null but got " + (typeof arguments[i]);
                        signarute += 'i';
                        if (arguments[i] === null) {
                            parameters.push(null);
                        }
                        else {
                            var length = lengthBytesUTF8(arguments[i]) + 1;
                            var buffer = _malloc(length);
                            stringToUTF8(arguments[i], buffer, length);
                            parameters.push(buffer);
                            pointersToFree.push(buffer);
                        }
                        break;
                    case 'f':
                        if ((typeof arguments[i]) !== 'number')
                            throw funcName + ": Invalid argument. At position " + i + " excepting number but got " + (typeof arguments[i]);
                        signarute += 'f';
                        parameters.push(arguments[i]);
                        break;
                    case 'd':
                        if ((typeof arguments[i]) !== 'number')
                            throw funcName + ": Invalid argument. At position " + i + " excepting number but got " + (typeof arguments[i]);
                        signarute += 'd';
                        parameters.push(arguments[i]);
                        break;
                }
            }

            //vi here is callback signature 
            // - v is void return type
            // - i is one int pointer argument 
            //if not arguments then just v
            Runtime.dynCall(signarute, func, parameters);
            //if we use pointer as parameter to callback and not as a return object we need to free it manually
            for (var i = 0; i < pointersToFree.length; i++)
                _free(pointersToFree[i]);
        };

        console.log("Registered callback: " + funcName + " with params " + funcParams);
    },
    RegisterTextureRetrieveCallback : function(func) {
        UnityBridge.showImage = function(textureId) {
            var dta = _malloc(12);
            Runtime.dynCall('vii', func, [textureId, dta]);
            var texture = GL.textures[getValue(dta, 'i32')];
            var width = getValue(dta+4, 'i32');
            var height = getValue(dta+8, 'i32');
            _free(dta);

            //taken from https://stackoverflow.com/questions/8191083/can-one-easily-create-an-html-image-element-from-a-webgl-texture-object
            // Create a framebuffer backed by the texture
            var framebuffer = GLctx.createFramebuffer();
            GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, framebuffer);
            GLctx.framebufferTexture2D(GLctx.FRAMEBUFFER, GLctx.COLOR_ATTACHMENT0, GLctx.TEXTURE_2D, texture, 0);
    
            // Read the contents of the framebuffer
            var data = new Uint8Array(width * height * 4);
            GLctx.readPixels(0, 0, width, height, GLctx.RGBA, GLctx.UNSIGNED_BYTE, data);
    
            GLctx.deleteFramebuffer(framebuffer);
    
            console.log(data);
    
            // // Create a 2D canvas to store the result 
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var context = canvas.getContext('2d');
    
            // Copy the pixels to a 2D canvas
            var imageData = context.createImageData(width, height);
            imageData.data.set(data);
            context.putImageData(imageData, 0, 0);
    
            var img = document.createElement("img");
            img.src = canvas.toDataURL('image/jpeg', 1);
            document.body.appendChild(img);
            console.log(img);
        };
    }
};

// Tell emscripten that everyting in UnityBridgeLib depends on $UnityBridge
autoAddDeps(UnityBridgeLib, '$UnityBridge');
mergeInto(LibraryManager.library, UnityBridgeLib);
