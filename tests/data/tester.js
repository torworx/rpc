exports = module.exports = (function() {

    var data = {
        res: "deleted"
    };

    var Tester = function() {

    };

    Tester.prototype.echo = function(req, res) {
        res.setHeader("Content-Type", "text/plain");
        var message = req.query.message || req.body.message;
        if (!message) {
            res.send("ERROR: message property not found");
        } else {
            res.send(message);
        }
    };

    Tester.prototype.echoJson = function(req, res) {
        if (!req.query['message']) {
            res.send("ERROR: message property not found");
        } else {
            res.setHeader("Content-Type", "application/json");
            res.send(req.query['message']);
        }
    };

    Tester.prototype.fakestore = function(req, res) {
        res.setHeader("Content-Type", "text/plain");
        var old, contents,
            location = req.query['location'] || req.body.location;
        location = (location+"").replace(/\W/, "");
        switch (req.method) {
            case "GET":
                if (req.session[location]) {
                    res.send(req.session[location]);
                } else {
                    res.send(data[location]);
                }
                break;
            case "PUT":
                contents = req.text;
                req.session[location] = contents;
                res.send(contents);
                break;
            case "POST":
                if (req.session[location]) {
                    old = req.session[location];
                } else {
                    old = data[location];
                }
                contents = req.text;
                req.session[location] = old + contents;
                res.send("OK");
                break;
            case "DELETE":
                req.session[location] = "deleted";
                res.send("OK");
                break;

        }
    };

    Tester.prototype.rawEcho = function(req, res) {
        res.setHeader("Content-Type", "application/json");
        res.send(req.body);
    };

    Tester.prototype.jsonpEcho = function(req, res) {
        res.setHeader("Content-Type", "application/json");
        var callback = req.query.testCallbackParam || req.body.testCallbackParam,
            message = req.query.message || req.body.message,
            jsonp = !!callback,
            result = '';
        if (jsonp) {
            result += callback + "('";
        }

        result += message ? message : "ERROR: message property not found";

        if (jsonp) {
            result += "');";
        }

        res.send(result);
    };

    Tester.prototype.jsonRpc10 = function(req, res) {
        res.setHeader("Content-Type", "application/json");
        var results = {
                error: null
            },
            _req = req.body;

        switch(_req.method) {
            case "postJsonRpc10EchoNamed":
                results['result']=_req.params[0].message;
                break;
            case "postJsonRpc10Echo":
                results['result']=_req.params[0];
                break;
            default:
                results['result']="";
                results['error']="JSON-RPC 1.0 METHOD NOT FOUND";
                break;
        }

        results['id'] = _req.id;

        res.send(results);
    };

    Tester.prototype.jsonRpc12 = function(req, res) {
        res.setHeader("Content-Type", "application/json");
        var results = {
                error: null
            },
            _req = req.body;

        switch(_req.method) {
            case "postJsonRpc12EchoNamed":
            case "postJsonRpc12Echo":
                if (_req.params instanceof Array) {
                    results['result']=_req.params[0];
                } else {
                    results['result'] = _req.params.message;
                }
                break;
            default:
                results['result']="";
                results['error'] = {
                    code: 32601,
                    message: "The requested remote-procedure does not exist / is not available."
                };
                res.setHeader("HTTP/1.1 500 Server Error");
                break;
        }

        results['id'] = _req.id;

        res.send(results);
    };

    return new Tester();

})();