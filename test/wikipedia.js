QUnit.config.testTimeout = 8000;

wikipediaService = new $.rpc.Service("../SMDLibrary/wikipedia.smd");

module("Wikipedia");

asyncTest("::parse", 1, function(){
    var wd = wikipediaService.query({
        action: "parse",
        page: "jQuery"
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
        srsearch: "jQuery"
    });
    wd.then(function(err, result) {
        console.log(result);
        ok(result.query);
        start();
    });
});