var jadeEditor = CodeMirror.fromTextArea(document.querySelector('#jade-src'), {
    lineNumbers: true,
    theme: 'default',
    mode: 'jade'
  });

 var dataEditor = CodeMirror.fromTextArea(document.querySelector('#data-src'), {
    lineNumbers: true,
    theme: 'default',
    mode: 'javascript'
  });

var je = CodeMirror.fromTextArea(document.querySelector('#jade-exmp'), {
	lineNumbers: true,
	theme: 'default',
	mode: 'jade'
});
je.setValue("div.product\n\th4=title\n\tp=description\n\th3 available colors:\n\ttable\n\t\ttbody\n\t\t\teach variant in variants\n\t\t\t\ttr\n\t\t\t\t\ttd=variant.color\n\t\t\t\t\ttd=variant.price");

var de = CodeMirror.fromTextArea(document.querySelector('#json-exmp'), {
	lineNumbers: true,
	theme: 'default',
	mode: 'javascript'
});
de.setValue("{\n\t\"color\": \"red\",\n\t\"title\": \"Awesome T-Shirt\",\n\t\"description\": \"it's the most awesome t-short!\",\n\t\"variants\": [\n\t\t{\n\t\t\t\"color\": \"red\",\n\t\t\t\"price\": 7200\n\t\t},\n\t\t{\n\t\t\t\"color\": \"green\",\n\t\t\t\"price\": 12090\n\t\t}\n\t]\n}");
 var examples = [
 	{
 		name: "T-Shirt",
 		jade: "div.product\n\th4=title\n    p=description\n    h5 available colors:\n    table\n    \ttbody\n          scope.variants\n              tr\n                  td(style=\"background: %color%\")=color\n                  td=price",
 		data: '{\n  \t\"color\": \"red\",\n\t\"title\": \"Awesome T-Shirt\",\n    \"description\": \"it\'s the most awesome t-short!\",\n    \"variants\": [\n      {\n      \t\"color\": \"red\",\n        \"price\": 7200\n      },\n      {\n      \t\"color\": \"green\",\n        \"price\": 12090\n      }\n    ]\n}'
 	},
 	{
 		name: "Table",
 		jade: "table\n\ttbody\n    \tscope.items\n        \ttr\n            \tscope\n                \ttd\n                    \tdata",
 		data: '{\n  \t\"items\": [\n    \t[1, 2, 3, 4],\n      \t[10, 20, 30, 40],\n      \t[100, 200, 300, 400]\n    ]\n}'
 	}
];

jadeEditor.setValue(examples[0].jade);
dataEditor.setValue(examples[0].data);

document.querySelector('#apply').onclick = function(e){
	var jade = jadeEditor.getValue();
	fg.readFg('boo', {tpl: jade});
	eval(fg.genClientMeta());
	window.q = $fg.classes.boo.renderIn(result, JSON.parse(dataEditor.getValue()));
	return false;
};

var okImg = document.querySelector('#state svg.ok');
var errImg = document.querySelector('#state svg.err');

dataEditor.on('change', function(){		
	var data;
	var jsonCode = dataEditor.getValue(); 
	try {
		data = JSON.parse(jsonCode);
	}catch(e){
		okImg.style.display = 'none';
		errImg.style.display = 'inline';
		return;
	};
	okImg.style.display = 'inline';
	errImg.style.display = 'none';
	if (!window.q){
		return;
	};
	var start = performance.now();
	window.lastData = data;
	q.update([], data);
	console.log(performance.now() - start);
});

exmpSelect.innerHTML = examples.map(function(i){
	return '<option>' + i.name + '</option>';
});
exmpSelect.onchange = function(){
	jadeEditor.setValue(examples[exmpSelect.selectedIndex].jade);
	dataEditor.setValue(examples[exmpSelect.selectedIndex].data);
};