(function( $, context ) {

    $.rpc = $.rpc || {};

    var arrayPrototype = Array.prototype,
        slice = arrayPrototype.slice;

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

    var hitch = $.rpc.hitch = function(scope, method){
        // summary:
        //		Returns a function that will only ever execute in the a given scope.
        //		This allows for easy use of object member functions
        //		in callbacks and other places in which the "this" keyword may
        //		otherwise not reference the expected scope.
        //		Any number of default positional arguments may be passed as parameters
        //		beyond "method".
        //		Each of these values will be used to "placehold" (similar to curry)
        //		for the hitched function.
        // scope: Object
        //		The scope to use when method executes. If method is a string,
        //		scope is also the object containing method.
        // method: Function|String...
        //		A function to be hitched to scope, or the name of the method in
        //		scope to be hitched.
        // example:
        //	|	lang.hitch(foo, "bar")();
        //		runs foo.bar() in the scope of foo
        // example:
        //	|	lang.hitch(foo, myFunction);
        //		returns a function that runs myFunction in the scope of foo
        // example:
        //		Expansion on the default positional arguments passed along from
        //		hitch. Passed args are mixed first, additional args after.
        //	|	var foo = { bar: function(a, b, c){ console.log(a, b, c); } };
        //	|	var fn = lang.hitch(foo, "bar", 1, 2);
        //	|	fn(3); // logs "1, 2, 3"
        // example:
        //	|	var foo = { bar: 2 };
        //	|	lang.hitch(foo, function(){ this.bar = 10; })();
        //		execute an anonymous function in scope of foo
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

    var Url = $.rpc.Url = function(){
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

    var AdapterRegistry = $.rpc.AdapterRegistry = function(/*Boolean?*/ returnWrappers){
        // summary:
        //		A registry to make contextual calling/searching easier.
        // description:
        //		Objects of this class keep list of arrays in the form [name, check,
        //		wrap, directReturn] that are used to determine what the contextual
        //		result of a set of checked arguments is. All check/wrap functions
        //		in this registry should be of the same arity.
        // example:
        //	|	// create a new registry
        //	|	var reg = new $.AdapterRegistry();
        //	|	reg.register("handleString",
        //	|		$.isString,
        //	|		function(str){
        //	|			// do something with the string here
        //	|		}
        //	|	);
        //	|	reg.register("handleArr",
        //	|		$.isArray,
        //	|		function(arr){
        //	|			// do something with the array here
        //	|		}
        //	|	);
        //	|
        //	|	// now we can pass reg.match() *either* an array or a string and
        //	|	// the value we pass will get handled by the right function
        //	|	reg.match("someValue"); // will call the first function
        //	|	reg.match(["someValue"]); // will call the second

        this.pairs = [];
        this.returnWrappers = returnWrappers || false; // Boolean
    };

    $.extend(AdapterRegistry.prototype, {
        register: function(name, check, wrap, directReturn, override){
            // summary:
            //		register a check function to determine if the wrap function or
            //		object gets selected
            // name:
            //		a way to identify this matcher.
            // check:
            //		a function that arguments are passed to from the adapter's
            //		match() function.  The check function should return true if the
            //		given arguments are appropriate for the wrap function.
            // directReturn:
            //		If directReturn is true, the value passed in for wrap will be
            //		returned instead of being called. Alternately, the
            //		AdapterRegistry can be set globally to "return not call" using
            //		the returnWrappers property. Either way, this behavior allows
            //		the registry to act as a "search" function instead of a
            //		function interception library.
            // override:
            //		If override is given and true, the check function will be given
            //		highest priority. Otherwise, it will be the lowest priority
            //		adapter.
            this.pairs[((override) ? "unshift" : "push")]([name, check, wrap, directReturn]);
        },

        match: function(/* ... */){
            // summary:
            //		Find an adapter for the given arguments. If no suitable adapter
            //		is found, throws an exception. match() accepts any number of
            //		arguments, all of which are passed to all matching functions
            //		from the registered pairs.
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
            throw new Error("No match found");
        },

        unregister: function(name){
            // summary:
            //		Remove a named adapter from the registry
            // name: String
            //		The name of the adapter.
            // returns: Boolean
            //		Returns true if operation is successful.
            //		Returns false if operation fails.

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

})( jQuery, this );