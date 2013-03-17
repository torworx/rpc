rpc.js
==========

rpc.js is the zepto/jquery version of [dojox.rpc](http://livedocs.dojotoolkit.org/dojox/rpc). RPC, or remote procedure call, is a system for communicating with a backend using a variety of flexible transports, all wrapped around a single class called a Service.

### $.rpc.Service

$.rpc.Service is the foundation of most RPC transportation. To use a Service, you need an SMD. Defining the SMD is a separate discussion, so for now we'll reuse some pre-defined SMD's available in the RPC project's folder.

There are several transports/envelopes that are defined in separate modules to minimize the size of $.rpc.Service. These must also be loaded if they are used by the SMD:

* JSONP Transport
* REST transport
* JSON-RPC-2.0 and JSON-RPC-1.0 envelopes

All of the provided SMDLibrary SMD's are based on JSONP. If you define your own SMD with a local target endpoint, JSONP is not needed.

## Add Scripts and links to your HTML:

```
// assuming your /rpc is in js/
<script src="js/lib/jquery.min.js" type="text/javascript"></script>
<script src="js/rpc/rpc.min.js" type="text/javascript"></script>
```

### Using Zepto

By default, rpc.js uses jQuery (last tested against 1.9.1). If you need to use [Zepto.js](http://zeptojs.com/) which has a similar API to jQuery instead, simply replace the jquery.js script above with zepto, and use the zepto version of rpc.js:

## Starting a Service

Service is a constructor, returning a pointer to the API defined in the SMD.

```javascript
var goog = new $.rpc.Service("js/rpc/SMDLibrary/google.smd");
```
or using convenient method:
```javascript
var goog = $.rpc.service("js/rpc/SMDLibrary/google.smd");
```
If the argument passed to new Service() is an object, it is assumed to be the direct service definition:
```javascript
var goog = null;
$.ajax({
   url: "js/rpc/SMDLibrary/google.smd",
   dataType: "json",
   success: function(data){
       goog = $.rpc.service(data);
   }
});
```
## Using a Service

Service works around built in [Deferred](http://sudhirj.github.com/simply-deferred/) system, providing asynchronous communication around a familiar API. Once we've created our Service from an SMD, the methods defined in the SMD are available through the return handle provided.

```javascript
var goog = $.rpc.Service("js/rpc/SMDLibrary/google.smd");
goog.webSearch({ q:"jQuery rpc.js" }).then(function(err, data){
	if (err) {
    	// an error occurred. timeout, bad data, etc.
	} else {
    	// in this particular RPC call, the results you seek are:
        console.log(data.responseData.results);
    }
});
```
This will trigger a web search for the phrase "jQuery rpc.js", and fire your callback function when complete.

## Creating your own SMD
Please see the [SMD specification](http://dojotoolkit.org/reference-guide/1.8/dojox/rpc/smd.html) for a definition of the SMD format and how to define your own.