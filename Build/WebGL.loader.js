function createUnityInstance(e, r, t) {
    function n(e, t) {
        if (!n.aborted && r.showBanner) return "error" == t && (n.aborted = !0), r.showBanner(e, t);
        switch (t) {
            case "error":
                console.error(e);
                break;
            case "warning":
                console.warn(e);
                break;
            default:
                console.log(e)
        }
    }
 
    function o(e) {
        var r = e.reason || e.error,
            t = r ? r.toString() : e.message || e.reason || "",
            n = r && r.stack ? r.stack.toString() : "";
        if (n.startsWith(t) && (n = n.substring(t.length)), t += "\n" + n.trim(), t && c.stackTraceRegExp && c.stackTraceRegExp.test(t)) {
            var o = e.filename || r && (r.fileName || r.sourceURL) || "",
                a = e.lineno || r && (r.lineNumber || r.line) || 0;
            s(t, o, a)
        }
    }
 
    function a(e) {
        e.preventDefault()
    }
 
    function s(e, r, t) {
        if (e.indexOf("fullscreen error") == -1) {
            if (c.startupErrorHandler) return void c.startupErrorHandler(e, r, t);
            if (!(c.errorHandler && c.errorHandler(e, r, t) || (console.log("Invoking error handler due to\n" + e), "function" == typeof dump && dump("Invoking error handler due to\n" + e), s.didShowErrorMessage))) {
                var e = "An error occurred running the Unity content on this page. See your browser JavaScript console for more info. The error was:\n" + e;
                e.indexOf("DISABLE_EXCEPTION_CATCHING") != -1 ? e = "An exception has occurred, but exception handling has been disabled in this build. If you are the developer of this content, enable exceptions in your project WebGL player settings to be able to catch the exception or see the stack trace." : e.indexOf("Cannot enlarge memory arrays") != -1 ? e = "Out of memory. If you are the developer of this content, try allocating more memory to your WebGL build in the WebGL player settings." : e.indexOf("Invalid array buffer length") == -1 && e.indexOf("Invalid typed array length") == -1 && e.indexOf("out of memory") == -1 && e.indexOf("could not allocate memory") == -1 || (e = "The browser could not allocate enough memory for the WebGL content. If you are the developer of this content, try allocating less memory to your WebGL build in the WebGL player settings."), alert(e), s.didShowErrorMessage = !0
            }
        }
    }