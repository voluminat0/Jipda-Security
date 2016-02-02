/*
 * G = States van JIPDA graph
 * P = Pattern (RPE)
 * F = Final states
 * v0 = initial state van G
 * s0 = initial state van P
 */
function ExistentialQuery(G, P, F, v0, s0){
	this.G = G;
	this.P = P;
	this.F = F;
	this.v0 = v0;
	this.s0 = s0;	
}

//HANDLE LAMBDA?
ExistentialQuery.prototype.runNaive = function(){
	//used variables
	var tripleG, tripleP, theta, theta2,
		tripleW, tripleTemp;
	//start algorithm
	var R = [];
	var W = [];
	for(var i = 0; i < this.G.length; i++){
		tripleG = this.G[i];
		if(tripleG.from.equals(this.v0)){ //Is de Jipda-node gelijk aan onze initial (Jipda-)node
			for(var j = 0; j < this.P.length; j++){
				tripleP = this.P[j];	
				if(tripleP.from.equals(this.s0)){ //Is de NFA-node gelijk aan de initial (NFA-)node
					//CHECK LAMBDA
					theta = this.match(tripleG.edge,tripleP.edge);
					tripleTemp = new WorklistTriple(tripleG.from, tripleP.target, theta[0]);
					if(tripleP.edge.name === 'lambda' && !this.contains(R, tripleTemp)){
						W = this.union(W, [tripleTemp]);
					}
					//else{
						for(var k = 0; k < theta.length; k++){
							W = this.union(W, [new WorklistTriple(tripleG.target, tripleP.target, theta[k])]);
						}
					//}
				}
			}
		}
	}
	var E = [];
	while(W.length > 0){
		tripleW = W.pop();
		R = this.union(R, [tripleW]);
		for(var i = 0; i < this.G.length; i++){
			tripleG = this.G[i];
			if(tripleG.from.equals(tripleW.v)){ //KLOPT DIT WEL????
				for(var j = 0; j < this.P.length; j++){
					tripleP = this.P[j];	
					if(tripleP.from.equals(tripleW.s)){ //KLOPT DIT WEL????
						//CHECK LAMBDA
						theta = this.match(tripleG.edge,tripleP.edge); //theta = [[{x:a},{callee:sink}]]
						tripleTemp = new WorklistTriple(tripleG.from, tripleP.target, theta[0]);	
						if(tripleP.edge.name === 'lambda' && !this.contains(R, tripleTemp)){
							W = this.union(W, [tripleTemp]);
						}
						//else{
							for(var k = 0; k < theta.length; k++){
								theta2 = this.merge(tripleW.theta, theta[k]);
								if(theta2){
									tripleTemp = new WorklistTriple(tripleG.target, tripleP.target, theta2);
									if(!this.contains(R, tripleTemp)){
										W = this.union(W, [tripleTemp]);
									}
								}
							}//end for
						//}
					}
				} //end for 
			}
		} //end for
		
		if(this.contains(this.F, tripleW.s)){
			E = this.union(E, [new VertexThetaPair(tripleW.v, tripleW.theta)]);
		}
	} //end while
	return E;
}


ExistentialQuery.prototype.runMemo = function(){
	//used variables
	var tripleG, tripleP, pairWts, theta, pairTemp, quintupleMts, theta2;
	//start algorithm
	var R = [];
	//START INITIALIZE WORKLIST
	var W = [];
	var Rts = [];
	var Wts = [];
	var Mts = [];
	for(var i = 0; i < this.G.length; i++){
		tripleG = this.G[i];
		if(tripleG.from.equals(this.v0)){
			for(var j = 0; j < this.P.length; j++){
				tripleP = this.P[j];
				if(tripleP.from.equals(this.s0)){
					theta = this.match(tripleG.edge,tripleP.edge); 
					for(var k = 0; k < theta.length; k++){
						W = this.union(W, [new WorklistTriple(tripleG.target, tripleP.target, theta[k])]);
						Wts = this.union(Wts, [new VertexPair(tripleG.target, tripleP.target)]);
						Mts = this.union(Mts, [new Quintuple(tripleG.from, tripleP.from, tripleG.target, tripleP.target, theta[k])]);
					}
				}
			}
		}
	}
	while(Wts.length > 0){
		pairWts = Wts.pop();
		Rts = this.union(Rts, [pairWts]);
		for(var i = 0; i < this.G.length; i++){
			tripleG = this.G[i];
			if(tripleG.from.equals(pairWts.v)){ 
				for(var j = 0; j < this.P.length; j++){
					tripleP = this.P[j];			
					if(tripleP.from.equals(pairWts.s)){
						theta = this.match(tripleG.edge,tripleP.edge);
						for(var k = 0; k < theta.length; k++){
							pairTemp = new VertexPair(tripleG.target, tripleP.target);
							if(!this.contains(Rts, pairTemp)){
								Wts = this.union(Wts, [pairTemp]);
								Mts = this.union(Mts, [new Quintuple(tripleG.from, tripleP.from, tripleG.target, tripleP.target, theta[k])])
							}
						}//end for
					}
				} //end for 
			}
		} //end for
	}
	//END INITIALIZE WORKLIST
	//START UPDATE WORKLIST
	var E = [];
	while(W.length > 0){
		tripleW = W.pop();
		R = this.union(R, [tripleW]);
		for(var i = 0; i < Mts.length; i++){
			quintupleMts = Mts[i];
			if(quintupleMts.vfrom.equals(tripleW.v) && quintupleMts.sfrom.equals(tripleW.s)){
				theta2 = this.merge(tripleW.theta, quintupleMts.theta);
				if(theta2){
					tripleTemp = new WorklistTriple(quintupleMts.vto, quintupleMts.sto, theta2);
					if(!this.contains(R, tripleTemp)){
						W = this.union(W, [tripleTemp]);
					}
				}
			}
		}
		if(this.contains(this.F, tripleW.s)){
			E = this.union(E, [new VertexThetaPair(tripleW.v, tripleW.theta)]);
		}
	} //end while
	//END UPDATE WORKLIST
	return E;
}

ExistentialQuery.prototype.match = function(el, tl){
	//Given an edge label el and a transition label tl, let match(tl,el), 
	//which takes a set of symbols as an implicit argument, be the set of minimal substitutions θ 
	//such that el matches tl under θ. The resulting set has at most one element when tl contains 
	//no negations but can be very large otherwise. For example, match(use(a),¬use(x)) is the set of 
	//substitutions of the form {x → b}, where b is any symbol other than a.
	var substitutions = [];
	var _map = [];
	switch(tl.name){
		case 'assign'		: 	_map = this.matchAssign(el, tl);
								break;
		case 'fCall'		: 	_map = this.matchFCall(el, tl); 
								break;
		case '_'			: 	_map = []; 
								break;
		case 'lambda'		: 	_map = []; 
								break;
		case 'dummy'		: 	_map = [];
								break;
		default:
			throw "Can not handle 'tl.name': " + tl.name + ". Source: ExistentialQuery.match(el, tl)"
	}
	//console.log(substitutions);
	substitutions.push(_map);
	//if(!Object.keys(_map).lenght === 0)
	//if(_.keys(_map).length > 0) {console.log('tet');substitutions.push(_map);}
	//console.log(_map);
	//substitutions.push(_map);
	return substitutions; //substitution
}

// MATCHING

ExistentialQuery.prototype.isWildCard = function(x){
	return x && (x === '_'); 
}

// TODO BLOCKSTATEMENTS MET 1 ELEMENT
// TODO CHECK FOR NOT/WILDCARDS
ExistentialQuery.prototype.matchAssign = function(el, tl){
	//tl can contain fields for: 
	//leftName
	var elInfo = el.node;
	var tlInfo = tl.state;
	var subst = [];
	var _map = {};
	if(elInfo && el.name === 'ExpressionStatement' && elInfo.expression.type === 'AssignExpression'){
		if(!this.isWildCard(tlInfo.leftName)) {
			//_map[tlInfo.leftName] = elInfo.expression.left.name;
			var obj = {};
			obj[tlInfo.leftName] = elInfo.expression.left.name;
			subst.push(obj);
		}
	}

	return subst;
}

ExistentialQuery.prototype.matchFCall = function(el, tl){
	//tl can contain fields for: 
	//argument
	//callee
	console.log('Match fCall:');
	console.log(el);
	console.log(tl);
	var elInfo = el.node;
	var tlInfo = tl.state;
	console.log('elInfo && el.name === \'ExpressionStatement\' && elInfo.expression.type === \'CallExpression\'');
	console.log(elInfo && el.name === 'ExpressionStatement' && elInfo.expression.type === 'CallExpression');

	var argumentFirstLiteral = function(args){
		for(var i = 0; i < args.length; i++){
			if(args[i].type === 'Literal') return args[i].name;
		}
	return false;
	}
	var subst = [];
	var _map = {};
	//Momenteel voor arguments enkel ondersteuning voor literals & single argument
	if(elInfo && el.name === 'CallExpression'){
		if (!this.isWildCard(tlInfo.argument)) {
			var obj = {}; 
			obj[tlInfo.argument] = argumentFirstLiteral(elInfo.arguments); 
			subst.push(obj);
			//_map[tlInfo.argument] = argumentFirstLiteral(elInfo.arguments);
		}
		if (!this.isWildCard(tlInfo.callee)){
			var obj = {}; 
			obj[tlInfo.callee] = elInfo.callee.name; 
			subst.push(obj);
			//_map[tlInfo.callee] = elInfo.callee.name;
		}
	}
	else if(elInfo && el.name === 'ExpressionStatement' && elInfo.expression.type === 'CallExpression'){
		if (!this.isWildCard(tlInfo.argument)) {
			var obj = {}; 
			obj[tlInfo.argument] = argumentFirstLiteral(elInfo.expression.arguments); 
			subst.push(obj);
			//_map[tlInfo.argument] = argumentFirstLiteral(elInfo.expression.arguments);
		}	
		if (!this.isWildCard(tlInfo.callee)){
			var obj = {}; 
			obj[tlInfo.callee] = elInfo.expression.callee.name; 
			subst.push(obj);
			//_map[tlInfo.callee] = elInfo.expression.callee.name;
		}
	}
	else if(elInfo && el.name === 'BlockStatement' && elInfo.body.length === 1 
			&& elInfo.body[0].type === 'ExpressionStatement' 
			&& elInfo.body[0].expression.type === 'CallExpression'){

		if (!this.isWildCard(tlInfo.argument)) {
			var obj = {}; 
			obj[tlInfo.argument] = argumentFirstLiteral(elInfo.body[0].expression.arguments); 
			subst.push(obj);
			//_map[tlInfo.argument] = argumentFirstLiteral(elInfo.body[0].expression.arguments);
		}
		if (!this.isWildCard(tlInfo.argument)) {
			var obj = {}; 
			obj[tlInfo.callee] =  elInfo.body[0].expression.callee.name ;
			subst.push(obj);
			//_map[tlInfo.callee] = elInfo.body[0].expression.callee.name;
		}
		//
	}
	return subst; //substitution
}
// END MATCHING

ExistentialQuery.prototype.merge = function(theta, otherTheta){
	//(1) undefined if any two substitutions in S disagree on the mapping 
	//of any variable in the intersection of their domains and 
	//(2) the union of the substitutions in S otherwise.
	//iterate over set 1
	/*for (var property in theta) {
	    if (theta.hasOwnProperty(property)) {
	        if(otherTheta[property]){
	        	if(otherTheta[property] !== theta[property]) return false;
	        }
	        else{
	        	otherTheta[property] = theta[property];
	        }
	    }
	}

	return otherTheta;*/
	var res = [];
	function mergeIterate(theta, otherTheta){
		var p;
		for(var i = 0; i < theta.length; i++){
			for(var prop in theta[i]){ //only one prop...
				if(theta[i].hasOwnProperty(prop)){
					p = findProp(otherTheta, prop);
					if(p){ //if property found, they need to match
						//if(p === '_'){ //If wildcard
							//Change otherTheta property
						//	setProp(otherTheta, prop, theta[i][prop]);
						//}
						//else if(theta[i][prop] === '_'){ //If wildcard
							//this is okay, otherTheta has correct value
						//}
						//else 
						if(!(p === theta[i][prop])){ //If not equal
							return false;
						}
					}
					else if(_.keys(theta[i]).length > 0){//not found
						otherTheta.push(theta[i]);
					}
				}
			}
		}
		return otherTheta;
	}

	function findProp(arr, prop){
		for(var i = 0; i <  arr.length; i++){
			for(var property in arr[i]){
				if(arr[i].hasOwnProperty(property)){
					if(property === prop) return arr[i][property];
				}
			}
		}
		return false;
	}

	/*function setProp(arr, prop, val){
		for(var i = 0; i <  arr.length; i++){
			for(var property in arr[i]){
				if(arr[i].hasOwnProperty(property)){
					if(property === prop) arr[i][property] = val;
				}
			}
		}
	}*/
	res = mergeIterate(theta, otherTheta);

	return res;
}

ExistentialQuery.prototype.union = function(set, otherSet, debug){
	var result = set.slice(0);
	
	for (var i = 0; i < otherSet.length; i++) {
        if (!this.contains(result, otherSet[i])) {
            result.push(otherSet[i]);
        }
    }
    if (debug) {
    	console.log(set);
	    console.log(result);
	    console.log('****');
	}
    return result;
}

ExistentialQuery.prototype.removeTriple = function(set, triple){
	return set.filter(function(x){
		return (x.from !== triple.from && x.target !== triple.target);
	});
}

ExistentialQuery.prototype.contains = function(set, elem){
	for (var i = 0; i < set.length; i++) {
        if (set[i].equals(elem) || set[i] === elem) {
            return true;
        }
    }
    return false;
}