(function( $, undefined ) {

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

            deserialize: function(obj, success){
                if (!success){
                    if (!obj.responseText) {
                        return obj;
                    }
                    obj = $.parseJSON(obj.responseText);
                }

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
})( jQuery );