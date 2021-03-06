function FiniteStateMachine(acceptStates, graph, origin, type, negatedPairs){
	this.acceptStates = acceptStates || {};
	this.graph = graph || {}; //TODO: Should I make a separate 'class' for node->edge->node connections?
	this.origin = origin || 0;
	this.tpe = type || ''; //debugging purposes
	this.negatedPairs = negatedPairs || []; //experimental
}

FiniteStateMachine.prototype.getNodeCount = function(){
	return this.getNodeNames().length;
}

FiniteStateMachine.prototype.getNodeNames = function(){
	var nodes = [];
	for (var key in this.graph){
		nodes.push(key);
		for (var subkey in this.graph[key]){
			Array.prototype.push.apply(nodes, this.graph[key][subkey]);
		}
	}
	return nodes.getUnique().sort(function(a,b){ return a-b;});
}

FiniteStateMachine.prototype.getEdgeLabels = function(){
	var labels = [];
	for(var key in this.graph){
		for(var lbl in this.graph[key]){
			labels.push(lbl);
		}
	}
	return flatten(labels).getUnique();
}

FiniteStateMachine.prototype.closureOf = function(nodeLabel){
	var closure = flatten([nodeLabel]);
	var changed = true;
	var node, reachable, lambdaNode;
	while(changed){
		changed = false;
		for(var i = 0; i < closure.length; i++){
			node = closure[i];
			if(this.graph[node] !== undefined && this.graph[node]['lambda'] !== undefined){
				reachable = flatten([this.graph[node]['lambda']]);
				for(var j = 0; j < reachable.length; j++){
					lambdaNode = reachable[j];
					if(closure.indexOf(lambdaNode) === -1){
						closure.push(lambdaNode);
						changed = true;
					}
				}
			}
		}
	}
	return closure;
}

//TODO: check datatypes
FiniteStateMachine.prototype.acceptStateOfClosure = function(closure){
	var state;
	for(var i = 0; i < closure.length; i++){
		state = closure[i];
		if(this.acceptStates[state] !== undefined){
			return this.acceptStates[state]; //GEEFT NIET JUIST TERUG?
		}
	}
	return false;
}

FiniteStateMachine.prototype.attachGraph = function(attachPoint, fsm, endPoint){
	var nodeCount = this.getNodeCount();
	//clone, since it will be 'reused'
	var fsmC = clone(fsm);
	this.incrementNodeLabels.apply(fsmC, [nodeCount - 1]);
	//console.log(JSON.stringify(fsmC));
	//TEST NEGATION
	fsmC.negatedPairs = fsmC.negatedPairs.map(function(x){
		//if the pair is the pair for a non-inner negation
		var n1, n2;
		n1 = x[0];
		n2 = x[1];
		if(x[0] === fsmC.origin) n1 = attachPoint;
		if(endPoint && contains(_.keys(fsmC.acceptStates).map(function(x){return parseInt(x);}), parseInt(x[1][0]))) n2 = [endPoint]; //TODO
		return [n1,n2];
	});

	this.attachNegatedPairs(fsmC, 0);

	var rootEdges = fsmC.graph[fsmC.origin];
	delete fsmC.graph[fsmC.origin];

	if(this.graph[attachPoint] === undefined) {
		this.graph[attachPoint] = {};
	}

	for(var k in rootEdges){
		this.graph[attachPoint][k] = rootEdges[k];
	}

	for(var j in fsmC.acceptStates){
		this.acceptStates[j] = fsmC.acceptStates[j];
	}

	for(var i in fsmC.graph){
		this.graph[i] = fsmC.graph[i];
	}

	//return this.getNodeCount();
}

FiniteStateMachine.prototype.deleteEdge = function(from, label, to){
	//Undefined handling
	if(this.graph[from] === undefined) return;
	if(this.graph[from][label] === undefined) return;

	//If there exists an edge, delete it
	//if(_.contains(this.graph[from][label], to)){
	//	removeFromArray(this.graph[from][label], to);
	//}

	//More consize
	this.graph[from][label] = _.reject(this.graph[from][label], function(x){ return (x === to); });

	//If above deletion was the last edge from a node, delete it.
	if(this.graph[from][label].length === 0){
		delete this.graph[from][label];
	}
}

FiniteStateMachine.prototype.addEdge = function(from, label, to){
	//new edge setup
	if(this.graph[from] === undefined){
		this.graph[from] = {};
	}

	if(!this.graph[from][label]){ //if there is not already an edge with this label
		this.graph[from][label] = [to];
	}
	else{ //if already an edge exists, we have to add the destination nodes
		if(this.graph[from][label].constructor !== Array){ //Wrap in an array
			this.graph[from][label] = [this.graph[from][label]];
		}
		if(!_.contains(this.graph[from][label], to)){
			this.graph[from][label].push(to);
		}
	}
}

FiniteStateMachine.prototype.replaceEdge = function(from, label, to, fsm){
	if(!fsm.acceptStates || fsm.acceptStates === {}){
		throw 'The fsm to be inserted doesn\'t have any accept states.';
	}

	if (this.graph[from][label].constructor !== Array){
		this.graph[from][label] = [this.graph[from][label]];
    }

    var offset = this.getNodeCount() - 1;
    this.attachGraph(from, fsm, to);

    //console.log(JSON.stringify(this));

    //for each of the edges pointing at the accept state of the graph
    //redirect them to point at dest
    for(var acc in fsm.acceptStates){
    	//console.log((parseInt(acc) + offset) + ' => ' + to);
    	this.retargetEdges(parseInt(acc) + offset, to);
    	delete this.acceptStates[parseInt(acc) + offset];
    }



    this.deleteEdge(from, label, to); 
    //console.log(JSON.stringify(this));
    this.renumberNodes();    

    return this;
}

FiniteStateMachine.prototype.renumberNodes = function(){
	//console.log("Start renumberNodes");
	var nodes = this.getNodeNames();
	var n;
	for(var i = 0; i < nodes.length; i++){
		n = nodes[i];
		if(parseInt(n) !== i){
			//console.log(n);
			//console.log(JSON.stringify(this));
			this.retargetEdges(parseInt(n), i);
			//console.log(JSON.stringify(this));
			//console.log('----');
			//console.log(this.acceptStates[n]);
			if(this.acceptStates[n] !== undefined){
				this.acceptStates[i] = this.acceptStates[n];
				delete this.acceptStates[n];
			} 
			this.graph[i] = this.graph[n];
			delete this.graph[n];

			//console.log(JSON.stringify(this));
			//console.log('Done renumbering for n = ' + n);
		}
	}
}
/*
def renumber!
    get_node_names.each_with_index do |n,ii|
      if n != ii
        retarget_edges(n,ii)
        @accept_states[ii] = @accept_states.delete(n) unless @accept_states[n].nil?
        @graph_hash[ii] = @graph_hash.delete(n)
      end
    end
    self
  end*/

FiniteStateMachine.prototype.incrementNodeLabels = function(amount){
	var newGraph = {};
	var newAcceptStates = {};
	var newSubGraph, toNodes, subGraph, value;
	for(var key in this.graph){
		subGraph = this.graph[key];
		newSubGraph = {};
		for(var subkey in subGraph){
			value = subGraph[subkey];
			if(value.constructor === Array){
				newSubGraph[subkey] = value.map(function(x){ return x + amount; });
			}
			else{
				newSubGraph[subkey] = value + amount;
			}
		}

		newGraph[parseInt(key) + amount] = newSubGraph; //we have to cast for some reason
	}

	for(var acc in this.acceptStates){
		newAcceptStates[parseInt(acc) + amount] = this.acceptStates[acc];
	}
     
    this.graph = newGraph;
    this.acceptStates = newAcceptStates; 
    this.origin += amount;
    this.negatedPairs = this.negatedPairs.map(function(x){
    	return [x[0] + amount,
    			x[1].map(function(y){
    				return parseInt(y) + amount;
    			})]
    });

}

FiniteStateMachine.prototype.retargetEdges = function(oldTarget, newTarget){
	var from, edge, label, to;
	for(var from in this.graph){
		edge = this.graph[from];
		for(var label in edge){
			to = edge[label];
			//console.log('replace what by what: ' + oldTarget + ' -> ' + newTarget);
			if(_.include(to, oldTarget)){ //als edge naar oude target, vervang deze door nieuwe
				this.addEdge(from, label, newTarget);
				this.deleteEdge(from, label, oldTarget);
				this.retargetNegatedPair(from, oldTarget, newTarget);
			}
		}
	}
	
}

/*
def retarget_edges(old_dest, new_dest)
    @graph_hash.each_pair do |node,edge_hash|
      edge_hash.each_pair do |label, dest|
        if dest.include? old_dest
          #puts "#{node}[#{label}] changed from #{dest} to #{new_dest}"
          add_edge(   node, label, new_dest)
          delete_edge(node, label, old_dest)
        end
      end
    end
    self
  end
*/

FiniteStateMachine.prototype.attachNegatedPairs = function(machine, offset){
	var curPair, newLeft, newRight;
	for(var j = 0; j < machine.negatedPairs.length; j++){

		curPair = machine.negatedPairs[j];
		newRight = curPair[1].map(function(x){return parseInt(x) + offset;});
		newLeft = parseInt(curPair[0]) + offset;
		if(!contains(this.negatedPairs, [newLeft, newRight])){
			this.negatedPairs.push([newLeft, newRight]);
		}
	}
}

FiniteStateMachine.prototype.retargetNegatedPair = function(from, oldTo, newTo){
	var curPair, replaced;
	for(var i = 0; i < this.negatedPairs.length; i++){
		curPair = this.negatedPairs[i];
		if(curPair[0] === from){
			replaced = curPair[1].map(function(x){
				return (parseInt(x) === oldTo) ? newTo : oldTo;
			});
			curPair[1] = replaced;
		}
	}
}

/**
 * MACHINES
 */

var CAT_MACHINE = function(label){
 	var obj = {};
 	obj[label] = [1];
 	return new FiniteStateMachine(	{ 1 : 'end' },
 									{ 
 										0 : obj 
 									}, 0, 'Cat'
 								 );
}

var ALT_MACHINE = function(){
 	return new FiniteStateMachine(	{ 5 : 'end' },
 									{ 
 										0 : { 'lambda' : [1,3] },
 										1 : { 0		   : [2]   }, //PENDING
 										2 : { 'lambda' : [5]   },
 										3 : { 0        : [4]   }, //PENDING
 										4 : { 'lambda' : [5]   }
 									}, 0, 'Alt'
 								 );
}

var KLEENE_MACHINE = function(){
 	return new FiniteStateMachine(	{ 3 : 'end' },
 									{ 
 										0 : { 'lambda' : [1,3] },
 										1 : { 0		   : [2]   }, //PENDING
 										2 : { 'lambda' : [1,3] }
 									}, 0, 'kleene'
 								 );
}

var PLUS_MACHINE = function(){
 	return new FiniteStateMachine(	{ 3 : 'end' },
 									{ 
 										0 : { 'lambda' : [1] },
 										1 : { 0		   : [2]   }, //PENDING
 										2 : { 'lambda' : [1,3] }
 									}, 0, 'plus'
 								 );
}

//https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
function clone(objectToBeCloned) {

  // Basis.
  if (!(objectToBeCloned instanceof Object)) {
    return objectToBeCloned;
  }
  var objectClone;
  
  // Filter out special objects.
  var Constructor = objectToBeCloned.constructor;
  switch (Constructor) {
    // Implement other special objects here.
    case RegExp:
      objectClone = new Constructor(objectToBeCloned);
      break;
    case Date:
      objectClone = new Constructor(objectToBeCloned.getTime());
      break;
    default:
      objectClone = new Constructor();
  }
  
  // Clone each property.
  for (var prop in objectToBeCloned) {
    objectClone[prop] = clone(objectToBeCloned[prop]);
  }
  
  return objectClone;
}

var flatten = function(arr){
	return [].concat.apply([], arr);
}
