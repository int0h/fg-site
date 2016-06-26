(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var EventEmitter = require('fg/eventEmitter.js');
var globalEvents = require('fg/client/globalEvents.js');
var utils = require('fg/utils.js');
var fgInstanceModule = require('fg/client/fgInstance.js');

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
};

FgClass.prototype.on = function(name, selector, fn){	
	if (arguments.length == 2){
		name = name;
		fn = arguments[1];
		selector = null;
	}else{
		var originalFn = fn;
		fn = function(event){			
			if (isInside(this, event.target, selector)){
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
},{"fg/client/fgInstance.js":2,"fg/client/globalEvents.js":6,"fg/eventEmitter.js":9,"fg/utils.js":11}],2:[function(require,module,exports){
var gapClassMgr = require('fg/client/gapClassMgr.js');
var renderTpl = require('fg/tplRender.js').renderTpl;
var EventEmitter = require('fg/eventEmitter.js');
var utils = require('fg/utils.js');
var GapStorage = require('fg/client/gapStorage.js').GapStorage;
var helper = require('./helper.js');

var fgInstanceTable = [];

function FgInstanceBase(fgClass, parent){
	this.id = fgInstanceTable.length;
	fgClass.instances.push(this);
	this.name = fgClass.name;
	this.fgClass = fgClass;
	this.code = null;
	this.parent = parent || null;
	this.eventEmitter = new EventEmitter(fgClass.eventEmitter);
	this.on = this.eventEmitter.on.bind(this.eventEmitter);
	this.emit = this.eventEmitter.emit.bind(this.eventEmitter);
	this.emitApply = this.eventEmitter.emitApply.bind(this.eventEmitter);
	this.gapStorage = new GapStorage(this);
	this.childFgs = [];
	fgInstanceTable.push(this);	
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
	var rootGap = new gapClassMgr.Gap(this, meta);
	rootGap.type = "root";
	rootGap.isVirtual = true;
	rootGap.fg = this;
	rootGap.scopePath = [];
	this.meta = rootGap;
	var cookedData = this.fgClass.cookData(data);
	return this.renderTpl(this.fgClass.tpl, rootGap, data, metaMap.bind(this));
};

FgInstanceBase.prototype.update = function(scopePath, value){
	var self = this;
	var oldValue = utils.objPath(scopePath, this.data);
	if (oldValue === value){
		return this;
	};	
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

FgInstanceBase.prototype.$data = function(newData){
	if (newData){
		//...
		return;
	};
	var helper = createScopeHelper(this, this.data, []);
	return helper;
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

FgInstanceBase.prototype.elms = function(id){
	var gaps = this.gapStorage.byEid(id);
	if (gaps){
		return gaps;
	};	
};

FgInstanceBase.prototype.sub = function(id){
	var elm = this.elm(id);
	if (!elm){
		return null;
	};
	return elm.fg || null; 
};

FgInstanceBase.prototype.elm = function(id){
	return this.elms(id)[0];
};

function getFgByIid(iid){
	return fgInstanceTable[iid];
};

exports.getFgByIid = getFgByIid;
exports.FgInstance = FgInstance;
exports.FgInstanceBase = FgInstanceBase;
exports.fgInstanceTable = fgInstanceTable;
},{"./helper.js":7,"fg/client/gapClassMgr.js":3,"fg/client/gapStorage.js":4,"fg/eventEmitter.js":9,"fg/tplRender.js":10,"fg/utils.js":11}],3:[function(require,module,exports){
var gapClasses = require('./gaps.js');
var utils = require('fg/utils');

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
},{"./gaps.js":5,"fg/utils":11}],4:[function(require,module,exports){
var utils = require('fg/utils.js');
var TreeHelper = require('fg/utils/treeHelper.js');

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
	return {
		target: scope.data.gaps,
		subs: subNodes
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

},{"fg/utils.js":11,"fg/utils/treeHelper.js":14}],5:[function(require,module,exports){
var gapClassMgr = require('./gapClassMgr.js');var renderTpl = require('fg/tplRender.js').renderTpl.bind(null, gapClassMgr);
exports["data"] = {
	"render": function (context, data){
		var utils = require('fg/utils');
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
		var utils = require('fg/utils');
		meta.scopePath = utils.getScopePath(meta);		
		var scopeData = utils.objPath(meta.scopePath, data);
		context.gapStorage.setTriggers(this, [this.scopePath]);
		if (!scopeData){
			return '';
		};		
		var parts = utils.renderScopeContent(context, meta, scopeData, data, 0);
		var placeHolderInner = ['fg', context.id, 'scope-gid', meta.gid].join('-');
		parts.push('<!--' + placeHolderInner + '-->');
		return parts.join('\n');
	},
"update": function (context, meta, scopePath, value, oldValue){		
		var utils = require('fg/utils');
		var gapClassMgr = require('fg/client/gapClassMgr.js');
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
		var utils = require('fg/utils');		
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
		var utils = require('fg/utils');
		this.parentFg = context;
		//this.renderedContent = context.renderTpl(this.content, meta, data);
		var fgClass = $fg.classes[this.fgName];	
		var scopeData = utils.objPath(this.scopePath, data);			
		var fg = fgClass.render(scopeData, this, context);
		this.fg = fg;
		context.childFgs.push(fg);
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
		var utils = require('fg/utils');			
		return context.parent.renderTpl(context.meta.content, this, context.parent.data);
	},
"update": function (context, meta, scopePath, value){
		return;
	}
};

exports["raw"] = {
	"render": function (context, data){		
		var meta = this;
		var utils = require('fg/utils');
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
		var utils = require('fg/utils');
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
},{"./gapClassMgr.js":3,"fg/client/gapClassMgr.js":3,"fg/tplRender.js":10,"fg/utils":11}],6:[function(require,module,exports){
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

var fgClassModule = require('fg/client/fgClass.js');
var fgInstanceModule = require('fg/client/fgInstance.js');

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
},{"fg/client/fgClass.js":1,"fg/client/fgInstance.js":2}],8:[function(require,module,exports){
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
var utils = require('fg/utils');

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
},{"fg/utils":11}],11:[function(require,module,exports){
var tplUtils = require('fg/utils/tplUtils.js');
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
	var gapClassMgr = require('fg/client/gapClassMgr.js');
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

},{"fg/client/gapClassMgr.js":3,"fg/utils/tplUtils.js":13}],12:[function(require,module,exports){
var utils = require('fg/utils');

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

},{"fg/utils":11}],13:[function(require,module,exports){
var StrTpl = require('fg/utils/strTpl.js');
var utils = require('fg/utils.js');

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

},{"fg/utils.js":11,"fg/utils/strTpl.js":12}],14:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmcvY2xpZW50L2ZnQ2xhc3MuanMiLCJub2RlX21vZHVsZXMvZmcvY2xpZW50L2ZnSW5zdGFuY2UuanMiLCJub2RlX21vZHVsZXMvZmcvY2xpZW50L2dhcENsYXNzTWdyLmpzIiwibm9kZV9tb2R1bGVzL2ZnL2NsaWVudC9nYXBTdG9yYWdlLmpzIiwibm9kZV9tb2R1bGVzL2ZnL2NsaWVudC9nYXBzLmpzIiwibm9kZV9tb2R1bGVzL2ZnL2NsaWVudC9nbG9iYWxFdmVudHMuanMiLCJub2RlX21vZHVsZXMvZmcvY2xpZW50L2hlbHBlci5qcyIsIm5vZGVfbW9kdWxlcy9mZy9jbGllbnQvbWFpbi5qcyIsIm5vZGVfbW9kdWxlcy9mZy9ldmVudEVtaXR0ZXIuanMiLCJub2RlX21vZHVsZXMvZmcvdHBsUmVuZGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZnL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2ZnL3V0aWxzL3N0clRwbC5qcyIsIm5vZGVfbW9kdWxlcy9mZy91dGlscy90cGxVdGlscy5qcyIsIm5vZGVfbW9kdWxlcy9mZy91dGlscy90cmVlSGVscGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2ZnL2V2ZW50RW1pdHRlci5qcycpO1xyXG52YXIgZ2xvYmFsRXZlbnRzID0gcmVxdWlyZSgnZmcvY2xpZW50L2dsb2JhbEV2ZW50cy5qcycpO1xyXG52YXIgdXRpbHMgPSByZXF1aXJlKCdmZy91dGlscy5qcycpO1xyXG52YXIgZmdJbnN0YW5jZU1vZHVsZSA9IHJlcXVpcmUoJ2ZnL2NsaWVudC9mZ0luc3RhbmNlLmpzJyk7XHJcblxyXG52YXIgZmdDbGFzc1RhYmxlID0gW107XHJcbnZhciBmZ0NsYXNzRGljdCA9IHt9O1xyXG5cclxuZnVuY3Rpb24gRmdDbGFzcyhvcHRzKXtcclxuXHR0aGlzLmlkID0gZmdDbGFzc1RhYmxlLmxlbmd0aDtcdFxyXG5cdHRoaXMuaW5zdGFuY2VzID0gW107XHJcblx0dGhpcy50cGwgPSBvcHRzLnRwbDtcclxuXHR0aGlzLm5hbWUgPSBvcHRzLm5hbWU7XHJcblx0dGhpcy5ldmVudEVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyO1xyXG5cdGZnQ2xhc3NEaWN0W29wdHMubmFtZV0gPSB0aGlzO1xyXG5cdGZnQ2xhc3NUYWJsZS5wdXNoKHRoaXMpO1x0XHJcblx0ZnVuY3Rpb24gRmdJbnN0YW5jZSgpe1xyXG5cdFx0ZmdJbnN0YW5jZU1vZHVsZS5GZ0luc3RhbmNlQmFzZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG5cdH07XHJcblx0dGhpcy5jcmVhdGVGbiA9IEZnSW5zdGFuY2U7XHJcblx0dGhpcy5jcmVhdGVGbi5jb25zdHJ1Y3RvciA9IGZnSW5zdGFuY2VNb2R1bGUuRmdJbnN0YW5jZUJhc2U7XHRcclxuXHR0aGlzLmNyZWF0ZUZuLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoZmdJbnN0YW5jZU1vZHVsZS5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUpO1x0XHJcblx0dmFyIGNsYXNzRm4gPSBvcHRzLmNsYXNzRm47XHJcblx0aWYgKGNsYXNzRm4pe1xyXG5cdFx0Y2xhc3NGbih0aGlzLCB0aGlzLmNyZWF0ZUZuLnByb3RvdHlwZSk7XHJcblx0fTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGlzSW5zaWRlKGZnLCBub2RlLCBzZWxlY3Rvcil7XHJcblx0dmFyIGRvbUVsbXMgPSBmZy5nZXREb20oKTtcclxuXHR2YXIgbWF0Y2hlZCA9IFtdO1xyXG5cdGRvbUVsbXMuZm9yRWFjaChmdW5jdGlvbihlbG0pe1xyXG5cdFx0dmFyIG5vZGVMaXN0ID0gZWxtLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xyXG5cdFx0dmFyIG5vZGVBcnIgPSBbXS5zbGljZS5jYWxsKG5vZGVMaXN0KTtcclxuXHRcdG1hdGNoZWQgPSBtYXRjaGVkLmNvbmNhdChub2RlQXJyKTtcclxuXHR9KTtcclxuXHR3aGlsZSAobm9kZSl7XHJcblx0XHRpZiAofmRvbUVsbXMuaW5kZXhPZihub2RlKSl7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH07XHJcblx0XHRpZiAofm1hdGNoZWQuaW5kZXhPZihub2RlKSl7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fTtcclxuXHRcdG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XHJcblx0fTtcclxuXHRyZXR1cm4gZmFsc2U7XHJcbn07XHJcblxyXG5GZ0NsYXNzLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKG5hbWUsIHNlbGVjdG9yLCBmbil7XHRcclxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAyKXtcclxuXHRcdG5hbWUgPSBuYW1lO1xyXG5cdFx0Zm4gPSBhcmd1bWVudHNbMV07XHJcblx0XHRzZWxlY3RvciA9IG51bGw7XHJcblx0fWVsc2V7XHJcblx0XHR2YXIgb3JpZ2luYWxGbiA9IGZuO1xyXG5cdFx0Zm4gPSBmdW5jdGlvbihldmVudCl7XHRcdFx0XHJcblx0XHRcdGlmIChpc0luc2lkZSh0aGlzLCBldmVudC50YXJnZXQsIHNlbGVjdG9yKSl7XHJcblx0XHRcdFx0b3JpZ2luYWxGbi5jYWxsKHRoaXMsIGV2ZW50KTtcclxuXHRcdFx0fTtcclxuXHRcdH07XHJcblx0fTtcclxuXHRnbG9iYWxFdmVudHMubGlzdGVuKG5hbWUpO1xyXG5cdHRoaXMuZXZlbnRFbWl0dGVyLm9uKG5hbWUsIGZuKTtcdFxyXG59O1xyXG5cclxuRmdDbGFzcy5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKG5hbWUvKiwgcmVzdCovKXtcclxuXHR0aGlzLmV2ZW50RW1pdHRlci5lbWl0LmFwcGx5KHRoaXMuZXZlbnRFbWl0dGVyLCBhcmd1bWVudHMpO1x0XHJcbn07XHJcblxyXG5GZ0NsYXNzLnByb3RvdHlwZS5lbWl0QXBwbHkgPSBmdW5jdGlvbihuYW1lLCB0aGlzQXJnLCBhcmdzKXtcclxuXHR0aGlzLmV2ZW50RW1pdHRlci5lbWl0QXBwbHkobmFtZSwgdGhpc0FyZywgYXJncyk7XHRcclxufTtcclxuXHJcbkZnQ2xhc3MucHJvdG90eXBlLmNvb2tEYXRhID0gZnVuY3Rpb24oZGF0YSl7XHJcblx0cmV0dXJuIGRhdGE7XHJcbn07XHJcblxyXG5GZ0NsYXNzLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihkYXRhLCBtZXRhLCBwYXJlbnQpe1xyXG5cdGlmIChkYXRhIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpe1xyXG5cdFx0cmV0dXJuIHRoaXMucmVuZGVySW4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxyXG5cdH07XHJcblx0dmFyIGZnID0gbmV3IGZnSW5zdGFuY2VNb2R1bGUuRmdJbnN0YW5jZSh0aGlzLCBwYXJlbnQpO1xyXG5cdGZnLmNvZGUgPSBmZy5nZXRIdG1sKGRhdGEsIG1ldGEpO1xyXG5cdHJldHVybiBmZztcclxufTtcclxuXHJcbkZnQ2xhc3MucHJvdG90eXBlLnJlbmRlckluID0gZnVuY3Rpb24ocGFyZW50Tm9kZSwgZGF0YSwgbWV0YSwgcGFyZW50KXtcclxuXHR2YXIgZmcgPSB0aGlzLnJlbmRlcihkYXRhLCBtZXRhLCBwYXJlbnQpO1xyXG5cdHBhcmVudE5vZGUuaW5uZXJIVE1MID0gZmcuY29kZTtcclxuXHRmZy5hc3NpZ24oKTtcclxuXHRyZXR1cm4gZmc7XHJcbn07XHJcblxyXG5GZ0NsYXNzLnByb3RvdHlwZS5hcHBlbmRUbyA9IGZ1bmN0aW9uKHBhcmVudE5vZGUsIGRhdGEpe1xyXG5cdHZhciBmZyA9IHRoaXMucmVuZGVyKGRhdGEpO1x0XHJcblx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG5cdGRpdi5pbm5lckhUTUwgPSBmZC5jb2RlO1xyXG5cdFtdLnNsaWNlLmNhbGwoZGl2LmNoaWxkcmVuKS5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcclxuXHRcdHBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoY2hpbGQpO1xyXG5cdH0pO1xyXG5cdGZnLmFzc2lnbigpO1xyXG59O1xyXG5cclxuZXhwb3J0cy5GZ0NsYXNzID0gRmdDbGFzcztcclxuZXhwb3J0cy5mZ0NsYXNzRGljdCA9IGZnQ2xhc3NEaWN0O1xyXG5leHBvcnRzLmZnQ2xhc3NUYWJsZSA9IGZnQ2xhc3NUYWJsZTsiLCJ2YXIgZ2FwQ2xhc3NNZ3IgPSByZXF1aXJlKCdmZy9jbGllbnQvZ2FwQ2xhc3NNZ3IuanMnKTtcclxudmFyIHJlbmRlclRwbCA9IHJlcXVpcmUoJ2ZnL3RwbFJlbmRlci5qcycpLnJlbmRlclRwbDtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2ZnL2V2ZW50RW1pdHRlci5qcycpO1xyXG52YXIgdXRpbHMgPSByZXF1aXJlKCdmZy91dGlscy5qcycpO1xyXG52YXIgR2FwU3RvcmFnZSA9IHJlcXVpcmUoJ2ZnL2NsaWVudC9nYXBTdG9yYWdlLmpzJykuR2FwU3RvcmFnZTtcclxudmFyIGhlbHBlciA9IHJlcXVpcmUoJy4vaGVscGVyLmpzJyk7XHJcblxyXG52YXIgZmdJbnN0YW5jZVRhYmxlID0gW107XHJcblxyXG5mdW5jdGlvbiBGZ0luc3RhbmNlQmFzZShmZ0NsYXNzLCBwYXJlbnQpe1xyXG5cdHRoaXMuaWQgPSBmZ0luc3RhbmNlVGFibGUubGVuZ3RoO1xyXG5cdGZnQ2xhc3MuaW5zdGFuY2VzLnB1c2godGhpcyk7XHJcblx0dGhpcy5uYW1lID0gZmdDbGFzcy5uYW1lO1xyXG5cdHRoaXMuZmdDbGFzcyA9IGZnQ2xhc3M7XHJcblx0dGhpcy5jb2RlID0gbnVsbDtcclxuXHR0aGlzLnBhcmVudCA9IHBhcmVudCB8fCBudWxsO1xyXG5cdHRoaXMuZXZlbnRFbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlcihmZ0NsYXNzLmV2ZW50RW1pdHRlcik7XHJcblx0dGhpcy5vbiA9IHRoaXMuZXZlbnRFbWl0dGVyLm9uLmJpbmQodGhpcy5ldmVudEVtaXR0ZXIpO1xyXG5cdHRoaXMuZW1pdCA9IHRoaXMuZXZlbnRFbWl0dGVyLmVtaXQuYmluZCh0aGlzLmV2ZW50RW1pdHRlcik7XHJcblx0dGhpcy5lbWl0QXBwbHkgPSB0aGlzLmV2ZW50RW1pdHRlci5lbWl0QXBwbHkuYmluZCh0aGlzLmV2ZW50RW1pdHRlcik7XHJcblx0dGhpcy5nYXBTdG9yYWdlID0gbmV3IEdhcFN0b3JhZ2UodGhpcyk7XHJcblx0dGhpcy5jaGlsZEZncyA9IFtdO1xyXG5cdGZnSW5zdGFuY2VUYWJsZS5wdXNoKHRoaXMpO1x0XHJcbn07XHJcblxyXG5mdW5jdGlvbiBGZ0luc3RhbmNlKGZnQ2xhc3MsIHBhcmVudCl7XHJcblx0cmV0dXJuIG5ldyBmZ0NsYXNzLmNyZWF0ZUZuKGZnQ2xhc3MsIHBhcmVudCk7XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpe1xyXG5cdHJldHVybiB0aGlzLmNvZGU7XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUuYXNzaWduID0gZnVuY3Rpb24oKXtcclxuXHR0aGlzLmVtaXRBcHBseSgncmVhZHknLCB0aGlzLCBbXSk7XHJcblx0dGhpcy5kb20gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmctaWlkLScgKyB0aGlzLmlkKTtcclxuXHR0aGlzLmdhcFN0b3JhZ2UuYXNzaWduKCk7XHJcblx0cmV0dXJuIHRoaXMuZG9tO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gZ2V0Q2xhc3NlcyhtZXRhKXtcclxuXHRpZiAoIW1ldGEgfHwgIW1ldGEuYXR0cnMgfHwgIW1ldGEuYXR0cnMuY2xhc3Mpe1xyXG5cdFx0cmV0dXJuIFtdO1xyXG5cdH07XHJcblx0aWYgKEFycmF5LmlzQXJyYXkobWV0YS5hdHRycy5jbGFzcykpe1xyXG5cdFx0cmV0dXJuIG1ldGEuYXR0cnMuY2xhc3M7XHJcblx0fTtcdFx0XHJcblx0cmV0dXJuIG1ldGEuYXR0cnMuY2xhc3Muc3BsaXQoJyAnKTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIG1ldGFNYXAobWV0YVBhcnQsIGlkKXtcclxuXHQvKnZhciByZXMgPSB1dGlscy5jb25jYXRPYmooe30sIG1ldGFQYXJ0IHx8IHt9KTtcclxuXHR2YXIgYXR0cnNPYmogPSBtZXRhUGFydC5hdHRycyB8fCB7fTsvL3V0aWxzLmtleVZhbHVlVG9PYmoobWV0YVBhcnQuYXR0cnMgfHwgW10sICduYW1lJywgJ3ZhbHVlJyk7XHJcblx0dmFyIHRwbENsYXNzZXMgPSAocmVzLmF0dHJzICYmIHJlcy5hdHRycy5jbGFzcyB8fCAnJykuc3BsaXQoJyAnKTtcclxuXHR2YXIgZmdfY2lkID0gXCJmZy1jaWQtXCIgKyB0aGlzLmZnQ2xhc3MuaWQ7XHJcblx0dmFyIGNsYXNzZXMgPSBbJ2ZnJywgZmdfY2lkXS5jb25jYXQodHBsQ2xhc3Nlcyk7XHRcclxuXHRhdHRyc09iai5jbGFzcyA9IGNsYXNzZXMuam9pbignICcpOyovXHJcblx0dmFyIHJlcyA9IHV0aWxzLnNpbXBsZUNsb25lKG1ldGFQYXJ0KTtcclxuXHR2YXIgY2xhc3NlcyA9IGdldENsYXNzZXMocmVzKTtcclxuXHR2YXIgZmdfY2lkID0gXCJmZy1jaWQtXCIgKyB0aGlzLmZnQ2xhc3MuaWQ7XHJcblx0cmVzLmF0dHJzID0gdXRpbHMuc2ltcGxlQ2xvbmUobWV0YVBhcnQuYXR0cnMpO1xyXG5cdGlmIChBcnJheS5pc0FycmF5KHJlcy5hdHRycy5jbGFzcykpe1xyXG5cdFx0cmVzLmF0dHJzLmNsYXNzID0gWydmZycsICcgJywgZmdfY2lkLCAnICddLmNvbmNhdChjbGFzc2VzKTtcclxuXHRcdHJldHVybiByZXM7XHRcclxuXHR9O1x0XHJcblx0cmVzLmF0dHJzLmNsYXNzID0gWydmZycsIGZnX2NpZF0uY29uY2F0KGNsYXNzZXMpLmpvaW4oJyAnKTtcclxuXHRyZXR1cm4gcmVzO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLnJlbmRlclRwbCA9IGZ1bmN0aW9uKHRwbCwgcGFyZW50LCBkYXRhLCBtZXRhKXtcclxuXHRyZXR1cm4gcmVuZGVyVHBsLmNhbGwoe1xyXG5cdFx0XCJnYXBDbGFzc01nclwiOiBnYXBDbGFzc01ncixcclxuXHRcdFwiY29udGV4dFwiOiB0aGlzXHJcblx0fSwgdHBsLCBwYXJlbnQsIGRhdGEsIG1ldGEpO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmdldEh0bWwgPSBmdW5jdGlvbihkYXRhLCBtZXRhKXtcclxuXHR0aGlzLmRhdGEgPSBkYXRhO1xyXG5cdHZhciByb290R2FwID0gbmV3IGdhcENsYXNzTWdyLkdhcCh0aGlzLCBtZXRhKTtcclxuXHRyb290R2FwLnR5cGUgPSBcInJvb3RcIjtcclxuXHRyb290R2FwLmlzVmlydHVhbCA9IHRydWU7XHJcblx0cm9vdEdhcC5mZyA9IHRoaXM7XHJcblx0cm9vdEdhcC5zY29wZVBhdGggPSBbXTtcclxuXHR0aGlzLm1ldGEgPSByb290R2FwO1xyXG5cdHZhciBjb29rZWREYXRhID0gdGhpcy5mZ0NsYXNzLmNvb2tEYXRhKGRhdGEpO1xyXG5cdHJldHVybiB0aGlzLnJlbmRlclRwbCh0aGlzLmZnQ2xhc3MudHBsLCByb290R2FwLCBkYXRhLCBtZXRhTWFwLmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKHNjb3BlUGF0aCwgdmFsdWUpe1xyXG5cdHZhciBzZWxmID0gdGhpcztcclxuXHR2YXIgb2xkVmFsdWUgPSB1dGlscy5vYmpQYXRoKHNjb3BlUGF0aCwgdGhpcy5kYXRhKTtcclxuXHRpZiAob2xkVmFsdWUgPT09IHZhbHVlKXtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH07XHRcclxuXHRpZiAoc2NvcGVQYXRoLmxlbmd0aCA+IDApe1xyXG5cdFx0dXRpbHMub2JqUGF0aChzY29wZVBhdGgsIHRoaXMuZGF0YSwgdmFsdWUpO1xyXG5cdH1lbHNle1xyXG5cdFx0dGhpcy5kYXRhID0gdmFsdWU7XHJcblx0fVxyXG5cdHZhciBzY29wZSA9IHRoaXMuZ2FwU3RvcmFnZS5ieVNjb3BlKHNjb3BlUGF0aCk7XHJcblx0dmFyIGdhcHMgPSBzY29wZS50YXJnZXQ7XHJcblx0Z2Fwcy5mb3JFYWNoKGZ1bmN0aW9uKGdhcCl7XHJcblx0XHRnYXBDbGFzc01nci51cGRhdGUoc2VsZiwgZ2FwLCBzY29wZVBhdGgsIHZhbHVlLCBvbGRWYWx1ZSk7XHJcblx0fSk7XHJcblx0c2NvcGUuc3Vicy5mb3JFYWNoKGZ1bmN0aW9uKHN1Yil7XHJcblx0XHR2YXIgc3ViVmFsID0gdXRpbHMub2JqUGF0aChzdWIucGF0aCwgc2VsZi5kYXRhKTtcdFxyXG5cdFx0dmFyIHN1YlBhdGggPSBzdWIucGF0aC5zbGljZShzY29wZVBhdGgubGVuZ3RoKTtcclxuXHRcdHZhciBvbGRTdWJWYWwgPSB1dGlscy5vYmpQYXRoKHN1YlBhdGgsIG9sZFZhbHVlKTtcclxuXHRcdGlmIChzdWJWYWwgPT0gb2xkU3ViVmFsKXtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fTtcclxuXHRcdHN1Yi5nYXBzLmZvckVhY2goZnVuY3Rpb24oZ2FwKXtcclxuXHRcdFx0aWYgKCF+c2VsZi5nYXBTdG9yYWdlLmdhcHMuaW5kZXhPZihnYXApKXtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH07XHJcblx0XHRcdGdhcENsYXNzTWdyLnVwZGF0ZShzZWxmLCBnYXAsIHN1Yi5wYXRoLCBzdWJWYWwsIG9sZFN1YlZhbCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHRyZXR1cm4gdGhpcztcclxufTtcclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVNjb3BlSGVscGVyKGZnLCBvYmosIHNjb3BlUGF0aCl7XHJcblx0dmFyIGhlbHBlciA9IEFycmF5LmlzQXJyYXkob2JqKSBcclxuXHRcdD8gW10gXHJcblx0XHQ6IHt9O1xyXG5cdHV0aWxzLm9iakZvcihvYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpe1xyXG5cdFx0dmFyIHByb3BTY29wZVBhdGggPSBzY29wZVBhdGguY29uY2F0KFtrZXldKTtcclxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShoZWxwZXIsIGtleSwge1xyXG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiKXtcclxuXHRcdFx0XHRcdHJldHVybiBjcmVhdGVTY29wZUhlbHBlcihmZywgb2JqW2tleV0sIHByb3BTY29wZVBhdGgpO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0cmV0dXJuIG9ialtrZXldO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRzZXQ6IGZ1bmN0aW9uKHZhbCl7XHJcblx0XHRcdFx0ZmcudXBkYXRlKHByb3BTY29wZVBhdGgsIHZhbCk7XHRcdFx0XHRcclxuXHRcdFx0fVx0XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHRyZXR1cm4gaGVscGVyO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLiRkYXRhID0gZnVuY3Rpb24obmV3RGF0YSl7XHJcblx0aWYgKG5ld0RhdGEpe1xyXG5cdFx0Ly8uLi5cclxuXHRcdHJldHVybjtcclxuXHR9O1xyXG5cdHZhciBoZWxwZXIgPSBjcmVhdGVTY29wZUhlbHBlcih0aGlzLCB0aGlzLmRhdGEsIFtdKTtcclxuXHRyZXR1cm4gaGVscGVyO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKXtcclxuXHR0aGlzLmNoaWxkRmdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpe1xyXG5cdFx0Y2hpbGQucmVtb3ZlKHRydWUpO1xyXG5cdH0pO1xyXG5cdHRoaXMuY29kZSA9ICcnO1xyXG5cdHRoaXMuZGF0YSA9IG51bGw7XHJcblx0dGhpcy5nYXBTdG9yYWdlID0gbnVsbDtcclxuXHR0aGlzLmNoaWxkRmdzID0gW107XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24odmlydHVhbCl7XHJcblx0aWYgKCF2aXJ0dWFsKXtcclxuXHRcdHZhciBkb20gPSB0aGlzLmdldERvbSgpO1xyXG5cdFx0ZG9tLmZvckVhY2goZnVuY3Rpb24oZWxtKXtcclxuXHRcdFx0ZWxtLnJlbW92ZSgpO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHR0aGlzLmNsZWFyKCk7XHJcblx0dmFyIGluc3RhbmNlSWQgPSB0aGlzLmZnQ2xhc3MuaW5zdGFuY2VzLmluZGV4T2YodGhpcyk7XHRcclxuXHR0aGlzLmZnQ2xhc3MuaW5zdGFuY2VzLnNwbGljZShpbnN0YW5jZUlkLCAxKTtcclxuXHRmZ0luc3RhbmNlVGFibGVbdGhpcy5pZF0gPSBudWxsO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLnJlcmVuZGVyID0gZnVuY3Rpb24oZGF0YSl7XHJcblx0dGhpcy5jbGVhcigpO1xyXG5cdHRoaXMuZ2FwU3RvcmFnZSA9IG5ldyBHYXBTdG9yYWdlKHRoaXMpO1xyXG5cdHZhciBkb20gPSB0aGlzLmdldERvbSgpWzBdO1xyXG5cdHRoaXMuY29kZSA9IHRoaXMuZ2V0SHRtbChkYXRhKTtcclxuXHRkb20ub3V0ZXJIVE1MID0gdGhpcy5jb2RlOyAvLyBkb2VzbnQgd29yayB3aXRoIG11bHRpIHJvb3RcclxuXHR0aGlzLmFzc2lnbigpO1xyXG5cdHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLmdldERvbSA9IGZ1bmN0aW9uKCl7XHJcblx0cmV0dXJuIHRoaXMubWV0YS5nZXREb20oKTtcclxufTtcclxuXHJcbkZnSW5zdGFuY2VCYXNlLnByb3RvdHlwZS5qcSA9IGZ1bmN0aW9uKCl7XHJcblx0dmFyIGRvbSA9IHRoaXMuZ2V0RG9tKCk7XHJcblx0dmFyIHJlcyA9IGhlbHBlci5qcShkb20pO1xyXG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID09IDApe1xyXG5cdFx0cmV0dXJuIHJlcztcclxuXHR9O1xyXG5cdHZhciBzZWxlY3RvciA9IGFyZ3VtZW50c1swXTtcclxuXHR2YXIgc2VsZlNlbGVjdGVkID0gcmVzXHJcblx0XHQucGFyZW50KClcclxuXHRcdC5maW5kKHNlbGVjdG9yKVxyXG5cdFx0LmZpbHRlcihmdW5jdGlvbihpZCwgZWxtKXtcclxuXHRcdFx0cmV0dXJuIH5kb20uaW5kZXhPZihlbG0pO1xyXG5cdFx0fSk7XHJcblx0dmFyIGNoaWxkU2VsZWN0ZWQgPSByZXMuZmluZChzZWxlY3Rvcik7XHJcblx0cmV0dXJuIHNlbGZTZWxlY3RlZC5hZGQoY2hpbGRTZWxlY3RlZCk7XHJcbn07XHJcblxyXG5GZ0luc3RhbmNlQmFzZS5wcm90b3R5cGUuZWxtcyA9IGZ1bmN0aW9uKGlkKXtcclxuXHR2YXIgZ2FwcyA9IHRoaXMuZ2FwU3RvcmFnZS5ieUVpZChpZCk7XHJcblx0aWYgKGdhcHMpe1xyXG5cdFx0cmV0dXJuIGdhcHM7XHJcblx0fTtcdFxyXG59O1xyXG5cclxuRmdJbnN0YW5jZUJhc2UucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uKGlkKXtcclxuXHR2YXIgZWxtID0gdGhpcy5lbG0oaWQpO1xyXG5cdGlmICghZWxtKXtcclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH07XHJcblx0cmV0dXJuIGVsbS5mZyB8fCBudWxsOyBcclxufTtcclxuXHJcbkZnSW5zdGFuY2VCYXNlLnByb3RvdHlwZS5lbG0gPSBmdW5jdGlvbihpZCl7XHJcblx0cmV0dXJuIHRoaXMuZWxtcyhpZClbMF07XHJcbn07XHJcblxyXG5mdW5jdGlvbiBnZXRGZ0J5SWlkKGlpZCl7XHJcblx0cmV0dXJuIGZnSW5zdGFuY2VUYWJsZVtpaWRdO1xyXG59O1xyXG5cclxuZXhwb3J0cy5nZXRGZ0J5SWlkID0gZ2V0RmdCeUlpZDtcclxuZXhwb3J0cy5GZ0luc3RhbmNlID0gRmdJbnN0YW5jZTtcclxuZXhwb3J0cy5GZ0luc3RhbmNlQmFzZSA9IEZnSW5zdGFuY2VCYXNlO1xyXG5leHBvcnRzLmZnSW5zdGFuY2VUYWJsZSA9IGZnSW5zdGFuY2VUYWJsZTsiLCJ2YXIgZ2FwQ2xhc3NlcyA9IHJlcXVpcmUoJy4vZ2Fwcy5qcycpO1xyXG52YXIgdXRpbHMgPSByZXF1aXJlKCdmZy91dGlscycpO1xyXG5cclxuZnVuY3Rpb24gR2FwKGNvbnRleHQsIHBhcnNlZE1ldGEsIHBhcmVudCl7XHJcblx0dXRpbHMuZXh0ZW5kKHRoaXMsIHBhcnNlZE1ldGEpO1xyXG5cdHRoaXMuY2hpbGRyZW4gPSBbXTtcdFxyXG5cdHRoaXMucGFyZW50ID0gcGFyZW50IHx8IG51bGw7XHJcblx0dGhpcy5yb290ID0gdGhpcztcclxuXHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1x0XHJcblx0dGhpcy5zY29wZVBhdGggPSB1dGlscy5nZXRTY29wZVBhdGgodGhpcyk7XHJcblx0Ly90aGlzLnRyaWdnZXJzID0gW107XHJcblx0Y29udGV4dC5nYXBTdG9yYWdlLnJlZyh0aGlzKTtcclxuXHRpZiAoIXBhcmVudCl7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9O1xyXG5cdHRoaXMucm9vdCA9IHBhcmVudC5yb290O1xyXG5cdHBhcmVudC5jaGlsZHJlbi5wdXNoKHRoaXMpO1xyXG59O1xyXG5cclxuR2FwLnByb3RvdHlwZS5maW5kUmVhbERvd24gPSBmdW5jdGlvbigpe1xyXG5cdGlmICghdGhpcy5pc1ZpcnR1YWwpe1xyXG5cdFx0cmV0dXJuIFt0aGlzXTtcclxuXHR9O1xyXG5cdHZhciByZXMgPSBbXTtcclxuXHR0aGlzLmNoaWxkcmVuLmZpbHRlcihmdW5jdGlvbihjaGlsZCl7XHJcblx0XHRyZXMgPSByZXMuY29uY2F0KGNoaWxkLmZpbmRSZWFsRG93bigpKTtcclxuXHR9KTtcclxuXHRyZXR1cm4gcmVzO1xyXG59O1xyXG5cclxuR2FwLnByb3RvdHlwZS5nZXREb20gPSBmdW5jdGlvbigpe1xyXG5cdGlmICghdGhpcy5pc1ZpcnR1YWwpe1xyXG5cdFx0dmFyIGlkID0gW1wiZmdcIiwgdGhpcy5jb250ZXh0LmlkLCBcImdpZFwiLCB0aGlzLmdpZF0uam9pbignLScpO1xyXG5cdFx0cmV0dXJuIFtkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCldO1xyXG5cdH07XHJcblx0dmFyIHJlcyA9IFtdO1xyXG5cdHRoaXMuZmluZFJlYWxEb3duKCkuZm9yRWFjaChmdW5jdGlvbihnYXApe1xyXG5cdFx0cmVzID0gcmVzLmNvbmNhdChnYXAuZ2V0RG9tKCkpO1xyXG5cdH0pO1xyXG5cdHJldHVybiByZXM7XHJcbn07XHJcblxyXG5HYXAucHJvdG90eXBlLnJlbW92ZURvbSA9IGZ1bmN0aW9uKCl7XHJcblx0dmFyIGRvbSA9IHRoaXMuZ2V0RG9tKCk7XHJcblx0ZG9tLmZvckVhY2goZnVuY3Rpb24oZWxtKXtcclxuXHRcdGlmICghZWxtKXtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fTtcclxuXHRcdGVsbS5yZW1vdmUoKTtcclxuXHR9KTtcclxufTtcclxuXHJcbmV4cG9ydHMuR2FwID0gR2FwO1xyXG5cclxuZnVuY3Rpb24gcmVuZGVyKGNvbnRleHQsIHBhcmVudCwgZGF0YSwgbWV0YSl7XHJcblx0dmFyIGdhcCA9IG5ldyBHYXAoY29udGV4dCwgbWV0YSwgcGFyZW50KTtcclxuXHR2YXIgZ2FwQ2xhc3MgPSBnYXBDbGFzc2VzW21ldGEudHlwZV07XHJcblx0cmV0dXJuIGdhcENsYXNzLnJlbmRlci5jYWxsKGdhcCwgY29udGV4dCwgZGF0YSk7XHJcbn07XHJcblxyXG5leHBvcnRzLnJlbmRlciA9IHJlbmRlcjtcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZShjb250ZXh0LCBnYXBNZXRhLCBzY29wZVBhdGgsIHZhbHVlLCBvbGRWYWx1ZSl7XHJcblx0dmFyIGdhcENsYXNzID0gZ2FwQ2xhc3Nlc1tnYXBNZXRhLnR5cGVdO1xyXG5cdGlmICghZ2FwQ2xhc3Mpe1xyXG5cdFx0cmV0dXJuO1xyXG5cdH07XHJcblx0cmV0dXJuIGdhcENsYXNzLnVwZGF0ZShjb250ZXh0LCBnYXBNZXRhLCBzY29wZVBhdGgsIHZhbHVlLCBvbGRWYWx1ZSk7XHJcbn07XHJcblxyXG5leHBvcnRzLnVwZGF0ZSA9IHVwZGF0ZTsiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCdmZy91dGlscy5qcycpO1xyXG52YXIgVHJlZUhlbHBlciA9IHJlcXVpcmUoJ2ZnL3V0aWxzL3RyZWVIZWxwZXIuanMnKTtcclxuXHJcbmZ1bmN0aW9uIGluaXROb2RlRm4oKXtcclxuXHRyZXR1cm4ge1xyXG5cdFx0Z2FwczogW11cclxuXHR9O1xyXG59O1xyXG5cclxuZnVuY3Rpb24gR2FwU3RvcmFnZShjb250ZXh0KXtcclxuXHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xyXG5cdHRoaXMuZ2FwcyA9IFtdO1xyXG5cdHRoaXMuc2NvcGVUcmVlID0gbmV3IFRyZWVIZWxwZXIoe1xyXG5cdFx0a2luZDogJ2RpY3QnLFxyXG5cdFx0aW5pdE5vZGU6IGluaXROb2RlRm5cclxuXHR9KTtcclxuXHR0aGlzLmVpZERpY3QgPSB7fTtcdFxyXG59O1xyXG5cclxuR2FwU3RvcmFnZS5wcm90b3R5cGUuc2V0U2NvcGVUcmlnZ2VyID0gZnVuY3Rpb24oZ2FwLCBzY29wZVBhdGgpe1xyXG5cdHZhciBzY29wZSA9IHRoaXMuc2NvcGVUcmVlLmFjY2VzcyhzY29wZVBhdGgpO1x0XHJcblx0c2NvcGUuZGF0YS5nYXBzLnB1c2goZ2FwKTtcclxufTtcclxuXHJcbi8qR2FwU3RvcmFnZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24obWV0YSwgc2NvcGVUcmlnZ2VycywgZ2lkKXtcclxuXHRzY29wZVRyaWdnZXJzID0gc2NvcGVUcmlnZ2VycyB8fCBbbWV0YS5zY29wZVBhdGhdO1xyXG5cdHZhciBnYXAgPSB7XHJcblx0XHRcImlkXCI6IGdpZCB8fCB0aGlzLmdldEdpZCgpLFxyXG5cdFx0XCJtZXRhXCI6IG1ldGFcclxuXHR9O1xyXG5cdHNjb3BlVHJpZ2dlcnMuZm9yRWFjaCh0aGlzLnNldFNjb3BlVHJpZ2dlci5iaW5kKHRoaXMsIGdhcCkpO1xyXG5cdHRoaXMuZ2Fwcy5wdXNoKGdhcCk7XHJcbn07XHJcblxyXG5HYXBTdG9yYWdlLnByb3RvdHlwZS5zZXRBdHRycyA9IGZ1bmN0aW9uKG1ldGEsIGF0dHJzLCBnaWQpe1xyXG5cdHZhciBmZ0dhcENsYXNzID0gJ2ZnLWdhcC0nICsgdGhpcy5jb250ZXh0LmlkO1xyXG5cdGF0dHJzLmNsYXNzID0gYXR0cnMuY2xhc3MgXHJcblx0XHQ/IGZnR2FwQ2xhc3MgKyAnICcgKyBhdHRycy5jbGFzc1xyXG5cdFx0OiBmZ0dhcENsYXNzO1xyXG5cdGF0dHJzW1wiZGF0YS1mZy1cIiArIHRoaXMuY29udGV4dC5pZCArIFwiLWdhcC1pZFwiXSA9IGdpZDtcclxuXHQvL2F0dHJzLmlkID0gW1wiZmdcIiwgdGhpcy5jb250ZXh0LmlkLCBcImdhcC1pZFwiLCBnaWRdLmpvaW4oJy0nKTtcclxuIFx0cmV0dXJuIGF0dHJzO1xyXG59OyovXHJcblxyXG5HYXBTdG9yYWdlLnByb3RvdHlwZS5zZXRUcmlnZ2VycyA9IGZ1bmN0aW9uKGdhcE1ldGEsIHNjb3BlVHJpZ2dlcnMpe1x0XHJcblx0c2NvcGVUcmlnZ2Vycy5mb3JFYWNoKHRoaXMuc2V0U2NvcGVUcmlnZ2VyLmJpbmQodGhpcywgZ2FwTWV0YSkpO1xyXG59O1xyXG5cclxuR2FwU3RvcmFnZS5wcm90b3R5cGUucmVnID0gZnVuY3Rpb24oZ2FwTWV0YSl7XHJcblx0dmFyIGVpZCA9IGdhcE1ldGEuZWlkO1xyXG5cdGlmIChlaWQpe1x0XHRcclxuXHRcdHRoaXMuZWlkRGljdFtlaWRdID0gdGhpcy5laWREaWN0W2VpZF0gfHwgW107XHJcblx0XHR0aGlzLmVpZERpY3RbZWlkXS5wdXNoKGdhcE1ldGEpO1xyXG5cdH07XHJcblx0dmFyIGdpZCA9IHRoaXMuZ2V0R2lkKCk7XHJcblx0Z2FwTWV0YS5naWQgPSBnaWQ7XHJcblx0aWYgKCFnYXBNZXRhLmlzVmlydHVhbCl7XHJcblx0XHRnYXBNZXRhLmF0dHJzID0gdXRpbHMuc2ltcGxlQ2xvbmUoZ2FwTWV0YS5hdHRycyB8fCB7fSk7XHRcdFxyXG5cdFx0Z2FwTWV0YS5hdHRycy5pZCA9IFtcImZnXCIsIHRoaXMuY29udGV4dC5pZCwgXCJnaWRcIiwgZ2lkXS5qb2luKCctJyk7XHJcblx0fTtcclxuXHRnYXBNZXRhLnN0b3JhZ2VJZCA9IHRoaXMuZ2Fwcy5sZW5ndGg7XHJcblx0dGhpcy5nYXBzLnB1c2goZ2FwTWV0YSk7XHRcdFxyXG5cdC8vcmV0dXJuIGF0dHJzT2JqO1xyXG59O1xyXG5cclxuR2FwU3RvcmFnZS5wcm90b3R5cGUuYXNzaWduID0gZnVuY3Rpb24oKXtcclxuXHQvL2lmICgpXHJcblx0dGhpcy5nYXBzLmZvckVhY2goZnVuY3Rpb24oZ2FwTWV0YSl7XHJcblx0XHRpZiAoZ2FwTWV0YS50eXBlICE9IFwicm9vdFwiICYmIGdhcE1ldGEuZmcpe1xyXG5cdFx0XHRnYXBNZXRhLmZnLmFzc2lnbigpO1xyXG5cdFx0fTtcclxuXHR9KTtcclxuXHRyZXR1cm47XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdHZhciBnYXBOb2RlcyA9IHRoaXMuY29udGV4dC5kb20uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnZmctZ2FwLScgKyB0aGlzLmNvbnRleHQuaWQpO1xyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZ2FwTm9kZXMubGVuZ3RoOyBpKyspe1xyXG5cdFx0dmFyIGdhcE5vZGUgPSBnYXBOb2Rlc1tpXTtcclxuXHRcdHZhciBnaWQgPSBnYXBOb2RlLmdldEF0dHJpYnV0ZSgnZGF0YS1mZy0nICsgdGhpcy5jb250ZXh0LmlkICsgJy1nYXAtaWQnKTtcclxuXHRcdHZhciBnYXAgPSBzZWxmLmdhcHNbZ2lkXTtcclxuXHRcdGlmICghZ2FwKXtjb250aW51ZX07XHJcblx0XHRpZiAoZ2FwLm1ldGEuZmcpe1xyXG5cdFx0XHRnYXAubWV0YS5mZy5hc3NpZ24oKTtcclxuXHRcdH07XHJcblx0XHRnYXAubWV0YS5kb20gPSBnYXBOb2RlO1xyXG5cdH07XHJcbn07XHJcblxyXG4vKkdhcFN0b3JhZ2UucHJvdG90eXBlLnN1YlRyZWUgPSBmdW5jdGlvbihzY29wZVBhdGgpe1xyXG5cdHZhciBicmFuY2ggPSBhY2Nlc3NTY29wZUxlYWYodGhpcy5zY29wZVRyZWUsIHNjb3BlUGF0aCk7XHJcblx0dmFyIHJlcyA9IFtdO1xyXG5cclxuXHRmdW5jdGlvbiBpdGVyYXRlKG5vZGUpe1xyXG5cdFx0Zm9yICh2YXIgaSBpbiBub2RlLmNoaWxkcmVuKXtcclxuXHJcblx0XHR9O1xyXG5cdH07XHJcblxyXG5cclxufTsqL1xyXG5cclxuR2FwU3RvcmFnZS5wcm90b3R5cGUuYnlTY29wZSA9IGZ1bmN0aW9uKHNjb3BlUGF0aCwgdGFyZ2V0T25seSl7XHJcblx0dmFyIHNjb3BlID0gdGhpcy5zY29wZVRyZWUuYWNjZXNzKHNjb3BlUGF0aCk7XHRcdFxyXG5cdHZhciBzdWJOb2RlcyA9IFtdO1xyXG5cdGlmIChzY29wZS5jaGlsZENvdW50ICE9IDAgJiYgIXRhcmdldE9ubHkpe1xyXG5cdFx0c3ViTm9kZXMgPSBzY29wZS5nZXREZWVwQ2hpbGRBcnIoKS5tYXAoZnVuY3Rpb24obm9kZSl7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0Z2Fwczogbm9kZS5kYXRhLmdhcHMsXHJcblx0XHRcdFx0cGF0aDogbm9kZS5wYXRoXHRcclxuXHRcdFx0fTtcdFx0XHRcclxuXHRcdH0pO1xyXG5cdH07XHJcblx0cmV0dXJuIHtcclxuXHRcdHRhcmdldDogc2NvcGUuZGF0YS5nYXBzLFxyXG5cdFx0c3Viczogc3ViTm9kZXNcclxuXHR9O1xyXG59O1xyXG5cclxuR2FwU3RvcmFnZS5wcm90b3R5cGUucmVtb3ZlU2NvcGUgPSBmdW5jdGlvbihzY29wZVBhdGgpe1xyXG5cdHZhciBzY29wZSA9IHRoaXMuYnlTY29wZShzY29wZVBhdGgpO1x0XHJcblx0dmFyIHJlbW92ZWREb21HYXBzID0gc2NvcGUudGFyZ2V0O1xyXG5cdHZhciByZW1vdmVkR2FwcyA9IHNjb3BlLnRhcmdldDtcclxuXHRzY29wZS5zdWJzLmZvckVhY2goZnVuY3Rpb24obm9kZSl7XHJcblx0XHRyZW1vdmVkR2FwcyA9IHJlbW92ZWRHYXBzLmNvbmNhdChub2RlLmdhcHMpO1xyXG5cdH0pO1xyXG5cdHRoaXMuc2NvcGVUcmVlLnJlbW92ZShzY29wZVBhdGgpO1xyXG5cdHRoaXMuZ2FwcyA9IHRoaXMuZ2Fwcy5maWx0ZXIoZnVuY3Rpb24oZ2FwKXtcclxuXHRcdHJldHVybiAhfnJlbW92ZWRHYXBzLmluZGV4T2YoZ2FwKTtcclxuXHR9KTtcclxuXHRyZW1vdmVkRG9tR2Fwcy5mb3JFYWNoKGZ1bmN0aW9uKGdhcCl7XHJcblx0XHRnYXAucmVtb3ZlRG9tKCk7XHJcblx0fSk7XHJcbn07XHJcblxyXG5HYXBTdG9yYWdlLnByb3RvdHlwZS5ieUVpZCA9IGZ1bmN0aW9uKGVpZCl7XHJcblx0cmV0dXJuIHRoaXMuZWlkRGljdFtlaWRdO1xyXG59O1xyXG5cclxuR2FwU3RvcmFnZS5wcm90b3R5cGUuZ2V0R2lkID0gZnVuY3Rpb24oKXtcclxuXHRyZXR1cm4gdGhpcy5nYXBzLmxlbmd0aDtcclxufTtcclxuXHJcbmV4cG9ydHMuR2FwU3RvcmFnZSA9IEdhcFN0b3JhZ2U7XHJcbiIsInZhciBnYXBDbGFzc01nciA9IHJlcXVpcmUoJy4vZ2FwQ2xhc3NNZ3IuanMnKTt2YXIgcmVuZGVyVHBsID0gcmVxdWlyZSgnZmcvdHBsUmVuZGVyLmpzJykucmVuZGVyVHBsLmJpbmQobnVsbCwgZ2FwQ2xhc3NNZ3IpO1xuZXhwb3J0c1tcImRhdGFcIl0gPSB7XG5cdFwicmVuZGVyXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBkYXRhKXtcclxuXHRcdHZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnL3V0aWxzJyk7XHJcblx0XHRjb250ZXh0LmdhcFN0b3JhZ2Uuc2V0VHJpZ2dlcnModGhpcywgW3RoaXMuc2NvcGVQYXRoXSk7XHJcblx0XHR2YXIgdmFsdWUgPSB1dGlscy5vYmpQYXRoKHRoaXMuc2NvcGVQYXRoLCBkYXRhKVxyXG5cdFx0cmV0dXJuIHV0aWxzLnJlbmRlclRhZyh7XHJcblx0XHRcdG5hbWU6IFwic3BhblwiLFxyXG5cdFx0XHRhdHRyczogdGhpcy5hdHRycyxcclxuXHRcdFx0aW5uZXJIVE1MOiB2YWx1ZVxyXG5cdFx0fSk7XHJcblx0fSxcblwidXBkYXRlXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBtZXRhLCBzY29wZVBhdGgsIHZhbHVlKXtcclxuXHRcdHZhciBub2RlID0gbWV0YS5nZXREb20oKVswXTtcclxuXHRcdGlmICghbm9kZSl7XHJcblx0XHRcdFxyXG5cdFx0fTtcclxuXHRcdG5vZGUuaW5uZXJIVE1MID0gdmFsdWU7XHJcblx0XHQvL2hpZ2hsaWdodChub2RlLCBbMHhmZmZmZmYsIDB4ZmZlZTg4XSwgNTAwKTtcclxuXHR9XG59O1xuXG5leHBvcnRzW1wic2NvcGVcIl0gPSB7XG5cdFwicmVuZGVyXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBkYXRhKXtcclxuXHRcdHZhciBtZXRhID0gdGhpcztcclxuXHRcdG1ldGEuaXRlbXMgPSBbXTtcclxuXHRcdHZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnL3V0aWxzJyk7XHJcblx0XHRtZXRhLnNjb3BlUGF0aCA9IHV0aWxzLmdldFNjb3BlUGF0aChtZXRhKTtcdFx0XHJcblx0XHR2YXIgc2NvcGVEYXRhID0gdXRpbHMub2JqUGF0aChtZXRhLnNjb3BlUGF0aCwgZGF0YSk7XHJcblx0XHRjb250ZXh0LmdhcFN0b3JhZ2Uuc2V0VHJpZ2dlcnModGhpcywgW3RoaXMuc2NvcGVQYXRoXSk7XHJcblx0XHRpZiAoIXNjb3BlRGF0YSl7XHJcblx0XHRcdHJldHVybiAnJztcclxuXHRcdH07XHRcdFxyXG5cdFx0dmFyIHBhcnRzID0gdXRpbHMucmVuZGVyU2NvcGVDb250ZW50KGNvbnRleHQsIG1ldGEsIHNjb3BlRGF0YSwgZGF0YSwgMCk7XHJcblx0XHR2YXIgcGxhY2VIb2xkZXJJbm5lciA9IFsnZmcnLCBjb250ZXh0LmlkLCAnc2NvcGUtZ2lkJywgbWV0YS5naWRdLmpvaW4oJy0nKTtcclxuXHRcdHBhcnRzLnB1c2goJzwhLS0nICsgcGxhY2VIb2xkZXJJbm5lciArICctLT4nKTtcclxuXHRcdHJldHVybiBwYXJ0cy5qb2luKCdcXG4nKTtcclxuXHR9LFxuXCJ1cGRhdGVcIjogZnVuY3Rpb24gKGNvbnRleHQsIG1ldGEsIHNjb3BlUGF0aCwgdmFsdWUsIG9sZFZhbHVlKXtcdFx0XHJcblx0XHR2YXIgdXRpbHMgPSByZXF1aXJlKCdmZy91dGlscycpO1xyXG5cdFx0dmFyIGdhcENsYXNzTWdyID0gcmVxdWlyZSgnZmcvY2xpZW50L2dhcENsYXNzTWdyLmpzJyk7XHJcblx0XHRmb3IgKHZhciBpID0gdmFsdWUubGVuZ3RoOyBpIDwgb2xkVmFsdWUubGVuZ3RoOyBpKyspe1xyXG5cdFx0XHRjb250ZXh0LmdhcFN0b3JhZ2UucmVtb3ZlU2NvcGUoc2NvcGVQYXRoLmNvbmNhdChbaV0pKTtcclxuXHRcdH07XHJcblx0XHRpZiAodmFsdWUubGVuZ3RoID4gb2xkVmFsdWUubGVuZ3RoKXtcclxuXHRcdFx0dmFyIHNjb3BlSG9sZGVyID0gdXRpbHMuZmluZFNjb3BlSG9sZGVyKG1ldGEpO1xyXG5cdFx0XHR2YXIgbm9kZXMgPSBbXS5zbGljZS5jYWxsKHNjb3BlSG9sZGVyLmdldERvbSgpWzBdLmNoaWxkTm9kZXMpO1xyXG5cdFx0XHR2YXIgcGxhY2VIb2xkZXJJbm5lciA9IFsnZmcnLCBjb250ZXh0LmlkLCAnc2NvcGUtZ2lkJywgbWV0YS5naWRdLmpvaW4oJy0nKTtcclxuXHRcdFx0dmFyIGZvdW5kID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uKG5vZGUpe1xyXG5cdFx0XHQgICAgaWYgKG5vZGUubm9kZVR5cGUgIT0gOCl7XHJcblx0XHRcdCAgICAgICAgcmV0dXJuIGZhbHNlXHJcblx0XHRcdCAgICB9O1xyXG5cdFx0XHQgICAgaWYgKG5vZGUudGV4dENvbnRlbnQgPT0gcGxhY2VIb2xkZXJJbm5lcil7XHJcblx0XHRcdCAgICBcdHJldHVybiB0cnVlO1xyXG5cdFx0XHQgICAgfTtcdFx0XHQgICAgXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRmb3VuZCA9IGZvdW5kWzBdO1xyXG5cdFx0XHR2YXIgZGF0YVNsaWNlID0gdmFsdWUuc2xpY2Uob2xkVmFsdWUubGVuZ3RoKTtcclxuXHRcdFx0dmFyIG5ld0NvbnRlbnQgPSB1dGlscy5yZW5kZXJTY29wZUNvbnRlbnQoY29udGV4dCwgbWV0YSwgZGF0YVNsaWNlLCBjb250ZXh0LmRhdGEsIG9sZFZhbHVlLmxlbmd0aCkuam9pbignXFxuJyk7XHJcblx0XHRcdHV0aWxzLmluc2VydEhUTUxCZWZvcmVDb21tZW50KGZvdW5kLCBuZXdDb250ZW50KTtcclxuXHRcdH07XHJcblx0XHR0aGlzO1xyXG5cdFx0Ly9jb250ZXh0LnJlcmVuZGVyKGNvbnRleHQuZGF0YSk7XHJcblx0fVxufTtcblxuZXhwb3J0c1tcInNjb3BlLWl0ZW1cIl0gPSB7XG5cdFwicmVuZGVyXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBkYXRhKXtcclxuXHRcdHZhciBtZXRhID0gdGhpcztcclxuXHRcdHZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnL3V0aWxzJyk7XHRcdFxyXG5cdFx0bWV0YS5zY29wZVBhdGggPSB1dGlscy5nZXRTY29wZVBhdGgobWV0YSk7XHRcdFxyXG5cdFx0dmFyIHNjb3BlRGF0YSA9IHV0aWxzLm9ialBhdGgobWV0YS5zY29wZVBhdGgsIGRhdGEpO1xyXG5cdFx0Y29udGV4dC5nYXBTdG9yYWdlLnNldFRyaWdnZXJzKHRoaXMsIFt0aGlzLnNjb3BlUGF0aF0pO1xyXG5cdFx0aWYgKCFzY29wZURhdGEpe1xyXG5cdFx0XHRyZXR1cm4gJyc7XHJcblx0XHR9O1xyXG5cdFx0cmV0dXJuIGNvbnRleHQucmVuZGVyVHBsKG1ldGEuY29udGVudCwgbWV0YSwgZGF0YSk7XHJcblx0fSxcblwidXBkYXRlXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBtZXRhLCBzY29wZVBhdGgsIHZhbHVlLCBvbGRWYWx1ZSl7XHRcdFxyXG5cdFx0cmV0dXJuO1xyXG5cdH1cbn07XG5cbmV4cG9ydHNbXCJmZ1wiXSA9IHtcblx0XCJyZW5kZXJcIjogZnVuY3Rpb24gKGNvbnRleHQsIGRhdGEsIG1ldGEpe1xyXG5cdFx0dmFyIHV0aWxzID0gcmVxdWlyZSgnZmcvdXRpbHMnKTtcclxuXHRcdHRoaXMucGFyZW50RmcgPSBjb250ZXh0O1xyXG5cdFx0Ly90aGlzLnJlbmRlcmVkQ29udGVudCA9IGNvbnRleHQucmVuZGVyVHBsKHRoaXMuY29udGVudCwgbWV0YSwgZGF0YSk7XHJcblx0XHR2YXIgZmdDbGFzcyA9ICRmZy5jbGFzc2VzW3RoaXMuZmdOYW1lXTtcdFxyXG5cdFx0dmFyIHNjb3BlRGF0YSA9IHV0aWxzLm9ialBhdGgodGhpcy5zY29wZVBhdGgsIGRhdGEpO1x0XHRcdFxyXG5cdFx0dmFyIGZnID0gZmdDbGFzcy5yZW5kZXIoc2NvcGVEYXRhLCB0aGlzLCBjb250ZXh0KTtcclxuXHRcdHRoaXMuZmcgPSBmZztcclxuXHRcdGNvbnRleHQuY2hpbGRGZ3MucHVzaChmZyk7XHJcblx0XHRyZXR1cm4gZmc7XHJcblx0XHRpZiAodHJ1ZSl7IC8vIGNsaWVudFxyXG5cdFx0XHRcclxuXHRcdH07XHRcdFxyXG5cdFx0dGhyb3cgJ3RvZG8gc2VydmVyIHJlbmRlcic7XHJcblx0fSxcblwidXBkYXRlXCI6IGZ1bmN0aW9uIChjb250ZXh0LCBtZXRhLCBzY29wZVBhdGgsIHZhbHVlKXtcclxuXHRcdHJldHVybjtcclxuXHR9XG59O1xuXG5leHBvcnRzW1wiY29udGVudFwiXSA9IHtcblx0XCJyZW5kZXJcIjogZnVuY3Rpb24gKGNvbnRleHQsIGRhdGEsIG1ldGEpe1xyXG5cdFx0dmFyIHV0aWxzID0gcmVxdWlyZSgnZmcvdXRpbHMnKTtcdFx0XHRcclxuXHRcdHJldHVybiBjb250ZXh0LnBhcmVudC5yZW5kZXJUcGwoY29udGV4dC5tZXRhLmNvbnRlbnQsIHRoaXMsIGNvbnRleHQucGFyZW50LmRhdGEpO1xyXG5cdH0sXG5cInVwZGF0ZVwiOiBmdW5jdGlvbiAoY29udGV4dCwgbWV0YSwgc2NvcGVQYXRoLCB2YWx1ZSl7XHJcblx0XHRyZXR1cm47XHJcblx0fVxufTtcblxuZXhwb3J0c1tcInJhd1wiXSA9IHtcblx0XCJyZW5kZXJcIjogZnVuY3Rpb24gKGNvbnRleHQsIGRhdGEpe1x0XHRcclxuXHRcdHZhciBtZXRhID0gdGhpcztcclxuXHRcdHZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnL3V0aWxzJyk7XHJcblx0XHRpZiAobWV0YS5pc1Njb3BlSG9sZGVyKXtcclxuXHRcdFx0bWV0YS5yb290LmN1cnJlbnRTY29wZUhvbGRlciA9IG1ldGE7XHRcdFxyXG5cdFx0fTtcclxuXHRcdHZhciBhdHRyRGF0YSA9IHV0aWxzLm9ialBhdGgobWV0YS5zY29wZVBhdGgsIGRhdGEpO1xyXG5cdFx0dmFyIGF0dHJzQXJyID0gdXRpbHMub2JqVG9LZXlWYWx1ZShtZXRhLmF0dHJzLCAnbmFtZScsICd2YWx1ZScpO1xyXG5cdFx0dmFyIHJlbmRlcmVkQXR0cnMgPSB1dGlscy5yZW5kZXJBdHRycyhtZXRhLmF0dHJzLCBhdHRyRGF0YSk7XHJcblx0XHR2YXIgdHJpZ2dlcnMgPSB1dGlsc1xyXG5cdFx0XHQuZ2V0QXR0cnNQYXRocyhtZXRhLmF0dHJzKVx0XHJcblx0XHRcdC5tYXAoZnVuY3Rpb24ocGF0aCl7XHJcblx0XHRcdFx0cmV0dXJuIHV0aWxzLnJlc29sdmVQYXRoKG1ldGEuc2NvcGVQYXRoLCBwYXRoKTtcclxuXHRcdFx0fSk7XHRcclxuXHRcdHZhciB2YWx1ZVBhdGg7XHJcblx0XHRpZiAobWV0YS52YWx1ZSl7XHJcblx0XHRcdHZhbHVlUGF0aCA9IHV0aWxzLnJlc29sdmVQYXRoKG1ldGEuc2NvcGVQYXRoLCBtZXRhLnZhbHVlKTtcclxuXHRcdFx0dHJpZ2dlcnMucHVzaCh2YWx1ZVBhdGgpO1xyXG5cdFx0XHRtZXRhLnZhbHVlUGF0aCA9IHZhbHVlUGF0aDtcclxuXHRcdH07IFxyXG5cdFx0Lyp2YXIgc2NvcGVUcmlnZ2VycyA9IGF0dHJzUGF0aHM7XHJcblx0XHRpZiAobWV0YS5pc1Njb3BlSXRlbSl7XHJcblx0XHRcdHNjb3BlVHJpZ2dlcnMucHVzaChtZXRhLnNjb3BlUGF0aCk7XHJcblx0XHR9OyovXHJcblx0XHRjb250ZXh0LmdhcFN0b3JhZ2Uuc2V0VHJpZ2dlcnMobWV0YSwgdHJpZ2dlcnMpO1x0XHRcclxuXHRcdHZhciBpbm5lciA9IG1ldGEudmFsdWUgXHJcblx0XHRcdD8gdXRpbHMub2JqUGF0aCh2YWx1ZVBhdGgsIGRhdGEpXHJcblx0XHRcdDogY29udGV4dC5yZW5kZXJUcGwobWV0YS5jb250ZW50LCBtZXRhLCBkYXRhKTtcclxuXHRcdHJldHVybiB1dGlscy5yZW5kZXJUYWcoe1xyXG5cdFx0XHRcIm5hbWVcIjogbWV0YS50YWdOYW1lLFxyXG5cdFx0XHRcImF0dHJzXCI6IHJlbmRlcmVkQXR0cnMsXHJcblx0XHRcdFwiaW5uZXJIVE1MXCI6IGlubmVyXHJcblx0XHR9KTtcclxuXHR9LFxuXCJ1cGRhdGVcIjogZnVuY3Rpb24gKGNvbnRleHQsIG1ldGEsIHNjb3BlUGF0aCwgdmFsdWUpe1xyXG5cdFx0Ly8gdG8gZG8gdmFsdWUgdXBkYXRlXHJcblx0XHR2YXIgdXRpbHMgPSByZXF1aXJlKCdmZy91dGlscycpO1xyXG5cdFx0dmFyIGF0dHJEYXRhID0gdXRpbHMub2JqUGF0aChtZXRhLnNjb3BlUGF0aCwgY29udGV4dC5kYXRhKTtcclxuXHRcdHZhciByZW5kZXJlZEF0dHJzID0gdXRpbHMucmVuZGVyQXR0cnMobWV0YS5hdHRycywgYXR0ckRhdGEpO1xyXG5cdFx0dmFyIGRvbSA9IG1ldGEuZ2V0RG9tKClbMF07XHJcblx0XHRpZiAobWV0YS52YWx1ZSAmJiBtZXRhLnZhbHVlUGF0aC5qb2luKCctJykgPT0gc2NvcGVQYXRoLmpvaW4oJy0nKSl7XHJcblx0XHRcdGRvbS5pbm5lckhUTUwgPSB2YWx1ZTtcclxuXHRcdH07XHJcblx0XHR1dGlscy5vYmpGb3IocmVuZGVyZWRBdHRycywgZnVuY3Rpb24odmFsdWUsIG5hbWUpe1xyXG5cdFx0XHR2YXIgb2xkVmFsID0gZG9tLmdldEF0dHJpYnV0ZShuYW1lKTtcclxuXHRcdFx0aWYgKG9sZFZhbCAhPSB2YWx1ZSl7XHJcblx0XHRcdFx0ZG9tLnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XHJcblx0XHRcdH07XHJcblx0XHR9KTtcdFx0XHJcblx0fVxufTsiLCJ2YXIgZXZlbnRzID0ge307XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVyKG5hbWUsIGV2ZW50KXtcclxuXHR2YXIgZWxtID0gZXZlbnQudGFyZ2V0O1xyXG5cdHdoaWxlIChlbG0pe1xyXG5cdFx0dmFyIGZnID0gJGZnLmJ5RG9tKGVsbSk7XHJcblx0XHRpZiAoZmcpe1xyXG5cdFx0XHRmZy5lbWl0QXBwbHkobmFtZSwgZmcsIFtldmVudF0pO1xyXG5cdFx0XHQvL3JldHVybjtcclxuXHRcdH07XHJcblx0XHRlbG0gPSBlbG0ucGFyZW50Tm9kZTtcclxuXHR9O1xyXG59O1xyXG5cclxuZXhwb3J0cy5saXN0ZW4gPSBmdW5jdGlvbihuYW1lKXtcclxuXHRpZiAobmFtZSBpbiBldmVudHMpe1xyXG5cdFx0cmV0dXJuO1xyXG5cdH07XHRcclxuXHRldmVudHNbbmFtZV0gPSB0cnVlO1xyXG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgaGFuZGxlci5iaW5kKG51bGwsIG5hbWUpLCB7XCJjYXB0dXJlXCI6IHRydWV9KTtcclxufTsiLCJtb2R1bGUuZXhwb3J0cyA9ICRmZztcclxuXHJcbnZhciBmZ0NsYXNzTW9kdWxlID0gcmVxdWlyZSgnZmcvY2xpZW50L2ZnQ2xhc3MuanMnKTtcclxudmFyIGZnSW5zdGFuY2VNb2R1bGUgPSByZXF1aXJlKCdmZy9jbGllbnQvZmdJbnN0YW5jZS5qcycpO1xyXG5cclxuZnVuY3Rpb24gJGZnKGFyZyl7XHJcblx0aWYgKGFyZyBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KXtcclxuXHRcdHJldHVybiAkZmcuYnlEb20oYXJnKTtcclxuXHR9O1xyXG5cdGlmICh0eXBlb2YgYXJnID09IFwic3RyaW5nXCIpe1xyXG5cdFx0cmV0dXJuIGZnQ2xhc3NNb2R1bGUuZmdDbGFzc0RpY3RbYXJnXTtcclxuXHR9O1xyXG59O1xyXG5cclxuJGZnLmxvYWQgPSBmdW5jdGlvbihmZ0RhdGEpe1xyXG5cdGlmIChBcnJheS5pc0FycmF5KGZnRGF0YSkpe1x0XHRcclxuXHRcdHJldHVybiBmZ0RhdGEubWFwKCRmZy5sb2FkKTtcclxuXHR9O1xyXG5cdHJldHVybiBuZXcgZmdDbGFzc01vZHVsZS5GZ0NsYXNzKGZnRGF0YSk7XHJcbn07XHJcblxyXG4kZmcuaXNGZyA9IGZ1bmN0aW9uKGRvbU5vZGUpe1xyXG5cdHJldHVybiBkb21Ob2RlLmNsYXNzTGlzdCAmJiBkb21Ob2RlLmNsYXNzTGlzdC5jb250YWlucygnZmcnKTtcclxufTtcclxuXHJcbnZhciBpaWRSZSA9IC9mZ1xcLWlpZFxcLShcXGQrKS9nO1xyXG52YXIgaWRSZSA9IC9mZ1xcLShcXGQrKVxcLWdpZFxcLShcXGQrKS9nO1xyXG5cclxuJGZnLmJ5RG9tID0gZnVuY3Rpb24oZG9tTm9kZSl7XHRcclxuXHRpZiAoIWRvbU5vZGUgfHwgIWRvbU5vZGUuY2xhc3NOYW1lKXtcclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH07XHJcblx0aWYgKCF+ZG9tTm9kZS5jbGFzc05hbWUuc3BsaXQoJyAnKS5pbmRleE9mKCdmZycpKXtcclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH07XHJcblx0aWYgKCFkb21Ob2RlLmlkKXtcclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH07XHJcblx0aWRSZS5sYXN0SW5kZXggPSAwO1xyXG5cdHZhciByZXMgPSBpZFJlLmV4ZWMoZG9tTm9kZS5pZCk7XHJcblx0aWYgKCFyZXMpe1xyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fTtcclxuXHR2YXIgaWlkID0gcGFyc2VJbnQocmVzWzFdKTtcclxuXHRyZXR1cm4gZmdJbnN0YW5jZU1vZHVsZS5nZXRGZ0J5SWlkKGlpZCk7XHRcclxufTtcclxuXHJcbiRmZy5nYXBDbG9zZXN0ID0gZnVuY3Rpb24oZG9tTm9kZSl7XHJcblx0d2hpbGUgKHRydWUpe1xyXG5cdFx0aWRSZS5sYXN0SW5kZXggPSAwO1xyXG5cdFx0dmFyIHJlcyA9IGlkUmUuZXhlYyhkb21Ob2RlLmlkKTtcclxuXHRcdGlmICghcmVzKXtcclxuXHRcdFx0ZG9tTm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZTtcclxuXHRcdFx0aWYgKCFkb21Ob2RlKXtcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0fTtcclxuXHRcdFx0Y29udGludWU7XHJcblx0XHR9O1xyXG5cdFx0dmFyIGlpZCA9IHBhcnNlSW50KHJlc1sxXSk7XHJcblx0XHR2YXIgZmcgPSBmZ0luc3RhbmNlTW9kdWxlLmdldEZnQnlJaWQoaWlkKTtcclxuXHRcdHZhciBnaWQgPSBwYXJzZUludChyZXNbMl0pO1xyXG5cdFx0cmV0dXJuIGZnLmdhcFN0b3JhZ2UuZ2Fwc1tnaWRdO1xyXG5cdH07XHJcbn07XHJcblxyXG4kZmcuY2xhc3NlcyA9IGZnQ2xhc3NNb2R1bGUuZmdDbGFzc0RpY3Q7XHJcblxyXG4kZmcuZmdzID0gZmdJbnN0YW5jZU1vZHVsZS5mZ0luc3RhbmNlVGFibGU7XHJcblxyXG4kZmcuanEgPSB3aW5kb3cualF1ZXJ5O1xyXG5cclxud2luZG93LiRmZyA9ICRmZzsiLCJ2YXIgZmdIZWxwZXIgPSByZXF1aXJlKCcuL2hlbHBlci5qcycpOyIsImZ1bmN0aW9uIEV2ZW50RW1pdHRlcihwYXJlbnQpe1xyXG5cdHRoaXMuZXZlbnRzID0ge307XHJcblx0dGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbn07XHJcblxyXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24obmFtZSwgZm4pe1xyXG5cdHZhciBldmVudExpc3QgPSB0aGlzLmV2ZW50c1tuYW1lXTtcclxuXHRpZiAoIWV2ZW50TGlzdCl7XHJcblx0XHRldmVudExpc3QgPSBbXTtcclxuXHRcdHRoaXMuZXZlbnRzW25hbWVdID0gZXZlbnRMaXN0O1xyXG5cdH07XHJcblx0ZXZlbnRMaXN0LnB1c2goZm4pO1xyXG59O1xyXG5cclxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24obmFtZS8qLCByZXN0Ki8pe1xyXG5cdGlmICh0aGlzLnBhcmVudCl7XHJcblx0XHR0aGlzLnBhcmVudC5lbWl0LmFwcGx5KHRoaXMucGFyZW50LCBhcmd1bWVudHMpO1xyXG5cdH07XHJcblx0dmFyIGV2ZW50TGlzdCA9IHRoaXMuZXZlbnRzW25hbWVdO1xyXG5cdGlmICghZXZlbnRMaXN0KXtcclxuXHRcdHJldHVybjtcclxuXHR9O1xyXG5cdHZhciBlbWl0QXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcdCBcclxuXHRldmVudExpc3QuZm9yRWFjaChmdW5jdGlvbihmbil7XHJcblx0XHRmbi5hcHBseSh0aGlzLCBlbWl0QXJncyk7XHJcblx0fSk7XHJcbn07XHJcblxyXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXRBcHBseSA9IGZ1bmN0aW9uKG5hbWUsIHRoaXNBcmcsIGFyZ3Mpe1xyXG5cdGlmICh0aGlzLnBhcmVudCl7XHJcblx0XHR0aGlzLnBhcmVudC5lbWl0QXBwbHkuYXBwbHkodGhpcy5wYXJlbnQsIGFyZ3VtZW50cyk7XHJcblx0fTtcclxuXHR2YXIgZXZlbnRMaXN0ID0gdGhpcy5ldmVudHNbbmFtZV07XHJcblx0aWYgKCFldmVudExpc3Qpe1xyXG5cdFx0cmV0dXJuO1xyXG5cdH07XHJcblx0ZXZlbnRMaXN0LmZvckVhY2goZnVuY3Rpb24oZm4pe1xyXG5cdFx0Zm4uYXBwbHkodGhpc0FyZywgYXJncyk7XHJcblx0fSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjsiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCdmZy91dGlscycpO1xyXG5cclxuZnVuY3Rpb24gcmVuZGVyVHBsKHRwbCwgcGFyZW50LCBkYXRhLCBtZXRhKXtcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0dmFyIHBhcnRzID0gdHBsLm1hcChmdW5jdGlvbihwYXJ0LCBwYXJ0SWQpe1xyXG5cdFx0aWYgKHR5cGVvZiBwYXJ0ID09IFwic3RyaW5nXCIpe1xyXG5cdFx0XHRyZXR1cm4gcGFydDtcclxuXHRcdH07XHJcblx0XHR2YXIgcGFydE1ldGEgPSB1dGlscy5zaW1wbGVDbG9uZShwYXJ0KTtcclxuXHRcdGlmIChtZXRhKXtcclxuXHRcdFx0aWYgKHR5cGVvZiBtZXRhID09IFwiZnVuY3Rpb25cIil7XHJcblx0XHRcdFx0cGFydE1ldGEgPSBtZXRhKHBhcnRNZXRhLCBwYXJ0SWQpO1xyXG5cdFx0XHR9ZWxzZXtcclxuXHRcdFx0XHRwYXJ0TWV0YSA9IHV0aWxzLmV4dGVuZChwYXJ0TWV0YSwgbWV0YSB8fCB7fSk7XHRcdFx0XHJcblx0XHRcdH07XHRcclxuXHRcdH07XHRcdFxyXG5cdFx0cmV0dXJuIHNlbGYuZ2FwQ2xhc3NNZ3IucmVuZGVyKHNlbGYuY29udGV4dCwgcGFyZW50LCBkYXRhLCBwYXJ0TWV0YSk7XHJcblx0fSk7XHJcblx0dmFyIGNvZGUgPSBwYXJ0cy5qb2luKCcnKTtcclxuXHRyZXR1cm4gY29kZTtcclxufTtcclxuXHJcbmV4cG9ydHMucmVuZGVyVHBsID0gcmVuZGVyVHBsOyIsInZhciB0cGxVdGlscyA9IHJlcXVpcmUoJ2ZnL3V0aWxzL3RwbFV0aWxzLmpzJyk7XHJcbmV4dGVuZChleHBvcnRzLCB0cGxVdGlscyk7XHJcblxyXG5mdW5jdGlvbiBvYmpGb3Iob2JqLCBmbil7XHJcblx0Zm9yICh2YXIgaSBpbiBvYmope1xyXG5cdFx0Zm4ob2JqW2ldLCBpLCBvYmopO1xyXG5cdH07XHJcbn07XHJcbmV4cG9ydHMub2JqRm9yID0gb2JqRm9yO1xyXG5cclxuZnVuY3Rpb24gb2JqUGF0aChwYXRoLCBvYmosIG5ld1ZhbCl7XHJcblx0aWYgKHBhdGgubGVuZ3RoIDwgMSl7XHJcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpe1xyXG5cdFx0XHR0aHJvdyAncm9vdCByZXdyaXR0aW5nIGlzIG5vdCBzdXBwb3J0ZWQnO1xyXG5cdFx0fTtcclxuXHRcdHJldHVybiBvYmo7XHJcblx0fTtcclxuXHR2YXIgcHJvcE5hbWUgPSBwYXRoWzBdO1xyXG5cdGlmIChwYXRoLmxlbmd0aCA9PSAxKXtcclxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMil7XHJcblx0XHRcdG9ialtwcm9wTmFtZV0gPSBuZXdWYWw7IFxyXG5cdFx0fTtcdFx0XHRcdFxyXG5cdFx0cmV0dXJuIG9ialtwcm9wTmFtZV07XHRcclxuXHR9O1xyXG5cdHZhciBzdWJPYmogPSBvYmpbcHJvcE5hbWVdO1xyXG5cdGlmIChzdWJPYmogPT09IHVuZGVmaW5lZCl7XHJcblx0XHQvL3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZWFkIFwiICsgcHJvcE5hbWUgKyBcIiBvZiB1bmRlZmluZWRcIik7XHJcblx0XHRyZXR1cm4gdW5kZWZpbmVkOyAvLyB0aHJvdz9cclxuXHR9O1x0XHRcclxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpe1xyXG5cdFx0cmV0dXJuIG9ialBhdGgocGF0aC5zbGljZSgxKSwgc3ViT2JqLCBuZXdWYWwpO1xyXG5cdH07XHJcblx0cmV0dXJuIG9ialBhdGgocGF0aC5zbGljZSgxKSwgc3ViT2JqKTtcclxufTtcclxuZXhwb3J0cy5vYmpQYXRoID0gb2JqUGF0aDtcclxuXHJcblxyXG5mdW5jdGlvbiBhdHRyc1RvT2JqKGF0dHJzKXtcclxuXHR2YXIgcmVzID0ge307XHJcblx0YXR0cnMuZm9yRWFjaChmdW5jdGlvbihpKXtcclxuXHRcdHJlc1tpLm5hbWVdID0gaS52YWx1ZTtcclxuXHR9KTsgXHJcblx0cmV0dXJuIHJlcztcclxufTtcclxuZXhwb3J0cy5hdHRyc1RvT2JqID0gYXR0cnNUb09iajtcclxuXHJcblxyXG5mdW5jdGlvbiBzaW1wbGVDbG9uZShvYmope1xyXG5cdHZhciByZXMgPSB7fTtcclxuXHRmb3IgKHZhciBpIGluIG9iail7XHJcblx0XHRyZXNbaV0gPSBvYmpbaV07XHJcblx0fTtcclxuXHRyZXR1cm4gcmVzO1xyXG59O1xyXG5leHBvcnRzLnNpbXBsZUNsb25lID0gc2ltcGxlQ2xvbmU7XHJcblxyXG5cclxuZnVuY3Rpb24gbWl4QXJyYXlzKGFycmF5cyl7XHJcblx0dmFyIGlkID0gMDtcclxuXHR2YXIgbWF4TGVuZ3RoID0gMDtcclxuXHR2YXIgdG90YWxMZW5ndGggPSAwO1xyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKXtcclxuXHRcdG1heExlbmd0aCA9IE1hdGgubWF4KGFyZ3VtZW50c1tpXS5sZW5ndGgsIG1heExlbmd0aCk7XHJcblx0XHR0b3RhbExlbmd0aCArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xyXG5cdH07XHJcblx0dmFyIHJlc0FyciA9IFtdO1xyXG5cdHZhciBhcnJheUNvdW50ID0gYXJndW1lbnRzLmxlbmd0aDtcclxuXHRmb3IgKHZhciBpZCA9IDA7IGlkIDwgbWF4TGVuZ3RoOyBpZCsrKXtcdFx0XHRcdFxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheUNvdW50OyBpKyspe1xyXG5cdFx0XHRpZiAoYXJndW1lbnRzW2ldLmxlbmd0aCA+IGlkKXtcclxuXHRcdFx0XHRyZXNBcnIucHVzaChhcmd1bWVudHNbaV1baWRdKTtcclxuXHRcdFx0fTtcclxuXHRcdH07XHJcblx0fTtcclxuXHRyZXR1cm4gcmVzQXJyO1xyXG59O1xyXG5leHBvcnRzLm1peEFycmF5cyA9IG1peEFycmF5cztcclxuXHJcbmZ1bmN0aW9uIHJlc29sdmVQYXRoKHJvb3RQYXRoLCByZWxQYXRoKXtcclxuXHR2YXIgcmVzUGF0aCA9IHJvb3RQYXRoLnNsaWNlKCk7XHJcblx0cmVsUGF0aCA9IHJlbFBhdGggfHwgW107XHJcblx0cmVsUGF0aC5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XHJcblx0XHRpZiAoa2V5ID09IFwiX3Jvb3RcIil7XHJcblx0XHRcdHJlc1BhdGggPSBbXTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fTtcclxuXHRcdHJlc1BhdGgucHVzaChrZXkpO1xyXG5cdH0pO1xyXG5cdHJldHVybiByZXNQYXRoO1xyXG59O1xyXG5leHBvcnRzLnJlc29sdmVQYXRoID0gcmVzb2x2ZVBhdGg7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0U2NvcGVQYXRoKG1ldGEpe1xyXG5cdHZhclx0cGFyZW50UGF0aCA9IFtdO1xyXG5cdGlmIChtZXRhLnBhcmVudCl7XHJcblx0XHRwYXJlbnRQYXRoID0gbWV0YS5wYXJlbnQuc2NvcGVQYXRoO1xyXG5cdFx0aWYgKCFwYXJlbnRQYXRoKXtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiUGFyZW50IGVsbSBtdXN0IGhhdmUgc2NvcGVQYXRoXCIpO1xyXG5cdFx0fTtcclxuXHR9O1xyXG5cdHJldHVybiByZXNvbHZlUGF0aChwYXJlbnRQYXRoLCBtZXRhLnBhdGgpXHJcbn07XHJcbmV4cG9ydHMuZ2V0U2NvcGVQYXRoID0gZ2V0U2NvcGVQYXRoO1xyXG5cclxuZnVuY3Rpb24ga2V5VmFsdWVUb09iaihhcnIsIGtleU5hbWUsIHZhbHVlTmFtZSl7XHJcblx0a2V5TmFtZSA9IGtleU5hbWUgfHwgJ2tleSc7XHJcblx0dmFsdWVOYW1lID0gdmFsdWVOYW1lIHx8ICd2YWx1ZSc7XHJcblx0dmFyIHJlcyA9IHt9O1xyXG5cdGFyci5mb3JFYWNoKGZ1bmN0aW9uKGkpe1xyXG5cdFx0cmVzW2lba2V5TmFtZV1dID0gaVt2YWx1ZU5hbWVdO1xyXG5cdH0pOyBcclxuXHRyZXR1cm4gcmVzO1xyXG59O1xyXG5leHBvcnRzLmtleVZhbHVlVG9PYmogPSBrZXlWYWx1ZVRvT2JqO1x0XHJcblxyXG5mdW5jdGlvbiBvYmpUb0tleVZhbHVlKG9iaiwga2V5TmFtZSwgdmFsdWVOYW1lKXtcclxuXHRrZXlOYW1lID0ga2V5TmFtZSB8fCAna2V5JztcclxuXHR2YWx1ZU5hbWUgPSB2YWx1ZU5hbWUgfHwgJ3ZhbHVlJztcclxuXHR2YXIgcmVzID0gW107XHJcblx0Zm9yICh2YXIgaSBpbiBvYmope1xyXG5cdFx0dmFyIGl0ZW0gPSB7fTtcclxuXHRcdGl0ZW1ba2V5TmFtZV0gPSBpO1xyXG5cdFx0aXRlbVt2YWx1ZU5hbWVdID0gb2JqW2ldO1xyXG5cdFx0cmVzLnB1c2goaXRlbSk7XHJcblx0fTtcclxuXHRyZXR1cm4gcmVzO1xyXG59O1xyXG5leHBvcnRzLm9ialRvS2V5VmFsdWUgPSBvYmpUb0tleVZhbHVlO1xyXG5cclxuZnVuY3Rpb24gY2xvbmUob2JqKXtcclxuXHRyZXR1cm4gT2JqZWN0LmNyZWF0ZShvYmopO1xyXG59O1xyXG5leHBvcnRzLmNsb25lID0gY2xvbmU7XHJcblxyXG5cclxuZnVuY3Rpb24gY29uY2F0T2JqKG9iajEsIG9iajIpe1xyXG5cdHZhciByZXMgPSBzaW1wbGVDbG9uZShvYmoxKTtcclxuXHRmb3IgKHZhciBpIGluIG9iajIpe1xyXG5cdFx0cmVzW2ldID0gb2JqMltpXTtcclxuXHR9O1xyXG5cdHJldHVybiByZXM7XHJcbn07XHJcbmV4cG9ydHMuY29uY2F0T2JqID0gY29uY2F0T2JqO1xyXG5cclxuZnVuY3Rpb24gZXh0ZW5kKGRlc3QsIHNyYyl7XHRcclxuXHRmb3IgKHZhciBpIGluIHNyYyl7XHJcblx0XHRkZXN0W2ldID0gc3JjW2ldO1xyXG5cdH07XHJcblx0cmV0dXJuIGRlc3Q7XHJcbn07XHJcbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO1xyXG5cclxuZnVuY3Rpb24gZmluZFNjb3BlSG9sZGVyKG1ldGEpe1xyXG4gICAgdmFyIG5vZGUgPSBtZXRhLnBhcmVudDtcclxuICAgIHdoaWxlIChub2RlKXtcclxuICAgICAgICBpZiAobm9kZS5pc1Njb3BlSG9sZGVyKXtcclxuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBub2RlID0gbm9kZS5wYXJlbnQ7ICBcclxuICAgIH07XHJcbiAgICB0aHJvdyAnY2Fubm90IGZpbmQgc2NvcGUgaG9sZGVyJztcclxufTtcclxuZXhwb3J0cy5maW5kU2NvcGVIb2xkZXIgPSBmaW5kU2NvcGVIb2xkZXI7XHJcblxyXG5mdW5jdGlvbiByZW5kZXJTY29wZUNvbnRlbnQoY29udGV4dCwgc2NvcGVNZXRhLCBzY29wZURhdGEsIGRhdGEsIGlkT2Zmc2V0KXtcclxuXHR2YXIgZ2FwQ2xhc3NNZ3IgPSByZXF1aXJlKCdmZy9jbGllbnQvZ2FwQ2xhc3NNZ3IuanMnKTtcclxuXHR2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkoc2NvcGVEYXRhKTtcclxuXHRpZiAoIWlzQXJyYXkpe1xyXG5cdFx0c2NvcGVEYXRhID0gW3Njb3BlRGF0YV07XHJcblx0fTtcclxuXHR2YXIgcGFydHMgPSBzY29wZURhdGEubWFwKGZ1bmN0aW9uKGRhdGFJdGVtLCBpZCl7XHJcblx0XHR2YXIgaXRlbU1ldGEgPSBzY29wZU1ldGE7XHJcblx0XHRpZiAoaXNBcnJheSl7XHJcblx0XHRcdHZhciBpdGVtQ2ZnID0ge1xyXG5cdFx0XHRcdFwidHlwZVwiOiBcInNjb3BlLWl0ZW1cIixcclxuXHRcdFx0XHRcImlzVmlydHVhbFwiOiB0cnVlLFxyXG5cdFx0XHRcdFwicGF0aFwiOiBbaWQgKyBpZE9mZnNldF0sXHJcblx0XHRcdFx0XCJjb250ZW50XCI6IHNjb3BlTWV0YS5jb250ZW50XHJcblx0XHRcdH07XHJcblx0XHRcdGl0ZW1NZXRhID0gbmV3IGdhcENsYXNzTWdyLkdhcChjb250ZXh0LCBpdGVtQ2ZnLCBpdGVtTWV0YSk7XHJcblx0XHRcdGNvbnRleHQuZ2FwU3RvcmFnZS5zZXRUcmlnZ2VycyhpdGVtTWV0YSwgW2l0ZW1NZXRhLnNjb3BlUGF0aF0pO1xyXG5cdFx0fTtcclxuXHRcdHJldHVybiBnYXBDbGFzc01nci5yZW5kZXIoY29udGV4dCwgc2NvcGVNZXRhLCBkYXRhLCBpdGVtTWV0YSk7XHJcblx0fSk7XHJcblx0cmV0dXJuIHBhcnRzO1xyXG59O1xyXG5leHBvcnRzLnJlbmRlclNjb3BlQ29udGVudCA9IHJlbmRlclNjb3BlQ29udGVudDtcclxuXHJcbmZ1bmN0aW9uIGluc2VydEhUTUxCZWZvcmVDb21tZW50KGNvbW1lbnRFbG0sIGh0bWwpe1xyXG5cdHZhciBwcmV2ID0gY29tbWVudEVsbS5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xyXG5cdGlmIChwcmV2KXtcclxuXHRcdHByZXYuaW5zZXJ0QWRqYWNlbnRIVE1MKCdhZnRlcmVuZCcsIGh0bWwpO1xyXG5cdFx0cmV0dXJuO1xyXG5cdH07XHJcblx0Y29tbWVudEVsbS5wYXJlbnROb2RlLmluc2VydEFkamFjZW50SFRNTCgnYWZ0ZXJiZWdpbicsIGh0bWwpO1xyXG59O1xyXG5leHBvcnRzLmluc2VydEhUTUxCZWZvcmVDb21tZW50ID0gaW5zZXJ0SFRNTEJlZm9yZUNvbW1lbnQ7XHJcblxyXG5cclxuZnVuY3Rpb24gcGFyc2VQYXRoKHBhcnNlZE5vZGUpe1xyXG5cdGlmIChwYXJzZWROb2RlLmF0dHJzLmNsYXNzKXtcclxuXHRcdHJldHVybiBwYXJzZWROb2RlLmF0dHJzLmNsYXNzLnZhbHVlLnNwbGl0KCcgJyk7XHJcblx0fTtcclxuXHRyZXR1cm4gW107XHJcbn07XHJcbmV4cG9ydHMucGFyc2VQYXRoID0gcGFyc2VQYXRoO1xyXG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCdmZy91dGlscycpO1xyXG5cclxuZnVuY3Rpb24gU3RyVHBsKHRwbCl7XHJcblx0dGhpcy50cGwgPSB0cGw7XHJcbn07XHJcblxyXG5TdHJUcGwucGFyc2UgPSBmdW5jdGlvbihzdHIpe1xyXG5cdHZhciByZSA9IC9cXCVcXEA/W1xcd1xcZF9cXC5cXC1dKyUvZztcclxuXHR2YXIgZ2FwcyA9IHN0ci5tYXRjaChyZSk7XHJcblx0aWYgKCFnYXBzKXtcclxuXHRcdHJldHVybiBzdHI7XHJcblx0fTtcclxuXHRnYXBzID0gZ2Fwcy5tYXAoZnVuY3Rpb24oZ2FwKXtcclxuXHRcdHZhciBwYXRoU3RyID0gZ2FwLnNsaWNlKDEsIC0xKTtcclxuXHRcdHZhciBwYXRoID0gW107XHJcblx0XHRpZiAocGF0aFN0clswXSA9PSBcIkBcIil7XHJcblx0XHRcdHBhdGhTdHIgPSBwYXRoU3RyLnNsaWNlKDEpO1xyXG5cdFx0fWVsc2V7XHJcblx0XHRcdHBhdGggPSBbXTtcclxuXHRcdH07XHJcblx0XHR2YXIgcGF0aCA9IHBhdGguY29uY2F0KHBhdGhTdHIuc3BsaXQoJy4nKSk7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcInBhdGhcIjogcGF0aFxyXG5cdFx0fTtcclxuXHR9KTtcclxuXHR2YXIgdHBsUGFydHMgPSBzdHIuc3BsaXQocmUpO1xyXG5cdHZhciB0cGwgPSB1dGlscy5taXhBcnJheXModHBsUGFydHMsIGdhcHMpO1xyXG5cdHJldHVybiB0cGw7XHJcbn07XHJcblxyXG5TdHJUcGwucHJvdG90eXBlLmdldFBhdGhzID0gZnVuY3Rpb24oKXtcclxuXHR2YXIgcGF0aHMgPSBbXTtcclxuXHRpZiAoIUFycmF5LmlzQXJyYXkodGhpcy50cGwpKXtcclxuXHRcdHJldHVybiBwYXRocztcclxuXHR9O1x0XHJcblx0dGhpcy50cGwuZm9yRWFjaChmdW5jdGlvbihwYXJ0KXtcclxuXHRcdGlmICh0eXBlb2YgcGFydCA9PSBcInN0cmluZ1wiKXtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fTtcclxuXHRcdHJldHVybiBwYXRocy5wdXNoKHBhcnQucGF0aCk7XHJcblx0fSk7XHJcblx0cmV0dXJuIHBhdGhzO1xyXG59O1xyXG5cclxuU3RyVHBsLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihkYXRhKXtcclxuXHRpZiAoIUFycmF5LmlzQXJyYXkodGhpcy50cGwpKXtcclxuXHRcdHJldHVybiB0aGlzLnRwbDtcclxuXHR9O1xyXG5cdHJldHVybiB0aGlzLnRwbC5tYXAoZnVuY3Rpb24ocGFydCl7XHJcblx0XHRpZiAodHlwZW9mIHBhcnQgPT0gXCJzdHJpbmdcIil7XHJcblx0XHRcdHJldHVybiBwYXJ0O1xyXG5cdFx0fTtcclxuXHRcdHJldHVybiB1dGlscy5vYmpQYXRoKHBhcnQucGF0aCwgZGF0YSk7XHJcblx0fSkuam9pbignJyk7XHRcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU3RyVHBsO1xyXG4iLCJ2YXIgU3RyVHBsID0gcmVxdWlyZSgnZmcvdXRpbHMvc3RyVHBsLmpzJyk7XHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJ2ZnL3V0aWxzLmpzJyk7XHJcblxyXG52YXIgc2VsZkNsb3NpbmdUYWdzID0gW1wiYXJlYVwiLCBcImJhc2VcIiwgXCJiclwiLCBcImNvbFwiLCBcclxuXHRcImNvbW1hbmRcIiwgXCJlbWJlZFwiLCBcImhyXCIsIFwiaW1nXCIsIFxyXG5cdFwiaW5wdXRcIiwgXCJrZXlnZW5cIiwgXCJsaW5rXCIsIFxyXG5cdFwibWV0YVwiLCBcInBhcmFtXCIsIFwic291cmNlXCIsIFwidHJhY2tcIiwgXHJcblx0XCJ3YnJcIl07XHJcblxyXG5mdW5jdGlvbiByZW5kZXJUYWcodGFnSW5mbyl7XHJcblx0dmFyIGF0dHJzID0gdGFnSW5mby5hdHRycztcclxuXHRpZiAoIUFycmF5LmlzQXJyYXkoYXR0cnMpKXtcclxuXHRcdGF0dHJzID0gdXRpbHMub2JqVG9LZXlWYWx1ZShhdHRycywgJ25hbWUnLCAndmFsdWUnKTtcclxuXHR9O1xyXG5cdHZhciBhdHRyQ29kZSA9IFwiXCI7XHJcblx0aWYgKGF0dHJzLmxlbmd0aCA+IDApe1xyXG5cdCAgICBhdHRyQ29kZSA9IFwiIFwiICsgYXR0cnMubWFwKGZ1bmN0aW9uKGF0dHIpe1xyXG5cdFx0ICByZXR1cm4gYXR0ci5uYW1lICsgJz1cIicgKyBhdHRyLnZhbHVlICsgJ1wiJztcclxuXHQgICB9KS5qb2luKCcgJyk7XHJcblx0fTtcclxuXHR2YXIgdGFnSGVhZCA9IHRhZ0luZm8ubmFtZSArIGF0dHJDb2RlO1xyXG5cdGlmICh+c2VsZkNsb3NpbmdUYWdzLmluZGV4T2YodGFnSW5mby5uYW1lKSl7XHJcblx0XHRyZXR1cm4gXCI8XCIgKyB0YWdIZWFkICsgXCIgLz5cIjtcclxuXHR9O1xyXG5cdHZhciBvcGVuVGFnID0gXCI8XCIgKyB0YWdIZWFkICsgXCI+XCI7XHJcblx0dmFyIGNsb3NlVGFnID0gXCI8L1wiICsgdGFnSW5mby5uYW1lICsgXCI+XCI7XHJcblx0dmFyIGNvZGUgPSBvcGVuVGFnICsgKHRhZ0luZm8uaW5uZXJIVE1MIHx8IFwiXCIpICsgY2xvc2VUYWc7XHJcblx0cmV0dXJuIGNvZGU7XHJcbn07XHJcbmV4cG9ydHMucmVuZGVyVGFnID0gcmVuZGVyVGFnO1x0XHJcblxyXG5mdW5jdGlvbiByZW5kZXJBdHRycyhhdHRycywgZGF0YSl7XHJcblx0dmFyIHJlc0F0dHJzID0ge307XHJcblx0dXRpbHMub2JqRm9yKGF0dHJzLCBmdW5jdGlvbih2YWx1ZSwgbmFtZSl7XHJcblx0XHR2YXIgbmFtZVRwbCA9IG5ldyBTdHJUcGwobmFtZSk7XHJcblx0XHR2YXIgdmFsdWVUcGwgPSBuZXcgU3RyVHBsKHZhbHVlKTtcclxuXHRcdHJlc0F0dHJzW25hbWVUcGwucmVuZGVyKGRhdGEpXSA9IHZhbHVlVHBsLnJlbmRlcihkYXRhKTtcdFx0XHJcblx0fSk7XHRcclxuXHRyZXR1cm4gcmVzQXR0cnM7XHJcbn07XHJcbmV4cG9ydHMucmVuZGVyQXR0cnMgPSByZW5kZXJBdHRycztcclxuXHJcbmZ1bmN0aW9uIGdldEF0dHJzUGF0aHMoYXR0cnMpe1xyXG5cdHZhciBwYXRocyA9IFtdO1xyXG5cdHV0aWxzLm9iakZvcihhdHRycywgZnVuY3Rpb24odmFsdWUsIG5hbWUpe1xyXG5cdFx0dmFyIG5hbWVUcGwgPSBuZXcgU3RyVHBsKG5hbWUpO1xyXG5cdFx0dmFyIHZhbHVlVHBsID0gbmV3IFN0clRwbCh2YWx1ZSk7XHJcblx0XHRwYXRocyA9IHBhdGhzLmNvbmNhdChuYW1lVHBsLmdldFBhdGhzKCksIHZhbHVlVHBsLmdldFBhdGhzKCkpO1x0XHRcclxuXHR9KTtcclxuXHRyZXR1cm4gcGF0aHM7XHJcbn07XHJcbmV4cG9ydHMuZ2V0QXR0cnNQYXRocyA9IGdldEF0dHJzUGF0aHM7XHJcbiIsImZ1bmN0aW9uIE5vZGUoa2luZCwgcGFyZW50LCBkYXRhKXtcclxuICAgIHRoaXMuY2hpbGRyZW4gPSBraW5kID09ICdhcnJheSdcclxuICAgICAgICA/IFtdXHJcbiAgICAgICAgOiB7fTsgICBcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG4gICAgdGhpcy5kYXRhID0gZGF0YTtcclxuICAgIHRoaXMuY2hpbGRDb3VudCA9IDA7XHJcbn07XHJcblxyXG5Ob2RlLnByb3RvdHlwZS5hZGRDaGlsZCA9IGZ1bmN0aW9uKG5hbWUsIGRhdGEpe1xyXG4gICAgaWYgKHRoaXMua2luZCA9PSAnYXJyYXknKXtcclxuICAgICAgICBkYXRhID0gbmFtZTtcclxuICAgICAgICBuYW1lID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7XHJcbiAgICB9O1xyXG4gICAgZGF0YSA9IGRhdGEgfHwgdGhpcy5yb290LmluaXROb2RlKCk7XHJcbiAgICB2YXIgY2hpbGQgPSBuZXcgTm9kZSh0aGlzLmtpbmQsIHRoaXMsIGRhdGEpO1xyXG4gICAgY2hpbGQuaWQgPSBuYW1lO1xyXG4gICAgY2hpbGQucGF0aCA9IHRoaXMucGF0aC5jb25jYXQoW25hbWVdKTtcclxuICAgIGNoaWxkLnJvb3QgPSB0aGlzLnJvb3Q7XHJcbiAgICB0aGlzLmNoaWxkQ291bnQrKztcclxuICAgIHRoaXMuY2hpbGRyZW5bbmFtZV0gPSBjaGlsZDtcclxuICAgIHJldHVybiBjaGlsZDtcclxufTtcclxuXHJcbk5vZGUucHJvdG90eXBlLmdldFBhcmVudHMgPSBmdW5jdGlvbigpe1xyXG4gICAgdmFyIHJlcyA9IFtdOyAgICBcclxuICAgIHZhciBub2RlID0gdGhpcztcclxuICAgIHdoaWxlICh0cnVlKXtcclxuICAgICAgICBub2RlID0gbm9kZS5wYXJlbnQ7XHJcbiAgICAgICAgaWYgKCFub2RlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcztcclxuICAgICAgICB9O1xyXG4gICAgICAgIHJlcy5wdXNoKG5vZGUpO1xyXG4gICAgfTsgIFxyXG59O1xyXG5cclxuTm9kZS5wcm90b3R5cGUuY2hpbGRJdGVyYXRlID0gZnVuY3Rpb24oZm4pe1xyXG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmNoaWxkcmVuKXtcclxuICAgICAgICBmbi5jYWxsKHRoaXMsIHRoaXMuY2hpbGRyZW5baV0sIGkpOyAgXHJcbiAgICB9O1xyXG59O1xyXG5cclxuTm9kZS5wcm90b3R5cGUuZ2V0Q2hpbGRBcnIgPSBmdW5jdGlvbigpe1xyXG4gICAgaWYgKHRoaXMua2luZCA9PSAnYXJyYXknKXtcclxuICAgICAgICByZXR1cm4gdGhpcy5jaGlsZHJlbjtcclxuICAgIH07XHJcbiAgICB2YXIgcmVzID0gW107XHJcbiAgICB0aGlzLmNoaWxkSXRlcmF0ZShmdW5jdGlvbihjaGlsZCl7XHJcbiAgICAgICAgcmVzLnB1c2goY2hpbGQpO1xyXG4gICAgfSk7ICAgICAgICAgICAgXHJcbiAgICByZXR1cm4gcmVzO1xyXG59O1xyXG5cclxuTm9kZS5wcm90b3R5cGUuZ2V0RGVlcENoaWxkQXJyID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciByZXMgPSB0aGlzLmdldENoaWxkQXJyKCk7XHJcbiAgICB0aGlzLmNoaWxkSXRlcmF0ZShmdW5jdGlvbihjaGlsZCl7XHJcbiAgICAgICByZXMgPSByZXMuY29uY2F0KGNoaWxkLmdldERlZXBDaGlsZEFycigpKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHJlcztcclxufTtcclxuXHJcbk5vZGUucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKHBhdGgpe1xyXG4gICAgdmFyIGxlYWZLZXkgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XHJcbiAgICB2YXIgYnJhbmNoUGF0aCA9IHBhdGguc2xpY2UoMCwgLTEpO1xyXG4gICAgdmFyIGJyYW5jaCA9IHRoaXMuYnlQYXRoKGJyYW5jaFBhdGgpO1xyXG4gICAgYnJhbmNoLmNoaWxkQ291bnQtLTtcclxuICAgIHZhciByZXMgPSBicmFuY2guY2hpbGRyZW5bbGVhZktleV07XHJcbiAgICBkZWxldGUgYnJhbmNoLmNoaWxkcmVuW2xlYWZLZXldOyAgIFxyXG4gICAgcmV0dXJuIHJlczsgXHJcbn07XHJcblxyXG5Ob2RlLnByb3RvdHlwZS5ieVBhdGggPSBmdW5jdGlvbihwYXRoKXsgICAgXHJcbiAgICBpZiAocGF0aC5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgdmFyIG5vZGUgPSB0aGlzO1xyXG4gICAgd2hpbGUgKHRydWUpe1xyXG4gICAgICAgIHZhciBrZXkgPSBwYXRoWzBdO1xyXG4gICAgICAgIG5vZGUgPSBub2RlLmNoaWxkcmVuW2tleV07XHJcbiAgICAgICAgaWYgKCFub2RlKXtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBwYXRoID0gcGF0aC5zbGljZSgxKTtcclxuICAgICAgICBpZiAocGF0aC5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgICAgIHJldHVybiBub2RlOyAgXHJcbiAgICAgICAgfTtcclxuICAgIH07XHJcbn07XHJcblxyXG5Ob2RlLnByb3RvdHlwZS5hY2Nlc3MgPSBmdW5jdGlvbihwYXRoKXtcclxuICAgIGlmIChwYXRoLmxlbmd0aCA9PSAwKXtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICB2YXIgbm9kZSA9IHRoaXM7XHJcbiAgICB3aGlsZSAodHJ1ZSl7XHJcbiAgICAgICAgdmFyIGtleSA9IHBhdGhbMF07XHJcbiAgICAgICAgdmFyIHBhcmVudCA9IG5vZGU7XHJcbiAgICAgICAgbm9kZSA9IG5vZGUuY2hpbGRyZW5ba2V5XTtcclxuICAgICAgICBpZiAoIW5vZGUpe1xyXG4gICAgICAgICAgICB2YXIgZGF0YSA9IHRoaXMucm9vdC5pbml0Tm9kZSgpOyAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgbm9kZSA9IHBhcmVudC5hZGRDaGlsZChrZXksIGRhdGEpO1xyXG4gICAgICAgICAgICBwYXJlbnQuY2hpbGRyZW5ba2V5XSA9IG5vZGU7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBwYXRoID0gcGF0aC5zbGljZSgxKTtcclxuICAgICAgICBpZiAocGF0aC5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgICAgIHJldHVybiBub2RlOyAgXHJcbiAgICAgICAgfTtcclxuICAgIH07IFxyXG59O1xyXG5cclxuZnVuY3Rpb24gVHJlZUhlbHBlcihvcHRzLCByb290RGF0YSl7XHJcbiAgICBvcHRzID0gb3B0cyB8fCB7fTtcclxuICAgIG9wdHMua2luZCA9IG9wdHMua2luZCB8fCAnYXJyYXknO1xyXG4gICAgdmFyIGluaXROb2RlID0gb3B0cy5pbml0Tm9kZSB8fCBmdW5jdGlvbigpe1xyXG4gICAgICAgIHJldHVybiB7fTtcclxuICAgIH07XHJcbiAgICB2YXIgZGF0YSA9IHJvb3REYXRhIHx8IGluaXROb2RlKCk7XHJcbiAgICB2YXIgcm9vdE5vZGUgPSBuZXcgTm9kZShvcHRzLmtpbmQsIG51bGwsIGRhdGEpO1xyXG4gICAgcm9vdE5vZGUuaXNSb290ID0gdHJ1ZTtcclxuICAgIHJvb3ROb2RlLnJvb3QgPSByb290Tm9kZTtcclxuICAgIHJvb3ROb2RlLnBhdGggPSBbXTtcclxuICAgIHJvb3ROb2RlLmluaXROb2RlID0gaW5pdE5vZGU7XHJcbiAgICByZXR1cm4gcm9vdE5vZGU7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRyZWVIZWxwZXI7Il19
