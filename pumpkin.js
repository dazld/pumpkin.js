define([
	'postal',
	'backbone'
],
function(
	postal,
	Backbone
){  
	"use strict";
	
	var Events = Backbone.Events;

	var Pumpkin = {},
		Sandbox = {}; // dirty hacks <3

	Pumpkin.version = "0.01";

	var App = Pumpkin.App = function(options){
		
		var options = options || {};
		this.sandbox = Sandbox;
		this.sandbox.module_channel = postal.channel('module');
		this.channel = this.sandbox.app_channel = postal.channel('app');
		
		
		
		this._startDate = new Date();   		


		// bind to incoming messages on the app bus
		this._bindToTopics(this._coreModuleTopics, this.sandbox.module_channel);
		this._bindToTopics(this.topics, this.channel);

		
		this.channel.publish('app.instanced');
		this._bootModules();
		

		// look for routes and startup appropriate module


	}

	
	_.extend(App.prototype,{

		_bootModules: function(){

			// cycle through modules and set the instances
			for(var module in this.modules){
				try{
					this.modules[module] = new this.modules[module]();
				}catch(e){
					throw 'Module "'+module+'" did not instance properly';
				}
			}
		},

		_bindToTopics: function(specific_topics, channel){

			var toBind = {},
				toBindChannel =  channel || this.channel;


			if (specific_topics && typeof(specific_topics) === "object") {
				toBind = specific_topics;
			} else if(specific_topics) {
				// this._logError(da);
				throw "topics passed to bind not correct";
			}

			for(var topic in toBind){

				var action = toBind[topic];
				
				if (this[action] && typeof(this[action])==="function") {
					toBindChannel.subscribe(topic, this[action]).withContext(this);
				} else {
					// this._logError();
					throw "Topic handler '"+action+"' not found";
				}

			}
		},
		// topic handlers
		_coreModuleTopics: {
			"init":"_moduleInit",
			"start":"_moduleStart",
			"stop":"_moduleStop",
			"render":"_moduleRender"
		},
		_moduleInit: function(data,topic){
			this.modules[data.module].init();
			try {
				
			} catch(e) {
				this._logError(data,topic,e);
				throw "Module '"+data.module+"' failed to initialize";
			}
		},
		_moduleStart: function(data,topic){
			// stop previous module

			var current = this.current_module;

			try {
				if (current) {
					this.modules[current].stop();
				};
				
				this.modules[data.module].start(data);
				this.current_module = data.module;
			} catch(e) {
				this._logError(data,topic,e);
				throw "Module '"+data.module+"' failed to start";
			}
		},
		_moduleStop: function(data,topic){
			try {
				this.modules[data.module].stop();
			} catch(e) {
				this._logError(data,topic,e);
				throw "Module '"+data.module+"' failed to stop";
			}
		},
		_moduleRender: function(data,topic){
			try {
				this.modules[data.module].render();
			} catch(e) {
				this._logError(data,topic,e);
				throw "Module '"+data.module+"' failed to render";
			}
		},
		_logError: function(data,topic,e){
			this.channel.publish('error',{data:data,topic: topic},e);
		},
		start: function(){
			// this should be overriden with custom startup
			throw 'oops should be overriden';
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

	

	/**/

	var Module = Pumpkin.Module = function(options){

		this.sandbox = Sandbox;
		this.channel = this.sandbox.app_channel;
		this._bindToTopics(this.topics, this.channel);
		this.channel.publish('module.instanced',{name:this._name});
	}

	_.extend(Module.prototype,{
		_name: 'Module',
		type: 'layout',
		el: false,
		$el: false,
		data: {},
		template: false,
		bindEvents: function(){

			for(var evt in this.events){

				var action = this.events[evt];
				
				// split into the action and target
				var split = evt.split(' ');
				this.$el.off(split[0],split[1]).on(split[0],split[1],$.proxy(this[action],this));
				//this.$el.find(split[1]).delegate(split[0],$.proxy(this[action],this));

			}
		},
		init: function(){
			
		},
		start: function(data){
			
		},
		render: function(){
			
		},
		stop: function(){
			
		},
		topics: {

		},
		_bindToTopics: function(specific_topics,channel){

			var toBind = {},
				toBindChannel =  channel || this.channel;


			if (specific_topics && typeof(specific_topics) === "object") {
				toBind = specific_topics;
			} else if(specific_topics) {
				// this._logError(da);
				throw "topics passed to bind not correct";
			}

			for(var topic in toBind){

				var action = toBind[topic];
				
				if (this[action] && typeof(this[action])==="function") {
					toBindChannel.subscribe(topic, this[action]).withContext(this);
				} else {
					// this._logError();
					throw "Topic handler '"+action+"' not found";
				}

			}
		},
	});



	var CoreExtension = Pumpkin.CoreExtension = function(){

	}


	var Model = Pumpkin.Model = Model = function(){
		this.channel = postal.channel('app');
		this.sandbox = Sandbox;

		this.channel.publish('model.instanced',{name:this.name});
	}

	_.extend(Model.prototype,{
		name: 'Model'
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
	App.extend = Module.extend = Model.extend = extend;

	
	return Pumpkin; 
});
