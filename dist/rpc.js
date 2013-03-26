(function( $, context ) {

    var arrayPrototype = Array.prototype,
        slice = arrayPrototype.slice;
    
    var rpc = {};

    var _hitchArgs = function(scope, method){
        var pre = slice.call(arguments, 2);
        var named = ($.type(method) === 'string');
        return function(){
            // arrayify arguments
            var args = slice.call(arguments);
            // locate our method
            var f = named ? (scope || context)[method] : method;
            // invoke with collected args
            return f && f.apply(scope || this, pre.concat(args)); // mixed
        }; // Function
    };

    var hitch = rpc.hitch = function(scope, method){
        if(arguments.length > 2){
            return _hitchArgs.apply(null, arguments); // Function
        }
        if(!method){
            method = scope;
            scope = null;
        }
        if($.type(method) === 'string'){
            scope = scope || context;
            if(!scope[method]){ throw(['hitch: scope["', method, '"] is null (scope="', scope, '")'].join('')); }
            return function(){ return scope[method].apply(scope, arguments || []); }; // Function
        }
        return !scope ? method : function(){ return method.apply(scope, arguments || []); }; // Function
    };

    var
        ore = new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?$"),
        ire = new RegExp("^((([^\\[:]+):)?([^@]+)@)?(\\[([^\\]]+)\\]|([^\\[:]*))(:([0-9]+))?$");

    var Url = rpc.Url = function(){
            var n = null,
                _a = arguments,
                uri = [_a[0]];
            // resolve uri components relative to each other
            for(var i = 1; i<_a.length; i++){
                if(!_a[i]){ continue; }

                // Safari doesn't support this.constructor so we have to be explicit
                // FIXME: Tracked (and fixed) in Webkit bug 3537.
                //		http://bugs.webkit.org/show_bug.cgi?id=3537
                var relobj = new Url(_a[i]+""),
                    uriobj = new Url(uri[0]+"");

                if(
                    relobj.path === "" &&
                        !relobj.scheme &&
                        !relobj.authority &&
                        !relobj.query
                    ){
                    if(relobj.fragment != n){
                        uriobj.fragment = relobj.fragment;
                    }
                    relobj = uriobj;
                }else if(!relobj.scheme){
                    relobj.scheme = uriobj.scheme;

                    if(!relobj.authority){
                        relobj.authority = uriobj.authority;

                        if(relobj.path.charAt(0) != "/"){
                            var path = uriobj.path.substring(0,
                                uriobj.path.lastIndexOf("/") + 1) + relobj.path;

                            var segs = path.split("/");
                            for(var j = 0; j < segs.length; j++){
                                if(segs[j] == "."){
                                    // flatten "./" references
                                    if(j == segs.length - 1){
                                        segs[j] = "";
                                    }else{
                                        segs.splice(j, 1);
                                        j--;
                                    }
                                }else if(j > 0 && !(j == 1 && segs[0] === "") &&
                                    segs[j] == ".." && segs[j-1] != ".."){
                                    // flatten "../" references
                                    if(j == (segs.length - 1)){
                                        segs.splice(j, 1);
                                        segs[j - 1] = "";
                                    }else{
                                        segs.splice(j - 1, 2);
                                        j -= 2;
                                    }
                                }
                            }
                            relobj.path = segs.join("/");
                        }
                    }
                }

                uri = [];
                if(relobj.scheme){
                    uri.push(relobj.scheme, ":");
                }
                if(relobj.authority){
                    uri.push("//", relobj.authority);
                }
                uri.push(relobj.path);
                if(relobj.query){
                    uri.push("?", relobj.query);
                }
                if(relobj.fragment){
                    uri.push("#", relobj.fragment);
                }
            }

            this.uri = uri.join("");

            // break the uri into its main components
            var r = this.uri.match(ore);

            this.scheme = r[2] || (r[1] ? "" : n);
            this.authority = r[4] || (r[3] ? "" : n);
            this.path = r[5]; // can never be undefined
            this.query = r[7] || (r[6] ? "" : n);
            this.fragment = r[9] || (r[8] ? "" : n);

            if(this.authority != n){
                // server based naming authority
                r = this.authority.match(ire);

                this.user = r[3] || n;
                this.password = r[4] || n;
                this.host = r[6] || r[7]; // ipv6 || ipv4
                this.port = r[9] || n;
            }
        };
    Url.prototype.toString = function(){ return this.uri; };

    var AdapterRegistry = rpc.AdapterRegistry = function(/*Boolean?*/ returnWrappers){
        this.pairs = [];
        this.returnWrappers = returnWrappers || false; // Boolean
    };

    $.extend(AdapterRegistry.prototype, {
        register: function(name, check, wrap, directReturn, override){
            this.pairs[((override) ? "unshift" : "push")]([name, check, wrap, directReturn]);
        },

        match: function(/* ... */){
            for(var i = 0; i < this.pairs.length; i++){
                var pair = this.pairs[i];
                if(pair[1].apply(this, arguments)){
                    if((pair[3])||(this.returnWrappers)){
                        return pair[2];
                    }else{
                        return pair[2].apply(this, arguments);
                    }
                }
            }
            throw new Error("No match found for '" + arguments[0] + "'");
        },

        unregister: function(name){
            // FIXME: this is kind of a dumb way to handle this. On a large
            // registry this will be slow-ish and we can use the name as a lookup
            // should we choose to trade memory for speed.
            for(var i = 0; i < this.pairs.length; i++){
                var pair = this.pairs[i];
                if(pair[0] == name){
                    this.pairs.splice(i, 1);
                    return true;
                }
            }
            return false;
        }
    });

    rpc.async = true;

    $.rpc = rpc;


})( $, window );
(function($) {
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

    $.extend($.rpc, _JSON);

})($);

// Generated by CoffeeScript 1.3.1

/*
 Simply Deferred - v.1.3.2
 (c) 2012 Sudhir Jonathan, contact.me@sudhirjonathan.com, MIT Licensed.
 Portions of this code are inspired and borrowed from Underscore.js (http://underscorejs.org/) (MIT License)
 */


(function($) {
    var Deferred, PENDING, REJECTED, RESOLVED, after, execute, flatten, has, isArguments, wrap, _when,
        __slice = [].slice;

    PENDING = "pending";

    RESOLVED = "resolved";

    REJECTED = "rejected";

    has = function(obj, prop) {
        return obj !== null ? obj.hasOwnProperty(prop) : void 0;
    };

    isArguments = function(obj) {
        return has(obj, 'length') && has(obj, 'callee');
    };

    flatten = function(array) {
        if (isArguments(array)) {
            return flatten(Array.prototype.slice.call(array));
        }
        if (!Array.isArray(array)) {
            return [array];
        }
        return array.reduce(function(memo, value) {
            if (Array.isArray(value)) {
                return memo.concat(flatten(value));
            }
            memo.push(value);
            return memo;
        }, []);
    };

    after = function(times, func) {
        if (times <= 0) {
            return func();
        }
        return function() {
            if (--times < 1) {
                return func.apply(this, arguments);
            }
        };
    };

    wrap = function(func, wrapper) {
        return function() {
            var args;
            args = [func].concat(Array.prototype.slice.call(arguments, 0));
            return wrapper.apply(this, args);
        };
    };

    execute = function(callbacks, args, context) {
        var callback, _i, _len, _ref, _results;
        _ref = flatten(callbacks);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            callback = _ref[_i];
            _results.push(callback.call.apply(callback, [context].concat(__slice.call(args))));
        }
        return _results;
    };

    Deferred = function() {
        var alwaysCallbacks, close, closingArguments, doneCallbacks, failCallbacks, state;
        state = PENDING;
        doneCallbacks = [];
        failCallbacks = [];
        alwaysCallbacks = [];
        closingArguments = {};
        this.promise = function(candidate) {
            var pipe, storeCallbacks;
            candidate = candidate || {};
            candidate.state = function() {
                return state;
            };
            storeCallbacks = function(shouldExecuteImmediately, holder) {
                return function() {
                    if (state === PENDING) {
                        holder.push.apply(holder, flatten(arguments));
                    }
                    if (shouldExecuteImmediately()) {
                        execute(arguments, closingArguments);
                    }
                    return candidate;
                };
            };
            pipe = function(doneFilter, failFilter) {
                var deferred, filter;
                deferred = new Deferred();
                filter = function(target, source, filter) {
                    if (filter) {
                        return target(function() {
                            return source(filter.apply(null, arguments));
                        });
                    } else {
                        return target(function() {
                            return source.apply(null, arguments);
                        });
                    }
                };
                filter(candidate.done, deferred.resolve, doneFilter);
                filter(candidate.fail, deferred.reject, failFilter);
                return deferred;
            };
            candidate.done = storeCallbacks((function() {
                return state === RESOLVED;
            }), doneCallbacks);
            candidate.fail = storeCallbacks((function() {
                return state === REJECTED;
            }), failCallbacks);
            candidate.always = storeCallbacks((function() {
                return state !== PENDING;
            }), alwaysCallbacks);
            candidate.pipe = pipe;
            candidate.then = pipe;
            return candidate;
        };
        this.promise(this);
        close = function(finalState, callbacks, context) {
            return function() {
                if (state === PENDING) {
                    state = finalState;
                    closingArguments = arguments;
                    execute([callbacks, alwaysCallbacks], closingArguments, context);
                }
                return this;
            };
        };
        this.resolve = close(RESOLVED, doneCallbacks);
        this.reject = close(REJECTED, failCallbacks);
        this.resolveWith = function() {
            var args, context;
            context = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
            return close(RESOLVED, doneCallbacks, context).apply(null, args);
        };
        this.rejectWith = function() {
            var args, context;
            context = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
            return close(REJECTED, failCallbacks, context).apply(null, args);
        };
        return this;
    };

    _when = function() {
        var def, defs, finish, errfn, trigger, _i, _j, _len, _len1;
        trigger = new Deferred();
        defs = flatten(arguments);
        finish = after(defs.length, trigger.resolve);
        for (_i = 0, _len = defs.length; _i < _len; _i++) {
            def = defs[_i];
            def.done(finish);
        }
        errfn = function() {
            return trigger.reject();
        };
        for (_j = 0, _len1 = defs.length; _j < _len1; _j++) {
            def = defs[_j];
            def.fail(errfn);
        }
        return trigger.promise();
    };

    $.rpc.Deferred = function() {
        return new Deferred();
    };
    $.rpc.Deferred.when = _when;

})($);
(function( $, undefined ) {

    var Service = $.rpc.Service = function (smd, options) {
        // summary:
        //		Take a string as a url to retrieve an smd or an object that is an smd or partial smd to use
        //		as a definition for the service
        // description:
        //		$.rpc.Service must be loaded prior to any plugin services like $.rpc.Rest
        //		$.rpc.JsonRpc in order for them to register themselves, otherwise you get
        //		a "No match found" error.
        // smd: object
        //		Takes a number of properties as kwArgs for defining the service.  It also
        //		accepts a string.  When passed a string, it is treated as a url from
        //		which it should synchronously retrieve an smd file.  Otherwise it is a kwArgs
        //		object.  It accepts serviceUrl, to manually define a url for the rpc service
        //		allowing the rpc system to be used without an smd definition. strictArgChecks
        //		forces the system to verify that the # of arguments provided in a call
        //		matches those defined in the smd.  smdString allows a developer to pass
        //		a jsonString directly, which will be converted into an object or alternatively
        //		smdObject is accepts an smdObject directly.

        var url;
        var self = this;

        function processSmd(smd) {
            var pieces;
            smd._baseUrl = new $.rpc.Url(location.href, url || '.') + "";
            self._smd = smd;

            //generate the methods
            for (var serviceName in self._smd.services) {
                pieces = serviceName.split("."); // handle "namespaced" services by breaking apart by .
                var current = self;
                for (var i = 0; i < pieces.length - 1; i++) {
                    // create or reuse each object as we go down the chain
                    current = current[pieces[i]] || (current[pieces[i]] = {});
                }
                current[pieces[pieces.length - 1]] = self._generateService(serviceName, self._smd.services[serviceName]);
            }
        }

        if (smd) {
            //ifthe arg is a string, we assume it is a url to retrieve an smd definition from
            if (($.type(smd) === 'string') || (smd instanceof $.rpc.Url)) {
                if (smd instanceof $.rpc.Url) {
                    url = smd + "";
                } else {
                    url = smd;
                }

                $.ajax({
                    url: url,
                    async: false,
                    success: function (data) {
                        // SMD format is not strict.
                        processSmd($.rpc.fromJson(data));
                    },
                    error: function (err, textStatus, errorThrown) {
                        throw errorThrown;
                    }
                });

            } else {
                processSmd(smd);
            }
        }

        this._options = (options ? options : {});
        this._requestId = 0;
    };

    $.extend(Service.prototype, {

        _generateService: function(serviceName, method){
            if(this[method]){
                throw new Error("WARNING: "+ serviceName+ " already exists for service. Unable to generate function");
            }
            method.name = serviceName;
            var func = $.rpc.hitch(this, "_executeMethod", method);
            var transport = $.rpc.transportRegistry.match(method.transport || this._smd.transport);
            if(transport.getExecutor){
                func = transport.getExecutor(func, method, this);
            }
            var schema = method.returns || (method._schema = {}); // define the schema
            var servicePath = '/' + serviceName +'/';
            // schemas are minimally used to track the id prefixes for the different services
            schema._service = func;
            func.servicePath = servicePath;
            func._schema = schema;
            func.id = $.rpc.Service._nextId++;
            return func;
        },
        _getRequest: function(method,args){
            var smd = this._smd;
            var envDef = $.rpc.envelopeRegistry.match(method.envelope || smd.envelope || "NONE");
            var parameters = (method.parameters || []).concat(smd.parameters || []);
            var i, j;
            if(envDef.namedParams){
                // the serializer is expecting named params
                if((args.length==1) && $.isPlainObject(args[0])){
                    // looks like we have what we want
                    args = args[0];
                }else{
                    // they provided ordered, must convert
                    var data={};
                    for(i=0;i<method.parameters.length;i++){
                        if(typeof args[i] != "undefined" || !method.parameters[i].optional){
                            data[method.parameters[i].name]=args[i];
                        }
                    }
                    args = data;
                }
                if(method.strictParameters||smd.strictParameters){
                    //remove any properties that were not defined

                    for(i in args){
                        var found=false;
                        for(j=0; j<parameters.length;j++){
                            if(parameters[i].name==i){ found=true; }
                        }
                        if(!found){
                            delete args[i];
                        }
                    }

                }
                // setting default values
                for(i=0; i< parameters.length; i++){
                    var param = parameters[i];
                    if(!param.optional && param.name && !args[param.name]){
                        if(param["default"]){
                            args[param.name] = param["default"];
                        }else if(!(param.name in args)){
                            throw new Error("Required parameter " + param.name + " was omitted");
                        }
                    }
                }
            }else if(parameters && parameters[0] && parameters[0].name && (args.length==1) && $.isPlainObject(args[0])){
                // looks like named params, we will convert
                if(envDef.namedParams === false){
                    // the serializer is expecting ordered params, must be ordered
                    args = $.rpc.toOrdered(parameters, args);
                }else{
                    // named is ok
                    args = args[0];
                }
            }

            if($.isPlainObject(this._options)){
                args = $.extend(args, this._options);
            }

            var schema = method._schema || method.returns; // serialize with the right schema for the context;
            var request = envDef.serialize.apply(this, [smd, method, args]);
            request._envDef = envDef;// save this for executeMethod
            var contentType = (method.contentType || smd.contentType || request.contentType);

            // this allows to mandate synchronous behavior from elsewhere when necessary, this may need to be changed to be one-shot in FF3 new sync handling model
            return $.extend(request, {
                async: $.rpc.async,
                contentType: contentType,
                headers: method.headers || smd.headers || request.headers || {},
                target: request.target || $.rpc.getTarget(smd, method),
                transport: method.transport || smd.transport || request.transport,
                envelope: method.envelope || smd.envelope || request.envelope,
                timeout: method.timeout || smd.timeout,
                callbackParamName: method.callbackParamName || smd.callbackParamName,
                rpcObjectParamName: method.rpcObjectParamName || smd.rpcObjectParamName,
                schema: schema,
                handleAs: request.handleAs || "auto",
                preventCache: method.preventCache || smd.preventCache,
                frameDoc: this._options.frameDoc || undefined
            });
        },
        _executeMethod: function(method){
            var args = [];

            for(var i=1; i< arguments.length; i++){
                args.push(arguments[i]);
            }
            var request = this._getRequest(method,args),
                deferred = $.rpc.Deferred();

            $.rpc.transportRegistry.match(request.transport).fire($.extend({}, request, {
                success: function(results){
                    var r = request._envDef.deserialize.call(this, results);
                    if (r instanceof Error) {
                        deferred.resolve(r, null);
                    } else {
                        deferred.resolve(null, r);
                    }
                },
                error: function(jqXHR, textStatus, errorThrown){
                    deferred.resolve(errorThrown, null);
                }
            }));

            return deferred;
        }

    });


    $.rpc.getTarget = function(smd, method){
        var dest=smd._baseUrl;
        if(smd.target){
            dest = new $.rpc.Url(dest,smd.target) + '';
        }
        if(method.target){
            dest = new $.rpc.Url(dest,method.target) + '';
        }
        return dest;
    };

    $.rpc.toOrdered=function(parameters, args){
        if($.type(args)==='array'){ return args; }
        var data=[];
        for(var i=0;i<parameters.length;i++){
            data.push(args[parameters[i].name]);
        }
        return data;
    };

    $.rpc.transportRegistry = new $.rpc.AdapterRegistry(true);
    $.rpc.envelopeRegistry = new $.rpc.AdapterRegistry(true);
    //Built In Envelopes

    $.rpc.envelopeRegistry.register(
        "URL",
        function(str){ return str == "URL"; },
        {
            serialize:function(smd, method, data ){
                var d = $.param(data);
                return {
                    data: d,
                    transport:"POST"
                };
            },
            deserialize:function(results){
                return results;
            },
            namedParams: true
        }
    );

    $.rpc.envelopeRegistry.register(
        "JSON",
        function(str){ return str == "JSON"; },
        {
            serialize: function(smd, method, data){
                var d = $.rpc.toJson(data);

                return {
                    data: d,
                    dataType: 'json',
                    contentType : 'application/json; charset=utf-8'
                };
            },
            deserialize: function(results){
                return results;
            }
        }
    );
    $.rpc.envelopeRegistry.register(
        "PATH",
        function(str){ return str == "PATH"; },
        {
            serialize:function(smd, method, data){
                var i;
                var target = $.rpc.getTarget(smd, method);
                if($.type(data)==='array'){
                    for(i = 0; i < data.length;i++){
                        target += '/' + data[i];
                    }
                }else{
                    for(i in data){
                        target += '/' + i + '/' + data[i];
                    }
                }

                return {
                    data:'',
                    target: target
                };
            },
            deserialize:function(results){
                return results;
            }
        }
    );

    //post is registered first because it is the default;
    $.rpc.transportRegistry.register(
        "POST",
        function(str){ return str == "POST"; },
        {
            fire:function(r){
                r.url = r.target;
                r.type="POST";
                return $.ajax(r);
            }
        }
    );

    $.rpc.transportRegistry.register(
        "GET",
        function(str){ return str == "GET"; },
        {
            fire: function(r){
                r.url=  r.target + (r.data ? '?' + ((r.rpcObjectParamName) ? r.rpcObjectParamName + '=' : '') + r.data : '');
                r.type="GET";
                r.data = '';
                return $.ajax(r);
            }
        }
    );


    //only works ifyou include dojo.io.script
    $.rpc.transportRegistry.register(
        "JSONP",
        function(str){ return str == "JSONP"; },
        {
            fire: function(r){
                r.url = r.target + ((r.target.indexOf("?") == -1) ? '?' : '&') + ((r.rpcObjectParamName) ? r.rpcObjectParamName + '=' : '') + r.data;
                r.data = '';
                r.dataType = "jsonp";
                r.jsonp = r.callbackParamName || "callback";
                return $.ajax(r);
            }
        }
    );
    $.rpc.Service._nextId = 1;

    $.rpc.service = function(smd, options) {
        return new Service(smd, options);
    };

})( $ );
(function($) {
// Note: This doesn't require dojox.rpc.Service, and if you want it you must require it
// yourself, and you must load it prior to dojox.rpc.Rest.

//    dojo.getObject("rpc.Rest", true, dojox);

    if ($.rpc && $.rpc.transportRegistry) {
        // register it as an RPC service if the registry is available
        $.rpc.transportRegistry.register(
            "REST",
            function (str) {
                return str == "REST";
            },
            {
                getExecutor: function (func, method, svc) {
                    return new $.rpc.Rest(
                        method.name,
                        (method.contentType || svc._smd.contentType || "").match(/json|javascript/), // isJson
                        null,
                        function (id, args) {
                            var request = svc._getRequest(method, []);
                            request.url = request.target + (id ? '?' + $.param(id) : '');
                            if (args && (args.start >= 0 || args.count >= 0)) {
                                request.headers = request.headers || {};
                                request.headers.Range = "items=" + (args.start || '0') + '-' +
                                    (("count" in args && args.count != Infinity) ?
                                        (args.count + (args.start || 0) - 1) : '');
                            }
                            return request;
                        }
                    );
                }
            }
        );
    }
    var drr;

    function index(method, request, service, range, id) {
        var d = $.rpc.Deferred(),
            o = {
                type: method,
                success: function(data, textStatus, jqXHR) {
                    if (range) {
                        // try to record the total number of items from the range header
                        range = jqXHR.getResponseHeader("Content-Range");
                        d.fullLength = range && (range = range.match(/\/(.*)/)) && parseInt(range[1], 0);
                    }
                    d.resolve(null, data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    d.resolve(errorThrown, null);
                }
            };
        $.ajax($.extend(o, request));
        return d;
    }

    drr = $.rpc.Rest = function (/*String*/path, /*Boolean?*/isJson, /*Object?*/schema, /*Function?*/getRequest) {
        // summary:
        //		This provides a HTTP REST service with full range REST verbs include PUT,POST, and DELETE.
        // description:
        //		A normal GET query is done by using the service directly:
        //		| var restService = dojox.rpc.Rest("Project");
        //		| restService("4");
        //		This will do a GET for the URL "/Project/4".
        //		| restService.put("4","new content");
        //		This will do a PUT to the URL "/Project/4" with the content of "new content".
        //		You can also use the SMD service to generate a REST service:
        //		| var services = dojox.rpc.Service({services: {myRestService: {transport: "REST",...
        //		| services.myRestService("parameters");
        //
        //		The modifying methods can be called as sub-methods of the rest service method like:
        //		| services.myRestService.put("parameters","data to put in resource");
        //		| services.myRestService.post("parameters","data to post to the resource");
        //		| services.myRestService['delete']("parameters");

        var service;
        // it should be in the form /Table/
        service = function (id, args) {
            return drr._get(service, id, args);
        };
        service.isJson = isJson;
        service._schema = schema;
        // cache:
        //		This is an object that provides indexing service
        //		This can be overriden to take advantage of more complex referencing/indexing
        //		schemes
        service.cache = {
            serialize: isJson ? $.rpc.toJson : function (result) {
                return result;
            }
        };
        // the default XHR args creator:
        service._getRequest = getRequest || function (id, args) {
            if ($.isPlainObject(id)) {
                id = $.param(id);
                id = id ? "?" + id : "";
            }
            if (args && args.sort && !args.queryStr) {
                id += (id ? "&" : "?") + "sort(";
                for (var i = 0; i < args.sort.length; i++) {
                    var sort = args.sort[i];
                    id += (i > 0 ? "," : "") + (sort.descending ? '-' : '+') + encodeURIComponent(sort.attribute);
                }
                id += ")";
            }
            var request = {
                url: path + (id === null ? "" : id),
                dataType: isJson ? 'json' : 'text',
                contentType: isJson ? 'application/json' : 'text/plain',
                async: $.rpc.async,
                headers: {
                    Accept: isJson ? 'application/json,application/javascript' : '*/*'
                }
            };
            if (args && (args.start >= 0 || args.count >= 0)) {
                request.headers.Range = "items=" + (args.start || '0') + '-' +
                    (("count" in args && args.count != Infinity) ?
                        (args.count + (args.start || 0) - 1) : '');
            }
//            $.rpc.async = true;
            return request;
        };
        // each calls the event handler
        function makeRest(name) {
            service[name] = function (id, content) {
                return drr._change(name, service, id, content); // the last parameter is to let the OfflineRest know where to store the item
            };
        }

        makeRest('put');
        makeRest('post');
        makeRest('delete');
        // record the REST services for later lookup
        service.servicePath = path;
        return service;
    };

    drr._index = {};// the map of all indexed objects that have gone through REST processing
    drr._timeStamps = {};
    // these do the actual requests
    drr._change = function (method, service, id, content) {
        // this is called to actually do the put, post, and delete
        var request = service._getRequest(id, content);
        request.data = content;
        return index(method.toUpperCase(), request, service);
    };

    drr._get = function (service, id, args) {
        args = args || {};
        // this is called to actually do the get
        return index("GET", service._getRequest(id, args), service, (args.start >= 0 || args.count >= 0), id);
    };

    return drr;
})($);

(function( $ ) {

    function jsonRpcEnvelope(version){
        return {
            serialize: function(smd, method, data, options){
                //not converted to json it self. This  will be done, if
                //appropriate, at the transport level

                var d = {
                    id: this._requestId++,
                    method: method.name,
                    params: data
                };
                if(version){
                    d.jsonrpc = version;
                }
                return {
                    data: $.rpc.toJson(d),
                    dataType:'json',
                    contentType: 'application/json; charset=utf-8',
                    transport:"POST"
                };
            },

            deserialize: function(obj){
                if(obj.error) {
                    var e = new Error(obj.error.message || obj.error);
                    e._rpcErrorObject = obj.error;
                    return e;
                }
                return obj.result;
            }
        };
    }
    $.rpc.envelopeRegistry.register(
        "JSON-RPC-1.0",
        function(str){
            return str == "JSON-RPC-1.0";
        },
        $.extend({namedParams:false}, jsonRpcEnvelope()) // 1.0 will only work with ordered params
    );

    $.rpc.envelopeRegistry.register(
        "JSON-RPC-2.0",
        function(str){
            return str == "JSON-RPC-2.0";
        },
        jsonRpcEnvelope("2.0")
    );
})( $ );