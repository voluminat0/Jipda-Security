function JSQL(seed){ 
	//Index x represents edge with label 'x' in the NFA 
	this._map = [];
	//Check braces
	this.depth = 0;
	//Contains the NFA with its graph triples
	this.nfa = [];
	//temporal fix
	this.uid = seed || 0;
}

/**
 * -----------------------
 * USER DEFINED PREDICATES
 * -----------------------
 */

JSQL.prototype.writeToFrozenObjectPrototype = function(obj){
	var obj = obj || {};
	var states = [];
	var frozenObjects = ['Array', 'Boolean', 'Date', 'Function', 'Document', 'Math', 'Window'];
	var ret = this.lBrace();

	var objProps = this.getTmpIfUndefined();

	for(var i = 0; i < frozenObjects.length; i++){
		var s = {};

		this.setupStateChain(s, ['node', 'expression', 'left','properties'], objProps);
		//console.log(JSON.stringify(s));
		this.setupStateChain(s, ['node', 'expression', 'left','mainObjectName'], frozenObjects[i]);
		
		this.setupFilter(s, 'contains', objProps, 'prototype');

		this.finalize(s, obj);
		states.push(s);
	}

	for(var j = 0; j < states.length; j++){
		if(j !== states.length - 1){
			ret = ret.state(states[j]).or()
		}
		else{
			ret = ret.state(states[j]).rBrace();
		}
	}

	return ret;
}

JSQL.prototype.beginApply = function(obj){ //this, kont, lkont, name, procedure, arguments, argName (first argument)
	var s1 = {};


	var objThis 	= this.getTmpIfUndefined(obj.this);
	var objKont 	= this.getTmpIfUndefined(obj.kont); 
	var objLkont 	= this.getTmpIfUndefined(obj.lkont); 
	var objName 	= this.getTmpIfUndefined(obj.name); 
	var objProcedure= this.getTmpIfUndefined(obj.procedure); 
	var objArguments= this.getTmpIfUndefined(obj.arguments); 
	var objArgName 	= obj.argName || false; 

	this.setupStateChain(s1, ['kont'], objKont);
	this.setupStateChain(s1, ['lkont'], objLkont);

	this.finalize(s1, obj);
	

	return this .fCall({this: objThis, name: objName, procedure: objProcedure, arguments: objArguments, argName: objArgName})
				.state(s1);
}

JSQL.prototype.endApply = function(obj){ //kont, lkont
	var s1 = {};

	var objKont 	= this.getTmpIfUndefined(obj.kont); 
	var objLkont 	= this.getTmpIfUndefined(obj.lkont); 

	this.setupStateChain(s1, ['kont'], objKont);
	this.setupStateChain(s1, ['lkont'], objLkont);
	
	return this.state(s1);
}

JSQL.prototype.returnStatement = function(obj){ //name, argument
	obj = obj || {};

	var s = {};

	var objThis = this.getTmpIfUndefined(obj.this); 
	var objName = this.getTmpIfUndefined(obj.name); 
	var objArgument = this.getTmpIfUndefined(obj.argument); 

	this.setupStateChain(s, ['node','this'], objThis);
	this.setupStateChain(s, ['node','type'], 'ReturnStatement');
	this.setupStateChain(s, ['node','name'], objName);
	this.setupStateChain(s, ['node','argument'], objArgument);

	this.finalize(s, obj);

	return this.state(s);
}

JSQL.prototype.procedureExit = function(obj){ //functionName, returnName, returnAddr

	var objFunc = {
		name: this.getTmpIfUndefined(obj.functionName),
		kont: this.getTmpIfUndefined(),
		lkont:this.getTmpIfUndefined(),
		properties: obj.properties,
		filters: obj.filters,

	}

	var objReturn = { 
		this: obj.this,
		name: this.getTmpIfUndefined(obj.returnName),
		properties: obj.properties,
		filters: obj.filters,
		lookup: obj.lookup
	};

	if(obj.returnAddr) {
		var o = {};
		o[objReturn.name] = obj.returnAddr;
		objReturn.lookup = o;
	} 

	return this .lBrace()
				.beginApply(objFunc)
				.not()
					.endApply(objFunc)
					.star()
				.returnStatement(objReturn)
				.rBrace();
}

JSQL.prototype.variableUse = function(obj){ //name, addr
	var obj = obj || obj;
	var s1 = {}, s2 = {}, s3 = {}, s4 = {};

	var objName = this.getTmpIfUndefined(obj.name); 

	this.setupStateChain(s1, ['node','name'], objName);
	this.setupStateChain(s1, ['node','type'], 'Identifier');


	this.setupStateChain(s2, ['node','left','name'], objName);
	this.setupStateChain(s2, ['node','type'], 'BinaryExpression');	

	this.setupStateChain(s3, ['node','right','name'], objName);
	this.setupStateChain(s3, ['node','type'], 'BinaryExpression');

	this.setupStateChain(s4, ['node','callee','name'], objName);
	this.setupStateChain(s4, ['node','type'], 'CallExpression');

	//lookup of address
	if(obj.addr) {
		var o = {};
		o[objName] = obj.addr;
		s1.lookup = o;
		s2.lookup = o;
		s3.lookup = o;
		s3.lookup = o;
	} 

	this.finalize(s1, obj);
	this.finalize(s2, obj);
	this.finalize(s3, obj);
	this.finalize(s4, obj);

	return this .lBrace()
					.state(s1)
					.or()
					.state(s2)
					.or()
					.state(s3)
					.or()
					.state(s4)
				.rBrace();
}

JSQL.prototype.beginIf = function(obj){ //this, test, cons, alt, kont, lkont
	var s1 = {}, s2 = {}, s3 = {};

	var objThis = this.getTmpIfUndefined(obj.this); 
	var objTest = this.getTmpIfUndefined(obj.test); 
	var objCons = this.getTmpIfUndefined(obj.cons); 
	var objAlt = this.getTmpIfUndefined(obj.alt); 
	var objKont = this.getTmpIfUndefined(obj.kont); 
	var objLkont = this.getTmpIfUndefined(obj.lkont); 

	this.setupStateChain(s1, ['node','this'], objThis);
	this.setupStateChain(s1, ['node','test'], objTest);
	this.setupStateChain(s1, ['node','consequent'], objCons);
	this.setupStateChain(s1, ['node','alternate'], objAlt);
	//this.setupStateChain(s1, ['node','type'], 'IfStatement');

	this.setupStateChain(s2, ['node','this'], objCons);
	this.setupStateChain(s2, ['kont'], objKont);
	this.setupStateChain(s2, ['lkont'], objLkont);

	this.setupStateChain(s3, ['node','this'], objAlt);
	this.setupStateChain(s3, ['kont'], objKont);
	this.setupStateChain(s3, ['lkont'], objLkont);	

	this.finalize(s2, obj);
	this.finalize(s3, obj);

	return this .state(s1)
				.skipZeroOrMore()
				.lBrace()
					.state(s2)
					.or()
					.state(s3)
				.rBrace()
}

JSQL.prototype.ifStatement = function(obj){ //this, test, cons, alt, kont, lkont
	var s1 = {};

	var objThis = this.getTmpIfUndefined(obj.this); 
	var objTest = this.getTmpIfUndefined(obj.test); 
	var objCons = this.getTmpIfUndefined(obj.cons); 
	var objAlt  = this.getTmpIfUndefined(obj.alt); 

	this.setupStateChain(s1, ['node','this'], objThis);
	this.setupStateChain(s1, ['node','test'], objTest);
	this.setupStateChain(s1, ['node','consequent'], objCons);
	this.setupStateChain(s1, ['node','alternate'], objAlt);
	this.setupStateChain(s1, ['node','type'], 'IfStatement');

	this.finalize(s1, obj);

	return this.state(s1);
				
}

JSQL.prototype.beginIfTrue = function(obj){ //this, test, cons, alt, kont, lkont
	var s1 = {}, s2 = {};

	var objThis = this.getTmpIfUndefined(obj.this); 
	var objTest = this.getTmpIfUndefined(obj.test); 
	var objCons = this.getTmpIfUndefined(obj.cons); 
	var objAlt = this.getTmpIfUndefined(obj.alt); 
	var objKont = this.getTmpIfUndefined(obj.kont); 
	var objLkont = this.getTmpIfUndefined(obj.lkont); 

	this.setupStateChain(s1, ['node','this'], objThis);
	this.setupStateChain(s1, ['node','test'], objTest);
	this.setupStateChain(s1, ['node','consequent'], objCons);
	this.setupStateChain(s1, ['node','alternate'], objAlt);
	//this.setupStateChain(s1, ['node','type'], 'IfStatement');

	this.setupStateChain(s2, ['node','this'], objCons);
	this.setupStateChain(s2, ['kont'], objKont);
	this.setupStateChain(s2, ['lkont'], objLkont);


	this.finalize(s2, obj);

	return this .state(s1)
				.skipZeroOrMore()
				.state(s2)
}

JSQL.prototype.beginIfFalse = function(obj){ //this, test, cons, alt, kont, lkont
	var s1 = {}, s2 = {};

	var objThis = this.getTmpIfUndefined(obj.this); 
	var objTest = this.getTmpIfUndefined(obj.test); 
	var objCons = this.getTmpIfUndefined(obj.cons); 
	var objAlt = this.getTmpIfUndefined(obj.alt); 
	var objKont = this.getTmpIfUndefined(obj.kont); 
	var objLkont = this.getTmpIfUndefined(obj.lkont); 

	this.setupStateChain(s1, ['node','this'], objThis);
	this.setupStateChain(s1, ['node','test'], objTest);
	this.setupStateChain(s1, ['node','consequent'], objCons);
	this.setupStateChain(s1, ['node','alternate'], objAlt);
	//this.setupStateChain(s1, ['node','type'], 'IfStatement');

	this.setupStateChain(s2, ['node','this'], objAlt);
	this.setupStateChain(s2, ['kont'], objKont);
	this.setupStateChain(s2, ['lkont'], objLkont);

	this.finalize(s2, obj);

	return this .state(s1)
				.skipZeroOrMore()
				.state(s2)
}

JSQL.prototype.endIf = function(obj){ //kont, lkont
	var s = {};

	var objKont = this.getTmpIfUndefined(obj.kont); 
	var objLkont = this.getTmpIfUndefined(obj.lkont); 

	this.setupStateChain(s, ['kont'], objKont);
	this.setupStateChain(s, ['lkont'], objLkont);

	return this.state(s);				
}

JSQL.prototype.assign = function(obj){ //left, right, leftName, rightName
	var obj = obj || {};
	//Variables
	var s = {};

	var objThis = this.getTmpIfUndefined(obj.this); 
	var objName = this.getTmpIfUndefined(obj.name); 
	var objLeft = this.getTmpIfUndefined(obj.left); 
	var objRight = this.getTmpIfUndefined(obj.right); 
	var objLeftName = this.getTmpIfUndefined(obj.leftName); 
	var objRightName = this.getTmpIfUndefined(obj.rightName); 


	this.setupStateChain(s, ['node','this'], objThis);
	this.setupStateChain(s, ['node','expression','name'], objName);
	this.setupStateChain(s, ['node','expression','left'], objLeft);
	this.setupStateChain(s, ['node','expression','right'], objRight);	
	this.setupStateChain(s, ['node','expression','operator'], "=");
	this.setupProperty(s, objLeftName, objLeft + '.name');
	this.setupProperty(s, objRightName, objRight + '.name');

	this.finalize(s, obj);

	return this.state(s);
}

JSQL.prototype.variableDeclaration = function(obj){ //left, right, leftName, rightName, decls
	//todo fill in params
	var s = {};

	var objThis = this.getTmpIfUndefined(obj.this); 
	var objLeft = this.getTmpIfUndefined(obj.left);
	var objRight = this.getTmpIfUndefined(obj.right);
	var objLeftName = this.getTmpIfUndefined(obj.leftName);
	var objRightName = this.getTmpIfUndefined(obj.rightName);
	var objDecls = this.getTmpIfUndefined(obj.decls);
	var objFirstDecl = this.getTmpIfUndefined();

	this.setupStateChain(s, ['node','this'], objThis);
	this.setupStateChain(s, ['node','type'], 'VariableDeclaration');
	this.setupStateChain(s, ['node','declarations'], objDecls);

	this.setupProperty(s, objFirstDecl, prop('at', objDecls, 0));
	this.setupProperty(s, objLeft, objFirstDecl + '.id');
	this.setupProperty(s, objRight, objFirstDecl + '.init');
	this.setupProperty(s, objLeftName, objLeft + '.name');
	this.setupProperty(s, objRightName, objRight + '.name');

	this.finalize(s, obj);

	return this.state(s);
}

JSQL.prototype.functionDeclaration = function(obj){
	//todo fill in params
	obj = obj || {};
	var s = {};

	var objThis = this.getTmpIfUndefined(obj.this); 
	var objName = this.getTmpIfUndefined(obj.name); 

	this.setupStateChain(s, ['node','this'], objThis);
	this.setupStateChain(s, ['node','type'], 'FunctionDeclaration');	
	this.setupStateChain(s, ['node', 'id', 'name'], objName);

	this.finalize(s, obj);

	return this.state(s);
}

JSQL.prototype.assignOrVarDecl = function(obj){ //left, right, leftName, rightName
	obj = obj || {};

	var objThis = this.getTmpIfUndefined(obj.this); 
	var objLeft = this.getTmpIfUndefined(obj.left);
	var objName = this.getTmpIfUndefined(obj.name);
	var objRight = this.getTmpIfUndefined(obj.right);
	var objLeftName = this.getTmpIfUndefined(obj.leftName);
	var objRightName = this.getTmpIfUndefined(obj.rightName);
	var props = obj.properties || {};
	var filters = obj.filters || {};
	var lookup = obj.lookup || {};

	return this 	.lBrace()
					.variableDeclaration({this: objThis, name: objName, left: objLeft, right: objRight, leftName: objLeftName, rightName: objRightName, properties: props, filters: filters, lookup: lookup})
					.or()
					.assign({this: objThis, name: objName, left: objLeft, right: objRight, leftName: objLeftName, rightName: objRightName, properties: props, filters: filters, lookup: lookup})
					.rBrace();
}

JSQL.prototype.fCall = function(obj){ //name, procedure, arguments, argName (eerste arg), global;
	obj = obj || {};
	var s1 = {}; //als ExpressionStatement
	var s2 = {}; //als CallExpression

	var objThis 	= 	this.getTmpIfUndefined(obj.this); 	
	var objName 	=	obj.name || this.getTmpVar('objName'); //naam van de functie
	var objProcedure= 	obj.procedure || this.getTmpVar('objProcedure'); //de callee node
	var objArguments= 	obj.arguments || this.getTmpVar('objArguments'); //de arguments node
	var firstArg 	= 	this.getTmpVar('firstArg');
	var firstArgName= 	obj.argName || this.getTmpVar('firstArgName'); //if user wants to know first argument name
	var calleeName 	= 	this.getTmpVar('calleeName'); //tmp var for matching
	var argName 	=	this.getTmpVar('argName');
	var global 		=	this.getTmpIfUndefined(obj.global); 

	//Basic function call
	this.setupStateChain(s1, ['node','this'], objThis);
	this.setupStateChain(s1, ['node','expression','callee'], objProcedure);
	this.setupStateChain(s1, ['node','expression','arguments'], objArguments);
	this.setupStateChain(s1, ['benv','_global'], global);
	
	//get first argument
	if(obj.argName){
		this.setupProperty(s1, firstArg, prop('at', objArguments, 0)); //tmp eerste arg
		this.setupProperty(s1, firstArgName, firstArg + '.name');
	}
	
	this.setupProperty(s1, objName, objProcedure + '.name');

	//Basic function call
	this.setupStateChain(s2, ['node','this'], objThis);
	this.setupStateChain(s2, ['node','callee'], objProcedure);
	this.setupStateChain(s2, ['node','arguments'], objArguments);
	this.setupStateChain(s2, ['benv','_global'], global);
	
	//get first argument
	if(obj.argName){
		this.setupProperty(s2, firstArg, prop('at', objArguments, 0)); //tmp eerste arg
		this.setupProperty(s2, firstArgName, firstArg + '.name');
	}
	this.setupProperty(s2, objName, objProcedure + '.name');

	this.finalize(s1, obj);
	this.finalize(s2, obj);

	return this .lBrace()
					.state(s1)
					.or()
					.state(s2)
				.rBrace()
}

JSQL.prototype.functionCall = JSQL.prototype.fCall;

JSQL.prototype.newExpression = function(obj){ //name, procedure, arguments, argName (eerste arg);
	obj = obj || {};
	var s = {}; 

	var objThis 	= 	this.getTmpIfUndefined(obj.this); 	
	var objName 	=	obj.name || this.getTmpVar('objName'); //naam van de functie
	var objProcedure= 	obj.procedure || this.getTmpVar('objProcedure'); //de callee node
	var objArguments= 	obj.arguments || this.getTmpVar('objArguments'); //de arguments node
	var firstArg 	= 	this.getTmpVar('firstArg');
	var firstArgName= 	obj.argName || this.getTmpVar('firstArgName'); //if user wants to know first argument name
	var calleeName 	= 	this.getTmpVar('calleeName'); //tmp var for matching

	//Basic function call
	this.setupStateChain(s, ['node','this'], objThis);
	this.setupStateChain(s, ['node','callee'], objProcedure);
	this.setupStateChain(s, ['node','arguments'], objArguments);
	

	this.setupProperty(s, objName, objProcedure + '.name');

	this.finalize(s, obj);

	return this.state(s);
}

//Small hack to find the final states, NOT NEEDED ANYMORE, USE ResultState()
JSQL.prototype.finalState = function(obj){
	obj = obj || {};
	var s = {}; 

	var objSuccs 	= 	this.getTmpIfUndefined(); 	
	var objSuccSuccs=	this.getTmpIfUndefined(); 	
	var objFirst 	=	this.getTmpIfUndefined();
	var objCount   	=	this.getTmpIfUndefined();

	//Basic function call
	this.setupStateChain(s, ['_successors'], objSuccs);
	this.setupProperty(s, objFirst, prop('at', objSuccs, 0)); //tmp eerste arg
	this.setupProperty(s, objSuccSuccs, objFirst + '.state._successors');
	this.setupProperty(s, objCount, prop('length', objSuccSuccs));
	this.setupFilter(s, '===', objCount, 0);

	this.finalize(s, obj);

	return this.state(s);
}

/**
 * -------------------
 * Examples for thesis
 * -------------------
 */

JSQL.prototype.udOpenClosedFile = function(obj){
	obj = obj || {};
	var fileName = obj.name || this.getTmpVar('objName');

	return 	this	.udFCall({name: 'close', argName: fileName})
					.not()
					//.lBrace()
					.udFCall({name: 'open'})
					//.rBrace()
					.star()
					.udFCall({name: 'access', argName: fileName});
}

JSQL.prototype.udClosedAllOpenedFiles = function(obj){
	obj = obj || {};
	var fileName = obj.name || this.getTmpVar('objName');

	//(open(f) _* (access(f) _*)* close(f))*
	return 	this	.lBrace()
						.udFCall({name: 'open', argName: fileName})
						.skipZeroOrMore()
						.lBrace()
							.udFCall({name: 'access', argName: fileName})
							.skipZeroOrMore()
						.rBrace()
						.star()
						.udFCall({name: 'close', argName: fileName})
					.rBrace()
					//.star()
}

JSQL.prototype.taintedBy = function(obj){ //x, y, rec
	obj = obj || {};
	var s1 = {};
	var s2 = {};
	var newObj = {};
	var orig = this.getTmpIfUndefined(obj.orig);
	var alias = this.getTmpIfUndefined(obj.alias);
	var flow;

	if(obj.rec){
		flow = this.getRecVar(obj.rec);
	}
	else{
		flow = this.getTmpIfUndefined();
	}

	newObj.orig = flow;
	newObj.alias = alias;
	newObj.rec = obj.rec;

	this.setupStateChain(s1, ['node','expression','right','name'], orig); //alias
	this.setupStateChain(s1, ['node','expression','left','name'], alias); //leaked
	this.setupStateChain(s2, ['node','expression','right','name'], orig); //alias
	this.setupStateChain(s2, ['node','expression','left','name'], flow); //leaked

	return this .lBrace()
				.state(s1) //assign from x to y
				.or()
				.state(s2) //assign from x to tmp
				.skipZeroOrMore()
				.rec(newObj,this.taintedBy)
				.rBrace();

}

JSQL.prototype.udRecSink = function(obj){ //leakedValue
	// sink(x);
	// | tmp = x
	// | udRecTest(tmp)

	//info from argument
	obj = obj || {};
	//state info for alias
	var s = {};
	var leaked 	= obj.leakedValue || this.getTmpVar('leaked');
	var alias 	= this.getRecVar('leakedAlias'); //use temp var if you don't want to know the aliases
	var left = this.getTmpVar('left');
	var right = this.getTmpVar('right');
	//var env = this.getTmpVar('env');
	//new obj for recursive function
	var newObj 	= {};
	newObj.leakedValue = alias;

	this.setupStateChain(s, ['node','expression','left'], left); //alias
	this.setupStateChain(s, ['node','expression','right'], right); //leaked

	this.setupProperty(s, alias, left + '.name'); 
	this.setupProperty(s, leaked, right + '.name');
	//this.setupProperty(s, env, right + '.name');


	return this 	.lBrace()
					.fCall({name: 'sink', argName: leaked})
					.or()
					.state(s)
					.skipZeroOrMore()
					.rec(newObj,this.udRecSink)
					.rBrace();
}

JSQL.prototype.udAvailableExpression = function(obj){ //left(Name),right(Name), Operator
	obj = obj || {};
	var s = {};

	var objLeft = obj.left || this.getTmpVar('obLeft');
	var objRight = obj.right || this.getTmpVar('obRight');
	var objLeftName = obj.leftName || this.getTmpVar('obLeftName');
	var objRightName = obj.rightName || this.getTmpVar('obRightName');
	var objOperator = obj.operator || this.getTmpVar('obOperator');

	this.setupStateChain(s, ['node','type'], 'BinaryExpression');
	this.setupStateChain(s, ['node','left'], objLeft);
	this.setupStateChain(s, ['node','right'], objRight);
	this.setupStateChain(s, ['node','operator'], objOperator);
	
	this.setupProperty(s, objLeftName, objLeft + '.name');
	this.setupProperty(s, objRightName, objRight + '.name');

	return this .state(s)
				.skipZeroOrMore()
				.lBrace()
				.udAssign({leftName: objLeftName})
				.or()
				.udAssign({leftName: objRightName})
				.rBrace();
}

/**
 * ------------------------------
 * Properties/filters/boilerplate
 * ------------------------------
 */

JSQL.prototype.finalize = function(state, obj){
	//Do all boilerplate code
	//This order is important!
	//We first want to express extra properties, 
	//then look some things up about the state.
	//When this info are grabbed, we can look some things up.
	//Finally, we can filter the acquired results.
	this.processKont(state, obj);
	this.processLkont(state, obj);
	this.processValue(state, obj);
	this.processBenv(state, obj);
	this.processStore(state, obj);
	this.processProperties(state, obj);
	this.processLookups(state, obj);
	this.processFilters(state, obj);
	
}

JSQL.prototype.setupStateChain = function(obj, chain, val){
	var cur = obj;
	for(var i = 0; i < chain.length; i++){
		if(i === chain.length - 1){
			cur[chain[i]] = val;
		}
		else{
			if(!cur[chain[i]]) cur[chain[i]] = {};
			cur = cur[chain[i]];
		}
		
	}
}

JSQL.prototype.setupProperty = function(obj, left, right){
	if(!obj.properties) obj.properties = {};
	if(!obj.lookup) obj.lookup = {};
	if(!obj.filters) obj.filters = [];
	//Is variable
	if(isVar(left)){
		obj.properties[left] = right;
	}
	else{
		//no variable, so we have to add condition
		var tmp = this.getTmpVar('tmpName');
		obj.properties[tmp] = right;
		this.setupFilter(	obj, 
							'===',
							tmp,
							left);
	}	
}

JSQL.prototype.processProperties = function(state, obj){
	if(obj.properties){
		for(var key in obj.properties){
			this.setupProperty(state, key, obj.properties[key]);
		}
	}
	return state;
}

JSQL.prototype.setupFilter = function(obj, f){
	var args = Array.prototype.slice.call(arguments, 2);
	var fArgs = Array.prototype.concat.apply([], [f, args])
	if(!obj.lookup) obj.lookup = {};
	if(!obj.filters) obj.filters = [];
	obj.filters.push(cond.apply(this,fArgs));	
	//console.log(obj.filters);
}

JSQL.prototype.processFilters = function(state, obj){
	var filter;
	if(obj.filters){
		if(!state.filters) state.filters = [];
		for(var i = 0; i < obj.filters.length; i++){
			filter = obj.filters[i];
			//filter.unshift(state);
			//console.log(filter);
			//this.setupFilter.apply(null, filter);
			state.filters.push(filter);
		}
	}
	//console.log(state);
	return state;
}

JSQL.prototype.processLookups = function(state, obj){
	if(obj.lookup){
		if(!state.lookup) state.lookup = {};
		for(var i in obj.lookup){
			state.lookup[i] = obj.lookup[i];
		}
	}
	//console.log(state);
	return state;
}

JSQL.prototype.processBenv = function(state, obj){
	if(obj.benv) state.benv = obj.benv;
	return state;
}

JSQL.prototype.processStore = function(state, obj){
	if(obj.store) state.store = obj.store;
	return state;
}

JSQL.prototype.processKont = function(state, obj){
	if(obj.kont) state.kont = obj.kont;
	return state;
}

JSQL.prototype.processLkont = function(state, obj){
	if(obj.lkont) state.lkont = obj.lkont;
	return state;
}

JSQL.prototype.processValue = function(state, obj){
	if(obj.value) state.value = obj.value;
	return state;
}

/**
 * ----------------
 * THINGS TO DETECT
 * ----------------
 */

//State
JSQL.prototype.state = function(obj){
	this._map.push(new RegexPart('state', obj, 'idx' + this._map.length));
	//Fluent API
	return this;
}


//EvalState
JSQL.prototype.evalState = function(obj){
	this._map.push(new RegexPart('EvalState', obj, 'idx' + this._map.length));
	//Fluent API
	return this;
}

//KontState
JSQL.prototype.kontState = function(obj){
	this._map.push(new RegexPart('KontState', obj, 'idx' + this._map.length));
	//Fluent API
	return this;
}

//ResultState
JSQL.prototype.resultState = function(obj){
	this._map.push(new RegexPart('ResultState', obj, 'idx' + this._map.length));
	//Fluent API
	return this;
}

//ReturnState
JSQL.prototype.returnState = function(obj){
	this._map.push(new RegexPart('ReturnState', obj, 'idx' + this._map.length));
	//Fluent API
	return this;
}

//subgraph (for recursion)
JSQL.prototype.rec = function(obj, f){
	//context that has an empty _map (for the creation of the subgraph)
	//and an index equal to the 'this' object, to avoid overlapping of tmpVars/recVars
	//var thisContext = new JSQL();
	//thisContext.uid = this.uid;
	this._map.push(new RegexPart('subGraph', obj, 'idx' + this._map.length, f, this.uid));
	//Fluent API
	return this;
}

/**
 * ----------
 * DELIMITERS
 * ----------
 */

//Left brace
JSQL.prototype.lBrace = function(obj){
	this.depth++;
	this._map.push(new RegexPart('lBrace', obj, '('));
	//Fluent API
	return this;
}

//Right brace
JSQL.prototype.rBrace = function(obj){
	if(this.depth === 0) throw 'Can\'t close a non-existing brace. Check brace order';
	
	this.depth--;
	this._map.push(new RegexPart('rBrace', obj, ')'));
	//Fluent API
	return this;
}

//or
JSQL.prototype.or = function(obj){
	this._map.push(new RegexPart('or', obj, '|'));
	//Fluent API
	return this;
}

//Wildcard
JSQL.prototype.wildcard = function(obj){

	this._map.push(new RegexPart('wildcard', obj, '_'));
	//Fluent API
	return this;
}

//Wildcard
JSQL.prototype.wildcards = function(times){

	//Push wildcard times
	for(var i = 0; i < times; i++){
		this._map.push(new RegexPart('wildcard', undefined, '_'));
	}
	
	//Fluent API
	return this;
}

//Not
JSQL.prototype.not = function(obj){

	this._map.push(new RegexPart('not', obj, '¬'));
	//Fluent API
	return this;
}

//Star
JSQL.prototype.star = function(obj){

	this._map.push(new RegexPart('star', obj, '*'));
	//Fluent API
	return this;
}

//Wildcard followed by Star
JSQL.prototype.skipZeroOrMore = function(obj){

	this.lBrace();
	this._map.push(new RegexPart('wildcard', obj, '_'));
	this._map.push(new RegexPart('star', obj, '*'));
	this.rBrace();
	//Fluent API
	return this;
}

//Wildcard followed by Plus
JSQL.prototype.skipOneOrMore = function(obj){
	this.lBrace();
	this._map.push(new RegexPart('wildcard', obj, '_'));
	this._map.push(new RegexPart('plus', obj, '+'));
	this.rBrace();
	//Fluent API
	return this;
}


//Plus
JSQL.prototype.plus = function(obj){

	this._map.push(new RegexPart('plus', obj, '+'));
	//Fluent API
	return this;
}

/*
 * ----
 * MISC
 * ----
 */

JSQL.prototype.toString = function(obj){
	return this._map.map(function(x){ return x.toString(); }).join('');
}

JSQL.prototype.toPrettyString = function(obj){
	return this._map.map(function(x){ return x.toString() + '\n'; }).join('.');
}

JSQL.prototype.getUid = function(){
	return this.uid++;
}

JSQL.prototype.getTmpVar = function(name){
	return '?__tmp__' + name + this.uid++;
}

JSQL.prototype.getRecVar = function(name){
	return '?r:' + name + this.uid++;
}

JSQL.prototype.getTmpIfUndefined = function(name){
	if(!name){
		return this.getTmpVar('');
	}
	return name;
}


/**
 * -------------
 * BUILD NFA/DFA
 * -------------
 */
JSQL.prototype.toNFA = function(){
	if(this.depth !== 0) throw 'Not all braces are closed!'; 
	var tsc = new ThompsonConstruction();
	//returns a finite state machine, we need to convert it to array of graph triples, e.g.:
	// new GraphTriple(new DummyNode(1), new EdgeLabel('assign', {leftName: 'x'}), new DummyNode(2))
	var fsm = tsc.toNFA(this._map);
	var nfa = new Automaton();
	//One way to make a nfa, from a FSM
	nfa.fromFSM(fsm, this._map); //built so that NFA's don't depend on FSM's per sé.
	//return the NFA
	console.log(nfa);
	return nfa;
}

JSQL.prototype.toDFA = function(){
	if(this.depth !== 0) throw 'Not all braces are closed!'; 
	
	var tsc = new ThompsonConstruction();
	var ssc = new SubsetConstruction();
	
	var nfa = tsc.toNFA(this._map);
	var newFsm = ssc.toDFA(nfa);

	var dfa = new Automaton();
	dfa.fromFSM(newFsm, this._map);

	//return the DFA
	return dfa;


}

/**
 * -----------------------
 * TESTSTRUCTURE FOR REGEX
 * -----------------------
 */

 function RegexPart(name, obj, symbol, expandFunction, expandContext){
 	this.name = name;
 	this.symbol = symbol;
 	this.obj = obj;
 	this.expandFunction = expandFunction || false;
 	this.expandContext = expandContext || false;
 }

RegexPart.prototype.toString = function(){
	if (this.symbol) return this.symbol;
	var str = this.obj ? JSON.stringify(this.obj) : '';
	return this.name + '(' + str +')';
}


/**
 * -------
 * HELPERS
 * -------
 */


var isVar = function(x){
	return x.charAt(0) === '?';
}

//Builtin functions for properties
var prop = function(f){
	var found;
	var args = Array.prototype.slice.call(arguments, 1);
	if(typeof f === 'string'){
		//lookup function
		found = queryFunctions.properties[f];
	}
	else if(typeof f === 'function'){
		found = f;
	}
	if(!found) throw 'function ' + f + ' is not a valid function';
	return [found, args];
}

//Builtin functions for conditions
var cond = function(f){
	var found;
	var args = Array.prototype.slice.call(arguments, 1);
	if(typeof f === 'string'){
		//lookup function
		found = queryFunctions.conditions[f];
	}
	else if(typeof f === 'function'){
		found = f;
	}
	
	if(!found) throw 'function ' + f + ' is not a valid function';
	return [found, args];
}

var isString = function(s){
	if(s === '{Str}') return true;
	if(s.indexOf('-') === 3 || s.charAt(0) === '{') return false;
	return true;
}


//TODO: getEnvAddr, getStoreVal
var queryFunctions = {
	conditions : { //filters
				'===' 		: _.isEqual,
				'!=='		: function(a,b){return (!_.isEqual(a,b));},
				'>'			: function(a,b){return a>b;},
				'<'			: function(a,b){return a<b;},
				contains 	: contains, 
				testTrue 	: function(){return true;},
				testFalse 	: function(){return false;},
				isString 	: isString
				},
	properties : {
				identity 		: function(a){ return a; },
				length			: function(a){ return a.length; },
				at 				: function(a,idx){ return a[idx]; },
				memberOf 		: function(a){ return new BundledResult(a);}
				}
}