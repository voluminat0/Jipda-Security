function SecurityAnalysis(codeSrc, query){
	//Jipda part
	this.states = [];
	this.transitions = [];
	this.codeSrc = codeSrc;
	//Query part
	this.tripleStore = [];
	//Regular path expressions part
	this.query = query;
	this.nfa = false;
	this.dfa = false;
	this.prevMap = {}
}

SecurityAnalysis.prototype.initialize = function(){
	//Jipda
	var ast = Ast.createAst(this.codeSrc, {loc:true});
    var cesk = createCesk(ast);
    var system = cesk.explore(ast);
    this.generateStates(system.initial);
    this.graphToTriples(system);

    console.log(this.states);
    try{
	    if(this.query.rpe){
			var rpe = this.query.rpe;
			//console.log(rpe);
			this.nfa = rpe.toNFA();
			this.dfa = rpe.toDFA();
			console.log(this.dfa);
			output.innerHTML = '';
	    }
	    else{
			this.nfa = false;
			this.dfa = false;
			output.innerHTML = 'Could not parse regular path expression.';
	    }
	}
	catch(err) {
		
	    output.innerHTML = err;
	}
}

//TEST GRAPHS
SecurityAnalysis.prototype.detect = function(){
	/*
	 * G = States van JIPDA graph
	 * P = Pattern (RPE)
	 * F = Final states
	 * v0 = initial state van G
	 * s0 = initial state van P
	 */
	var query, result, startNode;
	if(this.query.direction === 'Forward'){
		startNode = this.tripleStore.filter(function(x){ return (x.initial === true); })[0];
		if(this.query.type === 'Existential'){	
			query = new ExistentialQuery(this.tripleStore, this.dfa.triples, this.dfa.acceptStates, startNode.from, this.dfa.startingNode);
		}
		else{
			console.log(this.dfa);
			query = new UniversalQuery(this.tripleStore, this.dfa.triples, this.dfa.acceptStates, startNode.from, this.dfa.startingNode);
		}
		result = query.runNaiveWithNegation();
	}
	else{
		//Check if we have only 1 endpoint
		if(this.tripleStore.filter(function(x){ return (x.final === true); }).length !== 1){
				throw 'Can\'t perform backward query! There are multiple endpoints in the JIPDA graph.'
		}
		//lets flip them
		var flipped = this.tripleStore.map(
				function(x){
					var obj = new GraphTriple(); 
					obj.from = x.target; 
					obj.target = x.from; 
					obj.initial = x.final; 
					obj.final = x.initial, 
					obj.edge = x.edge; 
					return obj;
				});

		startNode = flipped.filter(function(x){ return (x.initial === true); })[0];

		if(this.query.type === 'Existential'){
			query = new ExistentialQuery(flipped, this.dfa.triples, this.dfa.acceptStates, startNode.from, this.dfa.startingNode);
		}
		else{
			query = new UniversalQuery(flipped, this.dfa.triples, this.dfa.acceptStates, startNode.from, this.dfa.startingNode);	
		}
		result = query.runNaiveWithNegation();
	}
	this.processQueryResult(result);
	
}

SecurityAnalysis.prototype.processQueryResult = function(queryResult){
	var processed = [];
	var newProcessed = [];
	var subs;
	//1. Strip temp substitutions
	for(var i = 0; i < queryResult.length; i++){
		
		for(var j = 0; j < queryResult[i].theta.length; j++){
			subs = queryResult[i].theta[j];
			for(var key in subs){
				if(key.lastIndexOf('?__tmp__') === 0) {
					delete queryResult[i].theta[j];
				}
			}
			if(queryResult[i].theta[j] && _.keys(queryResult[i].theta[j]).length > 0) newProcessed.push(queryResult[i].theta[j]);
		}
		queryResult[i].theta = newProcessed.slice();
		newProcessed = [];
		processed.push(queryResult[i]);
	}

	console.log(processed);

	this.markQueryResult(processed, 'violation0');

	return processed;
}

//GRAPHICS
SecurityAnalysis.prototype.markQueryResult = function(results, marker){
	//var ids = _fromStateIds(triples);
	var ids = results.map(function(x){ return [x.v._id, this.prevMap[x.v._id]]; }, this);
	var info, theta, color;
	for(var i = 0; i < ids.length; i++){
			color = i%5;
			//info = this.states[ids[i][0]].marker ? this.states[ids[i]].marker.info + Utilities.objToString(results[i].theta) + '<br />' : Utilities.objToString(results[i].theta) + '<br />';
			//theta = this.states[ids[i]].marker ? this.states[ids[i]].marker.theta.push(results[i].theta) : [results[i].theta];
			
			for(var j = 0; j < ids[i][1].length; j++){
				info = this.states[ids[i][1][j]].marker ? this.states[ids[i][1][j]].marker.info + Utilities.objToString(results[i].theta) + '<br />' : Utilities.objToString(results[i].theta) + '<br />';
			
				if(this.states[ids[i][1][j]].marker){
					theta = this.states[ids[i][1][j]].marker.theta.slice(),
					theta.push(results[i].theta);
					//theta = 
				}
				else{
					theta = [results[i].theta];
				}

				this.states[ids[i][1][j]].marker = {
											'className'	: marker, //+ '' + color,
											'info'		: info,
											'theta'		: theta
										 };
			}
	}
}

function createCesk(ast){
	return jsCesk({a:createTagAg(), l:new JipdaLattice()});
}

//SETTING UP DATA
SecurityAnalysis.prototype.graphToTriples = function(g){
	//initialization
	this.tripleStore = [];
	var doneList = [];
	var t;
	var lastList = [];
	var cur;

	//prev of first node is undefined, so add it manually
	this.prevMap[1] = [0];

	//initial node only has 1 successor
	this.tripleStore.push(new GraphTriple(
			new DummyNode(g.initial._id), 
			g.initial,
			new DummyNode(g.initial._successors[0].state._id), true)
	);

	for(var j = 0; j < this.tripleStore.length; j++){
		
		var triple = this.tripleStore[j];
		//if we already treated the triple, don't do it again
		if(Utilities.containsTriple(doneList,triple)){
			continue;
		}

		//avoid infinite loops
		doneList.push(triple);		

		var state = triple.edge;
		
		
		for (var k = 0; k < state._successors.length; k++){
			var tState = state._successors[k].state;
			if(tState._successors.length > 0){ 
				for (var h = 0; h < tState._successors.length; h++){
					if(tState._successors[h].state._successors.length === 0) {
						lastList.push(tState._successors[h].state);
					}
					t = new GraphTriple(
							new DummyNode(tState._id), 
							tState,
							new DummyNode(tState._successors[h].state._id),
							false, 
							false //final
						);
					if(this.prevMap[tState._successors[h].state._id]){
						this.prevMap[tState._successors[h].state._id].push(tState._id);
					}
					else{
						this.prevMap[tState._successors[h].state._id] = [tState._id]
					}
					if(!Utilities.containsTriple(this.tripleStore,t)){
						this.tripleStore.push(t);
					}
				}
			}				
		}		
	}

	for(var i = 0; i < lastList.length; i++){
		cur = lastList[i];
		this.tripleStore.push(new GraphTriple(
								new DummyNode(cur._id),
								cur,
								new DummyNode(cur._id + 9999), //TODO find unique id
								false,
								true));
		this.prevMap[cur._id + 9999] = [cur._id]
	}

	return this.tripleStore;
}

SecurityAnalysis.prototype.generateStates = function(initial){
	this.states = [];
	this.transitions = [];
	var todo = [initial];
	while (todo.length > 0){
		var s = todo.pop();
		this.states[s._id] = s;
		s._successors.forEach(function (t){
			if (isFinite(t._id))
			{
			  return;
			}
			t._id = this.transitions.push(t) - 1;
			todo.push(t.state);
		}, this);  
	}
}


//NAVIGATION

function findNodes(g, check){
	var result = g.map(function(x){
		if(check(x)){
			return x._id;
		}
		return false;
	});
	return result.filter(Boolean);
}

function nextNodes(id){
	var next = [id];
	addSuccessors(this.states[id]);
	function addSuccessors(state){
		var succs = state._successors || [];
		//foreach successor add its successors
		for(var i = 0; i < succs.length; i++){
			if(next.indexOf(succs[i].state._id) < 0) next.push(succs[i].state._id);
			addSuccessors(succs[i].state);
		}
	}
	return next;
}

function previousNodes(id){
	var pred = [id];
	addPredecessors(findPredecessors(id));

	function addPredecessors(ids){
		//foreach successor add its successors
		for(var i = 0; i < ids.length; i++){
			pred.push(ids[i]);
			addPredecessors(findPredecessors(ids[i]));
		}
	}

	function findPredecessors(id){
		var pred = [];
		for(var i = 0; i < this.tripleStore.length; i++){
			if(this.tripleStore[i].final) continue;
			if(this.tripleStore[i].target._id === id) pred.push(this.tripleStore[i].from._id);
		}
		return pred;
	}

	return pred;
}

//Navigation example
function findNodesExample(){
	//DEFINE SPECIFIC NODES
	var variableDeclarations = findNodes(this.states, function(x){
		return 	(x.node
				&& x.node.type === 'VariableDeclaration');
	});

	var variableDeclarationsNoValues = findNodes(this.states, function(x){
		return 	(x.node
				&& x.node.type === 'VariableDeclaration'
				&& !x.node.declarations[0].init);
	});

	var variableDeclarationsAlias = findNodes(this.states, function(x){
		return 	(x.node && x.node.declarations && x.node.declarations[0].init
				&& x.node.type === 'VariableDeclaration'
				&& x.node.declarations[0].init.type === 'Identifier'
				);
	});

	var functionCalls = findNodes(this.states, function(x){
		return 	(x.node
			&&  ((x.node.type === 'CallExpression')
				||	(x.node.type === 'ExpressionStatement' && x.node.expression.type === 'CallExpression')
				||	(x.node.type === 'BlockStatement' && x.node.body.length === 1 
													  && x.node.body[0].type === 'ExpressionStatement' 
													  && x.node.body[0].expression.type === 'CallExpression' )));
	});
	//END SPECIFIC NODES

    //mark with css classes	
	//var fws = followingNodes(variableDeclarations[2], system.initial);
	//var prev = previousNodes(variableDeclarations[2]);
	//var next = nextNodes(variableDeclarations[3]);
	//_markStates(functionCalls, 'fCall'); 
	//_markStates(variableDeclarationsAlias, 'vDecl');
	//_markStates(prev, 'violation');
}
