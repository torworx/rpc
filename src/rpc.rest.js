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
