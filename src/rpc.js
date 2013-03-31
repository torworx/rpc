(function (root) {

    var _rpc = root.rpc,
        arrayPrototype = Array.prototype,
        slice = arrayPrototype.slice,
        class2type = {},
        core_toString = class2type.toString,
        core_hasOwn = class2type.hasOwnProperty,
        rpc = function(smd, options){
            return new rpc.Service(smd, options);
        };

    function isWindow(obj) {
        return obj !== null && obj == obj.window;
    }

    function isObject(obj) {
        return type(obj) == "object";
    }


    function isPlainObject(obj) {
        // Must be an Object.
        // Because of IE, we also have to check the presence of the constructor property.
        // Make sure that DOM nodes and window objects don't pass through, as well
        if (!obj || type(obj) !== "object" || obj.nodeType || isWindow(obj)) {
            return false;
        }

        try {
            // Not own constructor property must be Object
            if (obj.constructor && !core_hasOwn.call(obj, "constructor") && !core_hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
                return false;
            }
        } catch (e) {
            // IE8,9 Will throw exceptions on certain host objects #9897
            return false;
        }

        // Own properties are enumerated firstly, so to speed up,
        // if last one is own, then all properties are own.

        var key;
        for (key in obj) {
        }

        return key === undefined || core_hasOwn.call(obj, key);
    }

    function isArray(value) {
        return value instanceof Array;
    }

    function likeArray(obj) {
        return typeof obj.length == 'number';
    }

    rpc.type = type;
    rpc.isPlainObject = isPlainObject;
    rpc.isWindow = isWindow;
    rpc.isObject = isObject;
    rpc.isArray = isArray;

    rpc.each = function (elements, callback) {
        var i, key;
        if (likeArray(elements)) {
            for (i = 0; i < elements.length; i++)
                if (callback.call(elements[i], i, elements[i]) === false) return elements;
        } else {
            for (key in elements)
                if (callback.call(elements[key], key, elements[key]) === false) return elements;
        }

        return elements;
    };

    // Populate the class2type map
    rpc.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function (i, name) {
        class2type[ "[object " + name + "]" ] = name.toLowerCase();
    });

    function type(obj) {
        return obj === null ? String(obj) :
            class2type[core_toString.call(obj)] || "object";
    }

    function extend(target, source, deep) {
        for (var key in source)
            if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
                if (isPlainObject(source[key]) && !isPlainObject(target[key]))
                    target[key] = {};
                if (isArray(source[key]) && !isArray(target[key]))
                    target[key] = [];
                extend(target[key], source[key], deep);
            }
            else if (source[key] !== undefined) target[key] = source[key];
    }

    // Copy all but undefined properties from one or more
    // objects to the `target` object.
    rpc.extend = function (target) {
        var deep, args = slice.call(arguments, 1);
        if (typeof target == 'boolean') {
            deep = target;
            target = args.shift();
        }
        args.forEach(function (arg) {
            extend(target, arg, deep);
        });
        return target;
    };

    var escape = encodeURIComponent;

    function serialize(params, obj, traditional, scope) {
        var type, array = $.isArray(obj);
        rpc.each(obj, function (key, value) {
            type = rpc.type(value);
            if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']';
            // handle data in serializeArray() format
            if (!scope && array) params.add(value.name, value.value);
            // recurse into nested objects
            else if (type == "array" || (!traditional && type == "object"))
                serialize(params, value, traditional, key);
            else params.add(key, value);
        });
    }

    rpc.param = function (obj, traditional) {
        var params = [];
        params.add = function (k, v) {
            this.push(escape(k) + '=' + escape(v));
        };
        serialize(params, obj, traditional);
        return params.join('&').replace(/%20/g, '+');
    };

    var _hitchArgs = function (scope, method) {
        var pre = slice.call(arguments, 2);
        var named = (type(method) === 'string');
        return function () {
            // arrayify arguments
            var args = slice.call(arguments);
            // locate our method
            var f = named ? (scope || root)[method] : method;
            // invoke with collected args
            return f && f.apply(scope || this, pre.concat(args)); // mixed
        }; // Function
    };

    var hitch = rpc.hitch = function (scope, method) {
        if (arguments.length > 2) {
            return _hitchArgs.apply(null, arguments); // Function
        }
        if (!method) {
            method = scope;
            scope = null;
        }
        if (type(method) === 'string') {
            scope = scope || root;
            if (!scope[method]) {
                throw(['hitch: scope["', method, '"] is null (scope="', scope, '")'].join(''));
            }
            return function () {
                return scope[method].apply(scope, arguments || []);
            }; // Function
        }
        return !scope ? method : function () {
            return method.apply(scope, arguments || []);
        }; // Function
    };

    var
        ore = new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?$"),
        ire = new RegExp("^((([^\\[:]+):)?([^@]+)@)?(\\[([^\\]]+)\\]|([^\\[:]*))(:([0-9]+))?$");

    var Url = rpc.Url = function () {
        var n = null,
            _a = arguments,
            uri = [_a[0]];
        // resolve uri components relative to each other
        for (var i = 1; i < _a.length; i++) {
            if (!_a[i]) {
                continue;
            }

            // Safari doesn't support this.constructor so we have to be explicit
            // FIXME: Tracked (and fixed) in Webkit bug 3537.
            //		http://bugs.webkit.org/show_bug.cgi?id=3537
            var relobj = new Url(_a[i] + ""),
                uriobj = new Url(uri[0] + "");

            if (
                relobj.path === "" && !relobj.scheme && !relobj.authority && !relobj.query
                ) {
                if (relobj.fragment != n) {
                    uriobj.fragment = relobj.fragment;
                }
                relobj = uriobj;
            } else if (!relobj.scheme) {
                relobj.scheme = uriobj.scheme;

                if (!relobj.authority) {
                    relobj.authority = uriobj.authority;

                    if (relobj.path.charAt(0) != "/") {
                        var path = uriobj.path.substring(0,
                            uriobj.path.lastIndexOf("/") + 1) + relobj.path;

                        var segs = path.split("/");
                        for (var j = 0; j < segs.length; j++) {
                            if (segs[j] == ".") {
                                // flatten "./" references
                                if (j == segs.length - 1) {
                                    segs[j] = "";
                                } else {
                                    segs.splice(j, 1);
                                    j--;
                                }
                            } else if (j > 0 && !(j == 1 && segs[0] === "") &&
                                segs[j] == ".." && segs[j - 1] != "..") {
                                // flatten "../" references
                                if (j == (segs.length - 1)) {
                                    segs.splice(j, 1);
                                    segs[j - 1] = "";
                                } else {
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
            if (relobj.scheme) {
                uri.push(relobj.scheme, ":");
            }
            if (relobj.authority) {
                uri.push("//", relobj.authority);
            }
            uri.push(relobj.path);
            if (relobj.query) {
                uri.push("?", relobj.query);
            }
            if (relobj.fragment) {
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

        if (this.authority != n) {
            // server based naming authority
            r = this.authority.match(ire);

            this.user = r[3] || n;
            this.password = r[4] || n;
            this.host = r[6] || r[7]; // ipv6 || ipv4
            this.port = r[9] || n;
        }
    };
    Url.prototype.toString = function () {
        return this.uri;
    };

    var AdapterRegistry = rpc.AdapterRegistry = function (/*Boolean?*/ returnWrappers) {
        this.pairs = [];
        this.returnWrappers = returnWrappers || false; // Boolean
    };

    rpc.extend(AdapterRegistry.prototype, {
        register: function (name, check, wrap, directReturn, override) {
            this.pairs[((override) ? "unshift" : "push")]([name, check, wrap, directReturn]);
        },

        match: function (/* ... */) {
            for (var i = 0; i < this.pairs.length; i++) {
                var pair = this.pairs[i];
                if (pair[1].apply(this, arguments)) {
                    if ((pair[3]) || (this.returnWrappers)) {
                        return pair[2];
                    } else {
                        return pair[2].apply(this, arguments);
                    }
                }
            }
            throw new Error("No match found for '" + arguments[0] + "'");
        },

        unregister: function (name) {
            // FIXME: this is kind of a dumb way to handle this. On a large
            // registry this will be slow-ish and we can use the name as a lookup
            // should we choose to trade memory for speed.
            for (var i = 0; i < this.pairs.length; i++) {
                var pair = this.pairs[i];
                if (pair[0] == name) {
                    this.pairs.splice(i, 1);
                    return true;
                }
            }
            return false;
        }
    });

    rpc.async = true;

    rpc.noConflict = function () {

        if (root.rpc === rpc) {
            root.rpc = _rpc;
        }

        return rpc;
    };

    rpc.ajax = function () {
        alert("No adapter has been installed.");
    };

    rpc.installInto = function(fw, noConflict) {
        fw.rpc = rpc;
        rpc.ajax = fw.ajax;
        if (noConflict) {
           rpc.noConflict();
        }
    };

    root.rpc = rpc;

})(window);