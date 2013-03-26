var service = $.rpc.service("data/test.smd");

var TESTS = {
        message: "Rpc Unit Tests."
    },
    res = "deleted";

module("Tests Echo Service");

asyncTest("#1 POST,URL,Named Parameters", 1, function(){
    service.postEcho({message: TESTS.message, foo: 2}).then(function(err, result) {
        console.log(result);
        equal(result, TESTS.message);
        start();
    });
});

asyncTest("#2 POST,URL,Ordered Parameters", 1, function(){
    service.postEcho(TESTS.message, 2).then(function(err, result) {
        console.log(result);
        equal(result, TESTS.message);
        start();
    });
});

asyncTest("#3 GET,URL,Named Parameters", 1, function(){
    service.postEcho({message: TESTS.message, foo: 2}).then(function(err, result) {
        console.log(result);
        equal(result, TESTS.message);
        start();
    });
});

asyncTest("#3.1 REST PUT,Named Parameters", 1, function(){
    res = TESTS.message + Math.random();
    //test when given named params
    service.restStore.put({location: "res"}, res).then(function(err, result) {
        service.restStore({location: "res"}).then(function(err, result) {
            console.log(result);
            equal(result, res);
            start();
        });
    });
});

asyncTest("#3.2 REST POST,Named Parameters", 1, function(){
    var newRes = TESTS.message + Math.random();
    res += newRes;
    //test when given named params
    service.restStore.post({location: "res"}, newRes).then(function(err, result) {
        service.restStore({location: "res"}).then(function(err, result) {
            console.log(result);
            equal(result, res);
            start();
        });
    });
});

asyncTest("#3.3 REST DELETE,Named Parameters", 1, function(){
    //test when given named params
    service.restStore["delete"]({location: "res"}).then(function(err, result) {
        service.restStore({location: "res"}).then(function(err, result) {
            console.log(result);
            equal(result, "deleted");
            start();
        });
    });
});

asyncTest("#3.4 GET,URL,Named Parameters, Returning Json", 1, function(){
    //test when given named params
    service.getEchoJson({message:'{"foo":"bar"}'}).then(function(err, result) {
            console.log(result);
            equal(result.foo, "bar");
            start();
    });
});

asyncTest("#3.5 GET,PATH,Named Parameters", 1, function(){
    //test when given named params
    service.getPathEcho({path: "pathname"}).then(function(err, result) {
        console.log(result);
        equal(result, "/path/pathname");
        start();
    });
});

asyncTest("#4.1 GET,URL,Ordered Parameters", 1, function(){
    //test when given named params                                              j
    service.getEcho(TESTS.message).then(function(err, result) {
        console.log(result);
        equal(result, TESTS.message);
        start();
    });
});

asyncTest("#4.2 Namespaced GET,URL,Ordered Parameters", 1, function(){
    //test when given named params
    service.namespace.getEcho(TESTS.message).then(function(err, result) {
        console.log(result);
        equal(result, TESTS.message);
        start();
    });
});

asyncTest("#5 POST,URL,Named Parameters", 1, function(){
    //test when given named params
    service.postJsonEcho({message: TESTS.message}).then(function(err, result) {
        console.log(result);
        ok(result && result.message && result.message==TESTS.message);
        start();
    });
});

asyncTest("#6 POST,JSON,Ordered Parameters", 1, function(){
    //test when given named params
    service.postJsonEcho(TESTS.message).then(function(err, result) {
        console.log(result);
        ok(result && result[0] && result[0]==TESTS.message);
        start();
    });
});

asyncTest("#7 JSONP,URL,Named Parameters", 1, function(){
    //test when given named params
    service.jsonpEcho({message: TESTS.message}).then(function(err, result) {
        console.log(result);
        equal(result, TESTS.message);
        start();
    });
});

asyncTest("#8 JSONP,URL, Ordered Parameters", 1, function(){
    //test when given named params
    service.jsonpEcho(TESTS.message).then(function(err, result) {
        console.log(result);
        equal(result, TESTS.message);
        start();
    });
});

asyncTest("#9 POST,JSON-RPC-1.0,Ordered Parameters", 1, function(){
    //test when given named params
    service.postJsonRpc10Echo(TESTS.message).then(function(err, result) {
        console.log(result);
        equal(result, TESTS.message);
        start();
    });
});

asyncTest("#10 POST,JSON-RPC-1.0,Named Parameters", 1, function(){
    //test when given named params
    service.postJsonRpc10EchoNamed({message: TESTS.message}).then(function(err, result) {
        console.log(result);
        equal(result, TESTS.message);
        start();
    });
});

asyncTest("#11 POST,JSON-RPC 2.0, Ordered Parameters", 1, function(){
    //test when given named params
    service.postJsonRpc12Echo(TESTS.message).then(function(err, result) {
        console.log(result);
        equal(result, TESTS.message);
        start();
    });
});

asyncTest("#12 POST,JSON-RPC 2.0, Named Parameters", 1, function(){
    //test when given named params
    service.postJsonRpc12Echo({message: TESTS.message}).then(function(err, result) {
        console.log(result);
        equal(result, TESTS.message);
        start();
    });
});

module("JsonRPC Forced Error");

asyncTest("POST,JSON-RPC 1.0, Ordered Parameters", 1, function(){
    //test when given named params
    service.postJsonRpc10ForcedError(TESTS.message).then(function(err, result) {
        console.log(err);
        ok(!!err);
        start();
    });
});

asyncTest("POST,JSON-RPC 2.0, Ordered Parameters", 1, function(){
    //test when given named params
    service.postJsonRpc12ForcedError(TESTS.message).then(function(err, result) {
        console.log(err);
        ok(!!err);
        start();
    });
});

asyncTest("POST,JSON-RPC 2.0, Named Parameters", 1, function(){
    //test when given named params
    service.postJsonRpc12ForcedError({message: TESTS.message}).then(function(err, result) {
        console.log(err);
        ok(!!err);
        start();
    });
});

