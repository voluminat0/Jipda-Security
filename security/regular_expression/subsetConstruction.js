function SubsetConstruction(){
}

SubsetConstruction.prototype.toDFA = function(nfa){
	var nfaGraph = nfa.graph;
	var newGraph = {};
	var newAcceptStates = {};
	var newLabels = {};
	var states = [nfa.closureOf(nfa.origin)];
	var edgeLabels = nfa.getEdgeLabels();
	var state, label, closuresThroughLabel, node, closure, tmp;

	for(var i = 0; i < states.length; i++){
		state = states[i];
		newGraph[state] = {};
		for(var j = 0; j < edgeLabels.length; j++){
			label = edgeLabels[j];
			if(label === 'lambda') continue;
			closuresThroughLabel = [];
			for(var k = 0; k < state.length; k++){
				node = state[k];
				if(nfaGraph[node] === undefined || nfaGraph[node][label] === undefined) continue;
				closure = nfa.closureOf(nfaGraph[node][label]);
				if(!arrayContainsArray(closuresThroughLabel, closure)) closuresThroughLabel.push(closure);
			}

			if(closuresThroughLabel.length === 0) continue;
			closuresThroughLabel = flatten(closuresThroughLabel); //flatten closures
			newGraph[state][label] = closuresThroughLabel;
			if(!arrayContainsArray(states, closuresThroughLabel)) states.push(closuresThroughLabel);
		}

		tmp = nfa.acceptStateOfClosure(state);
		if(tmp) newAcceptStates[state] = nfa.acceptStateOfClosure(state);
		if(_.keys(newGraph[state]).length === 0) delete newGraph[state];
	}

	return this.cleanUpStates(new FiniteStateMachine(newAcceptStates,newGraph, nfa.origin, 'DFA'));
}

SubsetConstruction.prototype.cleanUpStates = function(nfa){
	//TODO
	var newGraph = {};
	var newAcceptStates = {};
	var tmp = {};
	var count = -1;
	var subGraph, toNode, newKey, label;

	console.log(nfa);

	//Number closures
	for(var key in nfa.graph){
		subGraph = nfa.graph[key];
		if(tmp[key] === undefined) tmp[key] = ++count; //todo check correct increment
		for(var edge in subGraph){
			toNode = subGraph[edge];
			if(tmp[toNode] === undefined) tmp[toNode] = ++count;			
		}
	}



	//Replace closures with their new node numbers
	for(var key in nfa.graph){
		newKey = tmp[key];
		newGraph[newKey] = {};
		for(var edge in nfa.graph[key]){
			toNode = nfa.graph[key][edge];
			newGraph[newKey][edge] = tmp[toNode];
		}
	}

	//Fill in accept states
	for(var key in nfa.acceptStates){
		label = nfa.acceptStates[key];
		newAcceptStates[tmp[key]] = label;
	}

	//Return the cleaned up fsm
	return new FiniteStateMachine(newAcceptStates, newGraph, 0, nfa.tpe);
}

var arrayContainsArray = function(multiArr, arr){
	var found = multiArr.find(function(elem){
							return arraysEqual(elem, arr);
						})
	return found;
}

var arraysEqual = function(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}