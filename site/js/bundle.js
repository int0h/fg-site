(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
//window.parse5 = require('parse5');
//window.jade = require('jade');
window.fg = require('fg/fgMgr.js');
window.microJade = require('micro-jade');


},{"fg/fgMgr.js":4,"micro-jade":21}],2:[function(require,module,exports){
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
},{"./gaps.js":3,"fg/utils":17}],3:[function(require,module,exports){
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
},{"./gapClassMgr.js":2,"fg/client/gapClassMgr.js":2,"fg/tplRender.js":16,"fg/utils":17}],4:[function(require,module,exports){
var tplMgr = require('fg/tplMgr.js');
var gaps = require('fg/gaps');
//var jade = require('jade');
//var p5 = require('parse5');
var allTags = require('fg/listOfTags.js').allTags;
var utils = require('fg/utils');
var serverUtils = require('fg/serverUtils');
var microJade = require('micro-jade');

var fgTable = {};
//window.fgTable = fgTable;

var jadeOptions = {
	"pretty": '\t',
	"compileDebug": true
};

function prepareJade(code){
	return code
		.split('\n')
		.map(function(line){
			return line.replace(/[\ \t]*$/g, '');
		})
		.join('\n');
};

function readFg(name, sources){
	if (sources.tpl){
		var jadeCode = sources.tpl;
		var mjAst = microJade.parse(jadeCode);
		var tpl = tplMgr.readTpl(mjAst);
	};
	var classFn;
	if (sources.classFn){
		var code = sources.classFn;
		classFn = new Function('fgClass', 'fgProto', code);
	};

	if (!tpl){
		return;
	};

	fgTable[name] = {
		"tpl": tpl,
		"name": name,
		"classFn": classFn
	};
};
exports.readFg = readFg;

function genClientMeta(){
	var fgArr = [];
	for (var i in fgTable){
		fgArr.push(fgTable[i]);
	};
	return '$fg.load(' + serverUtils.toJs(fgArr, {tab: '\t'}) + ')';
};
exports.genClientMeta = genClientMeta;

exports.fgTable = fgTable;
/*function genClientStructure(){
	
};*/
},{"fg/gaps":6,"fg/listOfTags.js":13,"fg/serverUtils":14,"fg/tplMgr.js":15,"fg/utils":17,"micro-jade":21}],5:[function(require,module,exports){
var utils = require('fg/utils');
var gapTable = {};

function regGap(gapHandler){	
	gapTable[gapHandler.name] = gapHandler;
	return gapHandler;
};

function astMap(ast){
	var res = utils.simpleClone(ast);
	res.attrs = ast.attrs 
		? utils.keyValueToObj(ast.attrs, 'name', 'value')
		: ast.attrs;
	return res;
};

function parse(ast, html, parentMeta){
	/*var name = ast.nodeName;
	var gap = gapTable[name];
	if (!gap){
		return false;
	};*/
	for (var i in gapTable){
		var gap = gapTable[i];
		var meta = gap.parse(ast, html, parentMeta);
		if (meta){
			return meta;
		};
	};
	return null;
};

function render(data, meta, context){
	var gap = gapTable[meta.type];
	return gap.render(data, meta, context);
};

function genClientCode(){
	var clientCode = "var gapClassMgr = require('./gapClassMgr.js');" 
	+ "var renderTpl = require('fg/tplRender.js').renderTpl.bind(null, gapClassMgr);\n";
	var gapCodes = [];
	for (var i in gapTable){
		var gap = gapTable[i];
		var propCode = [
			'"render": ' + gap.render.toString(),			
			'"update": ' + gap.update.toString(),			
		].join(',\n');
		gapCodes.push('exports["' + i + '"] = {\n\t' + propCode + '\n};');
	};
	clientCode += gapCodes.join('\n\n');
	return clientCode;
};

exports.regGap = regGap;
exports.parse = parse;
exports.render = render;
exports.genClientCode = genClientCode;
},{"fg/utils":17}],6:[function(require,module,exports){
var gapClassMgr = require('./gapClassMgr.js');
var renderTpl = require('fg/tplRender.js').renderTpl.bind(null, gapClassMgr);
var tplMgr = require('./tplMgr.js');

//require('fg/gaps/input.js');
require('fg/gaps/data.js');
require('fg/gaps/scope.js');
require('fg/gaps/scope-item.js');
require('fg/gaps/fg.js');
require('fg/gaps/content-fg.js');
require('fg/gaps/raw.js');
},{"./gapClassMgr.js":5,"./tplMgr.js":15,"fg/gaps/content-fg.js":7,"fg/gaps/data.js":8,"fg/gaps/fg.js":9,"fg/gaps/raw.js":10,"fg/gaps/scope-item.js":11,"fg/gaps/scope.js":12,"fg/tplRender.js":16}],7:[function(require,module,exports){
var gapClassMgr = require('fg/gapClassMgr.js');
var renderTpl = require('fg/tplRender.js').renderTpl.bind(null, gapClassMgr);
var tplMgr = require('fg/tplMgr.js');
var utils = require('fg/utils');

// TODO: folder tree names
var content = gapClassMgr.regGap({
	"name": "content",
	"parse": function (node, html){
		if (node.tagName != "content"){
			return null;
		};
		var meta = {};
		meta.type = "content";		
		meta.isVirtual = true;
		/*meta.fgName = node.nodeName.slice(3);
		meta.path = node.attrs.class 
			? node.attrs.class.split(' ')
			: [];
		meta.eid = node.attrs.id || null;
		meta.content = tplMgr.readTpl(node, html, meta);*/
		return meta;
	},
	"render": function(context, data, meta){
		var utils = require('fg/utils');			
		return context.parent.renderTpl(context.meta.content, this, context.parent.data);
	},
	"update": function(context, meta, scopePath, value){
		return;
	}
});

exports.content = content;
},{"fg/gapClassMgr.js":5,"fg/tplMgr.js":15,"fg/tplRender.js":16,"fg/utils":17}],8:[function(require,module,exports){
var gapClassMgr = require('fg/gapClassMgr.js');
var renderTpl = require('fg/tplRender.js').renderTpl.bind(null, gapClassMgr);
var tplMgr = require('fg/tplMgr.js');
var utils = require('fg/utils');

var data = gapClassMgr.regGap({
	"name": "data",
	"parse": function (node, html){
		if (node.tagName != "data"){
			return null;
		};
		var meta = {};
		meta.type = "data";		
		meta.isVirtual = false;
		meta.path = utils.parsePath(node);		
		meta.eid = node.attrs.id || null;
		return meta;
	},
	"render": function(context, data){
		var utils = require('fg/utils');
		context.gapStorage.setTriggers(this, [this.scopePath]);
		var value = utils.objPath(this.scopePath, data)
		return utils.renderTag({
			name: "span",
			attrs: this.attrs,
			innerHTML: value
		});
	},
	"update": function(context, meta, scopePath, value){
		var node = meta.getDom()[0];
		if (!node){
			
		};
		node.innerHTML = value;
		//highlight(node, [0xffffff, 0xffee88], 500);
	}
});

exports.data = data;
},{"fg/gapClassMgr.js":5,"fg/tplMgr.js":15,"fg/tplRender.js":16,"fg/utils":17}],9:[function(require,module,exports){
var gapClassMgr = require('fg/gapClassMgr.js');
var renderTpl = require('fg/tplRender.js').renderTpl.bind(null, gapClassMgr);
var tplMgr = require('fg/tplMgr.js');
var utils = require('fg/utils');

// TODO: folder tree names
var fg = gapClassMgr.regGap({
	"name": "fg",
	"parse": function (node, html){
		if (node.type != 'tag' || !~node.tagName.indexOf("fg-")){
			return null;
		};
		var meta = {};
		meta.type = "fg";		
		meta.isVirtual = true;
		meta.fgName = node.tagName.slice(3);
		meta.path = utils.parsePath(node);		
		meta.eid = node.attrs.id || null;
		meta.content = tplMgr.readTpl(node, html, meta);
		return meta;
	},
	"render": function(context, data, meta){
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
	"update": function(context, meta, scopePath, value){
		return;
	}
});

exports.fg = fg;
},{"fg/gapClassMgr.js":5,"fg/tplMgr.js":15,"fg/tplRender.js":16,"fg/utils":17}],10:[function(require,module,exports){
var gapClassMgr = require('fg/gapClassMgr.js');
var renderTpl = require('fg/tplRender.js').renderTpl.bind(null, gapClassMgr);
var tplMgr = require('fg/tplMgr.js');
var utils = require('fg/utils');
var StrTpl = require('fg/utils/strTpl.js');

function isScope(item){
	if (typeof item == "string"){
		return false;
	};
	return item.type == "scope";
};

var raw = gapClassMgr.regGap({
	"name": "raw",
	"parse": function (node, html, parentMeta){
		if (node.type != "tag"){
			return null;
		};
		var hasDynamicAttrs = false;
		var meta = {};
		meta.type = "raw";
		meta.isVirtual = false;
		meta.isRootNode = node.parent.type != "tag";
		meta.tagName = node.tagName;
		if ("id" in node.attrs){
			meta.eid = node.attrs.id;
			delete node.attrs.id;
		};
		var attrsArr = utils.objToKeyValue(node.attrs, 'name', 'value');
		attrsArr = attrsArr.map(function(attr){			
			var value = StrTpl.parse(attr.value.value);
			if (typeof value != "string"){
				hasDynamicAttrs = true;
			};
			return {
				"name": attr.name,
				"value": value
			};
		});		
		meta.attrs = utils.keyValueToObj(attrsArr, 'name', 'value');		
		if (node.value){
			meta.value = node.value.split('.');
		};
		meta.content = tplMgr.readTpl(node, html, meta);		
		if (meta.content.some(isScope)){
			meta.isScopeHolder = true;			
		};
		if (parentMeta && parentMeta.type == "scope"){
			meta.isScopeItem = true;
		};
		if (
				!hasDynamicAttrs 
				&& !meta.eid
				&& !meta.isRootNode 
				&& !meta.isScopeHolder 
				&& !meta.isScopeItem
				&& !meta.value
			){
			return null;
		};
		return meta;
	},
	"render": function(context, data){		
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
	"update": function(context, meta, scopePath, value){
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
});

exports.raw = raw;
},{"fg/gapClassMgr.js":5,"fg/tplMgr.js":15,"fg/tplRender.js":16,"fg/utils":17,"fg/utils/strTpl.js":18}],11:[function(require,module,exports){
var gapClassMgr = require('fg/gapClassMgr.js');
var renderTpl = require('fg/tplRender.js').renderTpl.bind(null, gapClassMgr);
var tplMgr = require('fg/tplMgr.js');
var utils = require('fg/utils');

var scopeItem = gapClassMgr.regGap({
	"name": "scope-item",
	"parse": function (node, html){
		return null;
	},
	"render": function(context, data){
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
	"update": function(context, meta, scopePath, value, oldValue){		
		return;
	}
});

exports.scopeItem = scopeItem;
},{"fg/gapClassMgr.js":5,"fg/tplMgr.js":15,"fg/tplRender.js":16,"fg/utils":17}],12:[function(require,module,exports){
var gapClassMgr = require('fg/gapClassMgr.js');
var renderTpl = require('fg/tplRender.js').renderTpl.bind(null, gapClassMgr);
var tplMgr = require('fg/tplMgr.js');
var utils = require('fg/utils');

var scope = gapClassMgr.regGap({
	"name": "scope",
	"parse": function (node, html){
		if (node.tagName != "scope"){
			return null;
		};
		var meta = {};
		meta.type = "scope";
		meta.isVirtual = true;
		meta.path = utils.parsePath(node);		
		meta.content = tplMgr.readTpl(node, html, meta);
		return meta;
	},
	"render": function(context, data){
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
	"update": function(context, meta, scopePath, value, oldValue){		
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
});

exports.scope = scope;
},{"fg/client/gapClassMgr.js":2,"fg/gapClassMgr.js":5,"fg/tplMgr.js":15,"fg/tplRender.js":16,"fg/utils":17}],13:[function(require,module,exports){
exports.allTags = ["a","abbr","acronym","address","applet","area","article","aside","audio",
	"b","base","basefont","bdi","bdo","big","blockquote","body","br","button",
	"canvas","caption","center","cite","code","col","colgroup",
	"datalist","dd","del","details","dfn","dialog","dir","div","dl","dt",
	"em","embed",
	"fieldset","figcaption","figure","font","footer","form","frame","frameset",
	"h1","h2","h3","h4","h5","h6","head","header","hr","html",
	"i","iframe","img","input","ins",
	"kbd","keygen",
	"label","legend","li","link",
	"main","map","mark","menu","menuitem","meta","meter",
	"nav","noframes","noscript","object",
	"ol","optgroup","option","output",
	"p","param","pre","progress",
	"q",
	"rp","rt","ruby",
	"s","samp","script","section","select","small","source","span","strike","strong","style","sub","summary","sup",
	"table","tbody","td","textarea","tfoot","th","thead","time","title","tr","track","tt",
	"u","ul",
	"var","video",
	"wbr"];
},{}],14:[function(require,module,exports){
function toJs(obj, opts, tabOffest){
	opts = opts || {};
	opts.tab = opts.tab || '\t';
	opts.n = opts.n || '\n';
	tabOffest = tabOffest || 0;
	var tabPrefix = '';
	for (var i = 0; i < tabOffest; i++){
		tabPrefix += opts.tab;
	};	
	if (obj === null){
		return "null";
	};
	if (~["string", "number", "boolean"].indexOf(typeof obj)){
		return JSON.stringify(obj);
	};
	if (typeof obj == "function"){
		var code = obj.toString();
		lines = code
			.split(opts.n);
		code = lines.slice(0, 1).concat(
			lines.slice(1)
				.map(strPrefix.bind(null, tabPrefix))
			)
			.join(opts.n);
		return code;
	};
	if (typeof obj == "object"){
		if (Array.isArray(obj)){
			var codeParts = obj.map(function(val){
				return tabPrefix + opts.tab + toJs(val, opts, tabOffest + 1);
			});
			return '[' + opts.n + codeParts.join(',' + opts.n) + opts.n + tabPrefix + ']';
		};
		var codeParts = [];
		for (var i in obj){
			if (obj[i] === undefined){
				continue;
			};
			codeParts.push(tabPrefix + opts.tab + '"' + i + '": ' + toJs(obj[i], opts, tabOffest + 1));
		};		
		return '{' + opts.n + codeParts.join(',' + opts.n) + opts.n + tabPrefix + '}';
	};
};
exports.toJs = toJs;

function strPrefix(prefix, str){
	return prefix + str;
};
exports.strPrefix = strPrefix;

function prefixLines(str, prefix, triggerFn){
	var lines = str.split('\n').map(function(line, id){
		if (!triggerFn || triggerFn(line, id, lines)){
			return prefix + line;
		};
		return line;
	});
	return lines.join('\n')
};
exports.prefixLines = prefixLines;

function fileExist(path){
	try{
		fs.accessSync(path);
	}catch(e){
		return false;
	};
	return true;
};
exports.fileExist = fileExist;

function forTree(treeObj, childProp, fn){
	fn(treeObj);
	if (treeObj[childProp]){
		treeObj[childProp].forEach(function(node){
			forTree(node, fn);
		});
	};
};
exports.forTree = forTree;

function getSubFolders(path){
	return fs.readdirSync(path).filter(function(subPath){
		var stat = fs.statSync(path + '/' + subPath);
		return stat.isDirectory();
	});
};
exports.getSubFolders = getSubFolders;

function treeMap(treeObj, childProp, fn){
    var res = {};
	res = fn(treeObj);
	if (treeObj[childProp]){
		treeObj[childProp].forEach(function(node, id){
			res[childProp][id] = treeMap(node, childProp, fn);
		});
	};
	return res;
};
exports.treeMap = treeMap;

},{}],15:[function(require,module,exports){
var gapClassMgr = require('fg/gapClassMgr.js');
var renderTpl = require('fg/tplRender.js').renderTpl.bind(null, gapClassMgr);
//var p5 = require('parse5');
var mj = require('micro-jade');

var allTags = require('fg/listOfTags.js').allTags;


function attrsToObj(attrs){
	var res = {};
	attrs.forEach(function(i){
		res[i.name] = i.value;
	}); 
	return res;
};


function parseGap(node, html, parentMeta){
	var tagMeta = gapClassMgr.parse(node, html, parentMeta);
	return tagMeta;
};

/*function readTpl(htmlAst, htmlCode, parentMeta){

	function iterate(children){
		children.forEach(function(node, id){
			var tagMeta = parseGap(node, htmlCode, parentMeta);
			if (!tagMeta){
				iterate(node.childNodes || []);
				return;
			};			
			var loc = node.__location;
			parts.push(htmlCode.slice(curStart, loc.startOffset));
			curStart = loc.endOffset;
			//tagMeta.parent = parentMeta;
			//tagMeta.id = id;
			parts.push(tagMeta);
		});
	};

	var curStart = 0;
	var totalEnd = htmlAst.tagName ? 0 : htmlCode.length;
	if (htmlAst.childNodes.length > 0){
		var curStart = htmlAst.childNodes[0].__location.startOffset;
		var totalEnd = htmlAst.childNodes.slice(-1)[0].__location.endOffset;
	};
	var parts = [];
	
	iterate(htmlAst.childNodes);
	parts.push(htmlCode.slice(curStart, totalEnd));
	return parts;
};*/

function readTpl(ast, code, parentMeta){

	function iterate(children){
		var parts = [];
		children.forEach(function(node, id){
			var tagMeta = parseGap(node, code, parentMeta);
			if (tagMeta){				
				parts.push(tagMeta);				
				return; 
			};	
			if (!node.children || node.children.length == 0){
				parts.push(mj.render(node));				
				return;
			};
			var wrap = mj.renderEmpty(node);
			parts.push(wrap[0]);
			parts = parts.concat(iterate(node.children));		
			if (wrap[1]){
				parts.push(wrap[1]);
			}
		});
		return parts;
	};

	return iterate(ast.children);
};

function parseTpl(html, parentMeta){
	var parsed = p5.parseFragment(html, {locationInfo: true});
	return readTpl(parsed, html, parentMeta);
};

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

function tplToJson(tpl){ //?
	var parts = tpl.map(function(part){
		if (typeof part == "string"){
			return part;
		};
		return gapClassMgr.toJson(part);
	});
	return parts;
};

exports.parseTpl = parseTpl;
exports.readTpl = readTpl;
exports.renderTpl = renderTpl;
},{"fg/gapClassMgr.js":5,"fg/listOfTags.js":13,"fg/tplRender.js":16,"micro-jade":21}],16:[function(require,module,exports){
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
},{"fg/utils":17}],17:[function(require,module,exports){
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

},{"fg/client/gapClassMgr.js":2,"fg/utils/tplUtils.js":19}],18:[function(require,module,exports){
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

},{"fg/utils":17}],19:[function(require,module,exports){
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

},{"fg/utils.js":17,"fg/utils/strTpl.js":18}],20:[function(require,module,exports){
var gapRe = /\[\!(\w+)\]/g;

function ReTpl(reTpl, parts){    
    var source = reTpl.source;
    this.map = [];
    var self = this;
    var newSource = source.replace(gapRe, function(subStr, name){
        self.map.push(name);
        return '(' + parts[name].source + ')';
    });
    var flags = reTpl.global ? 'g' : ''
        + reTpl.multiline ? 'm' : ''
        + reTpl.ignoreCase ? 'i' : '';
    this.re = new RegExp(newSource, flags);
};

ReTpl.prototype.find = function(str, offset){  
    var self = this;
    this.re.lastIndex = offset || 0;
    var res = this.re.exec(str);
    if (!res){
        return null;  
    };
    var resObj = {
        full: res[0],
        parts: {}
    };
    res.slice(1).forEach(function(part, id){
        var key = self.map[id];
        resObj.parts[key] = part || null;
    });
    return resObj;
};

ReTpl.prototype.findAll = function(str, offset){  
    var res = [];
    this.re.lastIndex = offset || 0;
    while (true){
        var found = this.find(str, this.re.lastIndex);
        if (!found){
            return res;
        };
        res.push(found);
    };
    return res; // never go there
};

module.exports = ReTpl;
},{}],21:[function(require,module,exports){
exports.parse = require('./parser.js').parse;
exports.render = require('./render.js').render;
exports.renderEmpty = require('./render.js').renderEmpty;
},{"./parser.js":23,"./render.js":24}],22:[function(require,module,exports){
function parseTabTree(code, opts){    

    function Node(parent, code){
        this.parent = parent;
        if (parent){
            parent.children.push(this);
        };
        this.code = code;
        this.children = [];
    };

    opts = opts || {
        tabLen: 4
    };

    var tabStr = '';
    var i = opts.tabLen;
    while (i--){
        tabStr += ' ';
    }

    var ast = new Node(null, null);
    var stack = [{
        node: ast,
        offset: -1
    }];
    var lines = code.split('\n');

    lines.forEach(function(line, num){
        var tab = /^[\ \t]*/.exec(line)[0];        
        var offset = tab.replace(/\t/g, tabStr).length;
        stack = stack.filter(function(parent){
           return offset > parent.offset; 
        });
        var parent = stack.slice(-1)[0];
        var node = new Node(parent.node, line.slice(tab.length));
        node.num = num;
        node.offset = offset;
        stack.push({
            node: node,
            offset: offset
        });
    });

    return ast;
};

module.exports = parseTabTree;
},{}],23:[function(require,module,exports){
var ReTpl = require('./ReTpl.js');
var parseTabTree = require('./parseTabTree.js');

var gapRe = /\[\!(\w+)\]/g;

function makeRe(dict, re){
	var source = re.source;
	var newSource = source.replace(gapRe, function(subStr, name){
		return dict[name].source;
	});
	return new RegExp(newSource, re.flags);  
};

// find single/double quoted Strings [http://stackoverflow.com/questions/249791/regex-for-quoted-string-with-escaping-quotes]
var qutedStrRe = /"(?:[^"\\]*(?:\\.[^"\\]*)*)"|\'(?:[^\'\\]*(?:\\.[^\'\\]*)*)\'/; 
var idfRe = /[a-zA-Z0-9_\-]+/;
var attrRe = makeRe({
		idf: idfRe,
		dqs: qutedStrRe
}, /[!idf]\=?(?:[!idf]|[!dqs])?/);

var prep = makeRe.bind(null, {
	idf: idfRe,
	attr: attrRe
});

var tabRe = /\s*/;

var classIdPartRe = prep(/[\.\#]{1}[!idf]/g);
var classIdRe = makeRe({part: classIdPartRe}, /(?:[!part])*/g);

var tagLine = new ReTpl(
/^[!tag]?[!classId][!attrs]?[!text]?[!multiline]?[!value]?$/g, {
	tab: tabRe,
	tag: prep(/[!idf]/),
	classId: classIdRe,
	attrs: prep(/\((?:[!attr]\s*\,?\s*)*\)/),
	value: /\=[^\n]*/,
	text: /\ [^\n]*/,
	multiline: /\.[\ \t]*/,
	value: /\=[^\n]*/
});

var textLine = new ReTpl(/^\|[!text]$/, {
	text: /[^\n]*/
});

var commentLine = new ReTpl(/^\/\/\-?[!text]$/, {
	text: /[^\n]*/
});

function collapseToStr(ast){
	var lines = [ast.code].concat(ast.children.map(collapseToStr));
	return lines.join('\n');
};

function parseClassId(str){
	var res = {
		classes: [],
		id: null
	};
	var parts = str.match(classIdPartRe).forEach(function(part){
		if (part[0] == "#"){
			res.id = part.slice(1);
			return;
		};
		res.classes.push(part.slice(1));
	});
	return res;
};

var attrPairRe = new ReTpl(/(?:[!name]\=?(?:[!key]|[!strValue])?)\,?\s*/g, {
		name: idfRe,
		key: idfRe,
		strValue: qutedStrRe
})

function parseAttrs(str){
		var attrObj = {};
		if (!str){
				return attrObj;
		};
		str = str.slice(1, -1);
		var pairs = attrPairRe.findAll(str);
		pairs.forEach(function(pair){
			var name = pair.parts.name;
			var value;
				if (pair.parts.key){
					value = {
					type: "varible",
					key: pair.parts.key
				};
			}else{
				value = {
					type: "string",
					value: pair.parts.strValue.slice(1, -1)
				};
			}
			attrObj[name] = value; 
			});
		return attrObj;
};

var tokens = {
	tag: {
		rule: tagLine,
		tranform: function(found, ast, parent){            
			var node = {
				type: 'tag',
				tagName: found.parts.tag || 'div',
				attrs: {},
				parent: parent
			};
			var classes = [];
			var classId = found.parts.classId;
			if (classId){
				var parsed = parseClassId(classId);
				if (parsed.id){
					node.attrs.id = parsed.id
				};
				classes = classes.concat(parsed.classes);
			};
			var attrs = parseAttrs(found.parts.attrs);
			var classAttr = attrs["class"];
			if (classAttr){
				if (attrs["class"].type == "string"){
					classes = classes.concat(attrs["class"].value.split(' '));
				};
			}else{
				if (classes.length > 0){
					attrs["class"] = {
						type: "string",
						value: classes.join(' ')
					};
				};	
			};            
			node.attrs = attrs;
			var text;
			if (found.parts.value){
				node.value = found.parts.value.replace(/^\s*\=\s*/g, '');
				node.children = [];
				return node;
			};
			if (found.parts.multiline){
				node.children = [{
					type: 'text',
					text: ast.children.map(collapseToStr).join('\n')
				}];
				return node;                  
			};
			if (found.parts.text){
				node.children = [{
					type: 'text',
					text: found.parts.text
				}];
				return node;   
			};
			node.children = ast.children.map(transformAst.bind(null, node));
			return node;
		}
	},
	text: {
		rule: textLine,
		tranform: function(found, ast, parent){
			return {
				type: 'text',
				text: found.parts.text,
				parent: parent
			}
		}

	},
	comment: {
		rule: commentLine,
		tranform: function(found, ast, parent){
			return {
				type: 'comment',
				text: found.parts.text,
				parent: parent
			}
		}
	}
};

function transformAst(parent, ast){
		var found;
		var token;
		for (var name in tokens){
			token = tokens[name];
			found = token.rule.find(ast.code);
			if (found){
					break;
			}        
		};
		if (!found){
				throw 'token not found';
		};
		return token.tranform(found, ast, parent);
		
};

function parse(code){
	var ast = {
		type: "root"
	};
	var tabAst = parseTabTree(code);
	ast.children = tabAst.children.map(transformAst.bind(null, ast));  
	return ast;  

};



exports.parse = parse;
},{"./ReTpl.js":20,"./parseTabTree.js":22}],24:[function(require,module,exports){
var StrTpl = require('fg/utils/strTpl.js');
var utils = require('fg/utils.js');

var selfClosingTags = ["area", "base", "br", "col", 
	"command", "embed", "hr", "img", 
	"input", "keygen", "link", 
	"meta", "param", "source", "track", 
	"wbr"];

function renderTagWrapper(tagInfo){
	var attrs = tagInfo.attrs;	
	var pairs = [];
	for (var name in attrs){
		var value = attrs[name].value;
		pairs.push(name + '="' + value + '"');
	};
	var attrCode = '';
	if (pairs.length > 0){
		attrCode = ' ' + pairs.join('');
	};
	var tagHead = tagInfo.name + attrCode;
	if (~selfClosingTags.indexOf(tagInfo.name)){
		return ["<" + tagHead + " />"];
	};
	var openTag = "<" + tagHead + ">";
	var closeTag = "</" + tagInfo.name + ">";
	return [openTag, closeTag];
};
exports.renderTagWrapper = renderTagWrapper;	

function renderTag(tagInfo){
	var wrap = renderTagWrapper(tagInfo);
	var code = wrap.join(tagInfo.innerHTML || "");
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


function render(ast){
	if (ast.type == "comment"){
		return "";
	};
	if (ast.type == "text"){
		return ast.text;
	};
	if (ast.type == "root"){
		return ast.children.map(render).join('');
	};
	if (ast.type != "tag"){
		return "";
	};
	var inner = ast.children.map(render).join('');
	return renderTag({
		name: ast.tagName,
		attrs: ast.attrs,
		innerHTML: inner
	});
};
exports.render = render;

function renderEmpty(ast){
	if (ast.type != "tag"){
		return [];
	};
	return renderTagWrapper({
		name: ast.tagName,
		attrs: ast.attrs
	});
};
exports.renderEmpty = renderEmpty;
},{"fg/utils.js":17,"fg/utils/strTpl.js":18}]},{},[1]);
