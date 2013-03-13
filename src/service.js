(function( $, undefined ) {

    var Service;
    $.rpc = $.rpc || {};

    Service = $.rpc.Service = function (smd, options) {
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
                    async: false
                }).done(function (data) {
                        // SMD format is not strict.
                        processSmd(eval('(' + data + ')'));
                    }).fail(function (err, textStatus, errorThrown) {
                        throw errorThrown;
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
                func = transport.getExecutor(func,method,this);
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
                sync: $.rpc._sync,
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
            var i;
            for(i=1; i< arguments.length; i++){
                args.push(arguments[i]);
            }
            var request = this._getRequest(method,args);
            var deferred = $.rpc.transportRegistry.match(request.transport).fire(request);
            var _deferred = $.Deferred();

            deferred.always(function(results, textStatus){
                _deferred.resolve(request._envDef.deserialize.call(this, results, (textStatus == "success")));
            });
            return _deferred;
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
    //                var d = dojo.toJson(data);

                return {
                    data: data,
                    dataType: 'json',
                    contentType : 'application/json'
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
                r.dataType = "jsonp";
                r.jsonp = r.callbackParamName || "callback";
                return $.ajax(r);
            }
        }
    );
    $.rpc.Service._nextId = 1;

})( jQuery );