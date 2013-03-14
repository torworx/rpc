QUnit.config.testTimeout = 8000;

wikipediaService = $.rpc.service("../SMDLibrary/wikipedia.smd");

module("Wikipedia");

asyncTest("::parse", 1, function(){
    var wd = wikipediaService.query({
        action: "parse",
        page: "RPC"
    });
    wd.then(function(err, result) {
        console.log(result);
        ok(result.parse);
        start();
    });
});

asyncTest("::query", 1, function(){
    var wd = wikipediaService.query({
        action: "query",
        list: "search",
        srwhat: "text",
        srsearch: "RPC"
    });
    wd.then(function(err, result) {
        console.log(result);
        ok(result.query);
        start();
    });
});