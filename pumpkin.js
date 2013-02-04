define([
  'postal',
	'lib/sandbox'
],
function(
	postal,
	Sandbox
){  
    "use strict";
    
    var Pumpkin;

    Pumpkin.version = "0.01";
    
   	var App = Pumpkin.App = function(options){
   		// listen on app channel

   		var options = options || {};
   		var app_bus = options.app_bus || 'app';

   		this.channel = postal.channel(app_bus);
   		this.sandbox = Sandbox;

		this._startDate = new Date();   		

   		// bind to incoming messages on the app bus
   		this._bindToTopics(this._coreModuleTopics);
   		this._bindToTopics();
   	}

   	
   	_.extend(App.prototype,{
   		
   		_bindToTopics: function(specifc_topics){

   			var toBind = this.topics;

   			if (specifc_topics && typeof(specifc_topics) === "object") {
   				toBind = specifc_topics;
   			} else if(specifc_topics) {
   				// this._logError(da);
   				throw "topics passed to bind not correct";
   			}

   			for(var topic in toBind){

				var action = toBind[topic];
				
				if (this[action] && typeof(this[action])==="function") {
					this.channel.subscribe(topic, $.proxy(this[action],this));	
				} else {
					// this._logError();
					throw "Topic handler '"+action+"' not found";
				}

			}
   		},
   		_coreModuleTopics: {
   			"module.init":"_moduleInit",
   			"module.start":"_moduleStart",
   			"module.stop":"_moduleStop",
   			"module.render":"_moduleRender"
   		},
   		_moduleInit: function(data,topic){
   			try {
   				this.modules[data.module].init();
   			} catch(e) {
   				this._logError(data,topic);
   				throw "Module '"+data.module+"' failed to initialize";
   			}
   		},
   		_moduleStart: function(data,topic){
   			try {
   				this.modules[data.module].start();
   			} catch(e) {
   				this._logError(data,topic);
   				throw "Module '"+data.module+"' failed to start";
   			}
   		},
   		_moduleStop: function(data,topic){
   			try {
   				this.modules[data.module].stop();
   			} catch(e) {
   				this._logError(data,topic);
   				throw "Module '"+data.module+"' failed to stop";
   			}
   		},
   		_moduleRender: function(data,topic){
   			try {
   				this.modules[data.module].render();
   			} catch(e) {
   				this._logError(data,topic);
   				throw "Module '"+data.module+"' failed to render";
   			}
   		},
   		_logError: function(data,topic){
   			this.channel.publish('error',{data:data,topic: topic});
   		},
   		start: function(){
   			// this should be overriden with custom startup
   			
   		},
   		modules: {
   			// app modules here
   			// 'core','layout' types should be in a constants file @TODO
   		},
   		topics: {
   			// general app messages
   			// format: "topic.sub":"method_to_call"
   		}
   	});

	var Module = Pumpkin.Module = function(options){

	}

	_.extend(Module.prototype,{
		init: function(){},
		start: function(){},
		render: function(){},
		stop: function(){}
	});

	
    // from Backbone - https://github.com/documentcloud/backbone/blob/master/backbone.js#L1468
    //
    // Helper function to correctly set up the prototype chain, for subclasses.
  	// Similar to `goog.inherits`, but uses a hash of prototype properties and
	// class properties to be extended.
  	var extend = function(protoProps, staticProps) {
	    var parent = this;
	    var child;

	    // The constructor function for the new subclass is either defined by you
	    // (the "constructor" property in your `extend` definition), or defaulted
	    // by us to simply call the parent's constructor.
	    if (protoProps && _.has(protoProps, 'constructor')) {
      		child = protoProps.constructor;
	    } else {
	      	child = function(){ return parent.apply(this, arguments); };
	    }

	    // Add static properties to the constructor function, if supplied.
	    _.extend(child, parent, staticProps);

	    // Set the prototype chain to inherit from `parent`, without calling
	    // `parent`'s constructor function.
	    var Surrogate = function(){ this.constructor = child; };
	    Surrogate.prototype = parent.prototype;
	    child.prototype = new Surrogate;

	    // Add prototype properties (instance properties) to the subclass,
	    // if supplied.
	    if (protoProps) _.extend(child.prototype, protoProps);

	    // Set a convenience property in case the parent's prototype is needed
	    // later.
	    child.__super__ = parent.prototype;

	    return child;
  	};

	// Set up inheritance for the model, collection, router, view and history.
	App.extend = Module.extend = extend;

    
    return Pumpkin; 
});
