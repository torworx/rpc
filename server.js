// Add server config to make testing easier.
var express = require('express');
var tester = require(__dirname + '/tests/data/tester');
var app = express();

app.set('view engine', 'ejs');
app.set('views', __dirname + '/tests/data');

app.use(express.cookieParser());
app.use(express.session({ secret: "secret" }));
app.use(function(req, res, next){
    if (req.is('text/*')) {
        req.text = '';
        req.setEncoding('utf8');
        req.on('data', function(chunk){ req.text += chunk });
        req.on('end', next);
    } else {
        next();
    }
});
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(__dirname));

var serviceHandler = function(req, res, next) {
    tester[req.params.service](req, res, next);
};

app.get('/api/:service', serviceHandler);
app.put('/api/:service', serviceHandler);
app.post('/api/:service', serviceHandler);
app.delete('/api/:service', serviceHandler);

app.listen(8999);