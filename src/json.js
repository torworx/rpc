(function($) {
    "use strict";
    var _JSON,
        hasJSON = typeof JSON != "undefined",
    // Firefox 3.5/Gecko 1.9 fails to use replacer in stringify properly https://bugzilla.mozilla.org/show_bug.cgi?id=509184
        hasJSONStringify = hasJSON && JSON.stringify({a:0}, function(k,v){return v||1;}) == '{"a":1}';

    /*=====
     return {
     // summary:
     //		Functions to parse and serialize JSON

     parse: function(str, strict){
     // summary:
     //		Parses a [JSON](http://json.org) string to return a JavaScript object.
     // description:
     //		This function follows [native JSON API](https://developer.mozilla.org/en/JSON)
     //		Throws for invalid JSON strings. This delegates to eval() if native JSON
     //		support is not available. By default this will evaluate any valid JS expression.
     //		With the strict parameter set to true, the parser will ensure that only
     //		valid JSON strings are parsed (otherwise throwing an error). Without the strict
     //		parameter, the content passed to this method must come
     //		from a trusted source.
     // str:
     //		a string literal of a JSON item, for instance:
     //		`'{ "foo": [ "bar", 1, { "baz": "thud" } ] }'`
     // strict:
     //		When set to true, this will ensure that only valid, secure JSON is ever parsed.
     //		Make sure this is set to true for untrusted content. Note that on browsers/engines
     //		without native JSON support, setting this to true will run slower.
     },
     stringify: function(value, replacer, spacer){
     // summary:
     //		Returns a [JSON](http://json.org) serialization of an object.
     // description:
     //		Returns a [JSON](http://json.org) serialization of an object.
     //		This function follows [native JSON API](https://developer.mozilla.org/en/JSON)
     //		Note that this doesn't check for infinite recursion, so don't do that!
     // value:
     //		A value to be serialized.
     // replacer:
     //		A replacer function that is called for each value and can return a replacement
     // spacer:
     //		A spacer string to be used for pretty printing of JSON
     // example:
     //		simple serialization of a trivial object
     //	|	define(["dojo/json"], function(JSON){
     // |       var jsonStr = JSON.stringify({ howdy: "stranger!", isStrange: true });
     //	|		doh.is('{"howdy":"stranger!","isStrange":true}', jsonStr);
     }
     };
     =====*/

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
        // summary:
        //		Parses a JavaScript expression and returns a JavaScript value.
        // description:
        //		Throws for invalid JavaScript expressions. It does not use a strict JSON parser. It
        //		always delegates to eval(). The content passed to this method must therefore come
        //		from a trusted source.
        //		It is recommend that you use dojo/json's parse function for an
        //		implementation uses the (faster) native JSON parse when available.
        // js:
        //		a string literal of a JavaScript expression, for instance:
        //		`'{ "foo": [ "bar", 1, { "baz": "thud" } ] }'`

        return eval("(" + js + ")"); // Object
    };


    /*=====
     dojo._escapeString = function(){
     // summary:
     //		Adds escape sequences for non-visual characters, double quote and
     //		backslash and surrounds with double quotes to form a valid string
     //		literal.
     };
     =====*/
    var toJsonIndentStr = "\t";

    _JSON.toJson = function(/*Object*/ it, /*Boolean?*/ prettyPrint){
        // summary:
        //		Returns a [JSON](http://json.org) serialization of an object.
        // description:
        //		Returns a [JSON](http://json.org) serialization of an object.
        //		Note that this doesn't check for infinite recursion, so don't do that!
        //		It is recommend that you use dojo/json's stringify function for an lighter
        //		and faster implementation that matches the native JSON API and uses the
        //		native JSON serializer when available.
        // it:
        //		an object to be serialized. Objects may define their own
        //		serialization via a special "__json__" or "json" function
        //		property. If a specialized serializer has been defined, it will
        //		be used as a fallback.
        //		Note that in 1.6, toJson would serialize undefined, but this no longer supported
        //		since it is not supported by native JSON serializer.
        // prettyPrint:
        //		if true, we indent objects and arrays to make the output prettier.
        //		The variable `dojo.toJsonIndentStr` is used as the indent string --
        //		to use something other than the default (tab), change that variable
        //		before calling dojo.toJson().
        //		Note that if native JSON support is available, it will be used for serialization,
        //		and native implementations vary on the exact spacing used in pretty printing.
        // returns:
        //		A JSON string serialization of the passed-in object.
        // example:
        //		simple serialization of a trivial object
        //		|	var jsonStr = dojo.toJson({ howdy: "stranger!", isStrange: true });
        //		|	doh.is('{"howdy":"stranger!","isStrange":true}', jsonStr);
        // example:
        //		a custom serializer for an objects of a particular class:
        //		|	dojo.declare("Furby", null, {
        //		|		furbies: "are strange",
        //		|		furbyCount: 10,
        //		|		__json__: function(){
        //		|		},
        //		|	});

        // use dojo/json
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

    $.extend($.rpc, _JSON);
})(jQuery);
