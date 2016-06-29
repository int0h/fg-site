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
	return this.renderTpl(this.fgClass.tpl, rootGap, cookedData, metaMap.bind(this));
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
		oldValue = oldValue || [];
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmctanMvY2xpZW50L2ZnQ2xhc3MuanMiLCJub2RlX21vZHVsZXMvZmctanMvY2xpZW50L2ZnSW5zdGFuY2UuanMiLCJub2RlX21vZHVsZXMvZmctanMvY2xpZW50L2dhcENsYXNzTWdyLmpzIiwibm9kZV9tb2R1bGVzL2ZnLWpzL2NsaWVudC9nYXBTdG9yYWdlLmpzIiwibm9kZV9tb2R1bGVzL2ZnLWpzL2NsaWVudC9nYXBzLmpzIiwibm9kZV9tb2R1bGVzL2ZnLWpzL2NsaWVudC9nbG9iYWxFdmVudHMuanMiLCJub2RlX21vZHVsZXMvZmctanMvY2xpZW50L2hlbHBlci5qcyIsIm5vZGVfbW9kdWxlcy9mZy1qcy9jbGllbnQvbWFpbi5qcyIsIm5vZGVfbW9kdWxlcy9mZy1qcy9ldmVudEVtaXR0ZXIuanMiLCJub2RlX21vZHVsZXMvZmctanMvdHBsUmVuZGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZnLWpzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2ZnLWpzL3V0aWxzL3N0clRwbC5qcyIsIm5vZGVfbW9kdWxlcy9mZy1qcy91dGlscy90cGxVdGlscy5qcyIsIm5vZGVfbW9kdWxlcy9mZy1qcy91dGlscy90cmVlSGVscGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2ZnLWpzL2V2ZW50RW1pdHRlci5qcycpO1xyXG52YXIgZ2xvYmFsRXZlbnRzID0gcmVxdWlyZSgnZmctanMvY2xpZW50L2dsb2JhbEV2ZW50cy5qcycpO1xyXG52YXIgdXRpbHMgPSByZXF1aXJlKCdmZy1qcy91dGlscy5qcycpO1xyXG52YXIgZmdJbnN0YW5jZU1vZHVsZSA9IHJlcXVpcmUoJ2ZnLWpzL2NsaWVudC9mZ0luc3RhbmNlLmpzJyk7XHJcblxyXG52YXIgZmdDbGFzc1RhYmxlID0gW107XHJcbnZhciBmZ0NsYXNzRGljdCA9IHt9O1xyXG5cclxuZnVuY3Rpb24gRmdDbGFzcyhvcHRzKXtcclxuXHR0aGlzLmlkID0gZmdDbGFzc1RhYmxlLmxlbmd0aDtcdFxyXG5cdHRoaXMuaW5zdGFuY2VzID0gW107XHJcblx0dGhpcy50cGwgPSBvcHRzLnRwbDtcclxuXHR0aGlzLm5hbWUgPSBvcHRzLm5hbWU7XHJcblx0dGhpcy5ldmVudEVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyO1xyXG5cdGZnQ2xhc3NEaWN0W29wdHMubmFtZV0gPSB0aGlzO1xyXG5cdGZnQ2xhc3NUYWJsZS5wdXNoKHRoaXMpO1x0XHJcblx0ZnVuY3Rpb24gRmdJbnN0YW5jZSgpe1xyXG5cdFx0ZmdJbnN0YW5jZU1vZHVsZS5GZ0luc3RhbmNlQmFzZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG5cdH07XHJcblx0dGhpcy5jcmVhdGVGbiA9IEZnSW5zdGFuY2U7XHJcblx0dGhpcy5jcmVhdGVGbi5jb25zdHJ1Y3RvciA9IGZnSW5zdGFuY2VNb2R1bGUuRmdJbnN0YW5jZUJhc2U7XHRcclxuXHR0aGlzLmNyZWF0ZUZuLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoZmdJbnN0YW5jZU1vZHVsZS5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUpO1x0XHJcblx0dmFyIGNsYXNzRm4gPSBvcHRzLmNsYXNzRm47XHJcblx0aWYgKGNsYXNzRm4pe1xyXG5cdFx0Y2xhc3NGbih0aGlzLCB0aGlzLmNyZWF0ZUZuLnByb3RvdHlwZSk7XHJcblx0fTtcclxufTtcclxuLypcclxuZnVuY3Rpb24gaXNJbnNpZGUoZmcsIG5vZGUsIHNlbGVjdG9yKXtcclxuXHR2YXIgZG9tRWxtcyA9IGZnLmdldERvbSgpO1xyXG5cdHZhciBtYXRjaGVkID0gW107XHJcblx0ZG9tRWxtcy5mb3JFYWNoKGZ1bmN0aW9uKGVsbSl7XHJcblx0XHR2YXIgbm9kZUxpc3QgPSBlbG0ucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XHJcblx0XHR2YXIgbm9kZUFyciA9IFtdLnNsaWNlLmNhbGwobm9kZUxpc3QpO1xyXG5cdFx0bWF0Y2hlZCA9IG1hdGNoZWQuY29uY2F0KG5vZGVBcnIpO1xyXG5cdH0pO1xyXG5cdHdoaWxlIChub2RlKXtcclxuXHRcdGlmICh+ZG9tRWxtcy5pbmRleE9mKG5vZGUpKXtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fTtcclxuXHRcdGlmICh+bWF0Y2hlZC5pbmRleE9mKG5vZGUpKXtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9O1xyXG5cdFx0bm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcclxuXHR9O1xyXG5cdHJldHVybiBmYWxzZTtcclxufTsqL1xyXG5cclxuLypmdW5jdGlvbiBpc0luc2lkZShmZywgbm9kZSl7XHJcblx0dmFyIGRvbUVsbXMgPSBmZy5nZXREb20oKTtcclxuXHR3aGlsZSAobm9kZSl7XHJcblx0XHRpZiAofmRvbUVsbXMuaW5kZXhPZihub2RlKSl7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fTtcclxuXHRcdG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XHJcblx0fTtcclxuXHRyZXR1cm4gZmFsc2U7XHJcbn07XHJcbiovXHJcbmZ1bmN0aW9uIG1hdGNoKGZnLCBub2RlLCBzZWxlY3Rvcil7XHJcblx0dmFyIGRvbUVsbXMgPSBmZy5nZXREb20oKTtcclxuXHR2YXIgcm9vdFJlYWNoZWQgPSBmYWxzZTtcclxuXHR3aGlsZSAobm9kZSl7XHJcblx0XHRpZiAobm9kZS5tYXRjaGVzKHNlbGVjdG9yKSl7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fTtcclxuXHRcdGlmICh+ZG9tRWxtcy5pbmRleE9mKG5vZGUpKXtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fTtcdFx0XHJcblx0XHRub2RlID0gbm9kZS5wYXJlbnROb2RlO1xyXG5cdH07XHJcblx0cmV0dXJuIGZhbHNlO1xyXG59O1xyXG5cclxuRmdDbGFzcy5wcm90b3R5cGUub24gPSBmdW5jdGlvbihuYW1lLCBzZWxlY3RvciwgZm4pe1x0XHJcblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMil7XHJcblx0XHRuYW1lID0gbmFtZTtcclxuXHRcdGZuID0gYXJndW1lbnRzWzFdO1xyXG5cdFx0c2VsZWN0b3IgPSBudWxsO1xyXG5cdH1lbHNle1xyXG5cdFx0dmFyIG9yaWdpbmFsRm4gPSBmbjtcclxuXHRcdGZuID0gZnVuY3Rpb24oZXZlbnQpe1x0XHRcdFxyXG5cdFx0XHRpZiAobWF0Y2godGhpcywgZXZlbnQudGFyZ2V0LCBzZWxlY3Rvcikpe1xyXG5cdFx0XHRcdG9yaWdpbmFsRm4uY2FsbCh0aGlzLCBldmVudCk7XHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cdH07XHJcblx0Z2xvYmFsRXZlbnRzLmxpc3RlbihuYW1lKTtcclxuXHR0aGlzLmV2ZW50RW1pdHRlci5vbihuYW1lLCBmbik7XHRcclxufTtcclxuXHJcbkZnQ2xhc3MucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihuYW1lLyosIHJlc3QqLyl7XHJcblx0dGhpcy5ldmVudEVtaXR0ZXIuZW1pdC5hcHBseSh0aGlzLmV2ZW50RW1pdHRlciwgYXJndW1lbnRzKTtcdFxyXG59O1xyXG5cclxuRmdDbGFzcy5wcm90b3R5cGUuZW1pdEFwcGx5ID0gZnVuY3Rpb24obmFtZSwgdGhpc0FyZywgYXJncyl7XHJcblx0dGhpcy5ldmVudEVtaXR0ZXIuZW1pdEFwcGx5KG5hbWUsIHRoaXNBcmcsIGFyZ3MpO1x0XHJcbn07XHJcblxyXG5GZ0NsYXNzLnByb3RvdHlwZS5jb29rRGF0YSA9IGZ1bmN0aW9uKGRhdGEpe1xyXG5cdHJldHVybiBkYXRhO1xyXG59O1xyXG5cclxuRmdDbGFzcy5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oZGF0YSwgbWV0YSwgcGFyZW50KXtcclxuXHRpZiAoZGF0YSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KXtcclxuXHRcdHJldHVybiB0aGlzLnJlbmRlckluLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcclxuXHR9O1xyXG5cdHZhciBmZyA9IG5ldyBmZ0luc3RhbmNlTW9kdWxlLkZnSW5zdGFuY2UodGhpcywgcGFyZW50KTtcclxuXHRmZy5jb2RlID0gZmcuZ2V0SHRtbChkYXRhLCBtZXRhKTtcclxuXHRyZXR1cm4gZmc7XHJcbn07XHJcblxyXG5GZ0NsYXNzLnByb3RvdHlwZS5yZW5kZXJJbiA9IGZ1bmN0aW9uKHBhcmVudE5vZGUsIGRhdGEsIG1ldGEsIHBhcmVudCl7XHJcblx0dmFyIGZnID0gdGhpcy5yZW5kZXIoZGF0YSwgbWV0YSwgcGFyZW50KTtcclxuXHRwYXJlbnROb2RlLmlubmVySFRNTCA9IGZnLmNvZGU7XHJcblx0ZmcuYXNzaWduKCk7XHJcblx0cmV0dXJuIGZnO1xyXG59O1xyXG5cclxuRmdDbGFzcy5wcm90b3R5cGUuYXBwZW5kVG8gPSBmdW5jdGlvbihwYXJlbnROb2RlLCBkYXRhKXtcclxuXHR2YXIgZmcgPSB0aGlzLnJlbmRlcihkYXRhKTtcdFxyXG5cdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuXHRkaXYuaW5uZXJIVE1MID0gZmQuY29kZTtcclxuXHRbXS5zbGljZS5jYWxsKGRpdi5jaGlsZHJlbikuZm9yRWFjaChmdW5jdGlvbihjaGlsZCl7XHJcblx0XHRwYXJlbnROb2RlLmFwcGVuZENoaWxkKGNoaWxkKTtcclxuXHR9KTtcclxuXHRmZy5hc3NpZ24oKTtcclxufTtcclxuXHJcbmV4cG9ydHMuRmdDbGFzcyA9IEZnQ2xhc3M7XHJcbmV4cG9ydHMuZmdDbGFzc0RpY3QgPSBmZ0NsYXNzRGljdDtcclxuZXhwb3J0cy5mZ0NsYXNzVGFibGUgPSBmZ0NsYXNzVGFibGU7IiwidmFyIGdhcENsYXNzTWdyID0gcmVxdWlyZSgnZmctanMvY2xpZW50L2dhcENsYXNzTWdyLmpzJyk7XHJcbnZhciByZW5kZXJUcGwgPSByZXF1aXJlKCdmZy1qcy90cGxSZW5kZXIuanMnKS5yZW5kZXJUcGw7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdmZy1qcy9ldmVudEVtaXR0ZXIuanMnKTtcclxudmFyIHV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMuanMnKTtcclxudmFyIEdhcFN0b3JhZ2UgPSByZXF1aXJlKCdmZy1qcy9jbGllbnQvZ2FwU3RvcmFnZS5qcycpLkdhcFN0b3JhZ2U7XHJcbnZhciBoZWxwZXIgPSByZXF1aXJlKCcuL2hlbHBlci5qcycpO1xyXG52YXIgZ2xvYmFsRXZlbnRzID0gcmVxdWlyZSgnZmctanMvY2xpZW50L2dsb2JhbEV2ZW50cy5qcycpO1xyXG5cclxudmFyIGZnSW5zdGFuY2VUYWJsZSA9IFtdO1xyXG5cclxuZnVuY3Rpb24gRmdJbnN0YW5jZUJhc2UoZmdDbGFzcywgcGFyZW50KXtcclxuXHR0aGlzLmlkID0gZmdJbnN0YW5jZVRhYmxlLmxlbmd0aDtcclxuXHRmZ0NsYXNzLmluc3RhbmNlcy5wdXNoKHRoaXMpO1xyXG5cdHRoaXMubmFtZSA9IGZnQ2xhc3MubmFtZTtcclxuXHR0aGlzLmZnQ2xhc3MgPSBmZ0NsYXNzO1xyXG5cdHRoaXMuY29kZSA9IG51bGw7XHJcblx0dGhpcy5wYXJlbnQgPSBwYXJlbnQgfHwgbnVsbDtcclxuXHR0aGlzLmV2ZW50RW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoZmdDbGFzcy5ldmVudEVtaXR0ZXIpO1xyXG5cdHRoaXMuZW1pdEFwcGx5ID0gdGhpcy5ldmVudEVtaXR0ZXIuZW1pdEFwcGx5LmJpbmQodGhpcy5ldmVudEVtaXR0ZXIpO1xyXG5cdHRoaXMuZ2FwU3RvcmFnZSA9IG5ldyBHYXBTdG9yYWdlKHRoaXMpO1xyXG5cdHRoaXMuY2hpbGRGZ3MgPSBbXTtcclxuXHRmZ0luc3RhbmNlVGFibGUucHVzaCh0aGlzKTtcdFxyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcclxuXHRnbG9iYWxFdmVudHMubGlzdGVuKGV2ZW50KTtcclxuXHR0aGlzLmV2ZW50RW1pdHRlci5vbihldmVudCwgZm4pO1x0XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKG5hbWUvKiwgcmVzdCovKXtcclxuXHR0aGlzLmV2ZW50RW1pdHRlci5lbWl0LmFwcGx5KHRoaXMuZXZlbnRFbWl0dGVyLCBhcmd1bWVudHMpO1x0XHJcbn07XHJcblxyXG5mdW5jdGlvbiBGZ0luc3RhbmNlKGZnQ2xhc3MsIHBhcmVudCl7XHJcblx0cmV0dXJuIG5ldyBmZ0NsYXNzLmNyZWF0ZUZuKGZnQ2xhc3MsIHBhcmVudCk7XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpe1xyXG5cdHJldHVybiB0aGlzLmNvZGU7XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUuYXNzaWduID0gZnVuY3Rpb24oKXtcclxuXHR0aGlzLmVtaXRBcHBseSgncmVhZHknLCB0aGlzLCBbXSk7XHJcblx0dGhpcy5kb20gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmctaWlkLScgKyB0aGlzLmlkKTtcclxuXHR0aGlzLmdhcFN0b3JhZ2UuYXNzaWduKCk7XHJcblx0cmV0dXJuIHRoaXMuZG9tO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gZ2V0Q2xhc3NlcyhtZXRhKXtcclxuXHRpZiAoIW1ldGEgfHwgIW1ldGEuYXR0cnMgfHwgIW1ldGEuYXR0cnMuY2xhc3Mpe1xyXG5cdFx0cmV0dXJuIFtdO1xyXG5cdH07XHJcblx0aWYgKEFycmF5LmlzQXJyYXkobWV0YS5hdHRycy5jbGFzcykpe1xyXG5cdFx0cmV0dXJuIG1ldGEuYXR0cnMuY2xhc3M7XHJcblx0fTtcdFx0XHJcblx0cmV0dXJuIG1ldGEuYXR0cnMuY2xhc3Muc3BsaXQoJyAnKTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIG1ldGFNYXAobWV0YVBhcnQsIGlkKXtcclxuXHQvKnZhciByZXMgPSB1dGlscy5jb25jYXRPYmooe30sIG1ldGFQYXJ0IHx8IHt9KTtcclxuXHR2YXIgYXR0cnNPYmogPSBtZXRhUGFydC5hdHRycyB8fCB7fTsvL3V0aWxzLmtleVZhbHVlVG9PYmoobWV0YVBhcnQuYXR0cnMgfHwgW10sICduYW1lJywgJ3ZhbHVlJyk7XHJcblx0dmFyIHRwbENsYXNzZXMgPSAocmVzLmF0dHJzICYmIHJlcy5hdHRycy5jbGFzcyB8fCAnJykuc3BsaXQoJyAnKTtcclxuXHR2YXIgZmdfY2lkID0gXCJmZy1jaWQtXCIgKyB0aGlzLmZnQ2xhc3MuaWQ7XHJcblx0dmFyIGNsYXNzZXMgPSBbJ2ZnJywgZmdfY2lkXS5jb25jYXQodHBsQ2xhc3Nlcyk7XHRcclxuXHRhdHRyc09iai5jbGFzcyA9IGNsYXNzZXMuam9pbignICcpOyovXHJcblx0dmFyIHJlcyA9IHV0aWxzLnNpbXBsZUNsb25lKG1ldGFQYXJ0KTtcclxuXHR2YXIgY2xhc3NlcyA9IGdldENsYXNzZXMocmVzKTtcclxuXHR2YXIgZmdfY2lkID0gXCJmZy1jaWQtXCIgKyB0aGlzLmZnQ2xhc3MuaWQ7XHJcblx0cmVzLmF0dHJzID0gdXRpbHMuc2ltcGxlQ2xvbmUobWV0YVBhcnQuYXR0cnMpO1xyXG5cdGlmIChBcnJheS5pc0FycmF5KHJlcy5hdHRycy5jbGFzcykpe1xyXG5cdFx0cmVzLmF0dHJzLmNsYXNzID0gWydmZycsICcgJywgZmdfY2lkLCAnICddLmNvbmNhdChjbGFzc2VzKTtcclxuXHRcdHJldHVybiByZXM7XHRcclxuXHR9O1x0XHJcblx0cmVzLmF0dHJzLmNsYXNzID0gWydmZycsIGZnX2NpZF0uY29uY2F0KGNsYXNzZXMpLmpvaW4oJyAnKTtcclxuXHRyZXR1cm4gcmVzO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLnJlbmRlclRwbCA9IGZ1bmN0aW9uKHRwbCwgcGFyZW50LCBkYXRhLCBtZXRhKXtcclxuXHRyZXR1cm4gcmVuZGVyVHBsLmNhbGwoe1xyXG5cdFx0XCJnYXBDbGFzc01nclwiOiBnYXBDbGFzc01ncixcclxuXHRcdFwiY29udGV4dFwiOiB0aGlzXHJcblx0fSwgdHBsLCBwYXJlbnQsIGRhdGEsIG1ldGEpO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmdldEh0bWwgPSBmdW5jdGlvbihkYXRhLCBtZXRhKXtcclxuXHR0aGlzLmRhdGEgPSBkYXRhO1xyXG5cdHRoaXMuZ2FwTWV0YSA9IG1ldGE7XHJcblx0dmFyIHJvb3RHYXAgPSBuZXcgZ2FwQ2xhc3NNZ3IuR2FwKHRoaXMsIG1ldGEpO1xyXG5cdHJvb3RHYXAudHlwZSA9IFwicm9vdFwiO1xyXG5cdHJvb3RHYXAuaXNWaXJ0dWFsID0gdHJ1ZTtcclxuXHRyb290R2FwLmZnID0gdGhpcztcclxuXHRyb290R2FwLnNjb3BlUGF0aCA9IFtdO1xyXG5cdHRoaXMubWV0YSA9IHJvb3RHYXA7XHJcblx0dmFyIGNvb2tlZERhdGEgPSB0aGlzLmZnQ2xhc3MuY29va0RhdGEoZGF0YSk7XHJcblx0cmV0dXJuIHRoaXMucmVuZGVyVHBsKHRoaXMuZmdDbGFzcy50cGwsIHJvb3RHYXAsIGNvb2tlZERhdGEsIG1ldGFNYXAuYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oc2NvcGVQYXRoLCBuZXdWYWx1ZSl7XHJcblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMCl7XHJcblx0XHRyZXR1cm4gdGhpcy51cGRhdGUoW10sIHRoaXMuZGF0YSk7IC8vIHRvZG9cclxuXHR9O1xyXG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID09IDEpe1xyXG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKFtdLCBhcmd1bWVudHNbMF0pO1xyXG5cdH07XHJcblx0dmFyIHZhbHVlID0gdXRpbHMuZGVlcENsb25lKG5ld1ZhbHVlKTtcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0dmFyIG9sZFZhbHVlID0gdXRpbHMub2JqUGF0aChzY29wZVBhdGgsIHRoaXMuZGF0YSk7XHJcblx0aWYgKG9sZFZhbHVlID09PSB2YWx1ZSl7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9O1x0XHJcblx0dGhpcy5lbWl0KCd1cGRhdGUnLCBzY29wZVBhdGgsIG5ld1ZhbHVlKTtcclxuXHRpZiAoc2NvcGVQYXRoLmxlbmd0aCA+IDApe1xyXG5cdFx0dXRpbHMub2JqUGF0aChzY29wZVBhdGgsIHRoaXMuZGF0YSwgdmFsdWUpO1xyXG5cdH1lbHNle1xyXG5cdFx0dGhpcy5kYXRhID0gdmFsdWU7XHJcblx0fVxyXG5cdHZhciBzY29wZSA9IHRoaXMuZ2FwU3RvcmFnZS5ieVNjb3BlKHNjb3BlUGF0aCk7XHJcblx0dmFyIGdhcHMgPSBzY29wZS50YXJnZXQ7XHJcblx0Z2Fwcy5mb3JFYWNoKGZ1bmN0aW9uKGdhcCl7XHJcblx0XHRnYXBDbGFzc01nci51cGRhdGUoc2VsZiwgZ2FwLCBzY29wZVBhdGgsIHZhbHVlLCBvbGRWYWx1ZSk7XHJcblx0fSk7XHJcblx0c2NvcGUucGFyZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHBhcmVudE5vZGUpe1xyXG5cdFx0cGFyZW50Tm9kZS5kYXRhLmdhcHMuZm9yRWFjaChmdW5jdGlvbihwYXJlbnRHYXApe1xyXG5cdFx0XHRpZiAocGFyZW50R2FwLnR5cGUgPT0gXCJmZ1wiKXtcclxuXHRcdFx0XHR2YXIgc3ViUGF0aCA9IHNjb3BlUGF0aC5zbGljZShwYXJlbnRHYXAuc2NvcGVQYXRoLmxlbmd0aCk7XHJcblx0XHRcdFx0dmFyIHN1YlZhbCA9IHV0aWxzLm9ialBhdGgoc3ViUGF0aCwgc2VsZi5kYXRhKTtcclxuXHRcdFx0XHRwYXJlbnRHYXAuZmcudXBkYXRlKHN1YlBhdGgsIG5ld1ZhbHVlKTtcclxuXHRcdFx0fTtcdFx0XHRcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cdHNjb3BlLnN1YnMuZm9yRWFjaChmdW5jdGlvbihzdWIpe1xyXG5cdFx0dmFyIHN1YlZhbCA9IHV0aWxzLm9ialBhdGgoc3ViLnBhdGgsIHNlbGYuZGF0YSk7XHRcclxuXHRcdHZhciBzdWJQYXRoID0gc3ViLnBhdGguc2xpY2Uoc2NvcGVQYXRoLmxlbmd0aCk7XHJcblx0XHR2YXIgb2xkU3ViVmFsID0gdXRpbHMub2JqUGF0aChzdWJQYXRoLCBvbGRWYWx1ZSk7XHJcblx0XHRpZiAoc3ViVmFsID09IG9sZFN1YlZhbCl7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH07XHJcblx0XHRzdWIuZ2Fwcy5mb3JFYWNoKGZ1bmN0aW9uKGdhcCl7XHJcblx0XHRcdGlmICghfnNlbGYuZ2FwU3RvcmFnZS5nYXBzLmluZGV4T2YoZ2FwKSl7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRnYXBDbGFzc01nci51cGRhdGUoc2VsZiwgZ2FwLCBzdWIucGF0aCwgc3ViVmFsLCBvbGRTdWJWYWwpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblx0cmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVTY29wZUhlbHBlcihmZywgb2JqLCBzY29wZVBhdGgpe1xyXG5cdHZhciBoZWxwZXIgPSBBcnJheS5pc0FycmF5KG9iaikgXHJcblx0XHQ/IFtdIFxyXG5cdFx0OiB7fTtcclxuXHR1dGlscy5vYmpGb3Iob2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcclxuXHRcdHZhciBwcm9wU2NvcGVQYXRoID0gc2NvcGVQYXRoLmNvbmNhdChba2V5XSk7XHJcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoaGVscGVyLCBrZXksIHtcclxuXHRcdFx0Z2V0OiBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIil7XHJcblx0XHRcdFx0XHRyZXR1cm4gY3JlYXRlU2NvcGVIZWxwZXIoZmcsIG9ialtrZXldLCBwcm9wU2NvcGVQYXRoKTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdHJldHVybiBvYmpba2V5XTtcclxuXHRcdFx0fSxcclxuXHRcdFx0c2V0OiBmdW5jdGlvbih2YWwpe1xyXG5cdFx0XHRcdGZnLnVwZGF0ZShwcm9wU2NvcGVQYXRoLCB2YWwpO1x0XHRcdFx0XHJcblx0XHRcdH1cdFxyXG5cdFx0fSk7XHJcblx0fSk7XHJcblx0cmV0dXJuIGhlbHBlcjtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUZuRGF0YUhlbHBlcihmZywgb2JqLCBzY29wZVBhdGgpe1xyXG5cclxuXHR1dGlscy5vYmpGb3Iob2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcclxuXHRcdHZhciBwcm9wU2NvcGVQYXRoID0gc2NvcGVQYXRoLmNvbmNhdChba2V5XSk7XHJcblxyXG5cdH0pO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLiRkID0gZnVuY3Rpb24oKXtcclxuXHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUuJGRhdGEgPSBmdW5jdGlvbihuZXdEYXRhKXtcclxuXHRpZiAobmV3RGF0YSl7XHJcblx0XHQvLy4uLlxyXG5cdFx0cmV0dXJuO1xyXG5cdH07XHJcblx0dmFyIGhlbHBlciA9IGNyZWF0ZVNjb3BlSGVscGVyKHRoaXMsIHRoaXMuZGF0YSwgW10pO1xyXG5cdHJldHVybiBoZWxwZXI7XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUuY2xvbmVEYXRhID0gZnVuY3Rpb24oKXtcclxuXHRyZXR1cm4gdXRpbHMuZGVlcENsb25lKHRoaXMuZGF0YSk7XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpe1xyXG5cdHRoaXMuY2hpbGRGZ3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZCl7XHJcblx0XHRjaGlsZC5yZW1vdmUodHJ1ZSk7XHJcblx0fSk7XHJcblx0dGhpcy5jb2RlID0gJyc7XHJcblx0dGhpcy5kYXRhID0gbnVsbDtcclxuXHR0aGlzLmdhcFN0b3JhZ2UgPSBudWxsO1xyXG5cdHRoaXMuY2hpbGRGZ3MgPSBbXTtcclxufTtcclxuXHJcbkZnSW5zdGFuY2VCYXNlLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbih2aXJ0dWFsKXtcclxuXHRpZiAoIXZpcnR1YWwpe1xyXG5cdFx0dmFyIGRvbSA9IHRoaXMuZ2V0RG9tKCk7XHJcblx0XHRkb20uZm9yRWFjaChmdW5jdGlvbihlbG0pe1xyXG5cdFx0XHRlbG0ucmVtb3ZlKCk7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cdHRoaXMuY2xlYXIoKTtcclxuXHR2YXIgaW5zdGFuY2VJZCA9IHRoaXMuZmdDbGFzcy5pbnN0YW5jZXMuaW5kZXhPZih0aGlzKTtcdFxyXG5cdHRoaXMuZmdDbGFzcy5pbnN0YW5jZXMuc3BsaWNlKGluc3RhbmNlSWQsIDEpO1xyXG5cdGZnSW5zdGFuY2VUYWJsZVt0aGlzLmlkXSA9IG51bGw7XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUucmVyZW5kZXIgPSBmdW5jdGlvbihkYXRhKXtcclxuXHR0aGlzLmNsZWFyKCk7XHJcblx0dGhpcy5nYXBTdG9yYWdlID0gbmV3IEdhcFN0b3JhZ2UodGhpcyk7XHJcblx0dmFyIGRvbSA9IHRoaXMuZ2V0RG9tKClbMF07XHJcblx0dGhpcy5jb2RlID0gdGhpcy5nZXRIdG1sKGRhdGEpO1xyXG5cdGRvbS5vdXRlckhUTUwgPSB0aGlzLmNvZGU7IC8vIGRvZXNudCB3b3JrIHdpdGggbXVsdGkgcm9vdFxyXG5cdHRoaXMuYXNzaWduKCk7XHJcblx0cmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUuZ2V0RG9tID0gZnVuY3Rpb24oKXtcclxuXHRyZXR1cm4gdGhpcy5tZXRhLmdldERvbSgpO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmpxID0gZnVuY3Rpb24oKXtcclxuXHR2YXIgZG9tID0gdGhpcy5nZXREb20oKTtcclxuXHR2YXIgcmVzID0gaGVscGVyLmpxKGRvbSk7XHJcblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMCl7XHJcblx0XHRyZXR1cm4gcmVzO1xyXG5cdH07XHJcblx0dmFyIHNlbGVjdG9yID0gYXJndW1lbnRzWzBdO1xyXG5cdHZhciBzZWxmU2VsZWN0ZWQgPSByZXNcclxuXHRcdC5wYXJlbnQoKVxyXG5cdFx0LmZpbmQoc2VsZWN0b3IpXHJcblx0XHQuZmlsdGVyKGZ1bmN0aW9uKGlkLCBlbG0pe1xyXG5cdFx0XHRyZXR1cm4gfmRvbS5pbmRleE9mKGVsbSk7XHJcblx0XHR9KTtcclxuXHR2YXIgY2hpbGRTZWxlY3RlZCA9IHJlcy5maW5kKHNlbGVjdG9yKTtcclxuXHRyZXR1cm4gc2VsZlNlbGVjdGVkLmFkZChjaGlsZFNlbGVjdGVkKTtcclxufTtcclxuXHJcbkZnSW5zdGFuY2VCYXNlLnByb3RvdHlwZS5nYXAgPSBmdW5jdGlvbihpZCl7XHJcblx0cmV0dXJuIHRoaXMuZ2FwcyhpZClbMF07XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUuZ2FwcyA9IGZ1bmN0aW9uKGlkKXtcclxuXHR2YXIgZ2FwcyA9IHRoaXMuZ2FwU3RvcmFnZS5ieUVpZChpZCk7XHJcblx0aWYgKGdhcHMpe1xyXG5cdFx0cmV0dXJuIGdhcHM7XHJcblx0fTtcdFxyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmVsbSA9IEZnSW5zdGFuY2VCYXNlLnByb3RvdHlwZS5nYXA7IC8vIGxlZ2FjeVxyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmVsbXMgPSBGZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUuZ2FwczsgLy8gbGVnYWN5XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24oaWQpe1xyXG5cdHZhciBnYXAgPSB0aGlzLmdhcChpZCk7XHJcblx0aWYgKCFnYXApe1xyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fTtcclxuXHRyZXR1cm4gZ2FwLmZnIHx8IG51bGw7IFxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldEZnQnlJaWQoaWlkKXtcclxuXHRyZXR1cm4gZmdJbnN0YW5jZVRhYmxlW2lpZF07XHJcbn07XHJcblxyXG5leHBvcnRzLmdldEZnQnlJaWQgPSBnZXRGZ0J5SWlkO1xyXG5leHBvcnRzLkZnSW5zdGFuY2UgPSBGZ0luc3RhbmNlO1xyXG5leHBvcnRzLkZnSW5zdGFuY2VCYXNlID0gRmdJbnN0YW5jZUJhc2U7XHJcbmV4cG9ydHMuZmdJbnN0YW5jZVRhYmxlID0gZmdJbnN0YW5jZVRhYmxlOyIsInZhciBnYXBDbGFzc2VzID0gcmVxdWlyZSgnLi9nYXBzLmpzJyk7XHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnLWpzL3V0aWxzJyk7XHJcblxyXG5mdW5jdGlvbiBHYXAoY29udGV4dCwgcGFyc2VkTWV0YSwgcGFyZW50KXtcclxuXHR1dGlscy5leHRlbmQodGhpcywgcGFyc2VkTWV0YSk7XHJcblx0dGhpcy5jaGlsZHJlbiA9IFtdO1x0XHJcblx0dGhpcy5wYXJlbnQgPSBwYXJlbnQgfHwgbnVsbDtcclxuXHR0aGlzLnJvb3QgPSB0aGlzO1xyXG5cdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XHRcclxuXHR0aGlzLnNjb3BlUGF0aCA9IHV0aWxzLmdldFNjb3BlUGF0aCh0aGlzKTtcclxuXHQvL3RoaXMudHJpZ2dlcnMgPSBbXTtcclxuXHRjb250ZXh0LmdhcFN0b3JhZ2UucmVnKHRoaXMpO1xyXG5cdGlmICghcGFyZW50KXtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH07XHJcblx0dGhpcy5yb290ID0gcGFyZW50LnJvb3Q7XHJcblx0cGFyZW50LmNoaWxkcmVuLnB1c2godGhpcyk7XHJcbn07XHJcblxyXG5HYXAucHJvdG90eXBlLmNsb3Nlc3QgPSBmdW5jdGlvbihzZWxlY3Rvcil7XHJcblx0dmFyIGVpZCA9IHNlbGVjdG9yLnNsaWNlKDEpO1xyXG5cdGdhcCA9IHRoaXMucGFyZW50O1xyXG5cdHdoaWxlIChnYXApe1xyXG5cdFx0aWYgKGdhcC5laWQgPT0gZWlkKXtcclxuXHRcdFx0cmV0dXJuIGdhcDtcclxuXHRcdH07XHJcblx0XHRnYXAgPSBnYXAucGFyZW50O1xyXG5cdH07XHJcblx0cmV0dXJuIG51bGw7XHJcbn07XHJcblxyXG5HYXAucHJvdG90eXBlLmRhdGEgPSBmdW5jdGlvbih2YWwpe1xyXG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID09IDApe1xyXG5cdFx0cmV0dXJuIHV0aWxzLm9ialBhdGgodGhpcy5zY29wZVBhdGgsIHRoaXMuY29udGV4dC5kYXRhKTtcclxuXHR9O1xyXG5cdHRoaXMuY29udGV4dC51cGRhdGUodGhpcy5zY29wZVBhdGgsIHZhbCk7XHRcclxufTtcclxuXHJcbkdhcC5wcm90b3R5cGUuZmluZFJlYWxEb3duID0gZnVuY3Rpb24oKXtcclxuXHRpZiAoIXRoaXMuaXNWaXJ0dWFsKXtcclxuXHRcdHJldHVybiBbdGhpc107XHJcblx0fTtcclxuXHR2YXIgcmVzID0gW107XHJcblx0dGhpcy5jaGlsZHJlbi5maWx0ZXIoZnVuY3Rpb24oY2hpbGQpe1xyXG5cdFx0cmVzID0gcmVzLmNvbmNhdChjaGlsZC5maW5kUmVhbERvd24oKSk7XHJcblx0fSk7XHJcblx0cmV0dXJuIHJlcztcclxufTtcclxuXHJcbkdhcC5wcm90b3R5cGUuZ2V0RG9tID0gZnVuY3Rpb24oKXtcclxuXHRpZiAoIXRoaXMuaXNWaXJ0dWFsKXtcclxuXHRcdHZhciBpZCA9IFtcImZnXCIsIHRoaXMuY29udGV4dC5pZCwgXCJnaWRcIiwgdGhpcy5naWRdLmpvaW4oJy0nKTtcclxuXHRcdHJldHVybiBbZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXTtcclxuXHR9O1xyXG5cdHZhciByZXMgPSBbXTtcclxuXHR0aGlzLmZpbmRSZWFsRG93bigpLmZvckVhY2goZnVuY3Rpb24oZ2FwKXtcclxuXHRcdHJlcyA9IHJlcy5jb25jYXQoZ2FwLmdldERvbSgpKTtcclxuXHR9KTtcclxuXHRyZXR1cm4gcmVzO1xyXG59O1xyXG5cclxuR2FwLnByb3RvdHlwZS5yZW1vdmVEb20gPSBmdW5jdGlvbigpe1xyXG5cdHZhciBkb20gPSB0aGlzLmdldERvbSgpO1xyXG5cdGRvbS5mb3JFYWNoKGZ1bmN0aW9uKGVsbSl7XHJcblx0XHRpZiAoIWVsbSl7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH07XHJcblx0XHRlbG0ucmVtb3ZlKCk7XHJcblx0fSk7XHJcbn07XHJcblxyXG5leHBvcnRzLkdhcCA9IEdhcDtcclxuXHJcbmZ1bmN0aW9uIHJlbmRlcihjb250ZXh0LCBwYXJlbnQsIGRhdGEsIG1ldGEpe1xyXG5cdHZhciBnYXAgPSBuZXcgR2FwKGNvbnRleHQsIG1ldGEsIHBhcmVudCk7XHJcblx0dmFyIGdhcENsYXNzID0gZ2FwQ2xhc3Nlc1ttZXRhLnR5cGVdO1xyXG5cdHJldHVybiBnYXBDbGFzcy5yZW5kZXIuY2FsbChnYXAsIGNvbnRleHQsIGRhdGEpO1xyXG59O1xyXG5cclxuZXhwb3J0cy5yZW5kZXIgPSByZW5kZXI7XHJcblxyXG5mdW5jdGlvbiB1cGRhdGUoY29udGV4dCwgZ2FwTWV0YSwgc2NvcGVQYXRoLCB2YWx1ZSwgb2xkVmFsdWUpe1xyXG5cdHZhciBnYXBDbGFzcyA9IGdhcENsYXNzZXNbZ2FwTWV0YS50eXBlXTtcclxuXHRpZiAoIWdhcENsYXNzKXtcclxuXHRcdHJldHVybjtcclxuXHR9O1xyXG5cdHJldHVybiBnYXBDbGFzcy51cGRhdGUoY29udGV4dCwgZ2FwTWV0YSwgc2NvcGVQYXRoLCB2YWx1ZSwgb2xkVmFsdWUpO1xyXG59O1xyXG5cclxuZXhwb3J0cy51cGRhdGUgPSB1cGRhdGU7IiwidmFyIHV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMuanMnKTtcclxudmFyIFRyZWVIZWxwZXIgPSByZXF1aXJlKCdmZy1qcy91dGlscy90cmVlSGVscGVyLmpzJyk7XHJcblxyXG5mdW5jdGlvbiBpbml0Tm9kZUZuKCl7XHJcblx0cmV0dXJuIHtcclxuXHRcdGdhcHM6IFtdXHJcblx0fTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIEdhcFN0b3JhZ2UoY29udGV4dCl7XHJcblx0dGhpcy5jb250ZXh0ID0gY29udGV4dDtcclxuXHR0aGlzLmdhcHMgPSBbXTtcclxuXHR0aGlzLnNjb3BlVHJlZSA9IG5ldyBUcmVlSGVscGVyKHtcclxuXHRcdGtpbmQ6ICdkaWN0JyxcclxuXHRcdGluaXROb2RlOiBpbml0Tm9kZUZuXHJcblx0fSk7XHJcblx0dGhpcy5laWREaWN0ID0ge307XHRcclxufTtcclxuXHJcbkdhcFN0b3JhZ2UucHJvdG90eXBlLnNldFNjb3BlVHJpZ2dlciA9IGZ1bmN0aW9uKGdhcCwgc2NvcGVQYXRoKXtcclxuXHR2YXIgc2NvcGUgPSB0aGlzLnNjb3BlVHJlZS5hY2Nlc3Moc2NvcGVQYXRoKTtcdFxyXG5cdHNjb3BlLmRhdGEuZ2Fwcy5wdXNoKGdhcCk7XHJcbn07XHJcblxyXG4vKkdhcFN0b3JhZ2UucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG1ldGEsIHNjb3BlVHJpZ2dlcnMsIGdpZCl7XHJcblx0c2NvcGVUcmlnZ2VycyA9IHNjb3BlVHJpZ2dlcnMgfHwgW21ldGEuc2NvcGVQYXRoXTtcclxuXHR2YXIgZ2FwID0ge1xyXG5cdFx0XCJpZFwiOiBnaWQgfHwgdGhpcy5nZXRHaWQoKSxcclxuXHRcdFwibWV0YVwiOiBtZXRhXHJcblx0fTtcclxuXHRzY29wZVRyaWdnZXJzLmZvckVhY2godGhpcy5zZXRTY29wZVRyaWdnZXIuYmluZCh0aGlzLCBnYXApKTtcclxuXHR0aGlzLmdhcHMucHVzaChnYXApO1xyXG59O1xyXG5cclxuR2FwU3RvcmFnZS5wcm90b3R5cGUuc2V0QXR0cnMgPSBmdW5jdGlvbihtZXRhLCBhdHRycywgZ2lkKXtcclxuXHR2YXIgZmdHYXBDbGFzcyA9ICdmZy1nYXAtJyArIHRoaXMuY29udGV4dC5pZDtcclxuXHRhdHRycy5jbGFzcyA9IGF0dHJzLmNsYXNzIFxyXG5cdFx0PyBmZ0dhcENsYXNzICsgJyAnICsgYXR0cnMuY2xhc3NcclxuXHRcdDogZmdHYXBDbGFzcztcclxuXHRhdHRyc1tcImRhdGEtZmctXCIgKyB0aGlzLmNvbnRleHQuaWQgKyBcIi1nYXAtaWRcIl0gPSBnaWQ7XHJcblx0Ly9hdHRycy5pZCA9IFtcImZnXCIsIHRoaXMuY29udGV4dC5pZCwgXCJnYXAtaWRcIiwgZ2lkXS5qb2luKCctJyk7XHJcbiBcdHJldHVybiBhdHRycztcclxufTsqL1xyXG5cclxuR2FwU3RvcmFnZS5wcm90b3R5cGUuc2V0VHJpZ2dlcnMgPSBmdW5jdGlvbihnYXBNZXRhLCBzY29wZVRyaWdnZXJzKXtcdFxyXG5cdHNjb3BlVHJpZ2dlcnMuZm9yRWFjaCh0aGlzLnNldFNjb3BlVHJpZ2dlci5iaW5kKHRoaXMsIGdhcE1ldGEpKTtcclxufTtcclxuXHJcbkdhcFN0b3JhZ2UucHJvdG90eXBlLnJlZyA9IGZ1bmN0aW9uKGdhcE1ldGEpe1xyXG5cdHZhciBlaWQgPSBnYXBNZXRhLmVpZDtcclxuXHRpZiAoZWlkKXtcdFx0XHJcblx0XHR0aGlzLmVpZERpY3RbZWlkXSA9IHRoaXMuZWlkRGljdFtlaWRdIHx8IFtdO1xyXG5cdFx0dGhpcy5laWREaWN0W2VpZF0ucHVzaChnYXBNZXRhKTtcclxuXHR9O1xyXG5cdHZhciBnaWQgPSB0aGlzLmdldEdpZCgpO1xyXG5cdGdhcE1ldGEuZ2lkID0gZ2lkO1xyXG5cdGlmICghZ2FwTWV0YS5pc1ZpcnR1YWwpe1xyXG5cdFx0Z2FwTWV0YS5hdHRycyA9IHV0aWxzLnNpbXBsZUNsb25lKGdhcE1ldGEuYXR0cnMgfHwge30pO1x0XHRcclxuXHRcdGdhcE1ldGEuYXR0cnMuaWQgPSBbXCJmZ1wiLCB0aGlzLmNvbnRleHQuaWQsIFwiZ2lkXCIsIGdpZF0uam9pbignLScpO1xyXG5cdH07XHJcblx0Z2FwTWV0YS5zdG9yYWdlSWQgPSB0aGlzLmdhcHMubGVuZ3RoO1xyXG5cdHRoaXMuZ2Fwcy5wdXNoKGdhcE1ldGEpO1x0XHRcclxuXHQvL3JldHVybiBhdHRyc09iajtcclxufTtcclxuXHJcbkdhcFN0b3JhZ2UucHJvdG90eXBlLmFzc2lnbiA9IGZ1bmN0aW9uKCl7XHJcblx0Ly9pZiAoKVxyXG5cdHRoaXMuZ2Fwcy5mb3JFYWNoKGZ1bmN0aW9uKGdhcE1ldGEpe1xyXG5cdFx0aWYgKGdhcE1ldGEudHlwZSAhPSBcInJvb3RcIiAmJiBnYXBNZXRhLmZnKXtcclxuXHRcdFx0Z2FwTWV0YS5mZy5hc3NpZ24oKTtcclxuXHRcdH07XHJcblx0fSk7XHJcblx0cmV0dXJuO1xyXG5cdHZhciBzZWxmID0gdGhpcztcclxuXHR2YXIgZ2FwTm9kZXMgPSB0aGlzLmNvbnRleHQuZG9tLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2ZnLWdhcC0nICsgdGhpcy5jb250ZXh0LmlkKTtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGdhcE5vZGVzLmxlbmd0aDsgaSsrKXtcclxuXHRcdHZhciBnYXBOb2RlID0gZ2FwTm9kZXNbaV07XHJcblx0XHR2YXIgZ2lkID0gZ2FwTm9kZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtZmctJyArIHRoaXMuY29udGV4dC5pZCArICctZ2FwLWlkJyk7XHJcblx0XHR2YXIgZ2FwID0gc2VsZi5nYXBzW2dpZF07XHJcblx0XHRpZiAoIWdhcCl7Y29udGludWV9O1xyXG5cdFx0aWYgKGdhcC5tZXRhLmZnKXtcclxuXHRcdFx0Z2FwLm1ldGEuZmcuYXNzaWduKCk7XHJcblx0XHR9O1xyXG5cdFx0Z2FwLm1ldGEuZG9tID0gZ2FwTm9kZTtcclxuXHR9O1xyXG59O1xyXG5cclxuLypHYXBTdG9yYWdlLnByb3RvdHlwZS5zdWJUcmVlID0gZnVuY3Rpb24oc2NvcGVQYXRoKXtcclxuXHR2YXIgYnJhbmNoID0gYWNjZXNzU2NvcGVMZWFmKHRoaXMuc2NvcGVUcmVlLCBzY29wZVBhdGgpO1xyXG5cdHZhciByZXMgPSBbXTtcclxuXHJcblx0ZnVuY3Rpb24gaXRlcmF0ZShub2RlKXtcclxuXHRcdGZvciAodmFyIGkgaW4gbm9kZS5jaGlsZHJlbil7XHJcblxyXG5cdFx0fTtcclxuXHR9O1xyXG5cclxuXHJcbn07Ki9cclxuXHJcbkdhcFN0b3JhZ2UucHJvdG90eXBlLmJ5U2NvcGUgPSBmdW5jdGlvbihzY29wZVBhdGgsIHRhcmdldE9ubHkpe1xyXG5cdHZhciBzY29wZSA9IHRoaXMuc2NvcGVUcmVlLmFjY2VzcyhzY29wZVBhdGgpO1x0XHRcclxuXHR2YXIgc3ViTm9kZXMgPSBbXTtcclxuXHRpZiAoc2NvcGUuY2hpbGRDb3VudCAhPSAwICYmICF0YXJnZXRPbmx5KXtcclxuXHRcdHN1Yk5vZGVzID0gc2NvcGUuZ2V0RGVlcENoaWxkQXJyKCkubWFwKGZ1bmN0aW9uKG5vZGUpe1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGdhcHM6IG5vZGUuZGF0YS5nYXBzLFxyXG5cdFx0XHRcdHBhdGg6IG5vZGUucGF0aFx0XHJcblx0XHRcdH07XHRcdFx0XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cdHZhciBwYXJlbnRzID0gc2NvcGUuZ2V0UGFyZW50cygpO1xyXG5cdHJldHVybiB7XHJcblx0XHR0YXJnZXQ6IHNjb3BlLmRhdGEuZ2FwcyxcclxuXHRcdHN1YnM6IHN1Yk5vZGVzLFxyXG5cdFx0cGFyZW50czogcGFyZW50c1xyXG5cdH07XHJcbn07XHJcblxyXG5HYXBTdG9yYWdlLnByb3RvdHlwZS5yZW1vdmVTY29wZSA9IGZ1bmN0aW9uKHNjb3BlUGF0aCl7XHJcblx0dmFyIHNjb3BlID0gdGhpcy5ieVNjb3BlKHNjb3BlUGF0aCk7XHRcclxuXHR2YXIgcmVtb3ZlZERvbUdhcHMgPSBzY29wZS50YXJnZXQ7XHJcblx0dmFyIHJlbW92ZWRHYXBzID0gc2NvcGUudGFyZ2V0O1xyXG5cdHNjb3BlLnN1YnMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcclxuXHRcdHJlbW92ZWRHYXBzID0gcmVtb3ZlZEdhcHMuY29uY2F0KG5vZGUuZ2Fwcyk7XHJcblx0fSk7XHJcblx0dGhpcy5zY29wZVRyZWUucmVtb3ZlKHNjb3BlUGF0aCk7XHJcblx0dGhpcy5nYXBzID0gdGhpcy5nYXBzLmZpbHRlcihmdW5jdGlvbihnYXApe1xyXG5cdFx0cmV0dXJuICF+cmVtb3ZlZEdhcHMuaW5kZXhPZihnYXApO1xyXG5cdH0pO1xyXG5cdHJlbW92ZWREb21HYXBzLmZvckVhY2goZnVuY3Rpb24oZ2FwKXtcclxuXHRcdGdhcC5yZW1vdmVEb20oKTtcclxuXHR9KTtcclxufTtcclxuXHJcbkdhcFN0b3JhZ2UucHJvdG90eXBlLmJ5RWlkID0gZnVuY3Rpb24oZWlkKXtcclxuXHRyZXR1cm4gdGhpcy5laWREaWN0W2VpZF07XHJcbn07XHJcblxyXG5HYXBTdG9yYWdlLnByb3RvdHlwZS5nZXRHaWQgPSBmdW5jdGlvbigpe1xyXG5cdHJldHVybiB0aGlzLmdhcHMubGVuZ3RoO1xyXG59O1xyXG5cclxuZXhwb3J0cy5HYXBTdG9yYWdlID0gR2FwU3RvcmFnZTtcclxuIiwidmFyIGdhcENsYXNzTWdyID0gcmVxdWlyZSgnLi9nYXBDbGFzc01nci5qcycpO3ZhciByZW5kZXJUcGwgPSByZXF1aXJlKCdmZy1qcy90cGxSZW5kZXIuanMnKS5yZW5kZXJUcGwuYmluZChudWxsLCBnYXBDbGFzc01ncik7XG5leHBvcnRzW1wiZGF0YVwiXSA9IHtcblx0XCJyZW5kZXJcIjogZnVuY3Rpb24gKGNvbnRleHQsIGRhdGEpe1xyXG5cdFx0dmFyIHV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMnKTtcclxuXHRcdGNvbnRleHQuZ2FwU3RvcmFnZS5zZXRUcmlnZ2Vycyh0aGlzLCBbdGhpcy5zY29wZVBhdGhdKTtcclxuXHRcdHZhciB2YWx1ZSA9IHV0aWxzLm9ialBhdGgodGhpcy5zY29wZVBhdGgsIGRhdGEpXHJcblx0XHRyZXR1cm4gdXRpbHMucmVuZGVyVGFnKHtcclxuXHRcdFx0bmFtZTogXCJzcGFuXCIsXHJcblx0XHRcdGF0dHJzOiB0aGlzLmF0dHJzLFxyXG5cdFx0XHRpbm5lckhUTUw6IHZhbHVlXHJcblx0XHR9KTtcclxuXHR9LFxuXCJ1cGRhdGVcIjogZnVuY3Rpb24gKGNvbnRleHQsIG1ldGEsIHNjb3BlUGF0aCwgdmFsdWUpe1xyXG5cdFx0dmFyIG5vZGUgPSBtZXRhLmdldERvbSgpWzBdO1xyXG5cdFx0aWYgKCFub2RlKXtcclxuXHRcdFx0XHJcblx0XHR9O1xyXG5cdFx0bm9kZS5pbm5lckhUTUwgPSB2YWx1ZTtcclxuXHRcdC8vaGlnaGxpZ2h0KG5vZGUsIFsweGZmZmZmZiwgMHhmZmVlODhdLCA1MDApO1xyXG5cdH1cbn07XG5cbmV4cG9ydHNbXCJzY29wZVwiXSA9IHtcblx0XCJyZW5kZXJcIjogZnVuY3Rpb24gKGNvbnRleHQsIGRhdGEpe1xyXG5cdFx0dmFyIG1ldGEgPSB0aGlzO1xyXG5cdFx0bWV0YS5pdGVtcyA9IFtdO1xyXG5cdFx0dmFyIHV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMnKTtcclxuXHRcdG1ldGEuc2NvcGVQYXRoID0gdXRpbHMuZ2V0U2NvcGVQYXRoKG1ldGEpO1x0XHRcclxuXHRcdHZhciBzY29wZURhdGEgPSB1dGlscy5vYmpQYXRoKG1ldGEuc2NvcGVQYXRoLCBkYXRhKTtcclxuXHRcdGNvbnRleHQuZ2FwU3RvcmFnZS5zZXRUcmlnZ2Vycyh0aGlzLCBbdGhpcy5zY29wZVBhdGhdKTtcclxuXHRcdHZhciBwbGFjZUhvbGRlcklubmVyID0gWydmZycsIGNvbnRleHQuaWQsICdzY29wZS1naWQnLCBtZXRhLmdpZF0uam9pbignLScpO1xyXG5cdFx0aWYgKCFzY29wZURhdGEpe1xyXG5cdFx0XHRyZXR1cm4gJzwhLS0nICsgcGxhY2VIb2xkZXJJbm5lciArICctLT4nO1xyXG5cdFx0fTtcdFx0XHJcblx0XHR2YXIgcGFydHMgPSB1dGlscy5yZW5kZXJTY29wZUNvbnRlbnQoY29udGV4dCwgbWV0YSwgc2NvcGVEYXRhLCBkYXRhLCAwKTtcclxuXHRcdHBhcnRzLnB1c2goJzwhLS0nICsgcGxhY2VIb2xkZXJJbm5lciArICctLT4nKTtcclxuXHRcdHJldHVybiBwYXJ0cy5qb2luKCdcXG4nKTtcclxuXHR9LFxuXCJ1cGRhdGVcIjogZnVuY3Rpb24gKGNvbnRleHQsIG1ldGEsIHNjb3BlUGF0aCwgdmFsdWUsIG9sZFZhbHVlKXtcdFx0XHJcblx0XHR2YXIgdXRpbHMgPSByZXF1aXJlKCdmZy1qcy91dGlscycpO1xyXG5cdFx0dmFyIGdhcENsYXNzTWdyID0gcmVxdWlyZSgnZmctanMvY2xpZW50L2dhcENsYXNzTWdyLmpzJyk7XHJcblx0XHR2YWx1ZSA9IHZhbHVlIHx8IFtdO1xyXG5cdFx0b2xkVmFsdWUgPSBvbGRWYWx1ZSB8fCBbXTtcclxuXHRcdGZvciAodmFyIGkgPSB2YWx1ZS5sZW5ndGg7IGkgPCBvbGRWYWx1ZS5sZW5ndGg7IGkrKyl7XHJcblx0XHRcdGNvbnRleHQuZ2FwU3RvcmFnZS5yZW1vdmVTY29wZShzY29wZVBhdGguY29uY2F0KFtpXSkpO1xyXG5cdFx0fTtcclxuXHRcdGlmICh2YWx1ZS5sZW5ndGggPiBvbGRWYWx1ZS5sZW5ndGgpe1xyXG5cdFx0XHR2YXIgc2NvcGVIb2xkZXIgPSB1dGlscy5maW5kU2NvcGVIb2xkZXIobWV0YSk7XHJcblx0XHRcdHZhciBub2RlcyA9IFtdLnNsaWNlLmNhbGwoc2NvcGVIb2xkZXIuZ2V0RG9tKClbMF0uY2hpbGROb2Rlcyk7XHJcblx0XHRcdHZhciBwbGFjZUhvbGRlcklubmVyID0gWydmZycsIGNvbnRleHQuaWQsICdzY29wZS1naWQnLCBtZXRhLmdpZF0uam9pbignLScpO1xyXG5cdFx0XHR2YXIgZm91bmQgPSBub2Rlcy5maWx0ZXIoZnVuY3Rpb24obm9kZSl7XHJcblx0XHRcdCAgICBpZiAobm9kZS5ub2RlVHlwZSAhPSA4KXtcclxuXHRcdFx0ICAgICAgICByZXR1cm4gZmFsc2VcclxuXHRcdFx0ICAgIH07XHJcblx0XHRcdCAgICBpZiAobm9kZS50ZXh0Q29udGVudCA9PSBwbGFjZUhvbGRlcklubmVyKXtcclxuXHRcdFx0ICAgIFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdCAgICB9O1x0XHRcdCAgICBcclxuXHRcdFx0fSk7XHJcblx0XHRcdGZvdW5kID0gZm91bmRbMF07XHJcblx0XHRcdHZhciBkYXRhU2xpY2UgPSB2YWx1ZS5zbGljZShvbGRWYWx1ZS5sZW5ndGgpO1xyXG5cdFx0XHR2YXIgbmV3Q29udGVudCA9IHV0aWxzLnJlbmRlclNjb3BlQ29udGVudChjb250ZXh0LCBtZXRhLCBkYXRhU2xpY2UsIGNvbnRleHQuZGF0YSwgb2xkVmFsdWUubGVuZ3RoKS5qb2luKCdcXG4nKTtcclxuXHRcdFx0dXRpbHMuaW5zZXJ0SFRNTEJlZm9yZUNvbW1lbnQoZm91bmQsIG5ld0NvbnRlbnQpO1xyXG5cdFx0fTtcclxuXHRcdHRoaXM7XHJcblx0XHQvL2NvbnRleHQucmVyZW5kZXIoY29udGV4dC5kYXRhKTtcclxuXHR9XG59O1xuXG5leHBvcnRzW1wic2NvcGUtaXRlbVwiXSA9IHtcblx0XCJyZW5kZXJcIjogZnVuY3Rpb24gKGNvbnRleHQsIGRhdGEpe1xyXG5cdFx0dmFyIG1ldGEgPSB0aGlzO1xyXG5cdFx0dmFyIHV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMnKTtcdFx0XHJcblx0XHRtZXRhLnNjb3BlUGF0aCA9IHV0aWxzLmdldFNjb3BlUGF0aChtZXRhKTtcdFx0XHJcblx0XHR2YXIgc2NvcGVEYXRhID0gdXRpbHMub2JqUGF0aChtZXRhLnNjb3BlUGF0aCwgZGF0YSk7XHJcblx0XHRjb250ZXh0LmdhcFN0b3JhZ2Uuc2V0VHJpZ2dlcnModGhpcywgW3RoaXMuc2NvcGVQYXRoXSk7XHJcblx0XHRpZiAoIXNjb3BlRGF0YSl7XHJcblx0XHRcdHJldHVybiAnJztcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gY29udGV4dC5yZW5kZXJUcGwobWV0YS5jb250ZW50LCBtZXRhLCBkYXRhKTtcclxuXHR9LFxuXCJ1cGRhdGVcIjogZnVuY3Rpb24gKGNvbnRleHQsIG1ldGEsIHNjb3BlUGF0aCwgdmFsdWUsIG9sZFZhbHVlKXtcdFx0XHJcblx0XHRyZXR1cm47XHJcblx0fVxufTtcblxuZXhwb3J0c1tcImZnXCJdID0ge1xuXHRcInJlbmRlclwiOiBmdW5jdGlvbiAoY29udGV4dCwgZGF0YSwgbWV0YSl7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR2YXIgdXRpbHMgPSByZXF1aXJlKCdmZy1qcy91dGlscycpO1xyXG5cdFx0dGhpcy5wYXJlbnRGZyA9IGNvbnRleHQ7XHJcblx0XHQvL3RoaXMucmVuZGVyZWRDb250ZW50ID0gY29udGV4dC5yZW5kZXJUcGwodGhpcy5jb250ZW50LCBtZXRhLCBkYXRhKTtcclxuXHRcdHZhciBmZ0NsYXNzID0gJGZnLmNsYXNzZXNbdGhpcy5mZ05hbWVdO1x0XHJcblx0XHR2YXIgc2NvcGVEYXRhID0gdXRpbHMuZGVlcENsb25lKHV0aWxzLm9ialBhdGgodGhpcy5zY29wZVBhdGgsIGRhdGEpKTtcdFx0XHRcclxuXHRcdHZhciBmZyA9IGZnQ2xhc3MucmVuZGVyKHNjb3BlRGF0YSwgdGhpcywgY29udGV4dCk7XHJcblx0XHRmZy5vbigndXBkYXRlJywgZnVuY3Rpb24ocGF0aCwgdmFsKXtcclxuXHRcdFx0Y29udGV4dC51cGRhdGUoc2VsZi5zY29wZVBhdGguY29uY2F0KHBhdGgpLCB2YWwpO1xyXG5cdFx0XHQvL2NvbnNvbGUubG9nKHBhdGgsIHZhbCk7XHJcblx0XHR9KTtcclxuXHRcdHRoaXMuZmcgPSBmZztcclxuXHRcdGZnLm1ldGEgPSB0aGlzO1xyXG5cdFx0Y29udGV4dC5jaGlsZEZncy5wdXNoKGZnKTtcclxuXHRcdGNvbnRleHQuZ2FwU3RvcmFnZS5zZXRUcmlnZ2Vycyh0aGlzLCBbdGhpcy5zY29wZVBhdGhdKTtcdFx0XHJcblx0XHRyZXR1cm4gZmc7XHJcblx0XHRpZiAodHJ1ZSl7IC8vIGNsaWVudFxyXG5cdFx0XHRcclxuXHRcdH07XHRcdFxyXG5cdFx0dGhyb3cgJ3RvZG8gc2VydmVyIHJlbmRlcic7XHJcblx0fSxcblwidXBkYXRlXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBtZXRhLCBzY29wZVBhdGgsIHZhbHVlKXtcclxuXHRcdHJldHVybjtcclxuXHR9XG59O1xuXG5leHBvcnRzW1wiY29udGVudFwiXSA9IHtcblx0XCJyZW5kZXJcIjogZnVuY3Rpb24gKGNvbnRleHQsIGRhdGEsIG1ldGEpe1xyXG5cdFx0dGhpcy5zY29wZVBhdGggPSBjb250ZXh0LmdhcE1ldGEuc2NvcGVQYXRoO1xyXG5cdFx0Ly92YXIgdXRpbHMgPSByZXF1aXJlKCdmZy91dGlscycpO1x0XHRcdFxyXG5cdFx0cmV0dXJuIGNvbnRleHQucGFyZW50LnJlbmRlclRwbChjb250ZXh0Lm1ldGEuY29udGVudCwgdGhpcywgY29udGV4dC5wYXJlbnQuZGF0YSk7XHJcblx0fSxcblwidXBkYXRlXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBtZXRhLCBzY29wZVBhdGgsIHZhbHVlKXtcclxuXHRcdHJldHVybjtcclxuXHR9XG59O1xuXG5leHBvcnRzW1wicmF3XCJdID0ge1xuXHRcInJlbmRlclwiOiBmdW5jdGlvbiAoY29udGV4dCwgZGF0YSl7XHRcdFxyXG5cdFx0dmFyIG1ldGEgPSB0aGlzO1xyXG5cdFx0dmFyIHV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMnKTtcclxuXHRcdGlmIChtZXRhLmlzU2NvcGVIb2xkZXIpe1xyXG5cdFx0XHRtZXRhLnJvb3QuY3VycmVudFNjb3BlSG9sZGVyID0gbWV0YTtcdFx0XHJcblx0XHR9O1xyXG5cdFx0dmFyIGF0dHJEYXRhID0gdXRpbHMub2JqUGF0aChtZXRhLnNjb3BlUGF0aCwgZGF0YSk7XHJcblx0XHR2YXIgYXR0cnNBcnIgPSB1dGlscy5vYmpUb0tleVZhbHVlKG1ldGEuYXR0cnMsICduYW1lJywgJ3ZhbHVlJyk7XHJcblx0XHR2YXIgcmVuZGVyZWRBdHRycyA9IHV0aWxzLnJlbmRlckF0dHJzKG1ldGEuYXR0cnMsIGF0dHJEYXRhKTtcclxuXHRcdHZhciB0cmlnZ2VycyA9IHV0aWxzXHJcblx0XHRcdC5nZXRBdHRyc1BhdGhzKG1ldGEuYXR0cnMpXHRcclxuXHRcdFx0Lm1hcChmdW5jdGlvbihwYXRoKXtcclxuXHRcdFx0XHRyZXR1cm4gdXRpbHMucmVzb2x2ZVBhdGgobWV0YS5zY29wZVBhdGgsIHBhdGgpO1xyXG5cdFx0XHR9KTtcdFxyXG5cdFx0dmFyIHZhbHVlUGF0aDtcclxuXHRcdGlmIChtZXRhLnZhbHVlKXtcclxuXHRcdFx0dmFsdWVQYXRoID0gdXRpbHMucmVzb2x2ZVBhdGgobWV0YS5zY29wZVBhdGgsIG1ldGEudmFsdWUpO1xyXG5cdFx0XHR0cmlnZ2Vycy5wdXNoKHZhbHVlUGF0aCk7XHJcblx0XHRcdG1ldGEudmFsdWVQYXRoID0gdmFsdWVQYXRoO1xyXG5cdFx0fTsgXHJcblx0XHQvKnZhciBzY29wZVRyaWdnZXJzID0gYXR0cnNQYXRocztcclxuXHRcdGlmIChtZXRhLmlzU2NvcGVJdGVtKXtcclxuXHRcdFx0c2NvcGVUcmlnZ2Vycy5wdXNoKG1ldGEuc2NvcGVQYXRoKTtcclxuXHRcdH07Ki9cclxuXHRcdGNvbnRleHQuZ2FwU3RvcmFnZS5zZXRUcmlnZ2VycyhtZXRhLCB0cmlnZ2Vycyk7XHRcdFxyXG5cdFx0dmFyIGlubmVyID0gbWV0YS52YWx1ZSBcclxuXHRcdFx0PyB1dGlscy5vYmpQYXRoKHZhbHVlUGF0aCwgZGF0YSlcclxuXHRcdFx0OiBjb250ZXh0LnJlbmRlclRwbChtZXRhLmNvbnRlbnQsIG1ldGEsIGRhdGEpO1xyXG5cdFx0cmV0dXJuIHV0aWxzLnJlbmRlclRhZyh7XHJcblx0XHRcdFwibmFtZVwiOiBtZXRhLnRhZ05hbWUsXHJcblx0XHRcdFwiYXR0cnNcIjogcmVuZGVyZWRBdHRycyxcclxuXHRcdFx0XCJpbm5lckhUTUxcIjogaW5uZXJcclxuXHRcdH0pO1xyXG5cdH0sXG5cInVwZGF0ZVwiOiBmdW5jdGlvbiAoY29udGV4dCwgbWV0YSwgc2NvcGVQYXRoLCB2YWx1ZSl7XHJcblx0XHQvLyB0byBkbyB2YWx1ZSB1cGRhdGVcclxuXHRcdHZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnLWpzL3V0aWxzJyk7XHJcblx0XHR2YXIgYXR0ckRhdGEgPSB1dGlscy5vYmpQYXRoKG1ldGEuc2NvcGVQYXRoLCBjb250ZXh0LmRhdGEpO1xyXG5cdFx0dmFyIHJlbmRlcmVkQXR0cnMgPSB1dGlscy5yZW5kZXJBdHRycyhtZXRhLmF0dHJzLCBhdHRyRGF0YSk7XHJcblx0XHR2YXIgZG9tID0gbWV0YS5nZXREb20oKVswXTtcclxuXHRcdGlmIChtZXRhLnZhbHVlICYmIG1ldGEudmFsdWVQYXRoLmpvaW4oJy0nKSA9PSBzY29wZVBhdGguam9pbignLScpKXtcclxuXHRcdFx0ZG9tLmlubmVySFRNTCA9IHZhbHVlO1xyXG5cdFx0fTtcclxuXHRcdHV0aWxzLm9iakZvcihyZW5kZXJlZEF0dHJzLCBmdW5jdGlvbih2YWx1ZSwgbmFtZSl7XHJcblx0XHRcdHZhciBvbGRWYWwgPSBkb20uZ2V0QXR0cmlidXRlKG5hbWUpO1xyXG5cdFx0XHRpZiAob2xkVmFsICE9IHZhbHVlKXtcclxuXHRcdFx0XHRkb20uc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcclxuXHRcdFx0fTtcclxuXHRcdH0pO1x0XHRcclxuXHR9XG59OyIsInZhciBldmVudHMgPSB7fTtcclxuXHJcbmZ1bmN0aW9uIGhhbmRsZXIobmFtZSwgZXZlbnQpe1xyXG5cdHZhciBlbG0gPSBldmVudC50YXJnZXQ7XHJcblx0d2hpbGUgKGVsbSl7XHJcblx0XHR2YXIgZmcgPSAkZmcuYnlEb20oZWxtKTtcclxuXHRcdGlmIChmZyl7XHJcblx0XHRcdGZnLmVtaXRBcHBseShuYW1lLCBmZywgW2V2ZW50XSk7XHJcblx0XHRcdC8vcmV0dXJuO1xyXG5cdFx0fTtcclxuXHRcdGVsbSA9IGVsbS5wYXJlbnROb2RlO1xyXG5cdH07XHJcbn07XHJcblxyXG5leHBvcnRzLmxpc3RlbiA9IGZ1bmN0aW9uKG5hbWUpe1xyXG5cdGlmIChuYW1lIGluIGV2ZW50cyl7XHJcblx0XHRyZXR1cm47XHJcblx0fTtcdFxyXG5cdGV2ZW50c1tuYW1lXSA9IHRydWU7XHJcblx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBoYW5kbGVyLmJpbmQobnVsbCwgbmFtZSksIHtcImNhcHR1cmVcIjogdHJ1ZX0pO1xyXG59OyIsIm1vZHVsZS5leHBvcnRzID0gJGZnO1xyXG5cclxudmFyIGZnQ2xhc3NNb2R1bGUgPSByZXF1aXJlKCdmZy1qcy9jbGllbnQvZmdDbGFzcy5qcycpO1xyXG52YXIgZmdJbnN0YW5jZU1vZHVsZSA9IHJlcXVpcmUoJ2ZnLWpzL2NsaWVudC9mZ0luc3RhbmNlLmpzJyk7XHJcblxyXG5mdW5jdGlvbiAkZmcoYXJnKXtcclxuXHRpZiAoYXJnIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpe1xyXG5cdFx0cmV0dXJuICRmZy5ieURvbShhcmcpO1xyXG5cdH07XHJcblx0aWYgKHR5cGVvZiBhcmcgPT0gXCJzdHJpbmdcIil7XHJcblx0XHRyZXR1cm4gZmdDbGFzc01vZHVsZS5mZ0NsYXNzRGljdFthcmddO1xyXG5cdH07XHJcbn07XHJcblxyXG4kZmcubG9hZCA9IGZ1bmN0aW9uKGZnRGF0YSl7XHJcblx0aWYgKEFycmF5LmlzQXJyYXkoZmdEYXRhKSl7XHRcdFxyXG5cdFx0cmV0dXJuIGZnRGF0YS5tYXAoJGZnLmxvYWQpO1xyXG5cdH07XHJcblx0cmV0dXJuIG5ldyBmZ0NsYXNzTW9kdWxlLkZnQ2xhc3MoZmdEYXRhKTtcclxufTtcclxuXHJcbiRmZy5pc0ZnID0gZnVuY3Rpb24oZG9tTm9kZSl7XHJcblx0cmV0dXJuIGRvbU5vZGUuY2xhc3NMaXN0ICYmIGRvbU5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdmZycpO1xyXG59O1xyXG5cclxudmFyIGlpZFJlID0gL2ZnXFwtaWlkXFwtKFxcZCspL2c7XHJcbnZhciBpZFJlID0gL2ZnXFwtKFxcZCspXFwtZ2lkXFwtKFxcZCspL2c7XHJcblxyXG4kZmcuYnlEb20gPSBmdW5jdGlvbihkb21Ob2RlKXtcdFxyXG5cdGlmICghZG9tTm9kZSB8fCAhZG9tTm9kZS5jbGFzc05hbWUpe1xyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fTtcclxuXHRpZiAoIX5kb21Ob2RlLmNsYXNzTmFtZS5zcGxpdCgnICcpLmluZGV4T2YoJ2ZnJykpe1xyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fTtcclxuXHRpZiAoIWRvbU5vZGUuaWQpe1xyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fTtcclxuXHRpZFJlLmxhc3RJbmRleCA9IDA7XHJcblx0dmFyIHJlcyA9IGlkUmUuZXhlYyhkb21Ob2RlLmlkKTtcclxuXHRpZiAoIXJlcyl7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9O1xyXG5cdHZhciBpaWQgPSBwYXJzZUludChyZXNbMV0pO1xyXG5cdHJldHVybiBmZ0luc3RhbmNlTW9kdWxlLmdldEZnQnlJaWQoaWlkKTtcdFxyXG59O1xyXG5cclxuJGZnLmdhcENsb3Nlc3QgPSBmdW5jdGlvbihkb21Ob2RlKXtcclxuXHR3aGlsZSAodHJ1ZSl7XHJcblx0XHRpZFJlLmxhc3RJbmRleCA9IDA7XHJcblx0XHR2YXIgcmVzID0gaWRSZS5leGVjKGRvbU5vZGUuaWQpO1xyXG5cdFx0aWYgKCFyZXMpe1xyXG5cdFx0XHRkb21Ob2RlID0gZG9tTm9kZS5wYXJlbnROb2RlO1xyXG5cdFx0XHRpZiAoIWRvbU5vZGUpe1xyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH07XHJcblx0XHR2YXIgaWlkID0gcGFyc2VJbnQocmVzWzFdKTtcclxuXHRcdHZhciBmZyA9IGZnSW5zdGFuY2VNb2R1bGUuZ2V0RmdCeUlpZChpaWQpO1xyXG5cdFx0dmFyIGdpZCA9IHBhcnNlSW50KHJlc1syXSk7XHJcblx0XHRyZXR1cm4gZmcuZ2FwU3RvcmFnZS5nYXBzW2dpZF07XHJcblx0fTtcclxufTtcclxuXHJcbiRmZy5jbGFzc2VzID0gZmdDbGFzc01vZHVsZS5mZ0NsYXNzRGljdDtcclxuXHJcbiRmZy5mZ3MgPSBmZ0luc3RhbmNlTW9kdWxlLmZnSW5zdGFuY2VUYWJsZTtcclxuXHJcbiRmZy5qcSA9IHdpbmRvdy5qUXVlcnk7XHJcblxyXG53aW5kb3cuJGZnID0gJGZnOyIsInZhciBmZ0hlbHBlciA9IHJlcXVpcmUoJy4vaGVscGVyLmpzJyk7IiwiZnVuY3Rpb24gRXZlbnRFbWl0dGVyKHBhcmVudCl7XHJcblx0dGhpcy5ldmVudHMgPSB7fTtcclxuXHR0aGlzLnBhcmVudCA9IHBhcmVudDtcclxufTtcclxuXHJcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbihuYW1lLCBmbil7XHJcblx0dmFyIGV2ZW50TGlzdCA9IHRoaXMuZXZlbnRzW25hbWVdO1xyXG5cdGlmICghZXZlbnRMaXN0KXtcclxuXHRcdGV2ZW50TGlzdCA9IFtdO1xyXG5cdFx0dGhpcy5ldmVudHNbbmFtZV0gPSBldmVudExpc3Q7XHJcblx0fTtcclxuXHRldmVudExpc3QucHVzaChmbik7XHJcbn07XHJcblxyXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihuYW1lLyosIHJlc3QqLyl7XHJcblx0aWYgKHRoaXMucGFyZW50KXtcclxuXHRcdHRoaXMucGFyZW50LmVtaXQuYXBwbHkodGhpcy5wYXJlbnQsIGFyZ3VtZW50cyk7XHJcblx0fTtcclxuXHR2YXIgZXZlbnRMaXN0ID0gdGhpcy5ldmVudHNbbmFtZV07XHJcblx0aWYgKCFldmVudExpc3Qpe1xyXG5cdFx0cmV0dXJuO1xyXG5cdH07XHJcblx0dmFyIGVtaXRBcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1x0IFxyXG5cdGV2ZW50TGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGZuKXtcclxuXHRcdGZuLmFwcGx5KHRoaXMsIGVtaXRBcmdzKTtcclxuXHR9KTtcclxufTtcclxuXHJcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdEFwcGx5ID0gZnVuY3Rpb24obmFtZSwgdGhpc0FyZywgYXJncyl7XHJcblx0aWYgKHRoaXMucGFyZW50KXtcclxuXHRcdHRoaXMucGFyZW50LmVtaXRBcHBseS5hcHBseSh0aGlzLnBhcmVudCwgYXJndW1lbnRzKTtcclxuXHR9O1xyXG5cdHZhciBldmVudExpc3QgPSB0aGlzLmV2ZW50c1tuYW1lXTtcclxuXHRpZiAoIWV2ZW50TGlzdCl7XHJcblx0XHRyZXR1cm47XHJcblx0fTtcclxuXHRldmVudExpc3QuZm9yRWFjaChmdW5jdGlvbihmbil7XHJcblx0XHRmbi5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuXHR9KTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyOyIsInZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnLWpzL3V0aWxzJyk7XHJcblxyXG5mdW5jdGlvbiByZW5kZXJUcGwodHBsLCBwYXJlbnQsIGRhdGEsIG1ldGEpe1xyXG5cdHZhciBzZWxmID0gdGhpcztcclxuXHR2YXIgcGFydHMgPSB0cGwubWFwKGZ1bmN0aW9uKHBhcnQsIHBhcnRJZCl7XHJcblx0XHRpZiAodHlwZW9mIHBhcnQgPT0gXCJzdHJpbmdcIil7XHJcblx0XHRcdHJldHVybiBwYXJ0O1xyXG5cdFx0fTtcclxuXHRcdHZhciBwYXJ0TWV0YSA9IHV0aWxzLnNpbXBsZUNsb25lKHBhcnQpO1xyXG5cdFx0aWYgKG1ldGEpe1xyXG5cdFx0XHRpZiAodHlwZW9mIG1ldGEgPT0gXCJmdW5jdGlvblwiKXtcclxuXHRcdFx0XHRwYXJ0TWV0YSA9IG1ldGEocGFydE1ldGEsIHBhcnRJZCk7XHJcblx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdHBhcnRNZXRhID0gdXRpbHMuZXh0ZW5kKHBhcnRNZXRhLCBtZXRhIHx8IHt9KTtcdFx0XHRcclxuXHRcdFx0fTtcdFxyXG5cdFx0fTtcdFx0XHJcblx0XHRyZXR1cm4gc2VsZi5nYXBDbGFzc01nci5yZW5kZXIoc2VsZi5jb250ZXh0LCBwYXJlbnQsIGRhdGEsIHBhcnRNZXRhKTtcclxuXHR9KTtcclxuXHR2YXIgY29kZSA9IHBhcnRzLmpvaW4oJycpO1xyXG5cdHJldHVybiBjb2RlO1xyXG59O1xyXG5cclxuZXhwb3J0cy5yZW5kZXJUcGwgPSByZW5kZXJUcGw7IiwidmFyIHRwbFV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMvdHBsVXRpbHMuanMnKTtcclxuZXh0ZW5kKGV4cG9ydHMsIHRwbFV0aWxzKTtcclxuXHJcbmZ1bmN0aW9uIG9iakZvcihvYmosIGZuKXtcclxuXHRmb3IgKHZhciBpIGluIG9iail7XHJcblx0XHRmbihvYmpbaV0sIGksIG9iaik7XHJcblx0fTtcclxufTtcclxuZXhwb3J0cy5vYmpGb3IgPSBvYmpGb3I7XHJcblxyXG5mdW5jdGlvbiBvYmpQYXRoKHBhdGgsIG9iaiwgbmV3VmFsKXtcclxuXHRpZiAocGF0aC5sZW5ndGggPCAxKXtcclxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMil7XHJcblx0XHRcdHRocm93ICdyb290IHJld3JpdHRpbmcgaXMgbm90IHN1cHBvcnRlZCc7XHJcblx0XHR9O1xyXG5cdFx0cmV0dXJuIG9iajtcclxuXHR9O1xyXG5cdHZhciBwcm9wTmFtZSA9IHBhdGhbMF07XHJcblx0aWYgKHBhdGgubGVuZ3RoID09IDEpe1xyXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKXtcclxuXHRcdFx0b2JqW3Byb3BOYW1lXSA9IG5ld1ZhbDsgXHJcblx0XHR9O1x0XHRcdFx0XHJcblx0XHRyZXR1cm4gb2JqW3Byb3BOYW1lXTtcdFxyXG5cdH07XHJcblx0dmFyIHN1Yk9iaiA9IG9ialtwcm9wTmFtZV07XHJcblx0aWYgKHN1Yk9iaiA9PT0gdW5kZWZpbmVkKXtcclxuXHRcdC8vdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJlYWQgXCIgKyBwcm9wTmFtZSArIFwiIG9mIHVuZGVmaW5lZFwiKTtcclxuXHRcdHJldHVybiB1bmRlZmluZWQ7IC8vIHRocm93P1xyXG5cdH07XHRcdFxyXG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMil7XHJcblx0XHRyZXR1cm4gb2JqUGF0aChwYXRoLnNsaWNlKDEpLCBzdWJPYmosIG5ld1ZhbCk7XHJcblx0fTtcclxuXHRyZXR1cm4gb2JqUGF0aChwYXRoLnNsaWNlKDEpLCBzdWJPYmopO1xyXG59O1xyXG5leHBvcnRzLm9ialBhdGggPSBvYmpQYXRoO1xyXG5cclxuXHJcbmZ1bmN0aW9uIGF0dHJzVG9PYmooYXR0cnMpe1xyXG5cdHZhciByZXMgPSB7fTtcclxuXHRhdHRycy5mb3JFYWNoKGZ1bmN0aW9uKGkpe1xyXG5cdFx0cmVzW2kubmFtZV0gPSBpLnZhbHVlO1xyXG5cdH0pOyBcclxuXHRyZXR1cm4gcmVzO1xyXG59O1xyXG5leHBvcnRzLmF0dHJzVG9PYmogPSBhdHRyc1RvT2JqO1xyXG5cclxuXHJcbmZ1bmN0aW9uIHNpbXBsZUNsb25lKG9iail7XHJcblx0dmFyIHJlcyA9IHt9O1xyXG5cdGZvciAodmFyIGkgaW4gb2JqKXtcclxuXHRcdHJlc1tpXSA9IG9ialtpXTtcclxuXHR9O1xyXG5cdHJldHVybiByZXM7XHJcbn07XHJcbmV4cG9ydHMuc2ltcGxlQ2xvbmUgPSBzaW1wbGVDbG9uZTtcclxuXHJcblxyXG5mdW5jdGlvbiBtaXhBcnJheXMoYXJyYXlzKXtcclxuXHR2YXIgaWQgPSAwO1xyXG5cdHZhciBtYXhMZW5ndGggPSAwO1xyXG5cdHZhciB0b3RhbExlbmd0aCA9IDA7XHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspe1xyXG5cdFx0bWF4TGVuZ3RoID0gTWF0aC5tYXgoYXJndW1lbnRzW2ldLmxlbmd0aCwgbWF4TGVuZ3RoKTtcclxuXHRcdHRvdGFsTGVuZ3RoICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XHJcblx0fTtcclxuXHR2YXIgcmVzQXJyID0gW107XHJcblx0dmFyIGFycmF5Q291bnQgPSBhcmd1bWVudHMubGVuZ3RoO1xyXG5cdGZvciAodmFyIGlkID0gMDsgaWQgPCBtYXhMZW5ndGg7IGlkKyspe1x0XHRcdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Q291bnQ7IGkrKyl7XHJcblx0XHRcdGlmIChhcmd1bWVudHNbaV0ubGVuZ3RoID4gaWQpe1xyXG5cdFx0XHRcdHJlc0Fyci5wdXNoKGFyZ3VtZW50c1tpXVtpZF0pO1xyXG5cdFx0XHR9O1xyXG5cdFx0fTtcclxuXHR9O1xyXG5cdHJldHVybiByZXNBcnI7XHJcbn07XHJcbmV4cG9ydHMubWl4QXJyYXlzID0gbWl4QXJyYXlzO1xyXG5cclxuZnVuY3Rpb24gcmVzb2x2ZVBhdGgocm9vdFBhdGgsIHJlbFBhdGgpe1xyXG5cdHZhciByZXNQYXRoID0gcm9vdFBhdGguc2xpY2UoKTtcclxuXHRyZWxQYXRoID0gcmVsUGF0aCB8fCBbXTtcclxuXHRyZWxQYXRoLmZvckVhY2goZnVuY3Rpb24oa2V5KXtcclxuXHRcdGlmIChrZXkgPT0gXCJfcm9vdFwiKXtcclxuXHRcdFx0cmVzUGF0aCA9IFtdO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9O1xyXG5cdFx0cmVzUGF0aC5wdXNoKGtleSk7XHJcblx0fSk7XHJcblx0cmV0dXJuIHJlc1BhdGg7XHJcbn07XHJcbmV4cG9ydHMucmVzb2x2ZVBhdGggPSByZXNvbHZlUGF0aDtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRTY29wZVBhdGgobWV0YSl7XHJcblx0dmFyXHRwYXJlbnRQYXRoID0gW107XHJcblx0aWYgKG1ldGEucGFyZW50KXtcclxuXHRcdHBhcmVudFBhdGggPSBtZXRhLnBhcmVudC5zY29wZVBhdGg7XHJcblx0XHRpZiAoIXBhcmVudFBhdGgpe1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJQYXJlbnQgZWxtIG11c3QgaGF2ZSBzY29wZVBhdGhcIik7XHJcblx0XHR9O1xyXG5cdH07XHJcblx0cmV0dXJuIHJlc29sdmVQYXRoKHBhcmVudFBhdGgsIG1ldGEucGF0aClcclxufTtcclxuZXhwb3J0cy5nZXRTY29wZVBhdGggPSBnZXRTY29wZVBhdGg7XHJcblxyXG5mdW5jdGlvbiBrZXlWYWx1ZVRvT2JqKGFyciwga2V5TmFtZSwgdmFsdWVOYW1lKXtcclxuXHRrZXlOYW1lID0ga2V5TmFtZSB8fCAna2V5JztcclxuXHR2YWx1ZU5hbWUgPSB2YWx1ZU5hbWUgfHwgJ3ZhbHVlJztcclxuXHR2YXIgcmVzID0ge307XHJcblx0YXJyLmZvckVhY2goZnVuY3Rpb24oaSl7XHJcblx0XHRyZXNbaVtrZXlOYW1lXV0gPSBpW3ZhbHVlTmFtZV07XHJcblx0fSk7IFxyXG5cdHJldHVybiByZXM7XHJcbn07XHJcbmV4cG9ydHMua2V5VmFsdWVUb09iaiA9IGtleVZhbHVlVG9PYmo7XHRcclxuXHJcbmZ1bmN0aW9uIG9ialRvS2V5VmFsdWUob2JqLCBrZXlOYW1lLCB2YWx1ZU5hbWUpe1xyXG5cdGtleU5hbWUgPSBrZXlOYW1lIHx8ICdrZXknO1xyXG5cdHZhbHVlTmFtZSA9IHZhbHVlTmFtZSB8fCAndmFsdWUnO1xyXG5cdHZhciByZXMgPSBbXTtcclxuXHRmb3IgKHZhciBpIGluIG9iail7XHJcblx0XHR2YXIgaXRlbSA9IHt9O1xyXG5cdFx0aXRlbVtrZXlOYW1lXSA9IGk7XHJcblx0XHRpdGVtW3ZhbHVlTmFtZV0gPSBvYmpbaV07XHJcblx0XHRyZXMucHVzaChpdGVtKTtcclxuXHR9O1xyXG5cdHJldHVybiByZXM7XHJcbn07XHJcbmV4cG9ydHMub2JqVG9LZXlWYWx1ZSA9IG9ialRvS2V5VmFsdWU7XHJcblxyXG5mdW5jdGlvbiBjbG9uZShvYmope1xyXG5cdHJldHVybiBPYmplY3QuY3JlYXRlKG9iaik7XHJcbn07XHJcbmV4cG9ydHMuY2xvbmUgPSBjbG9uZTtcclxuXHJcblxyXG5mdW5jdGlvbiBjb25jYXRPYmoob2JqMSwgb2JqMil7XHJcblx0dmFyIHJlcyA9IHNpbXBsZUNsb25lKG9iajEpO1xyXG5cdGZvciAodmFyIGkgaW4gb2JqMil7XHJcblx0XHRyZXNbaV0gPSBvYmoyW2ldO1xyXG5cdH07XHJcblx0cmV0dXJuIHJlcztcclxufTtcclxuZXhwb3J0cy5jb25jYXRPYmogPSBjb25jYXRPYmo7XHJcblxyXG5mdW5jdGlvbiBleHRlbmQoZGVzdCwgc3JjKXtcdFxyXG5cdGZvciAodmFyIGkgaW4gc3JjKXtcclxuXHRcdGRlc3RbaV0gPSBzcmNbaV07XHJcblx0fTtcclxuXHRyZXR1cm4gZGVzdDtcclxufTtcclxuZXhwb3J0cy5leHRlbmQgPSBleHRlbmQ7XHJcblxyXG5mdW5jdGlvbiBmaW5kU2NvcGVIb2xkZXIobWV0YSl7XHJcbiAgICB2YXIgbm9kZSA9IG1ldGEucGFyZW50O1xyXG4gICAgd2hpbGUgKG5vZGUpe1xyXG4gICAgICAgIGlmIChub2RlLmlzU2NvcGVIb2xkZXIpe1xyXG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIG5vZGUgPSBub2RlLnBhcmVudDsgIFxyXG4gICAgfTtcclxuICAgIHRocm93ICdjYW5ub3QgZmluZCBzY29wZSBob2xkZXInO1xyXG59O1xyXG5leHBvcnRzLmZpbmRTY29wZUhvbGRlciA9IGZpbmRTY29wZUhvbGRlcjtcclxuXHJcbmZ1bmN0aW9uIHJlbmRlclNjb3BlQ29udGVudChjb250ZXh0LCBzY29wZU1ldGEsIHNjb3BlRGF0YSwgZGF0YSwgaWRPZmZzZXQpe1xyXG5cdHZhciBnYXBDbGFzc01nciA9IHJlcXVpcmUoJ2ZnLWpzL2NsaWVudC9nYXBDbGFzc01nci5qcycpO1xyXG5cdHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheShzY29wZURhdGEpO1xyXG5cdGlmICghaXNBcnJheSl7XHJcblx0XHRzY29wZURhdGEgPSBbc2NvcGVEYXRhXTtcclxuXHR9O1xyXG5cdHZhciBwYXJ0cyA9IHNjb3BlRGF0YS5tYXAoZnVuY3Rpb24oZGF0YUl0ZW0sIGlkKXtcclxuXHRcdHZhciBpdGVtTWV0YSA9IHNjb3BlTWV0YTtcclxuXHRcdGlmIChpc0FycmF5KXtcclxuXHRcdFx0dmFyIGl0ZW1DZmcgPSB7XHJcblx0XHRcdFx0XCJ0eXBlXCI6IFwic2NvcGUtaXRlbVwiLFxyXG5cdFx0XHRcdFwiaXNWaXJ0dWFsXCI6IHRydWUsXHJcblx0XHRcdFx0XCJwYXRoXCI6IFtpZCArIGlkT2Zmc2V0XSxcclxuXHRcdFx0XHRcImNvbnRlbnRcIjogc2NvcGVNZXRhLmNvbnRlbnRcclxuXHRcdFx0fTtcclxuXHRcdFx0aWYgKHNjb3BlTWV0YS5laWQpe1xyXG5cdFx0XHRcdGl0ZW1DZmcuZWlkID0gc2NvcGVNZXRhLmVpZCArICctaXRlbSc7XHJcblx0XHRcdH07XHJcblx0XHRcdGl0ZW1NZXRhID0gbmV3IGdhcENsYXNzTWdyLkdhcChjb250ZXh0LCBpdGVtQ2ZnLCBpdGVtTWV0YSk7XHJcblx0XHRcdGNvbnRleHQuZ2FwU3RvcmFnZS5zZXRUcmlnZ2VycyhpdGVtTWV0YSwgW2l0ZW1NZXRhLnNjb3BlUGF0aF0pO1xyXG5cdFx0fTtcclxuXHRcdHJldHVybiBnYXBDbGFzc01nci5yZW5kZXIoY29udGV4dCwgc2NvcGVNZXRhLCBkYXRhLCBpdGVtTWV0YSk7XHJcblx0fSk7XHJcblx0cmV0dXJuIHBhcnRzO1xyXG59O1xyXG5leHBvcnRzLnJlbmRlclNjb3BlQ29udGVudCA9IHJlbmRlclNjb3BlQ29udGVudDtcclxuXHJcbmZ1bmN0aW9uIGluc2VydEhUTUxCZWZvcmVDb21tZW50KGNvbW1lbnRFbG0sIGh0bWwpe1xyXG5cdHZhciBwcmV2ID0gY29tbWVudEVsbS5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xyXG5cdGlmIChwcmV2KXtcclxuXHRcdHByZXYuaW5zZXJ0QWRqYWNlbnRIVE1MKCdhZnRlcmVuZCcsIGh0bWwpO1xyXG5cdFx0cmV0dXJuO1xyXG5cdH07XHJcblx0Y29tbWVudEVsbS5wYXJlbnROb2RlLmluc2VydEFkamFjZW50SFRNTCgnYWZ0ZXJiZWdpbicsIGh0bWwpO1xyXG59O1xyXG5leHBvcnRzLmluc2VydEhUTUxCZWZvcmVDb21tZW50ID0gaW5zZXJ0SFRNTEJlZm9yZUNvbW1lbnQ7XHJcblxyXG5cclxuZnVuY3Rpb24gcGFyc2VQYXRoKHBhcnNlZE5vZGUpe1xyXG5cdGlmIChwYXJzZWROb2RlLmF0dHJzLmNsYXNzKXtcclxuXHRcdHJldHVybiBwYXJzZWROb2RlLmF0dHJzLmNsYXNzLnZhbHVlLnNwbGl0KCcgJyk7XHJcblx0fTtcclxuXHRyZXR1cm4gW107XHJcbn07XHJcbmV4cG9ydHMucGFyc2VQYXRoID0gcGFyc2VQYXRoO1xyXG5cclxuZnVuY3Rpb24gb2JqTWFwKG9iaiwgZm4pe1xyXG5cdHZhciByZXMgPSB7fTtcclxuXHRvYmpGb3Iob2JqLCBmdW5jdGlvbih2YWwsIGlkKXtcclxuXHRcdHJlc1tpZF0gPSBmbih2YWwsIGlkLCBvYmopO1xyXG5cdH0pO1xyXG5cdHJldHVybiByZXM7XHJcbn07XHJcbmV4cG9ydHMub2JqTWFwID0gb2JqTWFwO1xyXG5cclxuZnVuY3Rpb24gZGVlcENsb25lKG9iail7XHJcblx0aWYgKHR5cGVvZiBvYmogPT0gXCJvYmplY3RcIil7XHJcblx0XHR2YXIgbWFwID0gQXJyYXkuaXNBcnJheShvYmopXHJcblx0XHRcdD8gb2JqLm1hcC5iaW5kKG9iailcclxuXHRcdFx0OiBvYmpNYXAuYmluZChudWxsLCBvYmopO1xyXG5cdFx0cmV0dXJuIG1hcChkZWVwQ2xvbmUpO1xyXG5cdH07XHJcblx0cmV0dXJuIG9iajtcclxufTtcclxuZXhwb3J0cy5kZWVwQ2xvbmUgPSBkZWVwQ2xvbmU7IiwidmFyIHV0aWxzID0gcmVxdWlyZSgnZmctanMvdXRpbHMnKTtcclxuXHJcbmZ1bmN0aW9uIFN0clRwbCh0cGwpe1xyXG5cdHRoaXMudHBsID0gdHBsO1xyXG59O1xyXG5cclxuU3RyVHBsLnBhcnNlID0gZnVuY3Rpb24oc3RyKXtcclxuXHR2YXIgcmUgPSAvXFwlXFxAP1tcXHdcXGRfXFwuXFwtXSslL2c7XHJcblx0dmFyIGdhcHMgPSBzdHIubWF0Y2gocmUpO1xyXG5cdGlmICghZ2Fwcyl7XHJcblx0XHRyZXR1cm4gc3RyO1xyXG5cdH07XHJcblx0Z2FwcyA9IGdhcHMubWFwKGZ1bmN0aW9uKGdhcCl7XHJcblx0XHR2YXIgcGF0aFN0ciA9IGdhcC5zbGljZSgxLCAtMSk7XHJcblx0XHR2YXIgcGF0aCA9IFtdO1xyXG5cdFx0aWYgKHBhdGhTdHJbMF0gPT0gXCJAXCIpe1xyXG5cdFx0XHRwYXRoU3RyID0gcGF0aFN0ci5zbGljZSgxKTtcclxuXHRcdH1lbHNle1xyXG5cdFx0XHRwYXRoID0gW107XHJcblx0XHR9O1xyXG5cdFx0dmFyIHBhdGggPSBwYXRoLmNvbmNhdChwYXRoU3RyLnNwbGl0KCcuJykpO1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0XCJwYXRoXCI6IHBhdGhcclxuXHRcdH07XHJcblx0fSk7XHJcblx0dmFyIHRwbFBhcnRzID0gc3RyLnNwbGl0KHJlKTtcclxuXHR2YXIgdHBsID0gdXRpbHMubWl4QXJyYXlzKHRwbFBhcnRzLCBnYXBzKTtcclxuXHRyZXR1cm4gdHBsO1xyXG59O1xyXG5cclxuU3RyVHBsLnByb3RvdHlwZS5nZXRQYXRocyA9IGZ1bmN0aW9uKCl7XHJcblx0dmFyIHBhdGhzID0gW107XHJcblx0aWYgKCFBcnJheS5pc0FycmF5KHRoaXMudHBsKSl7XHJcblx0XHRyZXR1cm4gcGF0aHM7XHJcblx0fTtcdFxyXG5cdHRoaXMudHBsLmZvckVhY2goZnVuY3Rpb24ocGFydCl7XHJcblx0XHRpZiAodHlwZW9mIHBhcnQgPT0gXCJzdHJpbmdcIil7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gcGF0aHMucHVzaChwYXJ0LnBhdGgpO1xyXG5cdH0pO1xyXG5cdHJldHVybiBwYXRocztcclxufTtcclxuXHJcblN0clRwbC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oZGF0YSl7XHJcblx0aWYgKCFBcnJheS5pc0FycmF5KHRoaXMudHBsKSl7XHJcblx0XHRyZXR1cm4gdGhpcy50cGw7XHJcblx0fTtcclxuXHRyZXR1cm4gdGhpcy50cGwubWFwKGZ1bmN0aW9uKHBhcnQpe1xyXG5cdFx0aWYgKHR5cGVvZiBwYXJ0ID09IFwic3RyaW5nXCIpe1xyXG5cdFx0XHRyZXR1cm4gcGFydDtcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gdXRpbHMub2JqUGF0aChwYXJ0LnBhdGgsIGRhdGEpO1xyXG5cdH0pLmpvaW4oJycpO1x0XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFN0clRwbDtcclxuIiwidmFyIFN0clRwbCA9IHJlcXVpcmUoJ2ZnLWpzL3V0aWxzL3N0clRwbC5qcycpO1xyXG52YXIgdXRpbHMgPSByZXF1aXJlKCdmZy1qcy91dGlscy5qcycpO1xyXG5cclxudmFyIHNlbGZDbG9zaW5nVGFncyA9IFtcImFyZWFcIiwgXCJiYXNlXCIsIFwiYnJcIiwgXCJjb2xcIiwgXHJcblx0XCJjb21tYW5kXCIsIFwiZW1iZWRcIiwgXCJoclwiLCBcImltZ1wiLCBcclxuXHRcImlucHV0XCIsIFwia2V5Z2VuXCIsIFwibGlua1wiLCBcclxuXHRcIm1ldGFcIiwgXCJwYXJhbVwiLCBcInNvdXJjZVwiLCBcInRyYWNrXCIsIFxyXG5cdFwid2JyXCJdO1xyXG5cclxuZnVuY3Rpb24gcmVuZGVyVGFnKHRhZ0luZm8pe1xyXG5cdHZhciBhdHRycyA9IHRhZ0luZm8uYXR0cnM7XHJcblx0aWYgKCFBcnJheS5pc0FycmF5KGF0dHJzKSl7XHJcblx0XHRhdHRycyA9IHV0aWxzLm9ialRvS2V5VmFsdWUoYXR0cnMsICduYW1lJywgJ3ZhbHVlJyk7XHJcblx0fTtcclxuXHR2YXIgYXR0ckNvZGUgPSBcIlwiO1xyXG5cdGlmIChhdHRycy5sZW5ndGggPiAwKXtcclxuXHQgICAgYXR0ckNvZGUgPSBcIiBcIiArIGF0dHJzLm1hcChmdW5jdGlvbihhdHRyKXtcclxuXHRcdCAgcmV0dXJuIGF0dHIubmFtZSArICc9XCInICsgYXR0ci52YWx1ZSArICdcIic7XHJcblx0ICAgfSkuam9pbignICcpO1xyXG5cdH07XHJcblx0dmFyIHRhZ0hlYWQgPSB0YWdJbmZvLm5hbWUgKyBhdHRyQ29kZTtcclxuXHRpZiAofnNlbGZDbG9zaW5nVGFncy5pbmRleE9mKHRhZ0luZm8ubmFtZSkpe1xyXG5cdFx0cmV0dXJuIFwiPFwiICsgdGFnSGVhZCArIFwiIC8+XCI7XHJcblx0fTtcclxuXHR2YXIgb3BlblRhZyA9IFwiPFwiICsgdGFnSGVhZCArIFwiPlwiO1xyXG5cdHZhciBjbG9zZVRhZyA9IFwiPC9cIiArIHRhZ0luZm8ubmFtZSArIFwiPlwiO1xyXG5cdHZhciBjb2RlID0gb3BlblRhZyArICh0YWdJbmZvLmlubmVySFRNTCB8fCBcIlwiKSArIGNsb3NlVGFnO1xyXG5cdHJldHVybiBjb2RlO1xyXG59O1xyXG5leHBvcnRzLnJlbmRlclRhZyA9IHJlbmRlclRhZztcdFxyXG5cclxuZnVuY3Rpb24gcmVuZGVyQXR0cnMoYXR0cnMsIGRhdGEpe1xyXG5cdHZhciByZXNBdHRycyA9IHt9O1xyXG5cdHV0aWxzLm9iakZvcihhdHRycywgZnVuY3Rpb24odmFsdWUsIG5hbWUpe1xyXG5cdFx0dmFyIG5hbWVUcGwgPSBuZXcgU3RyVHBsKG5hbWUpO1xyXG5cdFx0dmFyIHZhbHVlVHBsID0gbmV3IFN0clRwbCh2YWx1ZSk7XHJcblx0XHRyZXNBdHRyc1tuYW1lVHBsLnJlbmRlcihkYXRhKV0gPSB2YWx1ZVRwbC5yZW5kZXIoZGF0YSk7XHRcdFxyXG5cdH0pO1x0XHJcblx0cmV0dXJuIHJlc0F0dHJzO1xyXG59O1xyXG5leHBvcnRzLnJlbmRlckF0dHJzID0gcmVuZGVyQXR0cnM7XHJcblxyXG5mdW5jdGlvbiBnZXRBdHRyc1BhdGhzKGF0dHJzKXtcclxuXHR2YXIgcGF0aHMgPSBbXTtcclxuXHR1dGlscy5vYmpGb3IoYXR0cnMsIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKXtcclxuXHRcdHZhciBuYW1lVHBsID0gbmV3IFN0clRwbChuYW1lKTtcclxuXHRcdHZhciB2YWx1ZVRwbCA9IG5ldyBTdHJUcGwodmFsdWUpO1xyXG5cdFx0cGF0aHMgPSBwYXRocy5jb25jYXQobmFtZVRwbC5nZXRQYXRocygpLCB2YWx1ZVRwbC5nZXRQYXRocygpKTtcdFx0XHJcblx0fSk7XHJcblx0cmV0dXJuIHBhdGhzO1xyXG59O1xyXG5leHBvcnRzLmdldEF0dHJzUGF0aHMgPSBnZXRBdHRyc1BhdGhzO1xyXG4iLCJmdW5jdGlvbiBOb2RlKGtpbmQsIHBhcmVudCwgZGF0YSl7XHJcbiAgICB0aGlzLmNoaWxkcmVuID0ga2luZCA9PSAnYXJyYXknXHJcbiAgICAgICAgPyBbXVxyXG4gICAgICAgIDoge307ICAgXHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcbiAgICB0aGlzLmNoaWxkQ291bnQgPSAwO1xyXG59O1xyXG5cclxuTm9kZS5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbihuYW1lLCBkYXRhKXtcclxuICAgIGlmICh0aGlzLmtpbmQgPT0gJ2FycmF5Jyl7XHJcbiAgICAgICAgZGF0YSA9IG5hbWU7XHJcbiAgICAgICAgbmFtZSA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoO1xyXG4gICAgfTtcclxuICAgIGRhdGEgPSBkYXRhIHx8IHRoaXMucm9vdC5pbml0Tm9kZSgpO1xyXG4gICAgdmFyIGNoaWxkID0gbmV3IE5vZGUodGhpcy5raW5kLCB0aGlzLCBkYXRhKTtcclxuICAgIGNoaWxkLmlkID0gbmFtZTtcclxuICAgIGNoaWxkLnBhdGggPSB0aGlzLnBhdGguY29uY2F0KFtuYW1lXSk7XHJcbiAgICBjaGlsZC5yb290ID0gdGhpcy5yb290O1xyXG4gICAgdGhpcy5jaGlsZENvdW50Kys7XHJcbiAgICB0aGlzLmNoaWxkcmVuW25hbWVdID0gY2hpbGQ7XHJcbiAgICByZXR1cm4gY2hpbGQ7XHJcbn07XHJcblxyXG5Ob2RlLnByb3RvdHlwZS5nZXRQYXJlbnRzID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciByZXMgPSBbXTsgICAgXHJcbiAgICB2YXIgbm9kZSA9IHRoaXM7XHJcbiAgICB3aGlsZSAodHJ1ZSl7XHJcbiAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50O1xyXG4gICAgICAgIGlmICghbm9kZSl7XHJcbiAgICAgICAgICAgIHJldHVybiByZXM7XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXMucHVzaChub2RlKTtcclxuICAgIH07ICBcclxufTtcclxuXHJcbk5vZGUucHJvdG90eXBlLmNoaWxkSXRlcmF0ZSA9IGZ1bmN0aW9uKGZuKXtcclxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5jaGlsZHJlbil7XHJcbiAgICAgICAgZm4uY2FsbCh0aGlzLCB0aGlzLmNoaWxkcmVuW2ldLCBpKTsgIFxyXG4gICAgfTtcclxufTtcclxuXHJcbk5vZGUucHJvdG90eXBlLmdldENoaWxkQXJyID0gZnVuY3Rpb24oKXtcclxuICAgIGlmICh0aGlzLmtpbmQgPT0gJ2FycmF5Jyl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hpbGRyZW47XHJcbiAgICB9O1xyXG4gICAgdmFyIHJlcyA9IFtdO1xyXG4gICAgdGhpcy5jaGlsZEl0ZXJhdGUoZnVuY3Rpb24oY2hpbGQpe1xyXG4gICAgICAgIHJlcy5wdXNoKGNoaWxkKTtcclxuICAgIH0pOyAgICAgICAgICAgIFxyXG4gICAgcmV0dXJuIHJlcztcclxufTtcclxuXHJcbk5vZGUucHJvdG90eXBlLmdldERlZXBDaGlsZEFyciA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgcmVzID0gdGhpcy5nZXRDaGlsZEFycigpO1xyXG4gICAgdGhpcy5jaGlsZEl0ZXJhdGUoZnVuY3Rpb24oY2hpbGQpe1xyXG4gICAgICAgcmVzID0gcmVzLmNvbmNhdChjaGlsZC5nZXREZWVwQ2hpbGRBcnIoKSk7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiByZXM7XHJcbn07XHJcblxyXG5Ob2RlLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbihwYXRoKXtcclxuICAgIHZhciBsZWFmS2V5ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xyXG4gICAgdmFyIGJyYW5jaFBhdGggPSBwYXRoLnNsaWNlKDAsIC0xKTtcclxuICAgIHZhciBicmFuY2ggPSB0aGlzLmJ5UGF0aChicmFuY2hQYXRoKTtcclxuICAgIGJyYW5jaC5jaGlsZENvdW50LS07XHJcbiAgICB2YXIgcmVzID0gYnJhbmNoLmNoaWxkcmVuW2xlYWZLZXldO1xyXG4gICAgZGVsZXRlIGJyYW5jaC5jaGlsZHJlbltsZWFmS2V5XTsgICBcclxuICAgIHJldHVybiByZXM7IFxyXG59O1xyXG5cclxuTm9kZS5wcm90b3R5cGUuYnlQYXRoID0gZnVuY3Rpb24ocGF0aCl7ICAgIFxyXG4gICAgaWYgKHBhdGgubGVuZ3RoID09IDApe1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuICAgIHZhciBub2RlID0gdGhpcztcclxuICAgIHdoaWxlICh0cnVlKXtcclxuICAgICAgICB2YXIga2V5ID0gcGF0aFswXTtcclxuICAgICAgICBub2RlID0gbm9kZS5jaGlsZHJlbltrZXldO1xyXG4gICAgICAgIGlmICghbm9kZSl7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcGF0aCA9IHBhdGguc2xpY2UoMSk7XHJcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgICByZXR1cm4gbm9kZTsgIFxyXG4gICAgICAgIH07XHJcbiAgICB9O1xyXG59O1xyXG5cclxuTm9kZS5wcm90b3R5cGUuYWNjZXNzID0gZnVuY3Rpb24ocGF0aCl7XHJcbiAgICBpZiAocGF0aC5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgdmFyIG5vZGUgPSB0aGlzO1xyXG4gICAgd2hpbGUgKHRydWUpe1xyXG4gICAgICAgIHZhciBrZXkgPSBwYXRoWzBdO1xyXG4gICAgICAgIHZhciBwYXJlbnQgPSBub2RlO1xyXG4gICAgICAgIG5vZGUgPSBub2RlLmNoaWxkcmVuW2tleV07XHJcbiAgICAgICAgaWYgKCFub2RlKXtcclxuICAgICAgICAgICAgdmFyIGRhdGEgPSB0aGlzLnJvb3QuaW5pdE5vZGUoKTsgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIG5vZGUgPSBwYXJlbnQuYWRkQ2hpbGQoa2V5LCBkYXRhKTtcclxuICAgICAgICAgICAgcGFyZW50LmNoaWxkcmVuW2tleV0gPSBub2RlO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcGF0aCA9IHBhdGguc2xpY2UoMSk7XHJcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgICByZXR1cm4gbm9kZTsgIFxyXG4gICAgICAgIH07XHJcbiAgICB9OyBcclxufTtcclxuXHJcbmZ1bmN0aW9uIFRyZWVIZWxwZXIob3B0cywgcm9vdERhdGEpe1xyXG4gICAgb3B0cyA9IG9wdHMgfHwge307XHJcbiAgICBvcHRzLmtpbmQgPSBvcHRzLmtpbmQgfHwgJ2FycmF5JztcclxuICAgIHZhciBpbml0Tm9kZSA9IG9wdHMuaW5pdE5vZGUgfHwgZnVuY3Rpb24oKXtcclxuICAgICAgICByZXR1cm4ge307XHJcbiAgICB9O1xyXG4gICAgdmFyIGRhdGEgPSByb290RGF0YSB8fCBpbml0Tm9kZSgpO1xyXG4gICAgdmFyIHJvb3ROb2RlID0gbmV3IE5vZGUob3B0cy5raW5kLCBudWxsLCBkYXRhKTtcclxuICAgIHJvb3ROb2RlLmlzUm9vdCA9IHRydWU7XHJcbiAgICByb290Tm9kZS5yb290ID0gcm9vdE5vZGU7XHJcbiAgICByb290Tm9kZS5wYXRoID0gW107XHJcbiAgICByb290Tm9kZS5pbml0Tm9kZSA9IGluaXROb2RlO1xyXG4gICAgcmV0dXJuIHJvb3ROb2RlO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUcmVlSGVscGVyOyJdfQ==
