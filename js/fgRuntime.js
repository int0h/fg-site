(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var EventEmitter = require('fg-js/eventEmitter.js');
var globalEvents = require('fg-js/client/globalEvents.js');
var utils = require('fg-js/utils.js');
var fgInstanceModule = require('fg-js/client/fgInstance.js');

var fgClassTable = [];
var fgClassDict = {};

function FgClass(opts){
	this.id = fgClassTable.length;	
	this.instances = [];
	this.tpl = opts.tpl;
	this.name = opts.name;
	this.eventEmitter = new EventEmitter;
	fgClassDict[opts.name] = this;
	fgClassTable.push(this);	
	function FgInstance(){
		fgInstanceModule.FgInstanceBase.apply(this, arguments);
	};
	this.createFn = FgInstance;
	this.createFn.constructor = fgInstanceModule.FgInstanceBase;	
	this.createFn.prototype = Object.create(fgInstanceModule.FgInstanceBase.prototype);	
	var classFn = opts.classFn;
	if (classFn){
		classFn(this, this.createFn.prototype);
	};
};
/*
function isInside(fg, node, selector){
	var domElms = fg.getDom();
	var matched = [];
	domElms.forEach(function(elm){
		var nodeList = elm.querySelectorAll(selector);
		var nodeArr = [].slice.call(nodeList);
		matched = matched.concat(nodeArr);
	});
	while (node){
		if (~domElms.indexOf(node)){
			return false;
		};
		if (~matched.indexOf(node)){
			return true;
		};
		node = node.parentNode;
	};
	return false;
};*/

/*function isInside(fg, node){
	var domElms = fg.getDom();
	while (node){
		if (~domElms.indexOf(node)){
			return true;
		};
		node = node.parentNode;
	};
	return false;
};
*/
function match(fg, node, selector){
	var domElms = fg.getDom();
	var rootReached = false;
	while (node){
		if (node.matches(selector)){
			return true;
		};
		if (~domElms.indexOf(node)){
			return false;
		};		
		node = node.parentNode;
	};
	return false;
};

FgClass.prototype.on = function(name, selector, fn){	
	if (arguments.length == 2){
		name = name;
		fn = arguments[1];
		selector = null;
	}else{
		var originalFn = fn;
		fn = function(event){			
			if (match(this, event.target, selector)){
				originalFn.call(this, event);
			};
		};
	};
	globalEvents.listen(name);
	this.eventEmitter.on(name, fn);	
};

FgClass.prototype.emit = function(name/*, rest*/){
	this.eventEmitter.emit.apply(this.eventEmitter, arguments);	
};

FgClass.prototype.emitApply = function(name, thisArg, args){
	this.eventEmitter.emitApply(name, thisArg, args);	
};

FgClass.prototype.cookData = function(data){
	return data;
};

FgClass.prototype.render = function(data, meta, parent){
	if (data instanceof HTMLElement){
		return this.renderIn.apply(this, arguments)
	};
	var fg = new fgInstanceModule.FgInstance(this, parent);
	fg.code = fg.getHtml(data, meta);
	return fg;
};

FgClass.prototype.renderIn = function(parentNode, data, meta, parent){
	var fg = this.render(data, meta, parent);
	parentNode.innerHTML = fg.code;
	fg.assign();
	return fg;
};

FgClass.prototype.appendTo = function(parentNode, data){
	var fg = this.render(data);	
	var div = document.createElement('div');
	div.innerHTML = fd.code;
	[].slice.call(div.children).forEach(function(child){
		parentNode.appendChild(child);
	});
	fg.assign();
};

exports.FgClass = FgClass;
exports.fgClassDict = fgClassDict;
exports.fgClassTable = fgClassTable;
},{"fg-js/client/fgInstance.js":2,"fg-js/client/globalEvents.js":6,"fg-js/eventEmitter.js":9,"fg-js/utils.js":11}],2:[function(require,module,exports){
var gapClassMgr = require('fg-js/client/gapClassMgr.js');
var renderTpl = require('fg-js/tplRender.js').renderTpl;
var EventEmitter = require('fg-js/eventEmitter.js');
var utils = require('fg-js/utils.js');
var GapStorage = require('fg-js/client/gapStorage.js').GapStorage;
var helper = require('./helper.js');
var globalEvents = require('fg-js/client/globalEvents.js');

var fgInstanceTable = [];

function FgInstanceBase(fgClass, parent){
	this.id = fgInstanceTable.length;
	fgClass.instances.push(this);
	this.name = fgClass.name;
	this.fgClass = fgClass;
	this.code = null;
	this.parent = parent || null;
	this.eventEmitter = new EventEmitter(fgClass.eventEmitter);
	this.emitApply = this.eventEmitter.emitApply.bind(this.eventEmitter);
	this.gapStorage = new GapStorage(this);
	this.childFgs = [];
	fgInstanceTable.push(this);	
};

FgInstanceBase.prototype.on = function(event, fn){
	globalEvents.listen(event);
	this.eventEmitter.on(event, fn);	
};

FgInstanceBase.prototype.emit = function(name/*, rest*/){
	this.eventEmitter.emit.apply(this.eventEmitter, arguments);	
};

function FgInstance(fgClass, parent){
	return new fgClass.createFn(fgClass, parent);
};

FgInstanceBase.prototype.toString = function(){
	return this.code;
};

FgInstanceBase.prototype.assign = function(){
	this.emitApply('ready', this, []);
	this.dom = document.getElementById('fg-iid-' + this.id);
	this.gapStorage.assign();
	return this.dom;
};

function getClasses(meta){
	if (!meta || !meta.attrs || !meta.attrs.class){
		return [];
	};
	if (Array.isArray(meta.attrs.class)){
		return meta.attrs.class;
	};		
	return meta.attrs.class.split(' ');
};

function metaMap(metaPart, id){
	/*var res = utils.concatObj({}, metaPart || {});
	var attrsObj = metaPart.attrs || {};//utils.keyValueToObj(metaPart.attrs || [], 'name', 'value');
	var tplClasses = (res.attrs && res.attrs.class || '').split(' ');
	var fg_cid = "fg-cid-" + this.fgClass.id;
	var classes = ['fg', fg_cid].concat(tplClasses);	
	attrsObj.class = classes.join(' ');*/
	var res = utils.simpleClone(metaPart);
	var classes = getClasses(res);
	var fg_cid = "fg-cid-" + this.fgClass.id;
	res.attrs = utils.simpleClone(metaPart.attrs);
	if (Array.isArray(res.attrs.class)){
		res.attrs.class = ['fg', ' ', fg_cid, ' '].concat(classes);
		return res;	
	};	
	res.attrs.class = ['fg', fg_cid].concat(classes).join(' ');
	return res;
};

FgInstanceBase.prototype.renderTpl = function(tpl, parent, data, meta){
	return renderTpl.call({
		"gapClassMgr": gapClassMgr,
		"context": this
	}, tpl, parent, data, meta);
};

FgInstanceBase.prototype.getHtml = function(data, meta){
	this.data = data;
	this.gapMeta = meta;
	var rootGap = new gapClassMgr.Gap(this, meta);
	rootGap.type = "root";
	rootGap.isVirtual = true;
	rootGap.fg = this;
	rootGap.scopePath = [];
	this.meta = rootGap;
	var cookedData = this.fgClass.cookData(data);
	return this.renderTpl(this.fgClass.tpl, rootGap, data, metaMap.bind(this));
};

FgInstanceBase.prototype.update = function(scopePath, newValue){
	if (arguments.length == 0){
		return this.update([], this.data); // todo
	};
	if (arguments.length == 1){
		return this.update([], arguments[0]);
	};
	var value = utils.deepClone(newValue);
	var self = this;
	var oldValue = utils.objPath(scopePath, this.data);
	if (oldValue === value){
		return this;
	};	
	this.emit('update', scopePath, newValue);
	if (scopePath.length > 0){
		utils.objPath(scopePath, this.data, value);
	}else{
		this.data = value;
	}
	var scope = this.gapStorage.byScope(scopePath);
	var gaps = scope.target;
	gaps.forEach(function(gap){
		gapClassMgr.update(self, gap, scopePath, value, oldValue);
	});
	scope.parents.forEach(function(parentNode){
		parentNode.data.gaps.forEach(function(parentGap){
			if (parentGap.type == "fg"){
				var subPath = scopePath.slice(parentGap.scopePath.length);
				var subVal = utils.objPath(subPath, self.data);
				parentGap.fg.update(subPath, newValue);
			};			
		});
	});
	scope.subs.forEach(function(sub){
		var subVal = utils.objPath(sub.path, self.data);	
		var subPath = sub.path.slice(scopePath.length);
		var oldSubVal = utils.objPath(subPath, oldValue);
		if (subVal == oldSubVal){
			return;
		};
		sub.gaps.forEach(function(gap){
			if (!~self.gapStorage.gaps.indexOf(gap)){
				return;
			};
			gapClassMgr.update(self, gap, sub.path, subVal, oldSubVal);
		});
	});
	return this;
};

function createScopeHelper(fg, obj, scopePath){
	var helper = Array.isArray(obj) 
		? [] 
		: {};
	utils.objFor(obj, function(value, key){
		var propScopePath = scopePath.concat([key]);
		Object.defineProperty(helper, key, {
			get: function(){
				if (typeof value == "object"){
					return createScopeHelper(fg, obj[key], propScopePath);
				};
				return obj[key];
			},
			set: function(val){
				fg.update(propScopePath, val);				
			}	
		});
	});
	return helper;
};

function createFnDataHelper(fg, obj, scopePath){

	utils.objFor(obj, function(value, key){
		var propScopePath = scopePath.concat([key]);

	});
};

FgInstanceBase.prototype.$d = function(){

};

FgInstanceBase.prototype.$data = function(newData){
	if (newData){
		//...
		return;
	};
	var helper = createScopeHelper(this, this.data, []);
	return helper;
};

FgInstanceBase.prototype.cloneData = function(){
	return utils.deepClone(this.data);
};

FgInstanceBase.prototype.clear = function(){
	this.childFgs.forEach(function(child){
		child.remove(true);
	});
	this.code = '';
	this.data = null;
	this.gapStorage = null;
	this.childFgs = [];
};

FgInstanceBase.prototype.remove = function(virtual){
	if (!virtual){
		var dom = this.getDom();
		dom.forEach(function(elm){
			elm.remove();
		});
	};
	this.clear();
	var instanceId = this.fgClass.instances.indexOf(this);	
	this.fgClass.instances.splice(instanceId, 1);
	fgInstanceTable[this.id] = null;
};

FgInstanceBase.prototype.rerender = function(data){
	this.clear();
	this.gapStorage = new GapStorage(this);
	var dom = this.getDom()[0];
	this.code = this.getHtml(data);
	dom.outerHTML = this.code; // doesnt work with multi root
	this.assign();
	return this;
};

FgInstanceBase.prototype.getDom = function(){
	return this.meta.getDom();
};

FgInstanceBase.prototype.jq = function(){
	var dom = this.getDom();
	var res = helper.jq(dom);
	if (arguments.length == 0){
		return res;
	};
	var selector = arguments[0];
	var selfSelected = res
		.parent()
		.find(selector)
		.filter(function(id, elm){
			return ~dom.indexOf(elm);
		});
	var childSelected = res.find(selector);
	return selfSelected.add(childSelected);
};

FgInstanceBase.prototype.gap = function(id){
	return this.gaps(id)[0];
};

FgInstanceBase.prototype.gaps = function(id){
	var gaps = this.gapStorage.byEid(id);
	if (gaps){
		return gaps;
	};	
};

FgInstanceBase.prototype.elm = FgInstanceBase.prototype.gap; // legacy

FgInstanceBase.prototype.elms = FgInstanceBase.prototype.gaps; // legacy

FgInstanceBase.prototype.sub = function(id){
	var gap = this.gap(id);
	if (!gap){
		return null;
	};
	return gap.fg || null; 
};


function getFgByIid(iid){
	return fgInstanceTable[iid];
};

exports.getFgByIid = getFgByIid;
exports.FgInstance = FgInstance;
exports.FgInstanceBase = FgInstanceBase;
exports.fgInstanceTable = fgInstanceTable;
},{"./helper.js":7,"fg-js/client/gapClassMgr.js":3,"fg-js/client/gapStorage.js":4,"fg-js/client/globalEvents.js":6,"fg-js/eventEmitter.js":9,"fg-js/tplRender.js":10,"fg-js/utils.js":11}],3:[function(require,module,exports){
var gapClasses = require('./gaps.js');
var utils = require('fg-js/utils');

function Gap(context, parsedMeta, parent){
	utils.extend(this, parsedMeta);
	this.children = [];	
	this.parent = parent || null;
	this.root = this;
	this.context = context;	
	this.scopePath = utils.getScopePath(this);
	//this.triggers = [];
	context.gapStorage.reg(this);
	if (!parent){
		return this;
	};
	this.root = parent.root;
	parent.children.push(this);
};

Gap.prototype.closest = function(selector){
	var eid = selector.slice(1);
	gap = this.parent;
	while (gap){
		if (gap.eid == eid){
			return gap;
		};
		gap = gap.parent;
	};
	return null;
};

Gap.prototype.data = function(val){
	if (arguments.length == 0){
		return utils.objPath(this.scopePath, this.context.data);
	};
	this.context.update(this.scopePath, val);	
};

Gap.prototype.findRealDown = function(){
	if (!this.isVirtual){
		return [this];
	};
	var res = [];
	this.children.filter(function(child){
		res = res.concat(child.findRealDown());
	});
	return res;
};

Gap.prototype.getDom = function(){
	if (!this.isVirtual){
		var id = ["fg", this.context.id, "gid", this.gid].join('-');
		return [document.getElementById(id)];
	};
	var res = [];
	this.findRealDown().forEach(function(gap){
		res = res.concat(gap.getDom());
	});
	return res;
};

Gap.prototype.removeDom = function(){
	var dom = this.getDom();
	dom.forEach(function(elm){
		if (!elm){
			return;
		};
		elm.remove();
	});
};

exports.Gap = Gap;

function render(context, parent, data, meta){
	var gap = new Gap(context, meta, parent);
	var gapClass = gapClasses[meta.type];
	return gapClass.render.call(gap, context, data);
};

exports.render = render;

function update(context, gapMeta, scopePath, value, oldValue){
	var gapClass = gapClasses[gapMeta.type];
	if (!gapClass){
		return;
	};
	return gapClass.update(context, gapMeta, scopePath, value, oldValue);
};

exports.update = update;
},{"./gaps.js":5,"fg-js/utils":11}],4:[function(require,module,exports){
var utils = require('fg-js/utils.js');
var TreeHelper = require('fg-js/utils/treeHelper.js');

function initNodeFn(){
	return {
		gaps: []
	};
};

function GapStorage(context){
	this.context = context;
	this.gaps = [];
	this.scopeTree = new TreeHelper({
		kind: 'dict',
		initNode: initNodeFn
	});
	this.eidDict = {};	
};

GapStorage.prototype.setScopeTrigger = function(gap, scopePath){
	var scope = this.scopeTree.access(scopePath);	
	scope.data.gaps.push(gap);
};

/*GapStorage.prototype.add = function(meta, scopeTriggers, gid){
	scopeTriggers = scopeTriggers || [meta.scopePath];
	var gap = {
		"id": gid || this.getGid(),
		"meta": meta
	};
	scopeTriggers.forEach(this.setScopeTrigger.bind(this, gap));
	this.gaps.push(gap);
};

GapStorage.prototype.setAttrs = function(meta, attrs, gid){
	var fgGapClass = 'fg-gap-' + this.context.id;
	attrs.class = attrs.class 
		? fgGapClass + ' ' + attrs.class
		: fgGapClass;
	attrs["data-fg-" + this.context.id + "-gap-id"] = gid;
	//attrs.id = ["fg", this.context.id, "gap-id", gid].join('-');
 	return attrs;
};*/

GapStorage.prototype.setTriggers = function(gapMeta, scopeTriggers){	
	scopeTriggers.forEach(this.setScopeTrigger.bind(this, gapMeta));
};

GapStorage.prototype.reg = function(gapMeta){
	var eid = gapMeta.eid;
	if (eid){		
		this.eidDict[eid] = this.eidDict[eid] || [];
		this.eidDict[eid].push(gapMeta);
	};
	var gid = this.getGid();
	gapMeta.gid = gid;
	if (!gapMeta.isVirtual){
		gapMeta.attrs = utils.simpleClone(gapMeta.attrs || {});		
		gapMeta.attrs.id = ["fg", this.context.id, "gid", gid].join('-');
	};
	gapMeta.storageId = this.gaps.length;
	this.gaps.push(gapMeta);		
	//return attrsObj;
};

GapStorage.prototype.assign = function(){
	//if ()
	this.gaps.forEach(function(gapMeta){
		if (gapMeta.type != "root" && gapMeta.fg){
			gapMeta.fg.assign();
		};
	});
	return;
	var self = this;
	var gapNodes = this.context.dom.getElementsByClassName('fg-gap-' + this.context.id);
	for (var i = 0; i < gapNodes.length; i++){
		var gapNode = gapNodes[i];
		var gid = gapNode.getAttribute('data-fg-' + this.context.id + '-gap-id');
		var gap = self.gaps[gid];
		if (!gap){continue};
		if (gap.meta.fg){
			gap.meta.fg.assign();
		};
		gap.meta.dom = gapNode;
	};
};

/*GapStorage.prototype.subTree = function(scopePath){
	var branch = accessScopeLeaf(this.scopeTree, scopePath);
	var res = [];

	function iterate(node){
		for (var i in node.children){

		};
	};


};*/

GapStorage.prototype.byScope = function(scopePath, targetOnly){
	var scope = this.scopeTree.access(scopePath);		
	var subNodes = [];
	if (scope.childCount != 0 && !targetOnly){
		subNodes = scope.getDeepChildArr().map(function(node){
			return {
				gaps: node.data.gaps,
				path: node.path	
			};			
		});
	};
	var parents = scope.getParents();
	return {
		target: scope.data.gaps,
		subs: subNodes,
		parents: parents
	};
};

GapStorage.prototype.removeScope = function(scopePath){
	var scope = this.byScope(scopePath);	
	var removedDomGaps = scope.target;
	var removedGaps = scope.target;
	scope.subs.forEach(function(node){
		removedGaps = removedGaps.concat(node.gaps);
	});
	this.scopeTree.remove(scopePath);
	this.gaps = this.gaps.filter(function(gap){
		return !~removedGaps.indexOf(gap);
	});
	removedDomGaps.forEach(function(gap){
		gap.removeDom();
	});
};

GapStorage.prototype.byEid = function(eid){
	return this.eidDict[eid];
};

GapStorage.prototype.getGid = function(){
	return this.gaps.length;
};

exports.GapStorage = GapStorage;

},{"fg-js/utils.js":11,"fg-js/utils/treeHelper.js":14}],5:[function(require,module,exports){
var gapClassMgr = require('./gapClassMgr.js');var renderTpl = require('fg-js/tplRender.js').renderTpl.bind(null, gapClassMgr);
exports["data"] = {
	"render": function (context, data){
		var utils = require('fg-js/utils');
		context.gapStorage.setTriggers(this, [this.scopePath]);
		var value = utils.objPath(this.scopePath, data)
		return utils.renderTag({
			name: "span",
			attrs: this.attrs,
			innerHTML: value
		});
	},
"update": function (context, meta, scopePath, value){
		var node = meta.getDom()[0];
		if (!node){
			
		};
		node.innerHTML = value;
		//highlight(node, [0xffffff, 0xffee88], 500);
	}
};

exports["scope"] = {
	"render": function (context, data){
		var meta = this;
		meta.items = [];
		var utils = require('fg-js/utils');
		meta.scopePath = utils.getScopePath(meta);		
		var scopeData = utils.objPath(meta.scopePath, data);
		context.gapStorage.setTriggers(this, [this.scopePath]);
		var placeHolderInner = ['fg', context.id, 'scope-gid', meta.gid].join('-');
		if (!scopeData){
			return '<!--' + placeHolderInner + '-->';
		};		
		var parts = utils.renderScopeContent(context, meta, scopeData, data, 0);
		parts.push('<!--' + placeHolderInner + '-->');
		return parts.join('\n');
	},
"update": function (context, meta, scopePath, value, oldValue){		
		var utils = require('fg-js/utils');
		var gapClassMgr = require('fg-js/client/gapClassMgr.js');
		value = value || [];
		for (var i = value.length; i < oldValue.length; i++){
			context.gapStorage.removeScope(scopePath.concat([i]));
		};
		if (value.length > oldValue.length){
			var scopeHolder = utils.findScopeHolder(meta);
			var nodes = [].slice.call(scopeHolder.getDom()[0].childNodes);
			var placeHolderInner = ['fg', context.id, 'scope-gid', meta.gid].join('-');
			var found = nodes.filter(function(node){
			    if (node.nodeType != 8){
			        return false
			    };
			    if (node.textContent == placeHolderInner){
			    	return true;
			    };			    
			});
			found = found[0];
			var dataSlice = value.slice(oldValue.length);
			var newContent = utils.renderScopeContent(context, meta, dataSlice, context.data, oldValue.length).join('\n');
			utils.insertHTMLBeforeComment(found, newContent);
		};
		this;
		//context.rerender(context.data);
	}
};

exports["scope-item"] = {
	"render": function (context, data){
		var meta = this;
		var utils = require('fg-js/utils');		
		meta.scopePath = utils.getScopePath(meta);		
		var scopeData = utils.objPath(meta.scopePath, data);
		context.gapStorage.setTriggers(this, [this.scopePath]);
		if (!scopeData){
			return '';
		};
		return context.renderTpl(meta.content, meta, data);
	},
"update": function (context, meta, scopePath, value, oldValue){		
		return;
	}
};

exports["fg"] = {
	"render": function (context, data, meta){
		var self = this;
		var utils = require('fg-js/utils');
		this.parentFg = context;
		//this.renderedContent = context.renderTpl(this.content, meta, data);
		var fgClass = $fg.classes[this.fgName];	
		var scopeData = utils.deepClone(utils.objPath(this.scopePath, data));			
		var fg = fgClass.render(scopeData, this, context);
		fg.on('update', function(path, val){
			context.update(self.scopePath.concat(path), val);
			//console.log(path, val);
		});
		this.fg = fg;
		fg.meta = this;
		context.childFgs.push(fg);
		context.gapStorage.setTriggers(this, [this.scopePath]);		
		return fg;
		if (true){ // client
			
		};		
		throw 'todo server render';
	},
"update": function (context, meta, scopePath, value){
		return;
	}
};

exports["content"] = {
	"render": function (context, data, meta){
		this.scopePath = context.gapMeta.scopePath;
		//var utils = require('fg/utils');			
		return context.parent.renderTpl(context.meta.content, this, context.parent.data);
	},
"update": function (context, meta, scopePath, value){
		return;
	}
};

exports["raw"] = {
	"render": function (context, data){		
		var meta = this;
		var utils = require('fg-js/utils');
		if (meta.isScopeHolder){
			meta.root.currentScopeHolder = meta;		
		};
		var attrData = utils.objPath(meta.scopePath, data);
		var attrsArr = utils.objToKeyValue(meta.attrs, 'name', 'value');
		var renderedAttrs = utils.renderAttrs(meta.attrs, attrData);
		var triggers = utils
			.getAttrsPaths(meta.attrs)	
			.map(function(path){
				return utils.resolvePath(meta.scopePath, path);
			});	
		var valuePath;
		if (meta.value){
			valuePath = utils.resolvePath(meta.scopePath, meta.value);
			triggers.push(valuePath);
			meta.valuePath = valuePath;
		}; 
		/*var scopeTriggers = attrsPaths;
		if (meta.isScopeItem){
			scopeTriggers.push(meta.scopePath);
		};*/
		context.gapStorage.setTriggers(meta, triggers);		
		var inner = meta.value 
			? utils.objPath(valuePath, data)
			: context.renderTpl(meta.content, meta, data);
		return utils.renderTag({
			"name": meta.tagName,
			"attrs": renderedAttrs,
			"innerHTML": inner
		});
	},
"update": function (context, meta, scopePath, value){
		// to do value update
		var utils = require('fg-js/utils');
		var attrData = utils.objPath(meta.scopePath, context.data);
		var renderedAttrs = utils.renderAttrs(meta.attrs, attrData);
		var dom = meta.getDom()[0];
		if (meta.value && meta.valuePath.join('-') == scopePath.join('-')){
			dom.innerHTML = value;
		};
		utils.objFor(renderedAttrs, function(value, name){
			var oldVal = dom.getAttribute(name);
			if (oldVal != value){
				dom.setAttribute(name, value);
			};
		});		
	}
};
},{"./gapClassMgr.js":3,"fg-js/client/gapClassMgr.js":3,"fg-js/tplRender.js":10,"fg-js/utils":11}],6:[function(require,module,exports){
var events = {};

function handler(name, event){
	var elm = event.target;
	while (elm){
		var fg = $fg.byDom(elm);
		if (fg){
			fg.emitApply(name, fg, [event]);
			//return;
		};
		elm = elm.parentNode;
	};
};

exports.listen = function(name){
	if (name in events){
		return;
	};	
	events[name] = true;
	document.addEventListener(name, handler.bind(null, name), {"capture": true});
};
},{}],7:[function(require,module,exports){
module.exports = $fg;

var fgClassModule = require('fg-js/client/fgClass.js');
var fgInstanceModule = require('fg-js/client/fgInstance.js');

function $fg(arg){
	if (arg instanceof HTMLElement){
		return $fg.byDom(arg);
	};
	if (typeof arg == "string"){
		return fgClassModule.fgClassDict[arg];
	};
};

$fg.load = function(fgData){
	if (Array.isArray(fgData)){		
		return fgData.map($fg.load);
	};
	return new fgClassModule.FgClass(fgData);
};

$fg.isFg = function(domNode){
	return domNode.classList && domNode.classList.contains('fg');
};

var iidRe = /fg\-iid\-(\d+)/g;
var idRe = /fg\-(\d+)\-gid\-(\d+)/g;

$fg.byDom = function(domNode){	
	if (!domNode || !domNode.className){
		return null;
	};
	if (!~domNode.className.split(' ').indexOf('fg')){
		return null;
	};
	if (!domNode.id){
		return null;
	};
	idRe.lastIndex = 0;
	var res = idRe.exec(domNode.id);
	if (!res){
		return null;
	};
	var iid = parseInt(res[1]);
	return fgInstanceModule.getFgByIid(iid);	
};

$fg.gapClosest = function(domNode){
	while (true){
		idRe.lastIndex = 0;
		var res = idRe.exec(domNode.id);
		if (!res){
			domNode = domNode.parentNode;
			if (!domNode){
				return null;
			};
			continue;
		};
		var iid = parseInt(res[1]);
		var fg = fgInstanceModule.getFgByIid(iid);
		var gid = parseInt(res[2]);
		return fg.gapStorage.gaps[gid];
	};
};

$fg.classes = fgClassModule.fgClassDict;

$fg.fgs = fgInstanceModule.fgInstanceTable;

$fg.jq = window.jQuery;

window.$fg = $fg;
},{"fg-js/client/fgClass.js":1,"fg-js/client/fgInstance.js":2}],8:[function(require,module,exports){
var fgHelper = require('./helper.js');
},{"./helper.js":7}],9:[function(require,module,exports){
function EventEmitter(parent){
	this.events = {};
	this.parent = parent;
};

EventEmitter.prototype.on = function(name, fn){
	var eventList = this.events[name];
	if (!eventList){
		eventList = [];
		this.events[name] = eventList;
	};
	eventList.push(fn);
};

EventEmitter.prototype.emit = function(name/*, rest*/){
	if (this.parent){
		this.parent.emit.apply(this.parent, arguments);
	};
	var eventList = this.events[name];
	if (!eventList){
		return;
	};
	var emitArgs = [].slice.call(arguments, 1);	 
	eventList.forEach(function(fn){
		fn.apply(this, emitArgs);
	});
};

EventEmitter.prototype.emitApply = function(name, thisArg, args){
	if (this.parent){
		this.parent.emitApply.apply(this.parent, arguments);
	};
	var eventList = this.events[name];
	if (!eventList){
		return;
	};
	eventList.forEach(function(fn){
		fn.apply(thisArg, args);
	});
};

module.exports = EventEmitter;
},{}],10:[function(require,module,exports){
var utils = require('fg-js/utils');

function renderTpl(tpl, parent, data, meta){
	var self = this;
	var parts = tpl.map(function(part, partId){
		if (typeof part == "string"){
			return part;
		};
		var partMeta = utils.simpleClone(part);
		if (meta){
			if (typeof meta == "function"){
				partMeta = meta(partMeta, partId);
			}else{
				partMeta = utils.extend(partMeta, meta || {});			
			};	
		};		
		return self.gapClassMgr.render(self.context, parent, data, partMeta);
	});
	var code = parts.join('');
	return code;
};

exports.renderTpl = renderTpl;
},{"fg-js/utils":11}],11:[function(require,module,exports){
var tplUtils = require('fg-js/utils/tplUtils.js');
extend(exports, tplUtils);

function objFor(obj, fn){
	for (var i in obj){
		fn(obj[i], i, obj);
	};
};
exports.objFor = objFor;

function objPath(path, obj, newVal){
	if (path.length < 1){
		if (arguments.length > 2){
			throw 'root rewritting is not supported';
		};
		return obj;
	};
	var propName = path[0];
	if (path.length == 1){
		if (arguments.length > 2){
			obj[propName] = newVal; 
		};				
		return obj[propName];	
	};
	var subObj = obj[propName];
	if (subObj === undefined){
		//throw new Error("Cannot read " + propName + " of undefined");
		return undefined; // throw?
	};		
	if (arguments.length > 2){
		return objPath(path.slice(1), subObj, newVal);
	};
	return objPath(path.slice(1), subObj);
};
exports.objPath = objPath;


function attrsToObj(attrs){
	var res = {};
	attrs.forEach(function(i){
		res[i.name] = i.value;
	}); 
	return res;
};
exports.attrsToObj = attrsToObj;


function simpleClone(obj){
	var res = {};
	for (var i in obj){
		res[i] = obj[i];
	};
	return res;
};
exports.simpleClone = simpleClone;


function mixArrays(arrays){
	var id = 0;
	var maxLength = 0;
	var totalLength = 0;
	for (var i = 0; i < arguments.length; i++){
		maxLength = Math.max(arguments[i].length, maxLength);
		totalLength += arguments[i].length;
	};
	var resArr = [];
	var arrayCount = arguments.length;
	for (var id = 0; id < maxLength; id++){				
		for (var i = 0; i < arrayCount; i++){
			if (arguments[i].length > id){
				resArr.push(arguments[i][id]);
			};
		};
	};
	return resArr;
};
exports.mixArrays = mixArrays;

function resolvePath(rootPath, relPath){
	var resPath = rootPath.slice();
	relPath = relPath || [];
	relPath.forEach(function(key){
		if (key == "_root"){
			resPath = [];
			return;
		};
		resPath.push(key);
	});
	return resPath;
};
exports.resolvePath = resolvePath;


function getScopePath(meta){
	var	parentPath = [];
	if (meta.parent){
		parentPath = meta.parent.scopePath;
		if (!parentPath){
			throw new Error("Parent elm must have scopePath");
		};
	};
	return resolvePath(parentPath, meta.path)
};
exports.getScopePath = getScopePath;

function keyValueToObj(arr, keyName, valueName){
	keyName = keyName || 'key';
	valueName = valueName || 'value';
	var res = {};
	arr.forEach(function(i){
		res[i[keyName]] = i[valueName];
	}); 
	return res;
};
exports.keyValueToObj = keyValueToObj;	

function objToKeyValue(obj, keyName, valueName){
	keyName = keyName || 'key';
	valueName = valueName || 'value';
	var res = [];
	for (var i in obj){
		var item = {};
		item[keyName] = i;
		item[valueName] = obj[i];
		res.push(item);
	};
	return res;
};
exports.objToKeyValue = objToKeyValue;

function clone(obj){
	return Object.create(obj);
};
exports.clone = clone;


function concatObj(obj1, obj2){
	var res = simpleClone(obj1);
	for (var i in obj2){
		res[i] = obj2[i];
	};
	return res;
};
exports.concatObj = concatObj;

function extend(dest, src){	
	for (var i in src){
		dest[i] = src[i];
	};
	return dest;
};
exports.extend = extend;

function findScopeHolder(meta){
    var node = meta.parent;
    while (node){
        if (node.isScopeHolder){
            return node;
        };
        node = node.parent;  
    };
    throw 'cannot find scope holder';
};
exports.findScopeHolder = findScopeHolder;

function renderScopeContent(context, scopeMeta, scopeData, data, idOffset){
	var gapClassMgr = require('fg-js/client/gapClassMgr.js');
	var isArray = Array.isArray(scopeData);
	if (!isArray){
		scopeData = [scopeData];
	};
	var parts = scopeData.map(function(dataItem, id){
		var itemMeta = scopeMeta;
		if (isArray){
			var itemCfg = {
				"type": "scope-item",
				"isVirtual": true,
				"path": [id + idOffset],
				"content": scopeMeta.content
			};
			if (scopeMeta.eid){
				itemCfg.eid = scopeMeta.eid + '-item';
			};
			itemMeta = new gapClassMgr.Gap(context, itemCfg, itemMeta);
			context.gapStorage.setTriggers(itemMeta, [itemMeta.scopePath]);
		};
		return gapClassMgr.render(context, scopeMeta, data, itemMeta);
	});
	return parts;
};
exports.renderScopeContent = renderScopeContent;

function insertHTMLBeforeComment(commentElm, html){
	var prev = commentElm.previousElementSibling;
	if (prev){
		prev.insertAdjacentHTML('afterend', html);
		return;
	};
	commentElm.parentNode.insertAdjacentHTML('afterbegin', html);
};
exports.insertHTMLBeforeComment = insertHTMLBeforeComment;


function parsePath(parsedNode){
	if (parsedNode.attrs.class){
		return parsedNode.attrs.class.value.split(' ');
	};
	return [];
};
exports.parsePath = parsePath;

function objMap(obj, fn){
	var res = {};
	objFor(obj, function(val, id){
		res[id] = fn(val, id, obj);
	});
	return res;
};
exports.objMap = objMap;

function deepClone(obj){
	if (typeof obj == "object"){
		var map = Array.isArray(obj)
			? obj.map.bind(obj)
			: objMap.bind(null, obj);
		return map(deepClone);
	};
	return obj;
};
exports.deepClone = deepClone;
},{"fg-js/client/gapClassMgr.js":3,"fg-js/utils/tplUtils.js":13}],12:[function(require,module,exports){
var utils = require('fg-js/utils');

function StrTpl(tpl){
	this.tpl = tpl;
};

StrTpl.parse = function(str){
	var re = /\%\@?[\w\d_\.\-]+%/g;
	var gaps = str.match(re);
	if (!gaps){
		return str;
	};
	gaps = gaps.map(function(gap){
		var pathStr = gap.slice(1, -1);
		var path = [];
		if (pathStr[0] == "@"){
			pathStr = pathStr.slice(1);
		}else{
			path = [];
		};
		var path = path.concat(pathStr.split('.'));
		return {
			"path": path
		};
	});
	var tplParts = str.split(re);
	var tpl = utils.mixArrays(tplParts, gaps);
	return tpl;
};

StrTpl.prototype.getPaths = function(){
	var paths = [];
	if (!Array.isArray(this.tpl)){
		return paths;
	};	
	this.tpl.forEach(function(part){
		if (typeof part == "string"){
			return;
		};
		return paths.push(part.path);
	});
	return paths;
};

StrTpl.prototype.render = function(data){
	if (!Array.isArray(this.tpl)){
		return this.tpl;
	};
	return this.tpl.map(function(part){
		if (typeof part == "string"){
			return part;
		};
		return utils.objPath(part.path, data);
	}).join('');	
};

module.exports = StrTpl;

},{"fg-js/utils":11}],13:[function(require,module,exports){
var StrTpl = require('fg-js/utils/strTpl.js');
var utils = require('fg-js/utils.js');

var selfClosingTags = ["area", "base", "br", "col", 
	"command", "embed", "hr", "img", 
	"input", "keygen", "link", 
	"meta", "param", "source", "track", 
	"wbr"];

function renderTag(tagInfo){
	var attrs = tagInfo.attrs;
	if (!Array.isArray(attrs)){
		attrs = utils.objToKeyValue(attrs, 'name', 'value');
	};
	var attrCode = "";
	if (attrs.length > 0){
	    attrCode = " " + attrs.map(function(attr){
		  return attr.name + '="' + attr.value + '"';
	   }).join(' ');
	};
	var tagHead = tagInfo.name + attrCode;
	if (~selfClosingTags.indexOf(tagInfo.name)){
		return "<" + tagHead + " />";
	};
	var openTag = "<" + tagHead + ">";
	var closeTag = "</" + tagInfo.name + ">";
	var code = openTag + (tagInfo.innerHTML || "") + closeTag;
	return code;
};
exports.renderTag = renderTag;	

function renderAttrs(attrs, data){
	var resAttrs = {};
	utils.objFor(attrs, function(value, name){
		var nameTpl = new StrTpl(name);
		var valueTpl = new StrTpl(value);
		resAttrs[nameTpl.render(data)] = valueTpl.render(data);		
	});	
	return resAttrs;
};
exports.renderAttrs = renderAttrs;

function getAttrsPaths(attrs){
	var paths = [];
	utils.objFor(attrs, function(value, name){
		var nameTpl = new StrTpl(name);
		var valueTpl = new StrTpl(value);
		paths = paths.concat(nameTpl.getPaths(), valueTpl.getPaths());		
	});
	return paths;
};
exports.getAttrsPaths = getAttrsPaths;

},{"fg-js/utils.js":11,"fg-js/utils/strTpl.js":12}],14:[function(require,module,exports){
function Node(kind, parent, data){
    this.children = kind == 'array'
        ? []
        : {};   
    this.parent = parent;
    this.data = data;
    this.childCount = 0;
};

Node.prototype.addChild = function(name, data){
    if (this.kind == 'array'){
        data = name;
        name = this.children.length;
    };
    data = data || this.root.initNode();
    var child = new Node(this.kind, this, data);
    child.id = name;
    child.path = this.path.concat([name]);
    child.root = this.root;
    this.childCount++;
    this.children[name] = child;
    return child;
};

Node.prototype.getParents = function(){
    var res = [];    
    var node = this;
    while (true){
        node = node.parent;
        if (!node){
            return res;
        };
        res.push(node);
    };  
};

Node.prototype.childIterate = function(fn){
    for (var i in this.children){
        fn.call(this, this.children[i], i);  
    };
};

Node.prototype.getChildArr = function(){
    if (this.kind == 'array'){
        return this.children;
    };
    var res = [];
    this.childIterate(function(child){
        res.push(child);
    });            
    return res;
};

Node.prototype.getDeepChildArr = function(){
    var res = this.getChildArr();
    this.childIterate(function(child){
       res = res.concat(child.getDeepChildArr());
    });
    return res;
};

Node.prototype.remove = function(path){
    var leafKey = path[path.length - 1];
    var branchPath = path.slice(0, -1);
    var branch = this.byPath(branchPath);
    branch.childCount--;
    var res = branch.children[leafKey];
    delete branch.children[leafKey];   
    return res; 
};

Node.prototype.byPath = function(path){    
    if (path.length == 0){
        return this;
    };
    var node = this;
    while (true){
        var key = path[0];
        node = node.children[key];
        if (!node){
            return null;
        };
        path = path.slice(1);
        if (path.length == 0){
            return node;  
        };
    };
};

Node.prototype.access = function(path){
    if (path.length == 0){
        return this;
    };
    var node = this;
    while (true){
        var key = path[0];
        var parent = node;
        node = node.children[key];
        if (!node){
            var data = this.root.initNode();                
            node = parent.addChild(key, data);
            parent.children[key] = node;
        };
        path = path.slice(1);
        if (path.length == 0){
            return node;  
        };
    }; 
};

function TreeHelper(opts, rootData){
    opts = opts || {};
    opts.kind = opts.kind || 'array';
    var initNode = opts.initNode || function(){
        return {};
    };
    var data = rootData || initNode();
    var rootNode = new Node(opts.kind, null, data);
    rootNode.isRoot = true;
    rootNode.root = rootNode;
    rootNode.path = [];
    rootNode.initNode = initNode;
    return rootNode;
};

module.exports = TreeHelper;
},{}]},{},[8])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmctanMvY2xpZW50L2ZnQ2xhc3MuanMiLCJub2RlX21vZHVsZXMvZmctanMvY2xpZW50L2ZnSW5zdGFuY2UuanMiLCJub2RlX21vZHVsZXMvZmctanMvY2xpZW50L2dhcENsYXNzTWdyLmpzIiwibm9kZV9tb2R1bGVzL2ZnLWpzL2NsaWVudC9nYXBTdG9yYWdlLmpzIiwibm9kZV9tb2R1bGVzL2ZnLWpzL2NsaWVudC9nYXBzLmpzIiwibm9kZV9tb2R1bGVzL2ZnLWpzL2NsaWVudC9nbG9iYWxFdmVudHMuanMiLCJub2RlX21vZHVsZXMvZmctanMvY2xpZW50L2hlbHBlci5qcyIsIm5vZGVfbW9kdWxlcy9mZy1qcy9jbGllbnQvbWFpbi5qcyIsIm5vZGVfbW9kdWxlcy9mZy1qcy9ldmVudEVtaXR0ZXIuanMiLCJub2RlX21vZHVsZXMvZmctanMvdHBsUmVuZGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZnLWpzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2ZnLWpzL3V0aWxzL3N0clRwbC5qcyIsIm5vZGVfbW9kdWxlcy9mZy1qcy91dGlscy90cGxVdGlscy5qcyIsIm5vZGVfbW9kdWxlcy9mZy1qcy91dGlscy90cmVlSGVscGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdmZy1qcy9ldmVudEVtaXR0ZXIuanMnKTtcclxudmFyIGdsb2JhbEV2ZW50cyA9IHJlcXVpcmUoJ2ZnLWpzL2NsaWVudC9nbG9iYWxFdmVudHMuanMnKTtcclxudmFyIHV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMuanMnKTtcclxudmFyIGZnSW5zdGFuY2VNb2R1bGUgPSByZXF1aXJlKCdmZy1qcy9jbGllbnQvZmdJbnN0YW5jZS5qcycpO1xyXG5cclxudmFyIGZnQ2xhc3NUYWJsZSA9IFtdO1xyXG52YXIgZmdDbGFzc0RpY3QgPSB7fTtcclxuXHJcbmZ1bmN0aW9uIEZnQ2xhc3Mob3B0cyl7XHJcblx0dGhpcy5pZCA9IGZnQ2xhc3NUYWJsZS5sZW5ndGg7XHRcclxuXHR0aGlzLmluc3RhbmNlcyA9IFtdO1xyXG5cdHRoaXMudHBsID0gb3B0cy50cGw7XHJcblx0dGhpcy5uYW1lID0gb3B0cy5uYW1lO1xyXG5cdHRoaXMuZXZlbnRFbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlcjtcclxuXHRmZ0NsYXNzRGljdFtvcHRzLm5hbWVdID0gdGhpcztcclxuXHRmZ0NsYXNzVGFibGUucHVzaCh0aGlzKTtcdFxyXG5cdGZ1bmN0aW9uIEZnSW5zdGFuY2UoKXtcclxuXHRcdGZnSW5zdGFuY2VNb2R1bGUuRmdJbnN0YW5jZUJhc2UuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuXHR9O1xyXG5cdHRoaXMuY3JlYXRlRm4gPSBGZ0luc3RhbmNlO1xyXG5cdHRoaXMuY3JlYXRlRm4uY29uc3RydWN0b3IgPSBmZ0luc3RhbmNlTW9kdWxlLkZnSW5zdGFuY2VCYXNlO1x0XHJcblx0dGhpcy5jcmVhdGVGbi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKGZnSW5zdGFuY2VNb2R1bGUuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlKTtcdFxyXG5cdHZhciBjbGFzc0ZuID0gb3B0cy5jbGFzc0ZuO1xyXG5cdGlmIChjbGFzc0ZuKXtcclxuXHRcdGNsYXNzRm4odGhpcywgdGhpcy5jcmVhdGVGbi5wcm90b3R5cGUpO1xyXG5cdH07XHJcbn07XHJcbi8qXHJcbmZ1bmN0aW9uIGlzSW5zaWRlKGZnLCBub2RlLCBzZWxlY3Rvcil7XHJcblx0dmFyIGRvbUVsbXMgPSBmZy5nZXREb20oKTtcclxuXHR2YXIgbWF0Y2hlZCA9IFtdO1xyXG5cdGRvbUVsbXMuZm9yRWFjaChmdW5jdGlvbihlbG0pe1xyXG5cdFx0dmFyIG5vZGVMaXN0ID0gZWxtLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xyXG5cdFx0dmFyIG5vZGVBcnIgPSBbXS5zbGljZS5jYWxsKG5vZGVMaXN0KTtcclxuXHRcdG1hdGNoZWQgPSBtYXRjaGVkLmNvbmNhdChub2RlQXJyKTtcclxuXHR9KTtcclxuXHR3aGlsZSAobm9kZSl7XHJcblx0XHRpZiAofmRvbUVsbXMuaW5kZXhPZihub2RlKSl7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH07XHJcblx0XHRpZiAofm1hdGNoZWQuaW5kZXhPZihub2RlKSl7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fTtcclxuXHRcdG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XHJcblx0fTtcclxuXHRyZXR1cm4gZmFsc2U7XHJcbn07Ki9cclxuXHJcbi8qZnVuY3Rpb24gaXNJbnNpZGUoZmcsIG5vZGUpe1xyXG5cdHZhciBkb21FbG1zID0gZmcuZ2V0RG9tKCk7XHJcblx0d2hpbGUgKG5vZGUpe1xyXG5cdFx0aWYgKH5kb21FbG1zLmluZGV4T2Yobm9kZSkpe1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH07XHJcblx0XHRub2RlID0gbm9kZS5wYXJlbnROb2RlO1xyXG5cdH07XHJcblx0cmV0dXJuIGZhbHNlO1xyXG59O1xyXG4qL1xyXG5mdW5jdGlvbiBtYXRjaChmZywgbm9kZSwgc2VsZWN0b3Ipe1xyXG5cdHZhciBkb21FbG1zID0gZmcuZ2V0RG9tKCk7XHJcblx0dmFyIHJvb3RSZWFjaGVkID0gZmFsc2U7XHJcblx0d2hpbGUgKG5vZGUpe1xyXG5cdFx0aWYgKG5vZGUubWF0Y2hlcyhzZWxlY3Rvcikpe1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH07XHJcblx0XHRpZiAofmRvbUVsbXMuaW5kZXhPZihub2RlKSl7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH07XHRcdFxyXG5cdFx0bm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcclxuXHR9O1xyXG5cdHJldHVybiBmYWxzZTtcclxufTtcclxuXHJcbkZnQ2xhc3MucHJvdG90eXBlLm9uID0gZnVuY3Rpb24obmFtZSwgc2VsZWN0b3IsIGZuKXtcdFxyXG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID09IDIpe1xyXG5cdFx0bmFtZSA9IG5hbWU7XHJcblx0XHRmbiA9IGFyZ3VtZW50c1sxXTtcclxuXHRcdHNlbGVjdG9yID0gbnVsbDtcclxuXHR9ZWxzZXtcclxuXHRcdHZhciBvcmlnaW5hbEZuID0gZm47XHJcblx0XHRmbiA9IGZ1bmN0aW9uKGV2ZW50KXtcdFx0XHRcclxuXHRcdFx0aWYgKG1hdGNoKHRoaXMsIGV2ZW50LnRhcmdldCwgc2VsZWN0b3IpKXtcclxuXHRcdFx0XHRvcmlnaW5hbEZuLmNhbGwodGhpcywgZXZlbnQpO1xyXG5cdFx0XHR9O1xyXG5cdFx0fTtcclxuXHR9O1xyXG5cdGdsb2JhbEV2ZW50cy5saXN0ZW4obmFtZSk7XHJcblx0dGhpcy5ldmVudEVtaXR0ZXIub24obmFtZSwgZm4pO1x0XHJcbn07XHJcblxyXG5GZ0NsYXNzLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24obmFtZS8qLCByZXN0Ki8pe1xyXG5cdHRoaXMuZXZlbnRFbWl0dGVyLmVtaXQuYXBwbHkodGhpcy5ldmVudEVtaXR0ZXIsIGFyZ3VtZW50cyk7XHRcclxufTtcclxuXHJcbkZnQ2xhc3MucHJvdG90eXBlLmVtaXRBcHBseSA9IGZ1bmN0aW9uKG5hbWUsIHRoaXNBcmcsIGFyZ3Mpe1xyXG5cdHRoaXMuZXZlbnRFbWl0dGVyLmVtaXRBcHBseShuYW1lLCB0aGlzQXJnLCBhcmdzKTtcdFxyXG59O1xyXG5cclxuRmdDbGFzcy5wcm90b3R5cGUuY29va0RhdGEgPSBmdW5jdGlvbihkYXRhKXtcclxuXHRyZXR1cm4gZGF0YTtcclxufTtcclxuXHJcbkZnQ2xhc3MucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKGRhdGEsIG1ldGEsIHBhcmVudCl7XHJcblx0aWYgKGRhdGEgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCl7XHJcblx0XHRyZXR1cm4gdGhpcy5yZW5kZXJJbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXHJcblx0fTtcclxuXHR2YXIgZmcgPSBuZXcgZmdJbnN0YW5jZU1vZHVsZS5GZ0luc3RhbmNlKHRoaXMsIHBhcmVudCk7XHJcblx0ZmcuY29kZSA9IGZnLmdldEh0bWwoZGF0YSwgbWV0YSk7XHJcblx0cmV0dXJuIGZnO1xyXG59O1xyXG5cclxuRmdDbGFzcy5wcm90b3R5cGUucmVuZGVySW4gPSBmdW5jdGlvbihwYXJlbnROb2RlLCBkYXRhLCBtZXRhLCBwYXJlbnQpe1xyXG5cdHZhciBmZyA9IHRoaXMucmVuZGVyKGRhdGEsIG1ldGEsIHBhcmVudCk7XHJcblx0cGFyZW50Tm9kZS5pbm5lckhUTUwgPSBmZy5jb2RlO1xyXG5cdGZnLmFzc2lnbigpO1xyXG5cdHJldHVybiBmZztcclxufTtcclxuXHJcbkZnQ2xhc3MucHJvdG90eXBlLmFwcGVuZFRvID0gZnVuY3Rpb24ocGFyZW50Tm9kZSwgZGF0YSl7XHJcblx0dmFyIGZnID0gdGhpcy5yZW5kZXIoZGF0YSk7XHRcclxuXHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcblx0ZGl2LmlubmVySFRNTCA9IGZkLmNvZGU7XHJcblx0W10uc2xpY2UuY2FsbChkaXYuY2hpbGRyZW4pLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpe1xyXG5cdFx0cGFyZW50Tm9kZS5hcHBlbmRDaGlsZChjaGlsZCk7XHJcblx0fSk7XHJcblx0ZmcuYXNzaWduKCk7XHJcbn07XHJcblxyXG5leHBvcnRzLkZnQ2xhc3MgPSBGZ0NsYXNzO1xyXG5leHBvcnRzLmZnQ2xhc3NEaWN0ID0gZmdDbGFzc0RpY3Q7XHJcbmV4cG9ydHMuZmdDbGFzc1RhYmxlID0gZmdDbGFzc1RhYmxlOyIsInZhciBnYXBDbGFzc01nciA9IHJlcXVpcmUoJ2ZnLWpzL2NsaWVudC9nYXBDbGFzc01nci5qcycpO1xyXG52YXIgcmVuZGVyVHBsID0gcmVxdWlyZSgnZmctanMvdHBsUmVuZGVyLmpzJykucmVuZGVyVHBsO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZmctanMvZXZlbnRFbWl0dGVyLmpzJyk7XHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnLWpzL3V0aWxzLmpzJyk7XHJcbnZhciBHYXBTdG9yYWdlID0gcmVxdWlyZSgnZmctanMvY2xpZW50L2dhcFN0b3JhZ2UuanMnKS5HYXBTdG9yYWdlO1xyXG52YXIgaGVscGVyID0gcmVxdWlyZSgnLi9oZWxwZXIuanMnKTtcclxudmFyIGdsb2JhbEV2ZW50cyA9IHJlcXVpcmUoJ2ZnLWpzL2NsaWVudC9nbG9iYWxFdmVudHMuanMnKTtcclxuXHJcbnZhciBmZ0luc3RhbmNlVGFibGUgPSBbXTtcclxuXHJcbmZ1bmN0aW9uIEZnSW5zdGFuY2VCYXNlKGZnQ2xhc3MsIHBhcmVudCl7XHJcblx0dGhpcy5pZCA9IGZnSW5zdGFuY2VUYWJsZS5sZW5ndGg7XHJcblx0ZmdDbGFzcy5pbnN0YW5jZXMucHVzaCh0aGlzKTtcclxuXHR0aGlzLm5hbWUgPSBmZ0NsYXNzLm5hbWU7XHJcblx0dGhpcy5mZ0NsYXNzID0gZmdDbGFzcztcclxuXHR0aGlzLmNvZGUgPSBudWxsO1xyXG5cdHRoaXMucGFyZW50ID0gcGFyZW50IHx8IG51bGw7XHJcblx0dGhpcy5ldmVudEVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKGZnQ2xhc3MuZXZlbnRFbWl0dGVyKTtcclxuXHR0aGlzLmVtaXRBcHBseSA9IHRoaXMuZXZlbnRFbWl0dGVyLmVtaXRBcHBseS5iaW5kKHRoaXMuZXZlbnRFbWl0dGVyKTtcclxuXHR0aGlzLmdhcFN0b3JhZ2UgPSBuZXcgR2FwU3RvcmFnZSh0aGlzKTtcclxuXHR0aGlzLmNoaWxkRmdzID0gW107XHJcblx0ZmdJbnN0YW5jZVRhYmxlLnB1c2godGhpcyk7XHRcclxufTtcclxuXHJcbkZnSW5zdGFuY2VCYXNlLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XHJcblx0Z2xvYmFsRXZlbnRzLmxpc3RlbihldmVudCk7XHJcblx0dGhpcy5ldmVudEVtaXR0ZXIub24oZXZlbnQsIGZuKTtcdFxyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihuYW1lLyosIHJlc3QqLyl7XHJcblx0dGhpcy5ldmVudEVtaXR0ZXIuZW1pdC5hcHBseSh0aGlzLmV2ZW50RW1pdHRlciwgYXJndW1lbnRzKTtcdFxyXG59O1xyXG5cclxuZnVuY3Rpb24gRmdJbnN0YW5jZShmZ0NsYXNzLCBwYXJlbnQpe1xyXG5cdHJldHVybiBuZXcgZmdDbGFzcy5jcmVhdGVGbihmZ0NsYXNzLCBwYXJlbnQpO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKXtcclxuXHRyZXR1cm4gdGhpcy5jb2RlO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmFzc2lnbiA9IGZ1bmN0aW9uKCl7XHJcblx0dGhpcy5lbWl0QXBwbHkoJ3JlYWR5JywgdGhpcywgW10pO1xyXG5cdHRoaXMuZG9tID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZnLWlpZC0nICsgdGhpcy5pZCk7XHJcblx0dGhpcy5nYXBTdG9yYWdlLmFzc2lnbigpO1xyXG5cdHJldHVybiB0aGlzLmRvbTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGdldENsYXNzZXMobWV0YSl7XHJcblx0aWYgKCFtZXRhIHx8ICFtZXRhLmF0dHJzIHx8ICFtZXRhLmF0dHJzLmNsYXNzKXtcclxuXHRcdHJldHVybiBbXTtcclxuXHR9O1xyXG5cdGlmIChBcnJheS5pc0FycmF5KG1ldGEuYXR0cnMuY2xhc3MpKXtcclxuXHRcdHJldHVybiBtZXRhLmF0dHJzLmNsYXNzO1xyXG5cdH07XHRcdFxyXG5cdHJldHVybiBtZXRhLmF0dHJzLmNsYXNzLnNwbGl0KCcgJyk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBtZXRhTWFwKG1ldGFQYXJ0LCBpZCl7XHJcblx0Lyp2YXIgcmVzID0gdXRpbHMuY29uY2F0T2JqKHt9LCBtZXRhUGFydCB8fCB7fSk7XHJcblx0dmFyIGF0dHJzT2JqID0gbWV0YVBhcnQuYXR0cnMgfHwge307Ly91dGlscy5rZXlWYWx1ZVRvT2JqKG1ldGFQYXJ0LmF0dHJzIHx8IFtdLCAnbmFtZScsICd2YWx1ZScpO1xyXG5cdHZhciB0cGxDbGFzc2VzID0gKHJlcy5hdHRycyAmJiByZXMuYXR0cnMuY2xhc3MgfHwgJycpLnNwbGl0KCcgJyk7XHJcblx0dmFyIGZnX2NpZCA9IFwiZmctY2lkLVwiICsgdGhpcy5mZ0NsYXNzLmlkO1xyXG5cdHZhciBjbGFzc2VzID0gWydmZycsIGZnX2NpZF0uY29uY2F0KHRwbENsYXNzZXMpO1x0XHJcblx0YXR0cnNPYmouY2xhc3MgPSBjbGFzc2VzLmpvaW4oJyAnKTsqL1xyXG5cdHZhciByZXMgPSB1dGlscy5zaW1wbGVDbG9uZShtZXRhUGFydCk7XHJcblx0dmFyIGNsYXNzZXMgPSBnZXRDbGFzc2VzKHJlcyk7XHJcblx0dmFyIGZnX2NpZCA9IFwiZmctY2lkLVwiICsgdGhpcy5mZ0NsYXNzLmlkO1xyXG5cdHJlcy5hdHRycyA9IHV0aWxzLnNpbXBsZUNsb25lKG1ldGFQYXJ0LmF0dHJzKTtcclxuXHRpZiAoQXJyYXkuaXNBcnJheShyZXMuYXR0cnMuY2xhc3MpKXtcclxuXHRcdHJlcy5hdHRycy5jbGFzcyA9IFsnZmcnLCAnICcsIGZnX2NpZCwgJyAnXS5jb25jYXQoY2xhc3Nlcyk7XHJcblx0XHRyZXR1cm4gcmVzO1x0XHJcblx0fTtcdFxyXG5cdHJlcy5hdHRycy5jbGFzcyA9IFsnZmcnLCBmZ19jaWRdLmNvbmNhdChjbGFzc2VzKS5qb2luKCcgJyk7XHJcblx0cmV0dXJuIHJlcztcclxufTtcclxuXHJcbkZnSW5zdGFuY2VCYXNlLnByb3RvdHlwZS5yZW5kZXJUcGwgPSBmdW5jdGlvbih0cGwsIHBhcmVudCwgZGF0YSwgbWV0YSl7XHJcblx0cmV0dXJuIHJlbmRlclRwbC5jYWxsKHtcclxuXHRcdFwiZ2FwQ2xhc3NNZ3JcIjogZ2FwQ2xhc3NNZ3IsXHJcblx0XHRcImNvbnRleHRcIjogdGhpc1xyXG5cdH0sIHRwbCwgcGFyZW50LCBkYXRhLCBtZXRhKTtcclxufTtcclxuXHJcbkZnSW5zdGFuY2VCYXNlLnByb3RvdHlwZS5nZXRIdG1sID0gZnVuY3Rpb24oZGF0YSwgbWV0YSl7XHJcblx0dGhpcy5kYXRhID0gZGF0YTtcclxuXHR0aGlzLmdhcE1ldGEgPSBtZXRhO1xyXG5cdHZhciByb290R2FwID0gbmV3IGdhcENsYXNzTWdyLkdhcCh0aGlzLCBtZXRhKTtcclxuXHRyb290R2FwLnR5cGUgPSBcInJvb3RcIjtcclxuXHRyb290R2FwLmlzVmlydHVhbCA9IHRydWU7XHJcblx0cm9vdEdhcC5mZyA9IHRoaXM7XHJcblx0cm9vdEdhcC5zY29wZVBhdGggPSBbXTtcclxuXHR0aGlzLm1ldGEgPSByb290R2FwO1xyXG5cdHZhciBjb29rZWREYXRhID0gdGhpcy5mZ0NsYXNzLmNvb2tEYXRhKGRhdGEpO1xyXG5cdHJldHVybiB0aGlzLnJlbmRlclRwbCh0aGlzLmZnQ2xhc3MudHBsLCByb290R2FwLCBkYXRhLCBtZXRhTWFwLmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKHNjb3BlUGF0aCwgbmV3VmFsdWUpe1xyXG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID09IDApe1xyXG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKFtdLCB0aGlzLmRhdGEpOyAvLyB0b2RvXHJcblx0fTtcclxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAxKXtcclxuXHRcdHJldHVybiB0aGlzLnVwZGF0ZShbXSwgYXJndW1lbnRzWzBdKTtcclxuXHR9O1xyXG5cdHZhciB2YWx1ZSA9IHV0aWxzLmRlZXBDbG9uZShuZXdWYWx1ZSk7XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdHZhciBvbGRWYWx1ZSA9IHV0aWxzLm9ialBhdGgoc2NvcGVQYXRoLCB0aGlzLmRhdGEpO1xyXG5cdGlmIChvbGRWYWx1ZSA9PT0gdmFsdWUpe1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fTtcdFxyXG5cdHRoaXMuZW1pdCgndXBkYXRlJywgc2NvcGVQYXRoLCBuZXdWYWx1ZSk7XHJcblx0aWYgKHNjb3BlUGF0aC5sZW5ndGggPiAwKXtcclxuXHRcdHV0aWxzLm9ialBhdGgoc2NvcGVQYXRoLCB0aGlzLmRhdGEsIHZhbHVlKTtcclxuXHR9ZWxzZXtcclxuXHRcdHRoaXMuZGF0YSA9IHZhbHVlO1xyXG5cdH1cclxuXHR2YXIgc2NvcGUgPSB0aGlzLmdhcFN0b3JhZ2UuYnlTY29wZShzY29wZVBhdGgpO1xyXG5cdHZhciBnYXBzID0gc2NvcGUudGFyZ2V0O1xyXG5cdGdhcHMuZm9yRWFjaChmdW5jdGlvbihnYXApe1xyXG5cdFx0Z2FwQ2xhc3NNZ3IudXBkYXRlKHNlbGYsIGdhcCwgc2NvcGVQYXRoLCB2YWx1ZSwgb2xkVmFsdWUpO1xyXG5cdH0pO1xyXG5cdHNjb3BlLnBhcmVudHMuZm9yRWFjaChmdW5jdGlvbihwYXJlbnROb2RlKXtcclxuXHRcdHBhcmVudE5vZGUuZGF0YS5nYXBzLmZvckVhY2goZnVuY3Rpb24ocGFyZW50R2FwKXtcclxuXHRcdFx0aWYgKHBhcmVudEdhcC50eXBlID09IFwiZmdcIil7XHJcblx0XHRcdFx0dmFyIHN1YlBhdGggPSBzY29wZVBhdGguc2xpY2UocGFyZW50R2FwLnNjb3BlUGF0aC5sZW5ndGgpO1xyXG5cdFx0XHRcdHZhciBzdWJWYWwgPSB1dGlscy5vYmpQYXRoKHN1YlBhdGgsIHNlbGYuZGF0YSk7XHJcblx0XHRcdFx0cGFyZW50R2FwLmZnLnVwZGF0ZShzdWJQYXRoLCBuZXdWYWx1ZSk7XHJcblx0XHRcdH07XHRcdFx0XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHRzY29wZS5zdWJzLmZvckVhY2goZnVuY3Rpb24oc3ViKXtcclxuXHRcdHZhciBzdWJWYWwgPSB1dGlscy5vYmpQYXRoKHN1Yi5wYXRoLCBzZWxmLmRhdGEpO1x0XHJcblx0XHR2YXIgc3ViUGF0aCA9IHN1Yi5wYXRoLnNsaWNlKHNjb3BlUGF0aC5sZW5ndGgpO1xyXG5cdFx0dmFyIG9sZFN1YlZhbCA9IHV0aWxzLm9ialBhdGgoc3ViUGF0aCwgb2xkVmFsdWUpO1xyXG5cdFx0aWYgKHN1YlZhbCA9PSBvbGRTdWJWYWwpe1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9O1xyXG5cdFx0c3ViLmdhcHMuZm9yRWFjaChmdW5jdGlvbihnYXApe1xyXG5cdFx0XHRpZiAoIX5zZWxmLmdhcFN0b3JhZ2UuZ2Fwcy5pbmRleE9mKGdhcCkpe1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fTtcclxuXHRcdFx0Z2FwQ2xhc3NNZ3IudXBkYXRlKHNlbGYsIGdhcCwgc3ViLnBhdGgsIHN1YlZhbCwgb2xkU3ViVmFsKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cdHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gY3JlYXRlU2NvcGVIZWxwZXIoZmcsIG9iaiwgc2NvcGVQYXRoKXtcclxuXHR2YXIgaGVscGVyID0gQXJyYXkuaXNBcnJheShvYmopIFxyXG5cdFx0PyBbXSBcclxuXHRcdDoge307XHJcblx0dXRpbHMub2JqRm9yKG9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSl7XHJcblx0XHR2YXIgcHJvcFNjb3BlUGF0aCA9IHNjb3BlUGF0aC5jb25jYXQoW2tleV0pO1xyXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGhlbHBlciwga2V5LCB7XHJcblx0XHRcdGdldDogZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIpe1xyXG5cdFx0XHRcdFx0cmV0dXJuIGNyZWF0ZVNjb3BlSGVscGVyKGZnLCBvYmpba2V5XSwgcHJvcFNjb3BlUGF0aCk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRyZXR1cm4gb2JqW2tleV07XHJcblx0XHRcdH0sXHJcblx0XHRcdHNldDogZnVuY3Rpb24odmFsKXtcclxuXHRcdFx0XHRmZy51cGRhdGUocHJvcFNjb3BlUGF0aCwgdmFsKTtcdFx0XHRcdFxyXG5cdFx0XHR9XHRcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cdHJldHVybiBoZWxwZXI7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVGbkRhdGFIZWxwZXIoZmcsIG9iaiwgc2NvcGVQYXRoKXtcclxuXHJcblx0dXRpbHMub2JqRm9yKG9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSl7XHJcblx0XHR2YXIgcHJvcFNjb3BlUGF0aCA9IHNjb3BlUGF0aC5jb25jYXQoW2tleV0pO1xyXG5cclxuXHR9KTtcclxufTtcclxuXHJcbkZnSW5zdGFuY2VCYXNlLnByb3RvdHlwZS4kZCA9IGZ1bmN0aW9uKCl7XHJcblxyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLiRkYXRhID0gZnVuY3Rpb24obmV3RGF0YSl7XHJcblx0aWYgKG5ld0RhdGEpe1xyXG5cdFx0Ly8uLi5cclxuXHRcdHJldHVybjtcclxuXHR9O1xyXG5cdHZhciBoZWxwZXIgPSBjcmVhdGVTY29wZUhlbHBlcih0aGlzLCB0aGlzLmRhdGEsIFtdKTtcclxuXHRyZXR1cm4gaGVscGVyO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmNsb25lRGF0YSA9IGZ1bmN0aW9uKCl7XHJcblx0cmV0dXJuIHV0aWxzLmRlZXBDbG9uZSh0aGlzLmRhdGEpO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKXtcclxuXHR0aGlzLmNoaWxkRmdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpe1xyXG5cdFx0Y2hpbGQucmVtb3ZlKHRydWUpO1xyXG5cdH0pO1xyXG5cdHRoaXMuY29kZSA9ICcnO1xyXG5cdHRoaXMuZGF0YSA9IG51bGw7XHJcblx0dGhpcy5nYXBTdG9yYWdlID0gbnVsbDtcclxuXHR0aGlzLmNoaWxkRmdzID0gW107XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24odmlydHVhbCl7XHJcblx0aWYgKCF2aXJ0dWFsKXtcclxuXHRcdHZhciBkb20gPSB0aGlzLmdldERvbSgpO1xyXG5cdFx0ZG9tLmZvckVhY2goZnVuY3Rpb24oZWxtKXtcclxuXHRcdFx0ZWxtLnJlbW92ZSgpO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHR0aGlzLmNsZWFyKCk7XHJcblx0dmFyIGluc3RhbmNlSWQgPSB0aGlzLmZnQ2xhc3MuaW5zdGFuY2VzLmluZGV4T2YodGhpcyk7XHRcclxuXHR0aGlzLmZnQ2xhc3MuaW5zdGFuY2VzLnNwbGljZShpbnN0YW5jZUlkLCAxKTtcclxuXHRmZ0luc3RhbmNlVGFibGVbdGhpcy5pZF0gPSBudWxsO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLnJlcmVuZGVyID0gZnVuY3Rpb24oZGF0YSl7XHJcblx0dGhpcy5jbGVhcigpO1xyXG5cdHRoaXMuZ2FwU3RvcmFnZSA9IG5ldyBHYXBTdG9yYWdlKHRoaXMpO1xyXG5cdHZhciBkb20gPSB0aGlzLmdldERvbSgpWzBdO1xyXG5cdHRoaXMuY29kZSA9IHRoaXMuZ2V0SHRtbChkYXRhKTtcclxuXHRkb20ub3V0ZXJIVE1MID0gdGhpcy5jb2RlOyAvLyBkb2VzbnQgd29yayB3aXRoIG11bHRpIHJvb3RcclxuXHR0aGlzLmFzc2lnbigpO1xyXG5cdHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmdldERvbSA9IGZ1bmN0aW9uKCl7XHJcblx0cmV0dXJuIHRoaXMubWV0YS5nZXREb20oKTtcclxufTtcclxuXHJcbkZnSW5zdGFuY2VCYXNlLnByb3RvdHlwZS5qcSA9IGZ1bmN0aW9uKCl7XHJcblx0dmFyIGRvbSA9IHRoaXMuZ2V0RG9tKCk7XHJcblx0dmFyIHJlcyA9IGhlbHBlci5qcShkb20pO1xyXG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID09IDApe1xyXG5cdFx0cmV0dXJuIHJlcztcclxuXHR9O1xyXG5cdHZhciBzZWxlY3RvciA9IGFyZ3VtZW50c1swXTtcclxuXHR2YXIgc2VsZlNlbGVjdGVkID0gcmVzXHJcblx0XHQucGFyZW50KClcclxuXHRcdC5maW5kKHNlbGVjdG9yKVxyXG5cdFx0LmZpbHRlcihmdW5jdGlvbihpZCwgZWxtKXtcclxuXHRcdFx0cmV0dXJuIH5kb20uaW5kZXhPZihlbG0pO1xyXG5cdFx0fSk7XHJcblx0dmFyIGNoaWxkU2VsZWN0ZWQgPSByZXMuZmluZChzZWxlY3Rvcik7XHJcblx0cmV0dXJuIHNlbGZTZWxlY3RlZC5hZGQoY2hpbGRTZWxlY3RlZCk7XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUuZ2FwID0gZnVuY3Rpb24oaWQpe1xyXG5cdHJldHVybiB0aGlzLmdhcHMoaWQpWzBdO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmdhcHMgPSBmdW5jdGlvbihpZCl7XHJcblx0dmFyIGdhcHMgPSB0aGlzLmdhcFN0b3JhZ2UuYnlFaWQoaWQpO1xyXG5cdGlmIChnYXBzKXtcclxuXHRcdHJldHVybiBnYXBzO1xyXG5cdH07XHRcclxufTtcclxuXHJcbkZnSW5zdGFuY2VCYXNlLnByb3RvdHlwZS5lbG0gPSBGZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUuZ2FwOyAvLyBsZWdhY3lcclxuXHJcbkZnSW5zdGFuY2VCYXNlLnByb3RvdHlwZS5lbG1zID0gRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmdhcHM7IC8vIGxlZ2FjeVxyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uKGlkKXtcclxuXHR2YXIgZ2FwID0gdGhpcy5nYXAoaWQpO1xyXG5cdGlmICghZ2FwKXtcclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH07XHJcblx0cmV0dXJuIGdhcC5mZyB8fCBudWxsOyBcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRGZ0J5SWlkKGlpZCl7XHJcblx0cmV0dXJuIGZnSW5zdGFuY2VUYWJsZVtpaWRdO1xyXG59O1xyXG5cclxuZXhwb3J0cy5nZXRGZ0J5SWlkID0gZ2V0RmdCeUlpZDtcclxuZXhwb3J0cy5GZ0luc3RhbmNlID0gRmdJbnN0YW5jZTtcclxuZXhwb3J0cy5GZ0luc3RhbmNlQmFzZSA9IEZnSW5zdGFuY2VCYXNlO1xyXG5leHBvcnRzLmZnSW5zdGFuY2VUYWJsZSA9IGZnSW5zdGFuY2VUYWJsZTsiLCJ2YXIgZ2FwQ2xhc3NlcyA9IHJlcXVpcmUoJy4vZ2Fwcy5qcycpO1xyXG52YXIgdXRpbHMgPSByZXF1aXJlKCdmZy1qcy91dGlscycpO1xyXG5cclxuZnVuY3Rpb24gR2FwKGNvbnRleHQsIHBhcnNlZE1ldGEsIHBhcmVudCl7XHJcblx0dXRpbHMuZXh0ZW5kKHRoaXMsIHBhcnNlZE1ldGEpO1xyXG5cdHRoaXMuY2hpbGRyZW4gPSBbXTtcdFxyXG5cdHRoaXMucGFyZW50ID0gcGFyZW50IHx8IG51bGw7XHJcblx0dGhpcy5yb290ID0gdGhpcztcclxuXHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1x0XHJcblx0dGhpcy5zY29wZVBhdGggPSB1dGlscy5nZXRTY29wZVBhdGgodGhpcyk7XHJcblx0Ly90aGlzLnRyaWdnZXJzID0gW107XHJcblx0Y29udGV4dC5nYXBTdG9yYWdlLnJlZyh0aGlzKTtcclxuXHRpZiAoIXBhcmVudCl7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9O1xyXG5cdHRoaXMucm9vdCA9IHBhcmVudC5yb290O1xyXG5cdHBhcmVudC5jaGlsZHJlbi5wdXNoKHRoaXMpO1xyXG59O1xyXG5cclxuR2FwLnByb3RvdHlwZS5jbG9zZXN0ID0gZnVuY3Rpb24oc2VsZWN0b3Ipe1xyXG5cdHZhciBlaWQgPSBzZWxlY3Rvci5zbGljZSgxKTtcclxuXHRnYXAgPSB0aGlzLnBhcmVudDtcclxuXHR3aGlsZSAoZ2FwKXtcclxuXHRcdGlmIChnYXAuZWlkID09IGVpZCl7XHJcblx0XHRcdHJldHVybiBnYXA7XHJcblx0XHR9O1xyXG5cdFx0Z2FwID0gZ2FwLnBhcmVudDtcclxuXHR9O1xyXG5cdHJldHVybiBudWxsO1xyXG59O1xyXG5cclxuR2FwLnByb3RvdHlwZS5kYXRhID0gZnVuY3Rpb24odmFsKXtcclxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAwKXtcclxuXHRcdHJldHVybiB1dGlscy5vYmpQYXRoKHRoaXMuc2NvcGVQYXRoLCB0aGlzLmNvbnRleHQuZGF0YSk7XHJcblx0fTtcclxuXHR0aGlzLmNvbnRleHQudXBkYXRlKHRoaXMuc2NvcGVQYXRoLCB2YWwpO1x0XHJcbn07XHJcblxyXG5HYXAucHJvdG90eXBlLmZpbmRSZWFsRG93biA9IGZ1bmN0aW9uKCl7XHJcblx0aWYgKCF0aGlzLmlzVmlydHVhbCl7XHJcblx0XHRyZXR1cm4gW3RoaXNdO1xyXG5cdH07XHJcblx0dmFyIHJlcyA9IFtdO1xyXG5cdHRoaXMuY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uKGNoaWxkKXtcclxuXHRcdHJlcyA9IHJlcy5jb25jYXQoY2hpbGQuZmluZFJlYWxEb3duKCkpO1xyXG5cdH0pO1xyXG5cdHJldHVybiByZXM7XHJcbn07XHJcblxyXG5HYXAucHJvdG90eXBlLmdldERvbSA9IGZ1bmN0aW9uKCl7XHJcblx0aWYgKCF0aGlzLmlzVmlydHVhbCl7XHJcblx0XHR2YXIgaWQgPSBbXCJmZ1wiLCB0aGlzLmNvbnRleHQuaWQsIFwiZ2lkXCIsIHRoaXMuZ2lkXS5qb2luKCctJyk7XHJcblx0XHRyZXR1cm4gW2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKV07XHJcblx0fTtcclxuXHR2YXIgcmVzID0gW107XHJcblx0dGhpcy5maW5kUmVhbERvd24oKS5mb3JFYWNoKGZ1bmN0aW9uKGdhcCl7XHJcblx0XHRyZXMgPSByZXMuY29uY2F0KGdhcC5nZXREb20oKSk7XHJcblx0fSk7XHJcblx0cmV0dXJuIHJlcztcclxufTtcclxuXHJcbkdhcC5wcm90b3R5cGUucmVtb3ZlRG9tID0gZnVuY3Rpb24oKXtcclxuXHR2YXIgZG9tID0gdGhpcy5nZXREb20oKTtcclxuXHRkb20uZm9yRWFjaChmdW5jdGlvbihlbG0pe1xyXG5cdFx0aWYgKCFlbG0pe1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9O1xyXG5cdFx0ZWxtLnJlbW92ZSgpO1xyXG5cdH0pO1xyXG59O1xyXG5cclxuZXhwb3J0cy5HYXAgPSBHYXA7XHJcblxyXG5mdW5jdGlvbiByZW5kZXIoY29udGV4dCwgcGFyZW50LCBkYXRhLCBtZXRhKXtcclxuXHR2YXIgZ2FwID0gbmV3IEdhcChjb250ZXh0LCBtZXRhLCBwYXJlbnQpO1xyXG5cdHZhciBnYXBDbGFzcyA9IGdhcENsYXNzZXNbbWV0YS50eXBlXTtcclxuXHRyZXR1cm4gZ2FwQ2xhc3MucmVuZGVyLmNhbGwoZ2FwLCBjb250ZXh0LCBkYXRhKTtcclxufTtcclxuXHJcbmV4cG9ydHMucmVuZGVyID0gcmVuZGVyO1xyXG5cclxuZnVuY3Rpb24gdXBkYXRlKGNvbnRleHQsIGdhcE1ldGEsIHNjb3BlUGF0aCwgdmFsdWUsIG9sZFZhbHVlKXtcclxuXHR2YXIgZ2FwQ2xhc3MgPSBnYXBDbGFzc2VzW2dhcE1ldGEudHlwZV07XHJcblx0aWYgKCFnYXBDbGFzcyl7XHJcblx0XHRyZXR1cm47XHJcblx0fTtcclxuXHRyZXR1cm4gZ2FwQ2xhc3MudXBkYXRlKGNvbnRleHQsIGdhcE1ldGEsIHNjb3BlUGF0aCwgdmFsdWUsIG9sZFZhbHVlKTtcclxufTtcclxuXHJcbmV4cG9ydHMudXBkYXRlID0gdXBkYXRlOyIsInZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnLWpzL3V0aWxzLmpzJyk7XHJcbnZhciBUcmVlSGVscGVyID0gcmVxdWlyZSgnZmctanMvdXRpbHMvdHJlZUhlbHBlci5qcycpO1xyXG5cclxuZnVuY3Rpb24gaW5pdE5vZGVGbigpe1xyXG5cdHJldHVybiB7XHJcblx0XHRnYXBzOiBbXVxyXG5cdH07XHJcbn07XHJcblxyXG5mdW5jdGlvbiBHYXBTdG9yYWdlKGNvbnRleHQpe1xyXG5cdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XHJcblx0dGhpcy5nYXBzID0gW107XHJcblx0dGhpcy5zY29wZVRyZWUgPSBuZXcgVHJlZUhlbHBlcih7XHJcblx0XHRraW5kOiAnZGljdCcsXHJcblx0XHRpbml0Tm9kZTogaW5pdE5vZGVGblxyXG5cdH0pO1xyXG5cdHRoaXMuZWlkRGljdCA9IHt9O1x0XHJcbn07XHJcblxyXG5HYXBTdG9yYWdlLnByb3RvdHlwZS5zZXRTY29wZVRyaWdnZXIgPSBmdW5jdGlvbihnYXAsIHNjb3BlUGF0aCl7XHJcblx0dmFyIHNjb3BlID0gdGhpcy5zY29wZVRyZWUuYWNjZXNzKHNjb3BlUGF0aCk7XHRcclxuXHRzY29wZS5kYXRhLmdhcHMucHVzaChnYXApO1xyXG59O1xyXG5cclxuLypHYXBTdG9yYWdlLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihtZXRhLCBzY29wZVRyaWdnZXJzLCBnaWQpe1xyXG5cdHNjb3BlVHJpZ2dlcnMgPSBzY29wZVRyaWdnZXJzIHx8IFttZXRhLnNjb3BlUGF0aF07XHJcblx0dmFyIGdhcCA9IHtcclxuXHRcdFwiaWRcIjogZ2lkIHx8IHRoaXMuZ2V0R2lkKCksXHJcblx0XHRcIm1ldGFcIjogbWV0YVxyXG5cdH07XHJcblx0c2NvcGVUcmlnZ2Vycy5mb3JFYWNoKHRoaXMuc2V0U2NvcGVUcmlnZ2VyLmJpbmQodGhpcywgZ2FwKSk7XHJcblx0dGhpcy5nYXBzLnB1c2goZ2FwKTtcclxufTtcclxuXHJcbkdhcFN0b3JhZ2UucHJvdG90eXBlLnNldEF0dHJzID0gZnVuY3Rpb24obWV0YSwgYXR0cnMsIGdpZCl7XHJcblx0dmFyIGZnR2FwQ2xhc3MgPSAnZmctZ2FwLScgKyB0aGlzLmNvbnRleHQuaWQ7XHJcblx0YXR0cnMuY2xhc3MgPSBhdHRycy5jbGFzcyBcclxuXHRcdD8gZmdHYXBDbGFzcyArICcgJyArIGF0dHJzLmNsYXNzXHJcblx0XHQ6IGZnR2FwQ2xhc3M7XHJcblx0YXR0cnNbXCJkYXRhLWZnLVwiICsgdGhpcy5jb250ZXh0LmlkICsgXCItZ2FwLWlkXCJdID0gZ2lkO1xyXG5cdC8vYXR0cnMuaWQgPSBbXCJmZ1wiLCB0aGlzLmNvbnRleHQuaWQsIFwiZ2FwLWlkXCIsIGdpZF0uam9pbignLScpO1xyXG4gXHRyZXR1cm4gYXR0cnM7XHJcbn07Ki9cclxuXHJcbkdhcFN0b3JhZ2UucHJvdG90eXBlLnNldFRyaWdnZXJzID0gZnVuY3Rpb24oZ2FwTWV0YSwgc2NvcGVUcmlnZ2Vycyl7XHRcclxuXHRzY29wZVRyaWdnZXJzLmZvckVhY2godGhpcy5zZXRTY29wZVRyaWdnZXIuYmluZCh0aGlzLCBnYXBNZXRhKSk7XHJcbn07XHJcblxyXG5HYXBTdG9yYWdlLnByb3RvdHlwZS5yZWcgPSBmdW5jdGlvbihnYXBNZXRhKXtcclxuXHR2YXIgZWlkID0gZ2FwTWV0YS5laWQ7XHJcblx0aWYgKGVpZCl7XHRcdFxyXG5cdFx0dGhpcy5laWREaWN0W2VpZF0gPSB0aGlzLmVpZERpY3RbZWlkXSB8fCBbXTtcclxuXHRcdHRoaXMuZWlkRGljdFtlaWRdLnB1c2goZ2FwTWV0YSk7XHJcblx0fTtcclxuXHR2YXIgZ2lkID0gdGhpcy5nZXRHaWQoKTtcclxuXHRnYXBNZXRhLmdpZCA9IGdpZDtcclxuXHRpZiAoIWdhcE1ldGEuaXNWaXJ0dWFsKXtcclxuXHRcdGdhcE1ldGEuYXR0cnMgPSB1dGlscy5zaW1wbGVDbG9uZShnYXBNZXRhLmF0dHJzIHx8IHt9KTtcdFx0XHJcblx0XHRnYXBNZXRhLmF0dHJzLmlkID0gW1wiZmdcIiwgdGhpcy5jb250ZXh0LmlkLCBcImdpZFwiLCBnaWRdLmpvaW4oJy0nKTtcclxuXHR9O1xyXG5cdGdhcE1ldGEuc3RvcmFnZUlkID0gdGhpcy5nYXBzLmxlbmd0aDtcclxuXHR0aGlzLmdhcHMucHVzaChnYXBNZXRhKTtcdFx0XHJcblx0Ly9yZXR1cm4gYXR0cnNPYmo7XHJcbn07XHJcblxyXG5HYXBTdG9yYWdlLnByb3RvdHlwZS5hc3NpZ24gPSBmdW5jdGlvbigpe1xyXG5cdC8vaWYgKClcclxuXHR0aGlzLmdhcHMuZm9yRWFjaChmdW5jdGlvbihnYXBNZXRhKXtcclxuXHRcdGlmIChnYXBNZXRhLnR5cGUgIT0gXCJyb290XCIgJiYgZ2FwTWV0YS5mZyl7XHJcblx0XHRcdGdhcE1ldGEuZmcuYXNzaWduKCk7XHJcblx0XHR9O1xyXG5cdH0pO1xyXG5cdHJldHVybjtcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0dmFyIGdhcE5vZGVzID0gdGhpcy5jb250ZXh0LmRvbS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdmZy1nYXAtJyArIHRoaXMuY29udGV4dC5pZCk7XHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBnYXBOb2Rlcy5sZW5ndGg7IGkrKyl7XHJcblx0XHR2YXIgZ2FwTm9kZSA9IGdhcE5vZGVzW2ldO1xyXG5cdFx0dmFyIGdpZCA9IGdhcE5vZGUuZ2V0QXR0cmlidXRlKCdkYXRhLWZnLScgKyB0aGlzLmNvbnRleHQuaWQgKyAnLWdhcC1pZCcpO1xyXG5cdFx0dmFyIGdhcCA9IHNlbGYuZ2Fwc1tnaWRdO1xyXG5cdFx0aWYgKCFnYXApe2NvbnRpbnVlfTtcclxuXHRcdGlmIChnYXAubWV0YS5mZyl7XHJcblx0XHRcdGdhcC5tZXRhLmZnLmFzc2lnbigpO1xyXG5cdFx0fTtcclxuXHRcdGdhcC5tZXRhLmRvbSA9IGdhcE5vZGU7XHJcblx0fTtcclxufTtcclxuXHJcbi8qR2FwU3RvcmFnZS5wcm90b3R5cGUuc3ViVHJlZSA9IGZ1bmN0aW9uKHNjb3BlUGF0aCl7XHJcblx0dmFyIGJyYW5jaCA9IGFjY2Vzc1Njb3BlTGVhZih0aGlzLnNjb3BlVHJlZSwgc2NvcGVQYXRoKTtcclxuXHR2YXIgcmVzID0gW107XHJcblxyXG5cdGZ1bmN0aW9uIGl0ZXJhdGUobm9kZSl7XHJcblx0XHRmb3IgKHZhciBpIGluIG5vZGUuY2hpbGRyZW4pe1xyXG5cclxuXHRcdH07XHJcblx0fTtcclxuXHJcblxyXG59OyovXHJcblxyXG5HYXBTdG9yYWdlLnByb3RvdHlwZS5ieVNjb3BlID0gZnVuY3Rpb24oc2NvcGVQYXRoLCB0YXJnZXRPbmx5KXtcclxuXHR2YXIgc2NvcGUgPSB0aGlzLnNjb3BlVHJlZS5hY2Nlc3Moc2NvcGVQYXRoKTtcdFx0XHJcblx0dmFyIHN1Yk5vZGVzID0gW107XHJcblx0aWYgKHNjb3BlLmNoaWxkQ291bnQgIT0gMCAmJiAhdGFyZ2V0T25seSl7XHJcblx0XHRzdWJOb2RlcyA9IHNjb3BlLmdldERlZXBDaGlsZEFycigpLm1hcChmdW5jdGlvbihub2RlKXtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRnYXBzOiBub2RlLmRhdGEuZ2FwcyxcclxuXHRcdFx0XHRwYXRoOiBub2RlLnBhdGhcdFxyXG5cdFx0XHR9O1x0XHRcdFxyXG5cdFx0fSk7XHJcblx0fTtcclxuXHR2YXIgcGFyZW50cyA9IHNjb3BlLmdldFBhcmVudHMoKTtcclxuXHRyZXR1cm4ge1xyXG5cdFx0dGFyZ2V0OiBzY29wZS5kYXRhLmdhcHMsXHJcblx0XHRzdWJzOiBzdWJOb2RlcyxcclxuXHRcdHBhcmVudHM6IHBhcmVudHNcclxuXHR9O1xyXG59O1xyXG5cclxuR2FwU3RvcmFnZS5wcm90b3R5cGUucmVtb3ZlU2NvcGUgPSBmdW5jdGlvbihzY29wZVBhdGgpe1xyXG5cdHZhciBzY29wZSA9IHRoaXMuYnlTY29wZShzY29wZVBhdGgpO1x0XHJcblx0dmFyIHJlbW92ZWREb21HYXBzID0gc2NvcGUudGFyZ2V0O1xyXG5cdHZhciByZW1vdmVkR2FwcyA9IHNjb3BlLnRhcmdldDtcclxuXHRzY29wZS5zdWJzLmZvckVhY2goZnVuY3Rpb24obm9kZSl7XHJcblx0XHRyZW1vdmVkR2FwcyA9IHJlbW92ZWRHYXBzLmNvbmNhdChub2RlLmdhcHMpO1xyXG5cdH0pO1xyXG5cdHRoaXMuc2NvcGVUcmVlLnJlbW92ZShzY29wZVBhdGgpO1xyXG5cdHRoaXMuZ2FwcyA9IHRoaXMuZ2Fwcy5maWx0ZXIoZnVuY3Rpb24oZ2FwKXtcclxuXHRcdHJldHVybiAhfnJlbW92ZWRHYXBzLmluZGV4T2YoZ2FwKTtcclxuXHR9KTtcclxuXHRyZW1vdmVkRG9tR2Fwcy5mb3JFYWNoKGZ1bmN0aW9uKGdhcCl7XHJcblx0XHRnYXAucmVtb3ZlRG9tKCk7XHJcblx0fSk7XHJcbn07XHJcblxyXG5HYXBTdG9yYWdlLnByb3RvdHlwZS5ieUVpZCA9IGZ1bmN0aW9uKGVpZCl7XHJcblx0cmV0dXJuIHRoaXMuZWlkRGljdFtlaWRdO1xyXG59O1xyXG5cclxuR2FwU3RvcmFnZS5wcm90b3R5cGUuZ2V0R2lkID0gZnVuY3Rpb24oKXtcclxuXHRyZXR1cm4gdGhpcy5nYXBzLmxlbmd0aDtcclxufTtcclxuXHJcbmV4cG9ydHMuR2FwU3RvcmFnZSA9IEdhcFN0b3JhZ2U7XHJcbiIsInZhciBnYXBDbGFzc01nciA9IHJlcXVpcmUoJy4vZ2FwQ2xhc3NNZ3IuanMnKTt2YXIgcmVuZGVyVHBsID0gcmVxdWlyZSgnZmctanMvdHBsUmVuZGVyLmpzJykucmVuZGVyVHBsLmJpbmQobnVsbCwgZ2FwQ2xhc3NNZ3IpO1xuZXhwb3J0c1tcImRhdGFcIl0gPSB7XG5cdFwicmVuZGVyXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBkYXRhKXtcclxuXHRcdHZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnLWpzL3V0aWxzJyk7XHJcblx0XHRjb250ZXh0LmdhcFN0b3JhZ2Uuc2V0VHJpZ2dlcnModGhpcywgW3RoaXMuc2NvcGVQYXRoXSk7XHJcblx0XHR2YXIgdmFsdWUgPSB1dGlscy5vYmpQYXRoKHRoaXMuc2NvcGVQYXRoLCBkYXRhKVxyXG5cdFx0cmV0dXJuIHV0aWxzLnJlbmRlclRhZyh7XHJcblx0XHRcdG5hbWU6IFwic3BhblwiLFxyXG5cdFx0XHRhdHRyczogdGhpcy5hdHRycyxcclxuXHRcdFx0aW5uZXJIVE1MOiB2YWx1ZVxyXG5cdFx0fSk7XHJcblx0fSxcblwidXBkYXRlXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBtZXRhLCBzY29wZVBhdGgsIHZhbHVlKXtcclxuXHRcdHZhciBub2RlID0gbWV0YS5nZXREb20oKVswXTtcclxuXHRcdGlmICghbm9kZSl7XHJcblx0XHRcdFxyXG5cdFx0fTtcclxuXHRcdG5vZGUuaW5uZXJIVE1MID0gdmFsdWU7XHJcblx0XHQvL2hpZ2hsaWdodChub2RlLCBbMHhmZmZmZmYsIDB4ZmZlZTg4XSwgNTAwKTtcclxuXHR9XG59O1xuXG5leHBvcnRzW1wic2NvcGVcIl0gPSB7XG5cdFwicmVuZGVyXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBkYXRhKXtcclxuXHRcdHZhciBtZXRhID0gdGhpcztcclxuXHRcdG1ldGEuaXRlbXMgPSBbXTtcclxuXHRcdHZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnLWpzL3V0aWxzJyk7XHJcblx0XHRtZXRhLnNjb3BlUGF0aCA9IHV0aWxzLmdldFNjb3BlUGF0aChtZXRhKTtcdFx0XHJcblx0XHR2YXIgc2NvcGVEYXRhID0gdXRpbHMub2JqUGF0aChtZXRhLnNjb3BlUGF0aCwgZGF0YSk7XHJcblx0XHRjb250ZXh0LmdhcFN0b3JhZ2Uuc2V0VHJpZ2dlcnModGhpcywgW3RoaXMuc2NvcGVQYXRoXSk7XHJcblx0XHR2YXIgcGxhY2VIb2xkZXJJbm5lciA9IFsnZmcnLCBjb250ZXh0LmlkLCAnc2NvcGUtZ2lkJywgbWV0YS5naWRdLmpvaW4oJy0nKTtcclxuXHRcdGlmICghc2NvcGVEYXRhKXtcclxuXHRcdFx0cmV0dXJuICc8IS0tJyArIHBsYWNlSG9sZGVySW5uZXIgKyAnLS0+JztcclxuXHRcdH07XHRcdFxyXG5cdFx0dmFyIHBhcnRzID0gdXRpbHMucmVuZGVyU2NvcGVDb250ZW50KGNvbnRleHQsIG1ldGEsIHNjb3BlRGF0YSwgZGF0YSwgMCk7XHJcblx0XHRwYXJ0cy5wdXNoKCc8IS0tJyArIHBsYWNlSG9sZGVySW5uZXIgKyAnLS0+Jyk7XHJcblx0XHRyZXR1cm4gcGFydHMuam9pbignXFxuJyk7XHJcblx0fSxcblwidXBkYXRlXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBtZXRhLCBzY29wZVBhdGgsIHZhbHVlLCBvbGRWYWx1ZSl7XHRcdFxyXG5cdFx0dmFyIHV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMnKTtcclxuXHRcdHZhciBnYXBDbGFzc01nciA9IHJlcXVpcmUoJ2ZnLWpzL2NsaWVudC9nYXBDbGFzc01nci5qcycpO1xyXG5cdFx0dmFsdWUgPSB2YWx1ZSB8fCBbXTtcclxuXHRcdGZvciAodmFyIGkgPSB2YWx1ZS5sZW5ndGg7IGkgPCBvbGRWYWx1ZS5sZW5ndGg7IGkrKyl7XHJcblx0XHRcdGNvbnRleHQuZ2FwU3RvcmFnZS5yZW1vdmVTY29wZShzY29wZVBhdGguY29uY2F0KFtpXSkpO1xyXG5cdFx0fTtcclxuXHRcdGlmICh2YWx1ZS5sZW5ndGggPiBvbGRWYWx1ZS5sZW5ndGgpe1xyXG5cdFx0XHR2YXIgc2NvcGVIb2xkZXIgPSB1dGlscy5maW5kU2NvcGVIb2xkZXIobWV0YSk7XHJcblx0XHRcdHZhciBub2RlcyA9IFtdLnNsaWNlLmNhbGwoc2NvcGVIb2xkZXIuZ2V0RG9tKClbMF0uY2hpbGROb2Rlcyk7XHJcblx0XHRcdHZhciBwbGFjZUhvbGRlcklubmVyID0gWydmZycsIGNvbnRleHQuaWQsICdzY29wZS1naWQnLCBtZXRhLmdpZF0uam9pbignLScpO1xyXG5cdFx0XHR2YXIgZm91bmQgPSBub2Rlcy5maWx0ZXIoZnVuY3Rpb24obm9kZSl7XHJcblx0XHRcdCAgICBpZiAobm9kZS5ub2RlVHlwZSAhPSA4KXtcclxuXHRcdFx0ICAgICAgICByZXR1cm4gZmFsc2VcclxuXHRcdFx0ICAgIH07XHJcblx0XHRcdCAgICBpZiAobm9kZS50ZXh0Q29udGVudCA9PSBwbGFjZUhvbGRlcklubmVyKXtcclxuXHRcdFx0ICAgIFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdCAgICB9O1x0XHRcdCAgICBcclxuXHRcdFx0fSk7XHJcblx0XHRcdGZvdW5kID0gZm91bmRbMF07XHJcblx0XHRcdHZhciBkYXRhU2xpY2UgPSB2YWx1ZS5zbGljZShvbGRWYWx1ZS5sZW5ndGgpO1xyXG5cdFx0XHR2YXIgbmV3Q29udGVudCA9IHV0aWxzLnJlbmRlclNjb3BlQ29udGVudChjb250ZXh0LCBtZXRhLCBkYXRhU2xpY2UsIGNvbnRleHQuZGF0YSwgb2xkVmFsdWUubGVuZ3RoKS5qb2luKCdcXG4nKTtcclxuXHRcdFx0dXRpbHMuaW5zZXJ0SFRNTEJlZm9yZUNvbW1lbnQoZm91bmQsIG5ld0NvbnRlbnQpO1xyXG5cdFx0fTtcclxuXHRcdHRoaXM7XHJcblx0XHQvL2NvbnRleHQucmVyZW5kZXIoY29udGV4dC5kYXRhKTtcclxuXHR9XG59O1xuXG5leHBvcnRzW1wic2NvcGUtaXRlbVwiXSA9IHtcblx0XCJyZW5kZXJcIjogZnVuY3Rpb24gKGNvbnRleHQsIGRhdGEpe1xyXG5cdFx0dmFyIG1ldGEgPSB0aGlzO1xyXG5cdFx0dmFyIHV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMnKTtcdFx0XHJcblx0XHRtZXRhLnNjb3BlUGF0aCA9IHV0aWxzLmdldFNjb3BlUGF0aChtZXRhKTtcdFx0XHJcblx0XHR2YXIgc2NvcGVEYXRhID0gdXRpbHMub2JqUGF0aChtZXRhLnNjb3BlUGF0aCwgZGF0YSk7XHJcblx0XHRjb250ZXh0LmdhcFN0b3JhZ2Uuc2V0VHJpZ2dlcnModGhpcywgW3RoaXMuc2NvcGVQYXRoXSk7XHJcblx0XHRpZiAoIXNjb3BlRGF0YSl7XHJcblx0XHRcdHJldHVybiAnJztcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gY29udGV4dC5yZW5kZXJUcGwobWV0YS5jb250ZW50LCBtZXRhLCBkYXRhKTtcclxuXHR9LFxuXCJ1cGRhdGVcIjogZnVuY3Rpb24gKGNvbnRleHQsIG1ldGEsIHNjb3BlUGF0aCwgdmFsdWUsIG9sZFZhbHVlKXtcdFx0XHJcblx0XHRyZXR1cm47XHJcblx0fVxufTtcblxuZXhwb3J0c1tcImZnXCJdID0ge1xuXHRcInJlbmRlclwiOiBmdW5jdGlvbiAoY29udGV4dCwgZGF0YSwgbWV0YSl7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR2YXIgdXRpbHMgPSByZXF1aXJlKCdmZy1qcy91dGlscycpO1xyXG5cdFx0dGhpcy5wYXJlbnRGZyA9IGNvbnRleHQ7XHJcblx0XHQvL3RoaXMucmVuZGVyZWRDb250ZW50ID0gY29udGV4dC5yZW5kZXJUcGwodGhpcy5jb250ZW50LCBtZXRhLCBkYXRhKTtcclxuXHRcdHZhciBmZ0NsYXNzID0gJGZnLmNsYXNzZXNbdGhpcy5mZ05hbWVdO1x0XHJcblx0XHR2YXIgc2NvcGVEYXRhID0gdXRpbHMuZGVlcENsb25lKHV0aWxzLm9ialBhdGgodGhpcy5zY29wZVBhdGgsIGRhdGEpKTtcdFx0XHRcclxuXHRcdHZhciBmZyA9IGZnQ2xhc3MucmVuZGVyKHNjb3BlRGF0YSwgdGhpcywgY29udGV4dCk7XHJcblx0XHRmZy5vbigndXBkYXRlJywgZnVuY3Rpb24ocGF0aCwgdmFsKXtcclxuXHRcdFx0Y29udGV4dC51cGRhdGUoc2VsZi5zY29wZVBhdGguY29uY2F0KHBhdGgpLCB2YWwpO1xyXG5cdFx0XHQvL2NvbnNvbGUubG9nKHBhdGgsIHZhbCk7XHJcblx0XHR9KTtcclxuXHRcdHRoaXMuZmcgPSBmZztcclxuXHRcdGZnLm1ldGEgPSB0aGlzO1xyXG5cdFx0Y29udGV4dC5jaGlsZEZncy5wdXNoKGZnKTtcclxuXHRcdGNvbnRleHQuZ2FwU3RvcmFnZS5zZXRUcmlnZ2Vycyh0aGlzLCBbdGhpcy5zY29wZVBhdGhdKTtcdFx0XHJcblx0XHRyZXR1cm4gZmc7XHJcblx0XHRpZiAodHJ1ZSl7IC8vIGNsaWVudFxyXG5cdFx0XHRcclxuXHRcdH07XHRcdFxyXG5cdFx0dGhyb3cgJ3RvZG8gc2VydmVyIHJlbmRlcic7XHJcblx0fSxcblwidXBkYXRlXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBtZXRhLCBzY29wZVBhdGgsIHZhbHVlKXtcclxuXHRcdHJldHVybjtcclxuXHR9XG59O1xuXG5leHBvcnRzW1wiY29udGVudFwiXSA9IHtcblx0XCJyZW5kZXJcIjogZnVuY3Rpb24gKGNvbnRleHQsIGRhdGEsIG1ldGEpe1xyXG5cdFx0dGhpcy5zY29wZVBhdGggPSBjb250ZXh0LmdhcE1ldGEuc2NvcGVQYXRoO1xyXG5cdFx0Ly92YXIgdXRpbHMgPSByZXF1aXJlKCdmZy91dGlscycpO1x0XHRcdFxyXG5cdFx0cmV0dXJuIGNvbnRleHQucGFyZW50LnJlbmRlclRwbChjb250ZXh0Lm1ldGEuY29udGVudCwgdGhpcywgY29udGV4dC5wYXJlbnQuZGF0YSk7XHJcblx0fSxcblwidXBkYXRlXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBtZXRhLCBzY29wZVBhdGgsIHZhbHVlKXtcclxuXHRcdHJldHVybjtcclxuXHR9XG59O1xuXG5leHBvcnRzW1wicmF3XCJdID0ge1xuXHRcInJlbmRlclwiOiBmdW5jdGlvbiAoY29udGV4dCwgZGF0YSl7XHRcdFxyXG5cdFx0dmFyIG1ldGEgPSB0aGlzO1xyXG5cdFx0dmFyIHV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMnKTtcclxuXHRcdGlmIChtZXRhLmlzU2NvcGVIb2xkZXIpe1xyXG5cdFx0XHRtZXRhLnJvb3QuY3VycmVudFNjb3BlSG9sZGVyID0gbWV0YTtcdFx0XHJcblx0XHR9O1xyXG5cdFx0dmFyIGF0dHJEYXRhID0gdXRpbHMub2JqUGF0aChtZXRhLnNjb3BlUGF0aCwgZGF0YSk7XHJcblx0XHR2YXIgYXR0cnNBcnIgPSB1dGlscy5vYmpUb0tleVZhbHVlKG1ldGEuYXR0cnMsICduYW1lJywgJ3ZhbHVlJyk7XHJcblx0XHR2YXIgcmVuZGVyZWRBdHRycyA9IHV0aWxzLnJlbmRlckF0dHJzKG1ldGEuYXR0cnMsIGF0dHJEYXRhKTtcclxuXHRcdHZhciB0cmlnZ2VycyA9IHV0aWxzXHJcblx0XHRcdC5nZXRBdHRyc1BhdGhzKG1ldGEuYXR0cnMpXHRcclxuXHRcdFx0Lm1hcChmdW5jdGlvbihwYXRoKXtcclxuXHRcdFx0XHRyZXR1cm4gdXRpbHMucmVzb2x2ZVBhdGgobWV0YS5zY29wZVBhdGgsIHBhdGgpO1xyXG5cdFx0XHR9KTtcdFxyXG5cdFx0dmFyIHZhbHVlUGF0aDtcclxuXHRcdGlmIChtZXRhLnZhbHVlKXtcclxuXHRcdFx0dmFsdWVQYXRoID0gdXRpbHMucmVzb2x2ZVBhdGgobWV0YS5zY29wZVBhdGgsIG1ldGEudmFsdWUpO1xyXG5cdFx0XHR0cmlnZ2Vycy5wdXNoKHZhbHVlUGF0aCk7XHJcblx0XHRcdG1ldGEudmFsdWVQYXRoID0gdmFsdWVQYXRoO1xyXG5cdFx0fTsgXHJcblx0XHQvKnZhciBzY29wZVRyaWdnZXJzID0gYXR0cnNQYXRocztcclxuXHRcdGlmIChtZXRhLmlzU2NvcGVJdGVtKXtcclxuXHRcdFx0c2NvcGVUcmlnZ2Vycy5wdXNoKG1ldGEuc2NvcGVQYXRoKTtcclxuXHRcdH07Ki9cclxuXHRcdGNvbnRleHQuZ2FwU3RvcmFnZS5zZXRUcmlnZ2VycyhtZXRhLCB0cmlnZ2Vycyk7XHRcdFxyXG5cdFx0dmFyIGlubmVyID0gbWV0YS52YWx1ZSBcclxuXHRcdFx0PyB1dGlscy5vYmpQYXRoKHZhbHVlUGF0aCwgZGF0YSlcclxuXHRcdFx0OiBjb250ZXh0LnJlbmRlclRwbChtZXRhLmNvbnRlbnQsIG1ldGEsIGRhdGEpO1xyXG5cdFx0cmV0dXJuIHV0aWxzLnJlbmRlclRhZyh7XHJcblx0XHRcdFwibmFtZVwiOiBtZXRhLnRhZ05hbWUsXHJcblx0XHRcdFwiYXR0cnNcIjogcmVuZGVyZWRBdHRycyxcclxuXHRcdFx0XCJpbm5lckhUTUxcIjogaW5uZXJcclxuXHRcdH0pO1xyXG5cdH0sXG5cInVwZGF0ZVwiOiBmdW5jdGlvbiAoY29udGV4dCwgbWV0YSwgc2NvcGVQYXRoLCB2YWx1ZSl7XHJcblx0XHQvLyB0byBkbyB2YWx1ZSB1cGRhdGVcclxuXHRcdHZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnLWpzL3V0aWxzJyk7XHJcblx0XHR2YXIgYXR0ckRhdGEgPSB1dGlscy5vYmpQYXRoKG1ldGEuc2NvcGVQYXRoLCBjb250ZXh0LmRhdGEpO1xyXG5cdFx0dmFyIHJlbmRlcmVkQXR0cnMgPSB1dGlscy5yZW5kZXJBdHRycyhtZXRhLmF0dHJzLCBhdHRyRGF0YSk7XHJcblx0XHR2YXIgZG9tID0gbWV0YS5nZXREb20oKVswXTtcclxuXHRcdGlmIChtZXRhLnZhbHVlICYmIG1ldGEudmFsdWVQYXRoLmpvaW4oJy0nKSA9PSBzY29wZVBhdGguam9pbignLScpKXtcclxuXHRcdFx0ZG9tLmlubmVySFRNTCA9IHZhbHVlO1xyXG5cdFx0fTtcclxuXHRcdHV0aWxzLm9iakZvcihyZW5kZXJlZEF0dHJzLCBmdW5jdGlvbih2YWx1ZSwgbmFtZSl7XHJcblx0XHRcdHZhciBvbGRWYWwgPSBkb20uZ2V0QXR0cmlidXRlKG5hbWUpO1xyXG5cdFx0XHRpZiAob2xkVmFsICE9IHZhbHVlKXtcclxuXHRcdFx0XHRkb20uc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcclxuXHRcdFx0fTtcclxuXHRcdH0pO1x0XHRcclxuXHR9XG59OyIsInZhciBldmVudHMgPSB7fTtcclxuXHJcbmZ1bmN0aW9uIGhhbmRsZXIobmFtZSwgZXZlbnQpe1xyXG5cdHZhciBlbG0gPSBldmVudC50YXJnZXQ7XHJcblx0d2hpbGUgKGVsbSl7XHJcblx0XHR2YXIgZmcgPSAkZmcuYnlEb20oZWxtKTtcclxuXHRcdGlmIChmZyl7XHJcblx0XHRcdGZnLmVtaXRBcHBseShuYW1lLCBmZywgW2V2ZW50XSk7XHJcblx0XHRcdC8vcmV0dXJuO1xyXG5cdFx0fTtcclxuXHRcdGVsbSA9IGVsbS5wYXJlbnROb2RlO1xyXG5cdH07XHJcbn07XHJcblxyXG5leHBvcnRzLmxpc3RlbiA9IGZ1bmN0aW9uKG5hbWUpe1xyXG5cdGlmIChuYW1lIGluIGV2ZW50cyl7XHJcblx0XHRyZXR1cm47XHJcblx0fTtcdFxyXG5cdGV2ZW50c1tuYW1lXSA9IHRydWU7XHJcblx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBoYW5kbGVyLmJpbmQobnVsbCwgbmFtZSksIHtcImNhcHR1cmVcIjogdHJ1ZX0pO1xyXG59OyIsIm1vZHVsZS5leHBvcnRzID0gJGZnO1xyXG5cclxudmFyIGZnQ2xhc3NNb2R1bGUgPSByZXF1aXJlKCdmZy1qcy9jbGllbnQvZmdDbGFzcy5qcycpO1xyXG52YXIgZmdJbnN0YW5jZU1vZHVsZSA9IHJlcXVpcmUoJ2ZnLWpzL2NsaWVudC9mZ0luc3RhbmNlLmpzJyk7XHJcblxyXG5mdW5jdGlvbiAkZmcoYXJnKXtcclxuXHRpZiAoYXJnIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpe1xyXG5cdFx0cmV0dXJuICRmZy5ieURvbShhcmcpO1xyXG5cdH07XHJcblx0aWYgKHR5cGVvZiBhcmcgPT0gXCJzdHJpbmdcIil7XHJcblx0XHRyZXR1cm4gZmdDbGFzc01vZHVsZS5mZ0NsYXNzRGljdFthcmddO1xyXG5cdH07XHJcbn07XHJcblxyXG4kZmcubG9hZCA9IGZ1bmN0aW9uKGZnRGF0YSl7XHJcblx0aWYgKEFycmF5LmlzQXJyYXkoZmdEYXRhKSl7XHRcdFxyXG5cdFx0cmV0dXJuIGZnRGF0YS5tYXAoJGZnLmxvYWQpO1xyXG5cdH07XHJcblx0cmV0dXJuIG5ldyBmZ0NsYXNzTW9kdWxlLkZnQ2xhc3MoZmdEYXRhKTtcclxufTtcclxuXHJcbiRmZy5pc0ZnID0gZnVuY3Rpb24oZG9tTm9kZSl7XHJcblx0cmV0dXJuIGRvbU5vZGUuY2xhc3NMaXN0ICYmIGRvbU5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdmZycpO1xyXG59O1xyXG5cclxudmFyIGlpZFJlID0gL2ZnXFwtaWlkXFwtKFxcZCspL2c7XHJcbnZhciBpZFJlID0gL2ZnXFwtKFxcZCspXFwtZ2lkXFwtKFxcZCspL2c7XHJcblxyXG4kZmcuYnlEb20gPSBmdW5jdGlvbihkb21Ob2RlKXtcdFxyXG5cdGlmICghZG9tTm9kZSB8fCAhZG9tTm9kZS5jbGFzc05hbWUpe1xyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fTtcclxuXHRpZiAoIX5kb21Ob2RlLmNsYXNzTmFtZS5zcGxpdCgnICcpLmluZGV4T2YoJ2ZnJykpe1xyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fTtcclxuXHRpZiAoIWRvbU5vZGUuaWQpe1xyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fTtcclxuXHRpZFJlLmxhc3RJbmRleCA9IDA7XHJcblx0dmFyIHJlcyA9IGlkUmUuZXhlYyhkb21Ob2RlLmlkKTtcclxuXHRpZiAoIXJlcyl7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9O1xyXG5cdHZhciBpaWQgPSBwYXJzZUludChyZXNbMV0pO1xyXG5cdHJldHVybiBmZ0luc3RhbmNlTW9kdWxlLmdldEZnQnlJaWQoaWlkKTtcdFxyXG59O1xyXG5cclxuJGZnLmdhcENsb3Nlc3QgPSBmdW5jdGlvbihkb21Ob2RlKXtcclxuXHR3aGlsZSAodHJ1ZSl7XHJcblx0XHRpZFJlLmxhc3RJbmRleCA9IDA7XHJcblx0XHR2YXIgcmVzID0gaWRSZS5leGVjKGRvbU5vZGUuaWQpO1xyXG5cdFx0aWYgKCFyZXMpe1xyXG5cdFx0XHRkb21Ob2RlID0gZG9tTm9kZS5wYXJlbnROb2RlO1xyXG5cdFx0XHRpZiAoIWRvbU5vZGUpe1xyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH07XHJcblx0XHR2YXIgaWlkID0gcGFyc2VJbnQocmVzWzFdKTtcclxuXHRcdHZhciBmZyA9IGZnSW5zdGFuY2VNb2R1bGUuZ2V0RmdCeUlpZChpaWQpO1xyXG5cdFx0dmFyIGdpZCA9IHBhcnNlSW50KHJlc1syXSk7XHJcblx0XHRyZXR1cm4gZmcuZ2FwU3RvcmFnZS5nYXBzW2dpZF07XHJcblx0fTtcclxufTtcclxuXHJcbiRmZy5jbGFzc2VzID0gZmdDbGFzc01vZHVsZS5mZ0NsYXNzRGljdDtcclxuXHJcbiRmZy5mZ3MgPSBmZ0luc3RhbmNlTW9kdWxlLmZnSW5zdGFuY2VUYWJsZTtcclxuXHJcbiRmZy5qcSA9IHdpbmRvdy5qUXVlcnk7XHJcblxyXG53aW5kb3cuJGZnID0gJGZnOyIsInZhciBmZ0hlbHBlciA9IHJlcXVpcmUoJy4vaGVscGVyLmpzJyk7IiwiZnVuY3Rpb24gRXZlbnRFbWl0dGVyKHBhcmVudCl7XHJcblx0dGhpcy5ldmVudHMgPSB7fTtcclxuXHR0aGlzLnBhcmVudCA9IHBhcmVudDtcclxufTtcclxuXHJcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbihuYW1lLCBmbil7XHJcblx0dmFyIGV2ZW50TGlzdCA9IHRoaXMuZXZlbnRzW25hbWVdO1xyXG5cdGlmICghZXZlbnRMaXN0KXtcclxuXHRcdGV2ZW50TGlzdCA9IFtdO1xyXG5cdFx0dGhpcy5ldmVudHNbbmFtZV0gPSBldmVudExpc3Q7XHJcblx0fTtcclxuXHRldmVudExpc3QucHVzaChmbik7XHJcbn07XHJcblxyXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihuYW1lLyosIHJlc3QqLyl7XHJcblx0aWYgKHRoaXMucGFyZW50KXtcclxuXHRcdHRoaXMucGFyZW50LmVtaXQuYXBwbHkodGhpcy5wYXJlbnQsIGFyZ3VtZW50cyk7XHJcblx0fTtcclxuXHR2YXIgZXZlbnRMaXN0ID0gdGhpcy5ldmVudHNbbmFtZV07XHJcblx0aWYgKCFldmVudExpc3Qpe1xyXG5cdFx0cmV0dXJuO1xyXG5cdH07XHJcblx0dmFyIGVtaXRBcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1x0IFxyXG5cdGV2ZW50TGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGZuKXtcclxuXHRcdGZuLmFwcGx5KHRoaXMsIGVtaXRBcmdzKTtcclxuXHR9KTtcclxufTtcclxuXHJcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdEFwcGx5ID0gZnVuY3Rpb24obmFtZSwgdGhpc0FyZywgYXJncyl7XHJcblx0aWYgKHRoaXMucGFyZW50KXtcclxuXHRcdHRoaXMucGFyZW50LmVtaXRBcHBseS5hcHBseSh0aGlzLnBhcmVudCwgYXJndW1lbnRzKTtcclxuXHR9O1xyXG5cdHZhciBldmVudExpc3QgPSB0aGlzLmV2ZW50c1tuYW1lXTtcclxuXHRpZiAoIWV2ZW50TGlzdCl7XHJcblx0XHRyZXR1cm47XHJcblx0fTtcclxuXHRldmVudExpc3QuZm9yRWFjaChmdW5jdGlvbihmbil7XHJcblx0XHRmbi5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuXHR9KTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyOyIsInZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnLWpzL3V0aWxzJyk7XHJcblxyXG5mdW5jdGlvbiByZW5kZXJUcGwodHBsLCBwYXJlbnQsIGRhdGEsIG1ldGEpe1xyXG5cdHZhciBzZWxmID0gdGhpcztcclxuXHR2YXIgcGFydHMgPSB0cGwubWFwKGZ1bmN0aW9uKHBhcnQsIHBhcnRJZCl7XHJcblx0XHRpZiAodHlwZW9mIHBhcnQgPT0gXCJzdHJpbmdcIil7XHJcblx0XHRcdHJldHVybiBwYXJ0O1xyXG5cdFx0fTtcclxuXHRcdHZhciBwYXJ0TWV0YSA9IHV0aWxzLnNpbXBsZUNsb25lKHBhcnQpO1xyXG5cdFx0aWYgKG1ldGEpe1xyXG5cdFx0XHRpZiAodHlwZW9mIG1ldGEgPT0gXCJmdW5jdGlvblwiKXtcclxuXHRcdFx0XHRwYXJ0TWV0YSA9IG1ldGEocGFydE1ldGEsIHBhcnRJZCk7XHJcblx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdHBhcnRNZXRhID0gdXRpbHMuZXh0ZW5kKHBhcnRNZXRhLCBtZXRhIHx8IHt9KTtcdFx0XHRcclxuXHRcdFx0fTtcdFxyXG5cdFx0fTtcdFx0XHJcblx0XHRyZXR1cm4gc2VsZi5nYXBDbGFzc01nci5yZW5kZXIoc2VsZi5jb250ZXh0LCBwYXJlbnQsIGRhdGEsIHBhcnRNZXRhKTtcclxuXHR9KTtcclxuXHR2YXIgY29kZSA9IHBhcnRzLmpvaW4oJycpO1xyXG5cdHJldHVybiBjb2RlO1xyXG59O1xyXG5cclxuZXhwb3J0cy5yZW5kZXJUcGwgPSByZW5kZXJUcGw7IiwidmFyIHRwbFV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMvdHBsVXRpbHMuanMnKTtcclxuZXh0ZW5kKGV4cG9ydHMsIHRwbFV0aWxzKTtcclxuXHJcbmZ1bmN0aW9uIG9iakZvcihvYmosIGZuKXtcclxuXHRmb3IgKHZhciBpIGluIG9iail7XHJcblx0XHRmbihvYmpbaV0sIGksIG9iaik7XHJcblx0fTtcclxufTtcclxuZXhwb3J0cy5vYmpGb3IgPSBvYmpGb3I7XHJcblxyXG5mdW5jdGlvbiBvYmpQYXRoKHBhdGgsIG9iaiwgbmV3VmFsKXtcclxuXHRpZiAocGF0aC5sZW5ndGggPCAxKXtcclxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMil7XHJcblx0XHRcdHRocm93ICdyb290IHJld3JpdHRpbmcgaXMgbm90IHN1cHBvcnRlZCc7XHJcblx0XHR9O1xyXG5cdFx0cmV0dXJuIG9iajtcclxuXHR9O1xyXG5cdHZhciBwcm9wTmFtZSA9IHBhdGhbMF07XHJcblx0aWYgKHBhdGgubGVuZ3RoID09IDEpe1xyXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKXtcclxuXHRcdFx0b2JqW3Byb3BOYW1lXSA9IG5ld1ZhbDsgXHJcblx0XHR9O1x0XHRcdFx0XHJcblx0XHRyZXR1cm4gb2JqW3Byb3BOYW1lXTtcdFxyXG5cdH07XHJcblx0dmFyIHN1Yk9iaiA9IG9ialtwcm9wTmFtZV07XHJcblx0aWYgKHN1Yk9iaiA9PT0gdW5kZWZpbmVkKXtcclxuXHRcdC8vdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJlYWQgXCIgKyBwcm9wTmFtZSArIFwiIG9mIHVuZGVmaW5lZFwiKTtcclxuXHRcdHJldHVybiB1bmRlZmluZWQ7IC8vIHRocm93P1xyXG5cdH07XHRcdFxyXG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMil7XHJcblx0XHRyZXR1cm4gb2JqUGF0aChwYXRoLnNsaWNlKDEpLCBzdWJPYmosIG5ld1ZhbCk7XHJcblx0fTtcclxuXHRyZXR1cm4gb2JqUGF0aChwYXRoLnNsaWNlKDEpLCBzdWJPYmopO1xyXG59O1xyXG5leHBvcnRzLm9ialBhdGggPSBvYmpQYXRoO1xyXG5cclxuXHJcbmZ1bmN0aW9uIGF0dHJzVG9PYmooYXR0cnMpe1xyXG5cdHZhciByZXMgPSB7fTtcclxuXHRhdHRycy5mb3JFYWNoKGZ1bmN0aW9uKGkpe1xyXG5cdFx0cmVzW2kubmFtZV0gPSBpLnZhbHVlO1xyXG5cdH0pOyBcclxuXHRyZXR1cm4gcmVzO1xyXG59O1xyXG5leHBvcnRzLmF0dHJzVG9PYmogPSBhdHRyc1RvT2JqO1xyXG5cclxuXHJcbmZ1bmN0aW9uIHNpbXBsZUNsb25lKG9iail7XHJcblx0dmFyIHJlcyA9IHt9O1xyXG5cdGZvciAodmFyIGkgaW4gb2JqKXtcclxuXHRcdHJlc1tpXSA9IG9ialtpXTtcclxuXHR9O1xyXG5cdHJldHVybiByZXM7XHJcbn07XHJcbmV4cG9ydHMuc2ltcGxlQ2xvbmUgPSBzaW1wbGVDbG9uZTtcclxuXHJcblxyXG5mdW5jdGlvbiBtaXhBcnJheXMoYXJyYXlzKXtcclxuXHR2YXIgaWQgPSAwO1xyXG5cdHZhciBtYXhMZW5ndGggPSAwO1xyXG5cdHZhciB0b3RhbExlbmd0aCA9IDA7XHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspe1xyXG5cdFx0bWF4TGVuZ3RoID0gTWF0aC5tYXgoYXJndW1lbnRzW2ldLmxlbmd0aCwgbWF4TGVuZ3RoKTtcclxuXHRcdHRvdGFsTGVuZ3RoICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XHJcblx0fTtcclxuXHR2YXIgcmVzQXJyID0gW107XHJcblx0dmFyIGFycmF5Q291bnQgPSBhcmd1bWVudHMubGVuZ3RoO1xyXG5cdGZvciAodmFyIGlkID0gMDsgaWQgPCBtYXhMZW5ndGg7IGlkKyspe1x0XHRcdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Q291bnQ7IGkrKyl7XHJcblx0XHRcdGlmIChhcmd1bWVudHNbaV0ubGVuZ3RoID4gaWQpe1xyXG5cdFx0XHRcdHJlc0Fyci5wdXNoKGFyZ3VtZW50c1tpXVtpZF0pO1xyXG5cdFx0XHR9O1xyXG5cdFx0fTtcclxuXHR9O1xyXG5cdHJldHVybiByZXNBcnI7XHJcbn07XHJcbmV4cG9ydHMubWl4QXJyYXlzID0gbWl4QXJyYXlzO1xyXG5cclxuZnVuY3Rpb24gcmVzb2x2ZVBhdGgocm9vdFBhdGgsIHJlbFBhdGgpe1xyXG5cdHZhciByZXNQYXRoID0gcm9vdFBhdGguc2xpY2UoKTtcclxuXHRyZWxQYXRoID0gcmVsUGF0aCB8fCBbXTtcclxuXHRyZWxQYXRoLmZvckVhY2goZnVuY3Rpb24oa2V5KXtcclxuXHRcdGlmIChrZXkgPT0gXCJfcm9vdFwiKXtcclxuXHRcdFx0cmVzUGF0aCA9IFtdO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9O1xyXG5cdFx0cmVzUGF0aC5wdXNoKGtleSk7XHJcblx0fSk7XHJcblx0cmV0dXJuIHJlc1BhdGg7XHJcbn07XHJcbmV4cG9ydHMucmVzb2x2ZVBhdGggPSByZXNvbHZlUGF0aDtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRTY29wZVBhdGgobWV0YSl7XHJcblx0dmFyXHRwYXJlbnRQYXRoID0gW107XHJcblx0aWYgKG1ldGEucGFyZW50KXtcclxuXHRcdHBhcmVudFBhdGggPSBtZXRhLnBhcmVudC5zY29wZVBhdGg7XHJcblx0XHRpZiAoIXBhcmVudFBhdGgpe1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJQYXJlbnQgZWxtIG11c3QgaGF2ZSBzY29wZVBhdGhcIik7XHJcblx0XHR9O1xyXG5cdH07XHJcblx0cmV0dXJuIHJlc29sdmVQYXRoKHBhcmVudFBhdGgsIG1ldGEucGF0aClcclxufTtcclxuZXhwb3J0cy5nZXRTY29wZVBhdGggPSBnZXRTY29wZVBhdGg7XHJcblxyXG5mdW5jdGlvbiBrZXlWYWx1ZVRvT2JqKGFyciwga2V5TmFtZSwgdmFsdWVOYW1lKXtcclxuXHRrZXlOYW1lID0ga2V5TmFtZSB8fCAna2V5JztcclxuXHR2YWx1ZU5hbWUgPSB2YWx1ZU5hbWUgfHwgJ3ZhbHVlJztcclxuXHR2YXIgcmVzID0ge307XHJcblx0YXJyLmZvckVhY2goZnVuY3Rpb24oaSl7XHJcblx0XHRyZXNbaVtrZXlOYW1lXV0gPSBpW3ZhbHVlTmFtZV07XHJcblx0fSk7IFxyXG5cdHJldHVybiByZXM7XHJcbn07XHJcbmV4cG9ydHMua2V5VmFsdWVUb09iaiA9IGtleVZhbHVlVG9PYmo7XHRcclxuXHJcbmZ1bmN0aW9uIG9ialRvS2V5VmFsdWUob2JqLCBrZXlOYW1lLCB2YWx1ZU5hbWUpe1xyXG5cdGtleU5hbWUgPSBrZXlOYW1lIHx8ICdrZXknO1xyXG5cdHZhbHVlTmFtZSA9IHZhbHVlTmFtZSB8fCAndmFsdWUnO1xyXG5cdHZhciByZXMgPSBbXTtcclxuXHRmb3IgKHZhciBpIGluIG9iail7XHJcblx0XHR2YXIgaXRlbSA9IHt9O1xyXG5cdFx0aXRlbVtrZXlOYW1lXSA9IGk7XHJcblx0XHRpdGVtW3ZhbHVlTmFtZV0gPSBvYmpbaV07XHJcblx0XHRyZXMucHVzaChpdGVtKTtcclxuXHR9O1xyXG5cdHJldHVybiByZXM7XHJcbn07XHJcbmV4cG9ydHMub2JqVG9LZXlWYWx1ZSA9IG9ialRvS2V5VmFsdWU7XHJcblxyXG5mdW5jdGlvbiBjbG9uZShvYmope1xyXG5cdHJldHVybiBPYmplY3QuY3JlYXRlKG9iaik7XHJcbn07XHJcbmV4cG9ydHMuY2xvbmUgPSBjbG9uZTtcclxuXHJcblxyXG5mdW5jdGlvbiBjb25jYXRPYmoob2JqMSwgb2JqMil7XHJcblx0dmFyIHJlcyA9IHNpbXBsZUNsb25lKG9iajEpO1xyXG5cdGZvciAodmFyIGkgaW4gb2JqMil7XHJcblx0XHRyZXNbaV0gPSBvYmoyW2ldO1xyXG5cdH07XHJcblx0cmV0dXJuIHJlcztcclxufTtcclxuZXhwb3J0cy5jb25jYXRPYmogPSBjb25jYXRPYmo7XHJcblxyXG5mdW5jdGlvbiBleHRlbmQoZGVzdCwgc3JjKXtcdFxyXG5cdGZvciAodmFyIGkgaW4gc3JjKXtcclxuXHRcdGRlc3RbaV0gPSBzcmNbaV07XHJcblx0fTtcclxuXHRyZXR1cm4gZGVzdDtcclxufTtcclxuZXhwb3J0cy5leHRlbmQgPSBleHRlbmQ7XHJcblxyXG5mdW5jdGlvbiBmaW5kU2NvcGVIb2xkZXIobWV0YSl7XHJcbiAgICB2YXIgbm9kZSA9IG1ldGEucGFyZW50O1xyXG4gICAgd2hpbGUgKG5vZGUpe1xyXG4gICAgICAgIGlmIChub2RlLmlzU2NvcGVIb2xkZXIpe1xyXG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIG5vZGUgPSBub2RlLnBhcmVudDsgIFxyXG4gICAgfTtcclxuICAgIHRocm93ICdjYW5ub3QgZmluZCBzY29wZSBob2xkZXInO1xyXG59O1xyXG5leHBvcnRzLmZpbmRTY29wZUhvbGRlciA9IGZpbmRTY29wZUhvbGRlcjtcclxuXHJcbmZ1bmN0aW9uIHJlbmRlclNjb3BlQ29udGVudChjb250ZXh0LCBzY29wZU1ldGEsIHNjb3BlRGF0YSwgZGF0YSwgaWRPZmZzZXQpe1xyXG5cdHZhciBnYXBDbGFzc01nciA9IHJlcXVpcmUoJ2ZnLWpzL2NsaWVudC9nYXBDbGFzc01nci5qcycpO1xyXG5cdHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheShzY29wZURhdGEpO1xyXG5cdGlmICghaXNBcnJheSl7XHJcblx0XHRzY29wZURhdGEgPSBbc2NvcGVEYXRhXTtcclxuXHR9O1xyXG5cdHZhciBwYXJ0cyA9IHNjb3BlRGF0YS5tYXAoZnVuY3Rpb24oZGF0YUl0ZW0sIGlkKXtcclxuXHRcdHZhciBpdGVtTWV0YSA9IHNjb3BlTWV0YTtcclxuXHRcdGlmIChpc0FycmF5KXtcclxuXHRcdFx0dmFyIGl0ZW1DZmcgPSB7XHJcblx0XHRcdFx0XCJ0eXBlXCI6IFwic2NvcGUtaXRlbVwiLFxyXG5cdFx0XHRcdFwiaXNWaXJ0dWFsXCI6IHRydWUsXHJcblx0XHRcdFx0XCJwYXRoXCI6IFtpZCArIGlkT2Zmc2V0XSxcclxuXHRcdFx0XHRcImNvbnRlbnRcIjogc2NvcGVNZXRhLmNvbnRlbnRcclxuXHRcdFx0fTtcclxuXHRcdFx0aWYgKHNjb3BlTWV0YS5laWQpe1xyXG5cdFx0XHRcdGl0ZW1DZmcuZWlkID0gc2NvcGVNZXRhLmVpZCArICctaXRlbSc7XHJcblx0XHRcdH07XHJcblx0XHRcdGl0ZW1NZXRhID0gbmV3IGdhcENsYXNzTWdyLkdhcChjb250ZXh0LCBpdGVtQ2ZnLCBpdGVtTWV0YSk7XHJcblx0XHRcdGNvbnRleHQuZ2FwU3RvcmFnZS5zZXRUcmlnZ2VycyhpdGVtTWV0YSwgW2l0ZW1NZXRhLnNjb3BlUGF0aF0pO1xyXG5cdFx0fTtcclxuXHRcdHJldHVybiBnYXBDbGFzc01nci5yZW5kZXIoY29udGV4dCwgc2NvcGVNZXRhLCBkYXRhLCBpdGVtTWV0YSk7XHJcblx0fSk7XHJcblx0cmV0dXJuIHBhcnRzO1xyXG59O1xyXG5leHBvcnRzLnJlbmRlclNjb3BlQ29udGVudCA9IHJlbmRlclNjb3BlQ29udGVudDtcclxuXHJcbmZ1bmN0aW9uIGluc2VydEhUTUxCZWZvcmVDb21tZW50KGNvbW1lbnRFbG0sIGh0bWwpe1xyXG5cdHZhciBwcmV2ID0gY29tbWVudEVsbS5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xyXG5cdGlmIChwcmV2KXtcclxuXHRcdHByZXYuaW5zZXJ0QWRqYWNlbnRIVE1MKCdhZnRlcmVuZCcsIGh0bWwpO1xyXG5cdFx0cmV0dXJuO1xyXG5cdH07XHJcblx0Y29tbWVudEVsbS5wYXJlbnROb2RlLmluc2VydEFkamFjZW50SFRNTCgnYWZ0ZXJiZWdpbicsIGh0bWwpO1xyXG59O1xyXG5leHBvcnRzLmluc2VydEhUTUxCZWZvcmVDb21tZW50ID0gaW5zZXJ0SFRNTEJlZm9yZUNvbW1lbnQ7XHJcblxyXG5cclxuZnVuY3Rpb24gcGFyc2VQYXRoKHBhcnNlZE5vZGUpe1xyXG5cdGlmIChwYXJzZWROb2RlLmF0dHJzLmNsYXNzKXtcclxuXHRcdHJldHVybiBwYXJzZWROb2RlLmF0dHJzLmNsYXNzLnZhbHVlLnNwbGl0KCcgJyk7XHJcblx0fTtcclxuXHRyZXR1cm4gW107XHJcbn07XHJcbmV4cG9ydHMucGFyc2VQYXRoID0gcGFyc2VQYXRoO1xyXG5cclxuZnVuY3Rpb24gb2JqTWFwKG9iaiwgZm4pe1xyXG5cdHZhciByZXMgPSB7fTtcclxuXHRvYmpGb3Iob2JqLCBmdW5jdGlvbih2YWwsIGlkKXtcclxuXHRcdHJlc1tpZF0gPSBmbih2YWwsIGlkLCBvYmopO1xyXG5cdH0pO1xyXG5cdHJldHVybiByZXM7XHJcbn07XHJcbmV4cG9ydHMub2JqTWFwID0gb2JqTWFwO1xyXG5cclxuZnVuY3Rpb24gZGVlcENsb25lKG9iail7XHJcblx0aWYgKHR5cGVvZiBvYmogPT0gXCJvYmplY3RcIil7XHJcblx0XHR2YXIgbWFwID0gQXJyYXkuaXNBcnJheShvYmopXHJcblx0XHRcdD8gb2JqLm1hcC5iaW5kKG9iailcclxuXHRcdFx0OiBvYmpNYXAuYmluZChudWxsLCBvYmopO1xyXG5cdFx0cmV0dXJuIG1hcChkZWVwQ2xvbmUpO1xyXG5cdH07XHJcblx0cmV0dXJuIG9iajtcclxufTtcclxuZXhwb3J0cy5kZWVwQ2xvbmUgPSBkZWVwQ2xvbmU7IiwidmFyIHV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMnKTtcclxuXHJcbmZ1bmN0aW9uIFN0clRwbCh0cGwpe1xyXG5cdHRoaXMudHBsID0gdHBsO1xyXG59O1xyXG5cclxuU3RyVHBsLnBhcnNlID0gZnVuY3Rpb24oc3RyKXtcclxuXHR2YXIgcmUgPSAvXFwlXFxAP1tcXHdcXGRfXFwuXFwtXSslL2c7XHJcblx0dmFyIGdhcHMgPSBzdHIubWF0Y2gocmUpO1xyXG5cdGlmICghZ2Fwcyl7XHJcblx0XHRyZXR1cm4gc3RyO1xyXG5cdH07XHJcblx0Z2FwcyA9IGdhcHMubWFwKGZ1bmN0aW9uKGdhcCl7XHJcblx0XHR2YXIgcGF0aFN0ciA9IGdhcC5zbGljZSgxLCAtMSk7XHJcblx0XHR2YXIgcGF0aCA9IFtdO1xyXG5cdFx0aWYgKHBhdGhTdHJbMF0gPT0gXCJAXCIpe1xyXG5cdFx0XHRwYXRoU3RyID0gcGF0aFN0ci5zbGljZSgxKTtcclxuXHRcdH1lbHNle1xyXG5cdFx0XHRwYXRoID0gW107XHJcblx0XHR9O1xyXG5cdFx0dmFyIHBhdGggPSBwYXRoLmNvbmNhdChwYXRoU3RyLnNwbGl0KCcuJykpO1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0XCJwYXRoXCI6IHBhdGhcclxuXHRcdH07XHJcblx0fSk7XHJcblx0dmFyIHRwbFBhcnRzID0gc3RyLnNwbGl0KHJlKTtcclxuXHR2YXIgdHBsID0gdXRpbHMubWl4QXJyYXlzKHRwbFBhcnRzLCBnYXBzKTtcclxuXHRyZXR1cm4gdHBsO1xyXG59O1xyXG5cclxuU3RyVHBsLnByb3RvdHlwZS5nZXRQYXRocyA9IGZ1bmN0aW9uKCl7XHJcblx0dmFyIHBhdGhzID0gW107XHJcblx0aWYgKCFBcnJheS5pc0FycmF5KHRoaXMudHBsKSl7XHJcblx0XHRyZXR1cm4gcGF0aHM7XHJcblx0fTtcdFxyXG5cdHRoaXMudHBsLmZvckVhY2goZnVuY3Rpb24ocGFydCl7XHJcblx0XHRpZiAodHlwZW9mIHBhcnQgPT0gXCJzdHJpbmdcIil7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gcGF0aHMucHVzaChwYXJ0LnBhdGgpO1xyXG5cdH0pO1xyXG5cdHJldHVybiBwYXRocztcclxufTtcclxuXHJcblN0clRwbC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oZGF0YSl7XHJcblx0aWYgKCFBcnJheS5pc0FycmF5KHRoaXMudHBsKSl7XHJcblx0XHRyZXR1cm4gdGhpcy50cGw7XHJcblx0fTtcclxuXHRyZXR1cm4gdGhpcy50cGwubWFwKGZ1bmN0aW9uKHBhcnQpe1xyXG5cdFx0aWYgKHR5cGVvZiBwYXJ0ID09IFwic3RyaW5nXCIpe1xyXG5cdFx0XHRyZXR1cm4gcGFydDtcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gdXRpbHMub2JqUGF0aChwYXJ0LnBhdGgsIGRhdGEpO1xyXG5cdH0pLmpvaW4oJycpO1x0XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFN0clRwbDtcclxuIiwidmFyIFN0clRwbCA9IHJlcXVpcmUoJ2ZnLWpzL3V0aWxzL3N0clRwbC5qcycpO1xyXG52YXIgdXRpbHMgPSByZXF1aXJlKCdmZy1qcy91dGlscy5qcycpO1xyXG5cclxudmFyIHNlbGZDbG9zaW5nVGFncyA9IFtcImFyZWFcIiwgXCJiYXNlXCIsIFwiYnJcIiwgXCJjb2xcIiwgXHJcblx0XCJjb21tYW5kXCIsIFwiZW1iZWRcIiwgXCJoclwiLCBcImltZ1wiLCBcclxuXHRcImlucHV0XCIsIFwia2V5Z2VuXCIsIFwibGlua1wiLCBcclxuXHRcIm1ldGFcIiwgXCJwYXJhbVwiLCBcInNvdXJjZVwiLCBcInRyYWNrXCIsIFxyXG5cdFwid2JyXCJdO1xyXG5cclxuZnVuY3Rpb24gcmVuZGVyVGFnKHRhZ0luZm8pe1xyXG5cdHZhciBhdHRycyA9IHRhZ0luZm8uYXR0cnM7XHJcblx0aWYgKCFBcnJheS5pc0FycmF5KGF0dHJzKSl7XHJcblx0XHRhdHRycyA9IHV0aWxzLm9ialRvS2V5VmFsdWUoYXR0cnMsICduYW1lJywgJ3ZhbHVlJyk7XHJcblx0fTtcclxuXHR2YXIgYXR0ckNvZGUgPSBcIlwiO1xyXG5cdGlmIChhdHRycy5sZW5ndGggPiAwKXtcclxuXHQgICAgYXR0ckNvZGUgPSBcIiBcIiArIGF0dHJzLm1hcChmdW5jdGlvbihhdHRyKXtcclxuXHRcdCAgcmV0dXJuIGF0dHIubmFtZSArICc9XCInICsgYXR0ci52YWx1ZSArICdcIic7XHJcblx0ICAgfSkuam9pbignICcpO1xyXG5cdH07XHJcblx0dmFyIHRhZ0hlYWQgPSB0YWdJbmZvLm5hbWUgKyBhdHRyQ29kZTtcclxuXHRpZiAofnNlbGZDbG9zaW5nVGFncy5pbmRleE9mKHRhZ0luZm8ubmFtZSkpe1xyXG5cdFx0cmV0dXJuIFwiPFwiICsgdGFnSGVhZCArIFwiIC8+XCI7XHJcblx0fTtcclxuXHR2YXIgb3BlblRhZyA9IFwiPFwiICsgdGFnSGVhZCArIFwiPlwiO1xyXG5cdHZhciBjbG9zZVRhZyA9IFwiPC9cIiArIHRhZ0luZm8ubmFtZSArIFwiPlwiO1xyXG5cdHZhciBjb2RlID0gb3BlblRhZyArICh0YWdJbmZvLmlubmVySFRNTCB8fCBcIlwiKSArIGNsb3NlVGFnO1xyXG5cdHJldHVybiBjb2RlO1xyXG59O1xyXG5leHBvcnRzLnJlbmRlclRhZyA9IHJlbmRlclRhZztcdFxyXG5cclxuZnVuY3Rpb24gcmVuZGVyQXR0cnMoYXR0cnMsIGRhdGEpe1xyXG5cdHZhciByZXNBdHRycyA9IHt9O1xyXG5cdHV0aWxzLm9iakZvcihhdHRycywgZnVuY3Rpb24odmFsdWUsIG5hbWUpe1xyXG5cdFx0dmFyIG5hbWVUcGwgPSBuZXcgU3RyVHBsKG5hbWUpO1xyXG5cdFx0dmFyIHZhbHVlVHBsID0gbmV3IFN0clRwbCh2YWx1ZSk7XHJcblx0XHRyZXNBdHRyc1tuYW1lVHBsLnJlbmRlcihkYXRhKV0gPSB2YWx1ZVRwbC5yZW5kZXIoZGF0YSk7XHRcdFxyXG5cdH0pO1x0XHJcblx0cmV0dXJuIHJlc0F0dHJzO1xyXG59O1xyXG5leHBvcnRzLnJlbmRlckF0dHJzID0gcmVuZGVyQXR0cnM7XHJcblxyXG5mdW5jdGlvbiBnZXRBdHRyc1BhdGhzKGF0dHJzKXtcclxuXHR2YXIgcGF0aHMgPSBbXTtcclxuXHR1dGlscy5vYmpGb3IoYXR0cnMsIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKXtcclxuXHRcdHZhciBuYW1lVHBsID0gbmV3IFN0clRwbChuYW1lKTtcclxuXHRcdHZhciB2YWx1ZVRwbCA9IG5ldyBTdHJUcGwodmFsdWUpO1xyXG5cdFx0cGF0aHMgPSBwYXRocy5jb25jYXQobmFtZVRwbC5nZXRQYXRocygpLCB2YWx1ZVRwbC5nZXRQYXRocygpKTtcdFx0XHJcblx0fSk7XHJcblx0cmV0dXJuIHBhdGhzO1xyXG59O1xyXG5leHBvcnRzLmdldEF0dHJzUGF0aHMgPSBnZXRBdHRyc1BhdGhzO1xyXG4iLCJmdW5jdGlvbiBOb2RlKGtpbmQsIHBhcmVudCwgZGF0YSl7XHJcbiAgICB0aGlzLmNoaWxkcmVuID0ga2luZCA9PSAnYXJyYXknXHJcbiAgICAgICAgPyBbXVxyXG4gICAgICAgIDoge307ICAgXHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcbiAgICB0aGlzLmNoaWxkQ291bnQgPSAwO1xyXG59O1xyXG5cclxuTm9kZS5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbihuYW1lLCBkYXRhKXtcclxuICAgIGlmICh0aGlzLmtpbmQgPT0gJ2FycmF5Jyl7XHJcbiAgICAgICAgZGF0YSA9IG5hbWU7XHJcbiAgICAgICAgbmFtZSA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoO1xyXG4gICAgfTtcclxuICAgIGRhdGEgPSBkYXRhIHx8IHRoaXMucm9vdC5pbml0Tm9kZSgpO1xyXG4gICAgdmFyIGNoaWxkID0gbmV3IE5vZGUodGhpcy5raW5kLCB0aGlzLCBkYXRhKTtcclxuICAgIGNoaWxkLmlkID0gbmFtZTtcclxuICAgIGNoaWxkLnBhdGggPSB0aGlzLnBhdGguY29uY2F0KFtuYW1lXSk7XHJcbiAgICBjaGlsZC5yb290ID0gdGhpcy5yb290O1xyXG4gICAgdGhpcy5jaGlsZENvdW50Kys7XHJcbiAgICB0aGlzLmNoaWxkcmVuW25hbWVdID0gY2hpbGQ7XHJcbiAgICByZXR1cm4gY2hpbGQ7XHJcbn07XHJcblxyXG5Ob2RlLnByb3RvdHlwZS5nZXRQYXJlbnRzID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciByZXMgPSBbXTsgICAgXHJcbiAgICB2YXIgbm9kZSA9IHRoaXM7XHJcbiAgICB3aGlsZSAodHJ1ZSl7XHJcbiAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50O1xyXG4gICAgICAgIGlmICghbm9kZSl7XHJcbiAgICAgICAgICAgIHJldHVybiByZXM7XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXMucHVzaChub2RlKTtcclxuICAgIH07ICBcclxufTtcclxuXHJcbk5vZGUucHJvdG90eXBlLmNoaWxkSXRlcmF0ZSA9IGZ1bmN0aW9uKGZuKXtcclxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5jaGlsZHJlbil7XHJcbiAgICAgICAgZm4uY2FsbCh0aGlzLCB0aGlzLmNoaWxkcmVuW2ldLCBpKTsgIFxyXG4gICAgfTtcclxufTtcclxuXHJcbk5vZGUucHJvdG90eXBlLmdldENoaWxkQXJyID0gZnVuY3Rpb24oKXtcclxuICAgIGlmICh0aGlzLmtpbmQgPT0gJ2FycmF5Jyl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hpbGRyZW47XHJcbiAgICB9O1xyXG4gICAgdmFyIHJlcyA9IFtdO1xyXG4gICAgdGhpcy5jaGlsZEl0ZXJhdGUoZnVuY3Rpb24oY2hpbGQpe1xyXG4gICAgICAgIHJlcy5wdXNoKGNoaWxkKTtcclxuICAgIH0pOyAgICAgICAgICAgIFxyXG4gICAgcmV0dXJuIHJlcztcclxufTtcclxuXHJcbk5vZGUucHJvdG90eXBlLmdldERlZXBDaGlsZEFyciA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgcmVzID0gdGhpcy5nZXRDaGlsZEFycigpO1xyXG4gICAgdGhpcy5jaGlsZEl0ZXJhdGUoZnVuY3Rpb24oY2hpbGQpe1xyXG4gICAgICAgcmVzID0gcmVzLmNvbmNhdChjaGlsZC5nZXREZWVwQ2hpbGRBcnIoKSk7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiByZXM7XHJcbn07XHJcblxyXG5Ob2RlLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbihwYXRoKXtcclxuICAgIHZhciBsZWFmS2V5ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xyXG4gICAgdmFyIGJyYW5jaFBhdGggPSBwYXRoLnNsaWNlKDAsIC0xKTtcclxuICAgIHZhciBicmFuY2ggPSB0aGlzLmJ5UGF0aChicmFuY2hQYXRoKTtcclxuICAgIGJyYW5jaC5jaGlsZENvdW50LS07XHJcbiAgICB2YXIgcmVzID0gYnJhbmNoLmNoaWxkcmVuW2xlYWZLZXldO1xyXG4gICAgZGVsZXRlIGJyYW5jaC5jaGlsZHJlbltsZWFmS2V5XTsgICBcclxuICAgIHJldHVybiByZXM7IFxyXG59O1xyXG5cclxuTm9kZS5wcm90b3R5cGUuYnlQYXRoID0gZnVuY3Rpb24ocGF0aCl7ICAgIFxyXG4gICAgaWYgKHBhdGgubGVuZ3RoID09IDApe1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuICAgIHZhciBub2RlID0gdGhpcztcclxuICAgIHdoaWxlICh0cnVlKXtcclxuICAgICAgICB2YXIga2V5ID0gcGF0aFswXTtcclxuICAgICAgICBub2RlID0gbm9kZS5jaGlsZHJlbltrZXldO1xyXG4gICAgICAgIGlmICghbm9kZSl7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcGF0aCA9IHBhdGguc2xpY2UoMSk7XHJcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgICByZXR1cm4gbm9kZTsgIFxyXG4gICAgICAgIH07XHJcbiAgICB9O1xyXG59O1xyXG5cclxuTm9kZS5wcm90b3R5cGUuYWNjZXNzID0gZnVuY3Rpb24ocGF0aCl7XHJcbiAgICBpZiAocGF0aC5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgdmFyIG5vZGUgPSB0aGlzO1xyXG4gICAgd2hpbGUgKHRydWUpe1xyXG4gICAgICAgIHZhciBrZXkgPSBwYXRoWzBdO1xyXG4gICAgICAgIHZhciBwYXJlbnQgPSBub2RlO1xyXG4gICAgICAgIG5vZGUgPSBub2RlLmNoaWxkcmVuW2tleV07XHJcbiAgICAgICAgaWYgKCFub2RlKXtcclxuICAgICAgICAgICAgdmFyIGRhdGEgPSB0aGlzLnJvb3QuaW5pdE5vZGUoKTsgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIG5vZGUgPSBwYXJlbnQuYWRkQ2hpbGQoa2V5LCBkYXRhKTtcclxuICAgICAgICAgICAgcGFyZW50LmNoaWxkcmVuW2tleV0gPSBub2RlO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcGF0aCA9IHBhdGguc2xpY2UoMSk7XHJcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgICByZXR1cm4gbm9kZTsgIFxyXG4gICAgICAgIH07XHJcbiAgICB9OyBcclxufTtcclxuXHJcbmZ1bmN0aW9uIFRyZWVIZWxwZXIob3B0cywgcm9vdERhdGEpe1xyXG4gICAgb3B0cyA9IG9wdHMgfHwge307XHJcbiAgICBvcHRzLmtpbmQgPSBvcHRzLmtpbmQgfHwgJ2FycmF5JztcclxuICAgIHZhciBpbml0Tm9kZSA9IG9wdHMuaW5pdE5vZGUgfHwgZnVuY3Rpb24oKXtcclxuICAgICAgICByZXR1cm4ge307XHJcbiAgICB9O1xyXG4gICAgdmFyIGRhdGEgPSByb290RGF0YSB8fCBpbml0Tm9kZSgpO1xyXG4gICAgdmFyIHJvb3ROb2RlID0gbmV3IE5vZGUob3B0cy5raW5kLCBudWxsLCBkYXRhKTtcclxuICAgIHJvb3ROb2RlLmlzUm9vdCA9IHRydWU7XHJcbiAgICByb290Tm9kZS5yb290ID0gcm9vdE5vZGU7XHJcbiAgICByb290Tm9kZS5wYXRoID0gW107XHJcbiAgICByb290Tm9kZS5pbml0Tm9kZSA9IGluaXROb2RlO1xyXG4gICAgcmV0dXJuIHJvb3ROb2RlO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUcmVlSGVscGVyOyJdfQ==
