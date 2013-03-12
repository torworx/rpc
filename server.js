// Add server config to make testing easier.
var express = require('express');
var app = express();

app.use(express.static(__dirname));

app.listen(3000);