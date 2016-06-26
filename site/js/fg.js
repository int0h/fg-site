(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function anonymous(fgClass,fgProto
/**/) {
/*fgClass.on('click', function(){

});*/
}
},{}],2:[function(require,module,exports){
module.exports = [
	{
		"type": "raw",
		"isVirtual": false,
		"isRootNode": true,
		"tagName": "a",
		"eid": "btn",
		"attrs": {
			"class": "btn"
		},
		"content": [
			{
				"type": "content",
				"isVirtual": true
			}
		]
	}
]
},{}],3:[function(require,module,exports){
var fgs = [];

fgs.push({
	"name": "button",
	"tpl": require("./button/tpl.js"),
	"classFn": require("./button/class.js")
});
fgs.push({
	"name": "main",
	"tpl": require("./main/tpl.js"),
	"classFn": require("./main/class.js")
});
fgs.push({
	"name": "tag",
	"tpl": require("./tag/tpl.js"),
	"classFn": null
});
fgs.push({
	"name": "test",
	"tpl": require("./test/tpl.js"),
	"classFn": null
});
fgs.push({
	"name": "testInner",
	"tpl": require("./testInner/tpl.js"),
	"classFn": require("./testInner/class.js")
});

$fg.load(fgs);
},{"./button/class.js":1,"./button/tpl.js":2,"./main/class.js":4,"./main/tpl.js":5,"./tag/tpl.js":6,"./test/tpl.js":9,"./testInner/class.js":7,"./testInner/tpl.js":8}],4:[function(require,module,exports){
module.exports = function anonymous(fgClass,fgProto
/**/) {
fgClass.on('ready', function(){
	var self = this;
	console.log('ready');
	self.data = {
		"todo": []
	};
	this.sub('helloBtn').on('click', function(){
		var data = self.cloneData();
		data.todo.push({
			"name": "nodda",
			"description": "asdsa",
			"tags": [Math.round((Math.pow(2, Math.random()*32))).toString(2), Math.round((Math.pow(2, Math.random()*32))).toString(2)]
		});
		self.update([], data);
	})
});
}
},{}],5:[function(require,module,exports){
module.exports = [
	{
		"type": "raw",
		"isVirtual": false,
		"isRootNode": true,
		"tagName": "h1",
		"attrs": {

		},
		"content": [
			" Hello! That's test app"
		]
	},
	"",
	{
		"type": "raw",
		"isVirtual": false,
		"isRootNode": true,
		"tagName": "h3",
		"attrs": {

		},
		"content": [
			" list of things to do:"
		]
	},
	{
		"type": "raw",
		"isVirtual": false,
		"isRootNode": true,
		"tagName": "div",
		"attrs": {
			"class": "col2"
		},
		"content": [
			"<table class=\"table\">",
			"<thead>",
			"<tr>",
			"<th>",
			" Name",
			"</th>",
			"<th>",
			" Tags",
			"</th>",
			"</tr>",
			"</thead>",
			{
				"type": "raw",
				"isVirtual": false,
				"isRootNode": false,
				"tagName": "tbody",
				"attrs": {

				},
				"content": [
					{
						"type": "scope",
						"isVirtual": true,
						"path": [
							"todo"
						],
						"content": [
							{
								"type": "raw",
								"isVirtual": false,
								"isRootNode": false,
								"tagName": "tr",
								"attrs": {

								},
								"content": [
									{
										"type": "raw",
										"isVirtual": false,
										"isRootNode": false,
										"tagName": "td",
										"attrs": {

										},
										"value": [
											"name"
										],
										"content": [

										]
									},
									"<td>",
									{
										"type": "raw",
										"isVirtual": false,
										"isRootNode": false,
										"tagName": "div",
										"attrs": {
											"class": "tag-box"
										},
										"content": [
											{
												"type": "scope",
												"isVirtual": true,
												"path": [
													"tags"
												],
												"content": [
													{
														"type": "fg",
														"isVirtual": true,
														"fgName": "tag",
														"path": [

														],
														"eid": null,
														"content": [
															{
																"type": "data",
																"isVirtual": false,
																"path": [

																],
																"eid": null
															}
														]
													}
												],
												"eid": null
											},
											""
										],
										"isScopeHolder": true
									},
									"</td>"
								],
								"isScopeItem": true
							},
							""
						],
						"eid": {
							"type": "string",
							"value": "row"
						}
					}
				],
				"isScopeHolder": true
			},
			"</table>"
		]
	},
	{
		"type": "fg",
		"isVirtual": true,
		"fgName": "button",
		"path": [

		],
		"eid": {
			"type": "string",
			"value": "helloBtn"
		},
		"content": [
			" hello!"
		]
	},
	{
		"type": "fg",
		"isVirtual": true,
		"fgName": "tag",
		"path": [

		],
		"eid": null,
		"content": [
			" I'm tag"
		]
	}
]
},{}],6:[function(require,module,exports){
module.exports = [
	{
		"type": "raw",
		"isVirtual": false,
		"isRootNode": true,
		"tagName": "div",
		"attrs": {
			"class": "tag-wrapper"
		},
		"content": [
			"<div class=\"tag-body\">",
			{
				"type": "content",
				"isVirtual": true
			},
			"</div>",
			"<div class=\"tag-tail\"></div>"
		]
	},
	""
]
},{}],7:[function(require,module,exports){
module.exports = function anonymous(fgClass,fgProto
/**/) {
fgClass.on('click', 'button', function(){
	console.log(this);
	this.update(['value'], this.gap('saf').getDom()[0].value)
});
}
},{}],8:[function(require,module,exports){
module.exports = [
	{
		"type": "raw",
		"isVirtual": false,
		"isRootNode": true,
		"tagName": "input",
		"eid": "saf",
		"attrs": {
			"value": [
				"",
				{
					"path": [
						"value"
					]
				},
				""
			]
		},
		"content": [

		]
	},
	{
		"type": "raw",
		"isVirtual": false,
		"isRootNode": true,
		"tagName": "button",
		"attrs": {

		},
		"content": [
			" ok"
		]
	},
	" val = ",
	{
		"type": "data",
		"isVirtual": false,
		"path": [
			"value"
		],
		"eid": null
	},
	""
]
},{}],9:[function(require,module,exports){
module.exports = [
	" data: ",
	{
		"type": "data",
		"isVirtual": false,
		"path": [
			"sub",
			"value"
		],
		"eid": null
	},
	{
		"type": "raw",
		"isVirtual": false,
		"isRootNode": true,
		"tagName": "br",
		"attrs": {

		},
		"content": [

		]
	},
	{
		"type": "fg",
		"isVirtual": true,
		"fgName": "testInner",
		"path": [
			"sub"
		],
		"eid": null,
		"content": [

		]
	},
	""
]
},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmctanMvdGVtcC9idXR0b24vY2xhc3MuanMiLCJub2RlX21vZHVsZXMvZmctanMvdGVtcC9idXR0b24vdHBsLmpzIiwibm9kZV9tb2R1bGVzL2ZnLWpzL3RlbXAvaW5jbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9mZy1qcy90ZW1wL21haW4vY2xhc3MuanMiLCJub2RlX21vZHVsZXMvZmctanMvdGVtcC9tYWluL3RwbC5qcyIsIm5vZGVfbW9kdWxlcy9mZy1qcy90ZW1wL3RhZy90cGwuanMiLCJub2RlX21vZHVsZXMvZmctanMvdGVtcC90ZXN0SW5uZXIvY2xhc3MuanMiLCJub2RlX21vZHVsZXMvZmctanMvdGVtcC90ZXN0SW5uZXIvdHBsLmpzIiwibm9kZV9tb2R1bGVzL2ZnLWpzL3RlbXAvdGVzdC90cGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBhbm9ueW1vdXMoZmdDbGFzcyxmZ1Byb3RvXG4vKiovKSB7XG4vKmZnQ2xhc3Mub24oJ2NsaWNrJywgZnVuY3Rpb24oKXtcclxuXHJcbn0pOyovXG59IiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcInR5cGVcIjogXCJyYXdcIixcblx0XHRcImlzVmlydHVhbFwiOiBmYWxzZSxcblx0XHRcImlzUm9vdE5vZGVcIjogdHJ1ZSxcblx0XHRcInRhZ05hbWVcIjogXCJhXCIsXG5cdFx0XCJlaWRcIjogXCJidG5cIixcblx0XHRcImF0dHJzXCI6IHtcblx0XHRcdFwiY2xhc3NcIjogXCJidG5cIlxuXHRcdH0sXG5cdFx0XCJjb250ZW50XCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJ0eXBlXCI6IFwiY29udGVudFwiLFxuXHRcdFx0XHRcImlzVmlydHVhbFwiOiB0cnVlXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dIiwidmFyIGZncyA9IFtdO1xuXG5mZ3MucHVzaCh7XG5cdFwibmFtZVwiOiBcImJ1dHRvblwiLFxuXHRcInRwbFwiOiByZXF1aXJlKFwiLi9idXR0b24vdHBsLmpzXCIpLFxuXHRcImNsYXNzRm5cIjogcmVxdWlyZShcIi4vYnV0dG9uL2NsYXNzLmpzXCIpXG59KTtcbmZncy5wdXNoKHtcblx0XCJuYW1lXCI6IFwibWFpblwiLFxuXHRcInRwbFwiOiByZXF1aXJlKFwiLi9tYWluL3RwbC5qc1wiKSxcblx0XCJjbGFzc0ZuXCI6IHJlcXVpcmUoXCIuL21haW4vY2xhc3MuanNcIilcbn0pO1xuZmdzLnB1c2goe1xuXHRcIm5hbWVcIjogXCJ0YWdcIixcblx0XCJ0cGxcIjogcmVxdWlyZShcIi4vdGFnL3RwbC5qc1wiKSxcblx0XCJjbGFzc0ZuXCI6IG51bGxcbn0pO1xuZmdzLnB1c2goe1xuXHRcIm5hbWVcIjogXCJ0ZXN0XCIsXG5cdFwidHBsXCI6IHJlcXVpcmUoXCIuL3Rlc3QvdHBsLmpzXCIpLFxuXHRcImNsYXNzRm5cIjogbnVsbFxufSk7XG5mZ3MucHVzaCh7XG5cdFwibmFtZVwiOiBcInRlc3RJbm5lclwiLFxuXHRcInRwbFwiOiByZXF1aXJlKFwiLi90ZXN0SW5uZXIvdHBsLmpzXCIpLFxuXHRcImNsYXNzRm5cIjogcmVxdWlyZShcIi4vdGVzdElubmVyL2NsYXNzLmpzXCIpXG59KTtcblxuJGZnLmxvYWQoZmdzKTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGFub255bW91cyhmZ0NsYXNzLGZnUHJvdG9cbi8qKi8pIHtcbmZnQ2xhc3Mub24oJ3JlYWR5JywgZnVuY3Rpb24oKXtcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0Y29uc29sZS5sb2coJ3JlYWR5Jyk7XHJcblx0c2VsZi5kYXRhID0ge1xyXG5cdFx0XCJ0b2RvXCI6IFtdXHJcblx0fTtcclxuXHR0aGlzLnN1YignaGVsbG9CdG4nKS5vbignY2xpY2snLCBmdW5jdGlvbigpe1xyXG5cdFx0dmFyIGRhdGEgPSBzZWxmLmNsb25lRGF0YSgpO1xyXG5cdFx0ZGF0YS50b2RvLnB1c2goe1xyXG5cdFx0XHRcIm5hbWVcIjogXCJub2RkYVwiLFxyXG5cdFx0XHRcImRlc2NyaXB0aW9uXCI6IFwiYXNkc2FcIixcclxuXHRcdFx0XCJ0YWdzXCI6IFtNYXRoLnJvdW5kKChNYXRoLnBvdygyLCBNYXRoLnJhbmRvbSgpKjMyKSkpLnRvU3RyaW5nKDIpLCBNYXRoLnJvdW5kKChNYXRoLnBvdygyLCBNYXRoLnJhbmRvbSgpKjMyKSkpLnRvU3RyaW5nKDIpXVxyXG5cdFx0fSk7XHJcblx0XHRzZWxmLnVwZGF0ZShbXSwgZGF0YSk7XHJcblx0fSlcclxufSk7XG59IiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcInR5cGVcIjogXCJyYXdcIixcblx0XHRcImlzVmlydHVhbFwiOiBmYWxzZSxcblx0XHRcImlzUm9vdE5vZGVcIjogdHJ1ZSxcblx0XHRcInRhZ05hbWVcIjogXCJoMVwiLFxuXHRcdFwiYXR0cnNcIjoge1xuXG5cdFx0fSxcblx0XHRcImNvbnRlbnRcIjogW1xuXHRcdFx0XCIgSGVsbG8hIFRoYXQncyB0ZXN0IGFwcFwiXG5cdFx0XVxuXHR9LFxuXHRcIlwiLFxuXHR7XG5cdFx0XCJ0eXBlXCI6IFwicmF3XCIsXG5cdFx0XCJpc1ZpcnR1YWxcIjogZmFsc2UsXG5cdFx0XCJpc1Jvb3ROb2RlXCI6IHRydWUsXG5cdFx0XCJ0YWdOYW1lXCI6IFwiaDNcIixcblx0XHRcImF0dHJzXCI6IHtcblxuXHRcdH0sXG5cdFx0XCJjb250ZW50XCI6IFtcblx0XHRcdFwiIGxpc3Qgb2YgdGhpbmdzIHRvIGRvOlwiXG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ0eXBlXCI6IFwicmF3XCIsXG5cdFx0XCJpc1ZpcnR1YWxcIjogZmFsc2UsXG5cdFx0XCJpc1Jvb3ROb2RlXCI6IHRydWUsXG5cdFx0XCJ0YWdOYW1lXCI6IFwiZGl2XCIsXG5cdFx0XCJhdHRyc1wiOiB7XG5cdFx0XHRcImNsYXNzXCI6IFwiY29sMlwiXG5cdFx0fSxcblx0XHRcImNvbnRlbnRcIjogW1xuXHRcdFx0XCI8dGFibGUgY2xhc3M9XFxcInRhYmxlXFxcIj5cIixcblx0XHRcdFwiPHRoZWFkPlwiLFxuXHRcdFx0XCI8dHI+XCIsXG5cdFx0XHRcIjx0aD5cIixcblx0XHRcdFwiIE5hbWVcIixcblx0XHRcdFwiPC90aD5cIixcblx0XHRcdFwiPHRoPlwiLFxuXHRcdFx0XCIgVGFnc1wiLFxuXHRcdFx0XCI8L3RoPlwiLFxuXHRcdFx0XCI8L3RyPlwiLFxuXHRcdFx0XCI8L3RoZWFkPlwiLFxuXHRcdFx0e1xuXHRcdFx0XHRcInR5cGVcIjogXCJyYXdcIixcblx0XHRcdFx0XCJpc1ZpcnR1YWxcIjogZmFsc2UsXG5cdFx0XHRcdFwiaXNSb290Tm9kZVwiOiBmYWxzZSxcblx0XHRcdFx0XCJ0YWdOYW1lXCI6IFwidGJvZHlcIixcblx0XHRcdFx0XCJhdHRyc1wiOiB7XG5cblx0XHRcdFx0fSxcblx0XHRcdFx0XCJjb250ZW50XCI6IFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcInR5cGVcIjogXCJzY29wZVwiLFxuXHRcdFx0XHRcdFx0XCJpc1ZpcnR1YWxcIjogdHJ1ZSxcblx0XHRcdFx0XHRcdFwicGF0aFwiOiBbXG5cdFx0XHRcdFx0XHRcdFwidG9kb1wiXG5cdFx0XHRcdFx0XHRdLFxuXHRcdFx0XHRcdFx0XCJjb250ZW50XCI6IFtcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFwidHlwZVwiOiBcInJhd1wiLFxuXHRcdFx0XHRcdFx0XHRcdFwiaXNWaXJ0dWFsXCI6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRcdFwiaXNSb290Tm9kZVwiOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0XHRcInRhZ05hbWVcIjogXCJ0clwiLFxuXHRcdFx0XHRcdFx0XHRcdFwiYXR0cnNcIjoge1xuXG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcImNvbnRlbnRcIjogW1xuXHRcdFx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcInR5cGVcIjogXCJyYXdcIixcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJpc1ZpcnR1YWxcIjogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwiaXNSb290Tm9kZVwiOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJ0YWdOYW1lXCI6IFwidGRcIixcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJhdHRyc1wiOiB7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJ2YWx1ZVwiOiBbXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XCJuYW1lXCJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJjb250ZW50XCI6IFtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRdXG5cdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XCI8dGQ+XCIsXG5cdFx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwidHlwZVwiOiBcInJhd1wiLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcImlzVmlydHVhbFwiOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJpc1Jvb3ROb2RlXCI6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcInRhZ05hbWVcIjogXCJkaXZcIixcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJhdHRyc1wiOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XCJjbGFzc1wiOiBcInRhZy1ib3hcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcImNvbnRlbnRcIjogW1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFwidHlwZVwiOiBcInNjb3BlXCIsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcImlzVmlydHVhbFwiOiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XCJwYXRoXCI6IFtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XCJ0YWdzXCJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdF0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcImNvbnRlbnRcIjogW1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XCJ0eXBlXCI6IFwiZmdcIixcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcImlzVmlydHVhbFwiOiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFwiZmdOYW1lXCI6IFwidGFnXCIsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XCJwYXRoXCI6IFtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdF0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XCJlaWRcIjogbnVsbCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcImNvbnRlbnRcIjogW1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcInR5cGVcIjogXCJkYXRhXCIsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFwiaXNWaXJ0dWFsXCI6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcInBhdGhcIjogW1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdF0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFwiZWlkXCI6IG51bGxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRdXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdF0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcImVpZFwiOiBudWxsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcIlwiXG5cdFx0XHRcdFx0XHRcdFx0XHRcdF0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwiaXNTY29wZUhvbGRlclwiOiB0cnVlXG5cdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XCI8L3RkPlwiXG5cdFx0XHRcdFx0XHRcdFx0XSxcblx0XHRcdFx0XHRcdFx0XHRcImlzU2NvcGVJdGVtXCI6IHRydWVcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XCJcIlxuXHRcdFx0XHRcdFx0XSxcblx0XHRcdFx0XHRcdFwiZWlkXCI6IHtcblx0XHRcdFx0XHRcdFx0XCJ0eXBlXCI6IFwic3RyaW5nXCIsXG5cdFx0XHRcdFx0XHRcdFwidmFsdWVcIjogXCJyb3dcIlxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XSxcblx0XHRcdFx0XCJpc1Njb3BlSG9sZGVyXCI6IHRydWVcblx0XHRcdH0sXG5cdFx0XHRcIjwvdGFibGU+XCJcblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcInR5cGVcIjogXCJmZ1wiLFxuXHRcdFwiaXNWaXJ0dWFsXCI6IHRydWUsXG5cdFx0XCJmZ05hbWVcIjogXCJidXR0b25cIixcblx0XHRcInBhdGhcIjogW1xuXG5cdFx0XSxcblx0XHRcImVpZFwiOiB7XG5cdFx0XHRcInR5cGVcIjogXCJzdHJpbmdcIixcblx0XHRcdFwidmFsdWVcIjogXCJoZWxsb0J0blwiXG5cdFx0fSxcblx0XHRcImNvbnRlbnRcIjogW1xuXHRcdFx0XCIgaGVsbG8hXCJcblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcInR5cGVcIjogXCJmZ1wiLFxuXHRcdFwiaXNWaXJ0dWFsXCI6IHRydWUsXG5cdFx0XCJmZ05hbWVcIjogXCJ0YWdcIixcblx0XHRcInBhdGhcIjogW1xuXG5cdFx0XSxcblx0XHRcImVpZFwiOiBudWxsLFxuXHRcdFwiY29udGVudFwiOiBbXG5cdFx0XHRcIiBJJ20gdGFnXCJcblx0XHRdXG5cdH1cbl0iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwidHlwZVwiOiBcInJhd1wiLFxuXHRcdFwiaXNWaXJ0dWFsXCI6IGZhbHNlLFxuXHRcdFwiaXNSb290Tm9kZVwiOiB0cnVlLFxuXHRcdFwidGFnTmFtZVwiOiBcImRpdlwiLFxuXHRcdFwiYXR0cnNcIjoge1xuXHRcdFx0XCJjbGFzc1wiOiBcInRhZy13cmFwcGVyXCJcblx0XHR9LFxuXHRcdFwiY29udGVudFwiOiBbXG5cdFx0XHRcIjxkaXYgY2xhc3M9XFxcInRhZy1ib2R5XFxcIj5cIixcblx0XHRcdHtcblx0XHRcdFx0XCJ0eXBlXCI6IFwiY29udGVudFwiLFxuXHRcdFx0XHRcImlzVmlydHVhbFwiOiB0cnVlXG5cdFx0XHR9LFxuXHRcdFx0XCI8L2Rpdj5cIixcblx0XHRcdFwiPGRpdiBjbGFzcz1cXFwidGFnLXRhaWxcXFwiPjwvZGl2PlwiXG5cdFx0XVxuXHR9LFxuXHRcIlwiXG5dIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBhbm9ueW1vdXMoZmdDbGFzcyxmZ1Byb3RvXG4vKiovKSB7XG5mZ0NsYXNzLm9uKCdjbGljaycsICdidXR0b24nLCBmdW5jdGlvbigpe1xyXG5cdGNvbnNvbGUubG9nKHRoaXMpO1xyXG5cdHRoaXMudXBkYXRlKFsndmFsdWUnXSwgdGhpcy5nYXAoJ3NhZicpLmdldERvbSgpWzBdLnZhbHVlKVxyXG59KTtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwidHlwZVwiOiBcInJhd1wiLFxuXHRcdFwiaXNWaXJ0dWFsXCI6IGZhbHNlLFxuXHRcdFwiaXNSb290Tm9kZVwiOiB0cnVlLFxuXHRcdFwidGFnTmFtZVwiOiBcImlucHV0XCIsXG5cdFx0XCJlaWRcIjogXCJzYWZcIixcblx0XHRcImF0dHJzXCI6IHtcblx0XHRcdFwidmFsdWVcIjogW1xuXHRcdFx0XHRcIlwiLFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0XCJwYXRoXCI6IFtcblx0XHRcdFx0XHRcdFwidmFsdWVcIlxuXHRcdFx0XHRcdF1cblx0XHRcdFx0fSxcblx0XHRcdFx0XCJcIlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0XCJjb250ZW50XCI6IFtcblxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwidHlwZVwiOiBcInJhd1wiLFxuXHRcdFwiaXNWaXJ0dWFsXCI6IGZhbHNlLFxuXHRcdFwiaXNSb290Tm9kZVwiOiB0cnVlLFxuXHRcdFwidGFnTmFtZVwiOiBcImJ1dHRvblwiLFxuXHRcdFwiYXR0cnNcIjoge1xuXG5cdFx0fSxcblx0XHRcImNvbnRlbnRcIjogW1xuXHRcdFx0XCIgb2tcIlxuXHRcdF1cblx0fSxcblx0XCIgdmFsID0gXCIsXG5cdHtcblx0XHRcInR5cGVcIjogXCJkYXRhXCIsXG5cdFx0XCJpc1ZpcnR1YWxcIjogZmFsc2UsXG5cdFx0XCJwYXRoXCI6IFtcblx0XHRcdFwidmFsdWVcIlxuXHRcdF0sXG5cdFx0XCJlaWRcIjogbnVsbFxuXHR9LFxuXHRcIlwiXG5dIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdFwiIGRhdGE6IFwiLFxuXHR7XG5cdFx0XCJ0eXBlXCI6IFwiZGF0YVwiLFxuXHRcdFwiaXNWaXJ0dWFsXCI6IGZhbHNlLFxuXHRcdFwicGF0aFwiOiBbXG5cdFx0XHRcInN1YlwiLFxuXHRcdFx0XCJ2YWx1ZVwiXG5cdFx0XSxcblx0XHRcImVpZFwiOiBudWxsXG5cdH0sXG5cdHtcblx0XHRcInR5cGVcIjogXCJyYXdcIixcblx0XHRcImlzVmlydHVhbFwiOiBmYWxzZSxcblx0XHRcImlzUm9vdE5vZGVcIjogdHJ1ZSxcblx0XHRcInRhZ05hbWVcIjogXCJiclwiLFxuXHRcdFwiYXR0cnNcIjoge1xuXG5cdFx0fSxcblx0XHRcImNvbnRlbnRcIjogW1xuXG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ0eXBlXCI6IFwiZmdcIixcblx0XHRcImlzVmlydHVhbFwiOiB0cnVlLFxuXHRcdFwiZmdOYW1lXCI6IFwidGVzdElubmVyXCIsXG5cdFx0XCJwYXRoXCI6IFtcblx0XHRcdFwic3ViXCJcblx0XHRdLFxuXHRcdFwiZWlkXCI6IG51bGwsXG5cdFx0XCJjb250ZW50XCI6IFtcblxuXHRcdF1cblx0fSxcblx0XCJcIlxuXSJdfQ==
