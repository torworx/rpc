(function(rpc) {
    "use strict";

    var _JSON,
        hasJSON = typeof JSON != "undefined",
        // Firefox 3.5/Gecko 1.9 fails to use replacer in stringify properly https://bugzilla.mozilla.org/show_bug.cgi?id=509184
        hasJSONStringify = hasJSON && JSON.stringify({a:0}, function(k,v){return v||1;}) == '{"a":1}';

    if(hasJSONStringify){
        _JSON = {
            parse: JSON.parse,
            stringify: JSON.stringify
        };
    }else{
        var escapeString = function(/*String*/str){
            // summary:
            //		Adds escape sequences for non-visual characters, double quote and
            //		backslash and surrounds with double quotes to form a valid string
            //		literal.
            return ('"' + str.replace(/(["\\])/g, '\\$1') + '"').
                replace(/[\f]/g, "\\f").replace(/[\b]/g, "\\b").replace(/[\n]/g, "\\n").
                replace(/[\t]/g, "\\t").replace(/[\r]/g, "\\r"); // string
        };
        _JSON = {
            parse: hasJSON ? JSON.parse : function(str, strict){
                if(strict && !/^([\s\[\{]*(?:"(?:\\.|[^"])+"|-?\d[\d\.]*(?:[Ee][+-]?\d+)?|null|true|false|)[\s\]\}]*(?:,|:|$))+$/.test(str)){
                    throw new SyntaxError("Invalid characters in JSON");
                }
                return eval('(' + str + ')');
            },
            stringify: function(value, replacer, spacer){
                var undef;
                if(typeof replacer == "string"){
                    spacer = replacer;
                    replacer = null;
                }
                function stringify(it, indent, key){
                    if(replacer){
                        it = replacer(key, it);
                    }
                    var val, objtype = typeof it;
                    if(objtype == "number"){
                        return isFinite(it) ? it + "" : "null";
                    }
                    if(objtype == "boolean"){
                        return it + "";
                    }
                    if(it === null){
                        return "null";
                    }
                    if(typeof it == "string"){
                        return escapeString(it);
                    }
                    if(objtype == "function" || objtype == "undefined"){
                        return undef; // undefined
                    }
                    // short-circuit for objects that support "json" serialization
                    // if they return "self" then just pass-through...
                    if(typeof it.toJSON == "function"){
                        return stringify(it.toJSON(key), indent, key);
                    }
                    if(it instanceof Date){
                        return '"{FullYear}-{Month+}-{Date}T{Hours}:{Minutes}:{Seconds}Z"'.replace(/\{(\w+)(\+)?\}/g, function(t, prop, plus){
                            var num = it["getUTC" + prop]() + (plus ? 1 : 0);
                            return num < 10 ? "0" + num : num;
                        });
                    }
                    if(it.valueOf() !== it){
                        // primitive wrapper, try again unwrapped:
                        return stringify(it.valueOf(), indent, key);
                    }
                    var nextIndent= spacer ? (indent + spacer) : "";
                    /* we used to test for DOM nodes and throw, but FF serializes them as {}, so cross-browser consistency is probably not efficiently attainable */

                    var sep = spacer ? " " : "";
                    var newLine = spacer ? "\n" : "";

                    // array
                    if(it instanceof Array){
                        var itl = it.length, res = [];
                        for(key = 0; key < itl; key++){
                            var obj = it[key];
                            val = stringify(obj, nextIndent, key);
                            if(typeof val != "string"){
                                val = "null";
                            }
                            res.push(newLine + nextIndent + val);
                        }
                        return "[" + res.join(",") + newLine + indent + "]";
                    }
                    // generic object code path
                    var output = [];
                    for(key in it){
                        var keyStr;
                        if(it.hasOwnProperty(key)){
                            if(typeof key == "number"){
                                keyStr = '"' + key + '"';
                            }else if(typeof key == "string"){
                                keyStr = escapeString(key);
                            }else{
                                // skip non-string or number keys
                                continue;
                            }
                            val = stringify(it[key], nextIndent, key);
                            if(typeof val != "string"){
                                // skip non-serializable values
                                continue;
                            }
                            // At this point, the most non-IE browsers don't get in this branch
                            // (they have native JSON), so push is definitely the way to
                            output.push(newLine + nextIndent + keyStr + ":" + sep + val);
                        }
                    }
                    return "{" + output.join(",") + newLine + indent + "}"; // String
                }
                return stringify(value, "", "");
            }
        };
    }

    _JSON.fromJson = function(/*String*/ js){
        return eval("(" + js + ")"); // Object
    };

    var toJsonIndentStr = "\t";

    _JSON.toJson = function(/*Object*/ it, /*Boolean?*/ prettyPrint){

        return _JSON.stringify(it, function(key, value){
            if(value){
                var tf = value.__json__||value.json;
                if(typeof tf == "function"){
                    return tf.call(value);
                }
            }
            return value;
        }, prettyPrint && toJsonIndentStr);	// String
    };

    rpc.extend(rpc, _JSON);

})(rpc);
