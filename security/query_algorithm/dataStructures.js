function Query(rpe, type, direction){
  try{
    this.rpe = eval('var G = new JSQL(); ' + rpe);
  }
  catch(err){
    this.rpe = false;
    console.log(err);
  }
  
  this.type = type;
  this.direction = direction;
}

//EdgeLabel
function EdgeLabel(name, state, negated, expandFunction, expandContext)
{
  this.name = name || (state.node? state.node.type : '');
  //store info
  this.state = state || {};
  this.negated = negated || false;
  this.expandFunction = expandFunction || false;  
  this.expandContext = expandContext || false;
  this.negationMarkers = [];
}

EdgeLabel.prototype.equals = function (x)
{
  //TODO
  console.log('WHEREVER I AM CALLED, I MUST BE CORRECTED (EVAL/KONT/...STATE vs EDGELABEL')
    return  (x instanceof EdgeLabel)
        && this.name === x.name
        && this.negated === x.negated;
        //&& this.state._id === x.state._id || this.state.equals(x.state);
        //&& _.isEqual(this.info, x.info);
}

//GraphTriple
function GraphTriple(fromNode, edgeLabel, toNode, initial, final){
	this.from = fromNode;
	this.edge = edgeLabel;
	this.target = toNode;
	this.initial = initial || false;
	this.final = final || false;
}

GraphTriple.prototype.equals = function(x){
	//TODO
    return (x instanceof GraphTriple)
      && (this.from === x.from || this.from.equals(x.from))
      && (this.edge === x.edge || this.edge.equals(x.edge))
      && (this.target === x.target || this.target.equals(x.target));
}

GraphTriple.prototype.toString = function(x){
	var prefix = this.initial ? 'initial: ' : (this.final ? 'final: ' : '');
	var fts = '(' + this.from._id + ')';
	if(!this.final){
		var elts = '--' + (this.edge.node ? this.edge.node.type : '') + '-->';
		var tts = '(' + this.target._id + ')';
		return prefix + fts + elts + tts;
	}
	return prefix + fts;
}

//WorklistTriple
function WorklistTriple(v, s, theta){
	this.v = v;
	this.s = s;
	this.theta = theta;
}

WorklistTriple.prototype.equals = function(x){ //OK
	//TODO
    return (x instanceof WorklistTriple)
      && (this.v === x.v || this.v.equals(x.v))
      && (this.s === x.s || this.s.equals(x.s))
      && (this.theta === x.theta || equalTheta(this.theta, x.theta));
}

WorklistTriple.prototype.toString = function(){ //OK
	//TODO
    var str = this.v.toString() + ' & ' + this.s.toString() + ' {';
    for(var i = 0; i < this.theta.length; i++){
      for(var prop in this.theta[i]){
        if(this.theta[i].hasOwnProperty(prop)){
          props = true;
          str += prop + ' -> ' + this.theta[i][prop] + ', ';
        }
      }
    }
    return str.substring(0, str.length - 2) + '}';
}

//VertexThetaPair
function VertexThetaPair(v, theta){
	this.v = v;
	this.theta = theta;
}

//node, [{x:a},{y:b}]
VertexThetaPair.prototype.equals = function(x){
  //TODO
    return (x instanceof VertexThetaPair)
      && (this.v === x.v || this.v.equals(x.v))
      //&& true; //TODO Equality of array
      && (this.theta === x.theta || equalTheta(this.theta, x.theta)); //also equal if subsumes?
}

VertexThetaPair.prototype.toString = function(){
    var str = this.v.toString() + ' {';
    var props = false;
    for(var i = 0; i < this.theta.length; i++){
      for(var prop in this.theta[i]){
        if(this.theta[i].hasOwnProperty(prop)){
          props = true;
          str += prop + ' -> ' + this.theta[i][prop] + ', ';
        }
      }
    }
    
    str = props ?  str.substring(0, str.length - 2) : str;
    return  str + '}';
}

//DUMMY NODE TO CHECK ALGORITHM
function DummyNode(id){
	this._id = id || 0;
}

DummyNode.prototype.equals = function(x){
  return (x instanceof DummyNode) 
      && this._id === x._id;
}

DummyNode.prototype.toString = function(){
	return this._id;
}

//Vertexpair for memoization
function VertexPair(v, s){
  this.v = v;
  this.s = s;
}

VertexPair.prototype.equals = function(x){  
  return (x instanceof VertexPair)
      && (this.v === x.v || this.v.equals(x.v))
      && (this.s === x.s || this.s.equals(x.s));
}

//Quintuple
function Quintuple(vfrom, sfrom, vto, sto, theta){
  this.vfrom = vfrom; 
  this.sfrom = sfrom;
  this.vto = vto;
  this.sto = sto;
  this.theta = theta;
}

Quintuple.prototype.equals = function(x){
  return (x instanceof Quintuple)
      && (this.vfrom === x.vfrom || this.vfrom.equals(x.vfrom))
      && (this.sfrom === x.sfrom || this.sfrom.equals(x.sfrom))
      && (this.vto === x.vto || this.vto.equals(x.vto))
      && (this.sto === x.sto || this.sto.equals(x.sto))
      && (this.theta === x.theta || equalTheta(this.theta, x.theta));
}

//To indicate we are in a part of the pattern being negated
function NegationMarker(from, to, id, last){
  this.from = from;
  this.to = to;
  this.id = id;
  this.last = false || last;
}

//UTILITIES
var equalTheta = function(theta, otherTheta){
    function iterate(theta, otherTheta){
      var p;
      for(var i = 0; i < theta.length; i++){
        for(var prop in theta[i]){
          if(theta[i].hasOwnProperty(prop)){
            p = findProp(otherTheta, prop);
            if(p){ //if property found, they need to match
              if(!(p === theta[i][prop])){
                return false;
              }
            }
            else {//not found
              return false;
            }
          }
        }
      }
      return true;
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

    return iterate(theta, otherTheta);
}

function BundledResult(vals){
  this.vals = vals;
}
//ARRAY EQUALITY
//http://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript