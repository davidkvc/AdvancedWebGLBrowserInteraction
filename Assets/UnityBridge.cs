using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Runtime.InteropServices;
using System;
using System.Reflection;
using System.Linq;
using AOT;
using System.Runtime.CompilerServices;

[StructLayout(LayoutKind.Sequential)]
struct TextureData
{
    public IntPtr texturePtr;
    public int width;
    public int height;
}

public class UnityBridge : MonoBehaviour {

    static class Lib
    {
        // We can declare multiple RegisterCallback overloads each taking different callback type 
        // but all of them will point to the same jslib function
        [DllImport("__Internal")]
        public static extern void RegisterCallback(Action<IntPtr, int, bool, float> callback, string callbackName, string callbackSignature);
        [DllImport("__Internal")]
        public static extern void RegisterCallback(Action<int> callback, string callbackName, string callbackSignature);
        
        [DllImport("__Internal")]
        public static extern void RegisterTextureRetrieveCallback(Action<int, IntPtr> callback);
        [DllImport("__Internal")]
        public static extern void Initialize();
    }

    public Texture texture;

    private static UnityBridge Instance;

    private void Awake()
    {
        Instance = this;
    }

    void Start ()
    {
        RegisterCallback<Action<IntPtr, int, bool, float>>(Callback);
        RegisterCallback<Action<int>>(CallbackLow);

        if (texture == null)
        {
            Texture2D tex = new Texture2D(512, 512, TextureFormat.RGBA32, false);
            Color[] colors = new Color[512 * 512];
            for (int i = 0; i < colors.Length; i++)
                colors[i] = Color.red;
            tex.SetPixels(colors);
            tex.Apply(false, true);
            texture = tex;
        }

        Lib.RegisterTextureRetrieveCallback(GetTexturePointer);

        Lib.Initialize();
    }

    private static void RegisterCallback<T>(T callback, string functionName = null)
    {
        if (callback == null) throw new ArgumentNullException("callback");
        if(!typeof(Delegate).IsAssignableFrom(callback.GetType()))
        {
            throw new ArgumentException("callback must be of type Action or Action<...>", "callback");
        }
        MethodInfo method = callback.GetType().GetProperty("Method").GetValue(callback, null) as MethodInfo;
        bool isStatic = method.IsStatic;
        var attrs = method.GetCustomAttributes(typeof(MonoPInvokeCallbackAttribute), false);
        bool hasRequiredAttribute = attrs.Length == 1;
        var @params = method.GetParameters();
        //bool isValidParamType = paramType.IsValueType && !paramType.IsEnum && !paramType.IsPrimitive; //check if struct
        bool areParamsValid = @params.Length == 0 || @params.All(p =>
            p.ParameterType == typeof(int)
            || p.ParameterType == typeof(bool)
            || p.ParameterType == typeof(float)
            || p.ParameterType == typeof(double)
            || p.ParameterType == typeof(IntPtr));

        if (!isStatic)
        {
            throw new ArgumentException("callback must refer to static method", "callback");
        }
        if (!areParamsValid)
        {
            throw new ArgumentException("Only bool|IntPtr|int|float|double parameters are allowed", "callback");
        }
        if (!hasRequiredAttribute)
        {
            throw new ArgumentException("Method reffered to by callback must be decorated with MonoPInvokeCallback attribute", "callback");
        }

        string paramList = new string(@params.Select(p =>
            p.ParameterType == typeof(bool) ? 'b' :
            p.ParameterType == typeof(int) ? 'i' :
            p.ParameterType == typeof(float) ? 'f' :
            p.ParameterType == typeof(double) ? 'd' :
            p.ParameterType == typeof(IntPtr) ? 's' : 'x').ToArray());
        var registerMethod = typeof(Lib).GetMethods(BindingFlags.Static | BindingFlags.Public)
            .SingleOrDefault(m =>
            {
                var mp = m.GetParameters();
                return mp.Length > 0 && mp[0].ParameterType == callback.GetType();
            });

        if (registerMethod == null)
            throw new Exception("Could not find Lib callback registraction method with callback type " + callback.GetType());

        if (functionName == null)
            functionName = method.Name;

        registerMethod.Invoke(null, new object[] { callback, functionName, paramList });
    }

    [MonoPInvokeCallback(typeof(Action<int, IntPtr>))]
    private static void GetTexturePointer(int textureId, IntPtr texDataPtr)
    {
        TextureData texData = FindTexture(textureId);
        Marshal.StructureToPtr(texData, texDataPtr, false);
    }
    private static TextureData FindTexture(int textureId)
    {
        return new TextureData
        {
            texturePtr = Instance.texture.GetNativeTexturePtr(),
            width = Instance.texture.width,
            height = Instance.texture.height
        };
    }

    [MonoPInvokeCallback(typeof(Action<IntPtr, int, bool, float>))]
    private static void Callback(IntPtr dataPtr, int number, bool bol, float per)
    {
        string data = Marshal.PtrToStringAuto(dataPtr);
        Debug.Log(bol + ":" + number + ":" + data + ":" + per);
    }
    [MonoPInvokeCallback(typeof(Action<int>))]
    private static void CallbackLow(int number)
    {
        Debug.Log(number);
    }
}
