T = {
  '__flattenArr': function __flattenArr(input) {
    if (!(input instanceof Array)) {
      return [input];
    } else if (input.length == 1) {
      return input;
    }
    
    var newArr = [];
    for (var k = 0; k < input.length; k++) {
      newArr = newArr.concat(__flattenArr(input[k]));
    }
    return newArr;
  },
  // FIXME: Will this work for custom types? Think so because descends childtypes, then aggregates. But what about fact am not using instanceof?
  '__findTypeByObject': function __findTypeByObject(obj, type) {
    // null == undefined but null !== undefined
    //  only for non-Objects
    if (obj === type.value) {
      return type;
    } else if (type.children.length > 0) {
      var childTypes = type.children.map(function(childType) {
        return __findTypeByObject(obj, childType);
      });
      // flatten array (necessary?)
      childTypes = T.__flattenArr(childTypes);
      // remove UnknownTypes
      childTypes = childTypes.filter(function(aType) {
        return (aType != T.UnknownType);
      })
      // if anything left, return it (should be one, but even if there isn't for some strange reason, just take the first element of the arr)
      if (childTypes.length > 0) {
        return childTypes.shift();
      }
      // else, return UnknownType
      return T.UnknownType;
    }
    // nowhere else to search, so unknown
    return T.UnknownType;
  },
  '__findTypeByString': function __findTypeByString(name, type) {
    // compare search string to the name of the current type
    if (name === type.name) {
      return type;
    } else if (type.children.length > 0) {
      var childTypes = type.children.map(function(childType) {
        return __findTypeByString(name, childType);
      });
      // flatten array (necessary?)
      childTypes = T.__flattenArr(childTypes);
      // remove UnknownTypes
      childTypes = childTypes.filter(function(aType) {
        return (aType != T.UnknownType);
      })
      // if anything left, return it (should be one, but even if there isn't for some strange reason, just take the first element of the arr)
      if (childTypes.length > 0) {
        return childTypes.shift();
      }
      // else, return UnknownType
      return T.UnknownType;
    } else {
       // nowhere else to search, so unknown
      return T.UnknownType;
    } el
  },
  '__findTypeByInstance': function __findTypeByInstance(instance, type) {
    // if given null or undefined, which can't be checked via instanceof
    if ((type.children.length == 0) && (instance === type.value)) {
      return type;
    }
    // else if has no children and is an instance of the type
    else if ((type.children.length == 0) && (type.value instanceof Object) && (instance instanceof type.value)) {
      return type;
    }
    
    // collect types from children
    var childTypes = type.children.map(function(childType) {
      return __findTypeByInstance(instance, childType);
    });
    // flatten
    childTypes = T.__flattenArr(childTypes);
    // remove UnknownTypes
    childTypes = childTypes.filter(function(aType) {
      return (aType != T.UnknownType);
    })
    
    // if anything left, return it (should be one, but even if there isn't for some strange reason, just take the first element of the arr)
    if (childTypes.length > 0) {
      return childTypes.shift();
    }
    // else if no type from children and given null or undefined, which can't be checked via instanceof
    else if (instance === type.value) {
      return type;
    }
    // else if no type from children and is an instance of the type
    else if ((type.value instanceof Object) && (instance instanceof type.value)) {
      return type;
    }
    
    // else, return UnknownType
    return T.UnknownType;
  },
  '__getProtoObjects': function __getProtoObjects(obj) {
    // if obj.__proto__ is null then obj is Object
    if (obj.__proto__ == null) {
      return [];
    } else {
      return T.__flattenArr([obj].concat(this.__getProtoObjects(obj.__proto__)));
    }
  },
  '__getTypeChain': function __getTypeChain(type) {
    if (type.parents.length == 0) {
      // at the end
      return type;
    }
    var parents = type.parents.map(function (parentType) {
      return __getTypeChain(parentType);
    });
    return T.__flattenArr([type].concat(parents));
  },
  '__type2TypeCondition': function __type2TypeCondition(type) {
    T.assertIsType(type);
    return new T.TypeCondition(type);
  },
  '__typeCondition2Type': function __typeCondition2Type(typeCondition) {
    T.assertObjectIsType(typeCondition, T.TypeConditionType);
    return typeCondition.type;
  },
  'Type': function Type(name, value) {
    this.name = name;
    this.value = value;
    this.children = [];
    this.parents = [];
  },
  'TypeCondition': function TypeCondition(type, condition) {
    T.assertIsType(type);
    this.type = type;
    // if condition is defined
    if (T.isSubtype(condition, T.FunctionType)) {
      // override the default condition
      this.condition = condition;
    }
  },
  'Implicit': function Implicit(input, output, f) {
    if (!T.isType(input) && !T.is(input, T.TypeConditionType)) {
      throw new Error("The input parameter of an Implicit must be a Type or TypeCondition.");
    }
    if (!T.isType(output) && !T.is(output, T.TypeConditionType)) {
      throw new Error("The output parameter of an Implicit must be a Type or TypeCondition.");
    }
    T.assertObjectIsSubtype(f, T.FunctionType);
    
    // convert input and output to TypeConditions if necessary
    if (T.isType(input)) {
      input = T.__type2TypeCondition(input);
    }
    if (T.isType(output)) {
      output = T.__type2TypeCondition(output);
    }
    
    this.input = input;
    this.output = output;
    this.convert = f;
  },
  // get the corresponding Type for things from references like Object and "Function"
  'getType': function(input) {
    // dogfooding here...
    // Checking if input is of Type String
    if (this.is(input, this.StringType)) {
      return this.getTypeByString(input);
    }
    else {
      return this.getTypeByObject(input);
    }
  },
  'getTypeByObject': function getTypeByObject(input) {
    return this.__findTypeByObject(input, this.Types);
  },
  'getTypeByString': function getTypeByString(input) {
    return this.__findTypeByString(input, this.Types);
  },
  'getTypeByInstance': function getTypeByInstance(input) {
    return this.__findTypeByInstance(input, this.Types);
  },
  // get the type of anything
  'typeOf': function(obj) {
    var is = typeof obj;
    if (is == "undefined") {
      return this.AnyType;
    }
    // else if we have a primitive (Number, String, or Boolean (plus Function)
    else if (is != "object")
    {
      // ugly way to get Number, String, Boolean, and Function objects, since all Types are based upon objects
      return this.getTypeByObject(eval(is.substr(0,1).toUpperCase() + is.substr(1)));
    }
    // stupid Javascript!
    // typeof null -> "object"
    // null instanceof null -> TypeError: Can't use instanceof on a non-object.
    else if (obj === null) {
      return this.NullType;
    }
    // else we've got an object
    // go through its proto objects (plus itself) and look for a type
    var objs = [obj].concat(this.__getProtoObjects(obj))
    for (var k = 0; k < objs.length; k++) {
      var tmp = objs[k]
      var type = this.getTypeByObject(tmp);
      // if we've a match, immediately return since we're going from specific to general
      if (type != this.UnknownType) {
        return type;
      }
      // else go through the tree from the bottom up and see whether the object is an intance of any of the types
      type = this.getTypeByInstance(tmp)
      // if we've a match, immediately return since we're going from specific to general
      if (type != this.UnknownType) {
        return type;
      }
    }
    // fallbacks
    if (obj instanceof Object) { return this.ObjectType; }
    // else we're really screwed
    return this.AnyType;
  },
  'is': function(obj, type) {
    this.assertIsType(type);
    return (this.typeOf(obj) == type);
  },
  'isType': function(obj) {
    return (obj instanceof this.Type);
  },
  // given a Type, return the chain of its Types all the way back to Object
  'getTypeChain': function(type) {
    this.assertIsType(type);
    return this.__getTypeChain(type);
  },
  'isSubtype': function(obj, type) {
    this.assertIsType(type);
    return (this.typeOf(obj).isSubtypeOf(type));
  },
  'isSupertype': function(obj, type) {
    this.assertIsType(type);
    return (this.typeOf(obj).isSupertypeOf(type));
  },
  'typedFunction': function typedFunction(input, output, f) {
    // take an object, convert to an array for internal use
    var inputArr = [];
    for (var i in input) {      
      var tmp = input[i];
      if (!T.isType(tmp) && !T.is(tmp, T.TypeConditionType)) {
        throw new Error("Each function parameter must be defined with a Type or TypeCondition.");
      }
      // convert input and output to TypeConditions if necessary
      if (T.isType(tmp)) {
        tmp = T.__type2TypeCondition(tmp);
      }
      inputArr.push({'parameter': i, 'typeCondition': tmp});
    }
    
    // check the output value
    if (!T.isType(output) && !T.is(output, T.TypeConditionType)) {
      throw new Error("The expected output must be a Type or TypeCondition.");
    }
    // convert input and output to TypeConditions if necessary
    if (T.isType(output)) {
      output = T.__type2TypeCondition(output);
    }
    
    return function() {
      // get the function's arguments
      var argsArr = Array.prototype.slice.call(arguments);
      if (argsArr.length < inputArr.length) {
        throw new Error("Missing one or more function parameters.");
      }
      
      // get that each argument is the expected type
      for (var k = 0; k < argsArr.length; k++) {
        if (!inputArr[k].typeCondition.test(argsArr[k])) {
          throw new Error("Parameter " + inputArr[k].parameter + " does not satisfy " + inputArr[k].typeCondition);
        }
      }
      
      // call the function with the arguments
      var result = f.apply(f, argsArr);
      
      // check that the return type statisfies the output TypeCondition
      if (!output.test(result)) {
        throw new Error("Return value of " + T.typeOf(result) + " does not satisfy " + output);
      }
      // return the result
      return result;
    }
  },
  'implicitlyConvert': function implicitlyConvert(obj, type) {
    // no need to convert, as the object is already of the correct type
    if (T.is(obj, type)) {
      return obj;
    }
    
    var objType = T.typeOf(obj);
    
    // get all implicits that go from objType -> type
    var usefulImplicits = [];
    for (var k = 0; k < T.Implicits.__active.length; k++) {
      var implicit = T.Implicits.__active[k];
      // if an exact match, try conversion now
      if (objType.is(implicit.input.type) && type.is(implicit.output.type)) {
        var ret = implicit.convert(obj);
        // if we got a valid result, return it immediately
        if (T.isSubtype(ret, T.ObjectType)) {
          return ret;
        }
        //  otherwise continue on
      } else if (implicit.input.test(objType) && implicit.output.test(type)) {
        // else if use the implicit if it has a broader match (ie perhaps a subtype test)
        usefulImplicits.push(implicit);
      }
    }
    // sort usefulImplicits according to typeChain of objType?

    // loop through usefulImplicits
    for (var k = 0; k < usefulImplicits.length; k++) {
      // try converting
      var ret = usefulImplicits[k].convert(obj);
      // if we got a valid result, return it immediately
      if (T.isSubtype(ret, T.ObjectType)) {
        return ret;
      }
      //  otherwise continue on
    }
        
    // if we get here we've failed, just return the original value
    return obj;
  },
  'assertIsType': function(type) {
    if (!(type instanceof this.Type)) {
      throw new Error(type + " is not a Type");
    }
  },
  'assertObjectIsType': function(obj, type) {
    this.assertIsType(type);
    if (!this.is(obj, type)) {
      throw new Error(obj + " is not a " + type);
    }
  },
  'assertObjectIsSubtype': function(obj, type) {
    this.assertIsType(type);
    if (!(this.typeOf(obj).isSubtypeOf(type))) {
      throw new Error(obj + " is not a child type of " + type);
    }
  },
  'assertObjectIsSupertype': function(obj, type) {
    this.assertIsType(type);
    if (!(this.typeOf(obj).isSupertypeOf(type))) {
      throw new Error(obj + " is not a parent type of " + type);
    }
  },
  'assertTypeIsType': function(type1, type2) {
    this.assertIsType(type1);
    this.assertIsType(type2);
    if (type1 != type2) {
      throw new Error(type1 + " is not " + type2);
    }
  },
  'assertTypeIsSubtype': function(child, parent) {
    this.assertIsType(child);
    this.assertIsType(parent);
    if (!child.isSubtypeOf(parent)) {
      throw new Error(child + " is not a subtype of " + parent);
    }
  },
  'assertTypeIsSupertype': function(parent, child) {
    this.assertIsType(parent);
    this.assertIsType(child);
    if (!parent.isSupertypeOf(child)) {
      throw new Error(parent + " is not a supertype of " + child);
    }
  }
};

T.Type.prototype.toString = function toString() {
  return "type " + this.name;
}

T.Type.prototype.is = function is(type) {
  T.assertIsType(type);
  return (this == type);
}
T.Type.prototype.addChild = function addChild(anotherType) {
  if (!(anotherType instanceof T.Type)) {
    throw new Error("A Type can only extent another Type.");
  }
  // prevent duplicates and loops
  if (!(anotherType in this.children)) {
    this.children.push(anotherType);
  }
  if (!(this in anotherType.parents)) {
    anotherType.parents.push(this);
  }
}
T.Type.prototype.addParent = function addParent(anotherType) {
  // prevent duplicates and loops
  if (!(this in anotherType.children)) {
    anotherType.children.push(this);
  }
  if (!(anotherType in this.parents)) {
    this.parents.push(anotherType);
  }
}
T.Type.prototype.getTypeChain = function getTypeChain() {
  return T.__getTypeChain(this);
}
// NOTE: a Type is considered both a subtype and a supertype of itself
T.Type.prototype.isSubtypeOf = function isSubtypeOf(type) {
  T.assertIsType(type);
  var chain = this.getTypeChain();
  for (var k = 0; k < chain.length; k++) {
    if (type == chain[k]) { return true; }
  }
  return false;
}
T.Type.prototype.isSupertypeOf = function isSubtypeOf(type) {
  T.assertIsType(type);
  var chain = type.getTypeChain();
  for (var k = 0; k < chain.length; k++) {
    if (this == chain[k]) { return true; }
  }
  return false;
}

// by default the condition is one of equality
T.TypeCondition.prototype.toString = function toString() {
  return "type condition of " + this.type + " with condition " + this.condition;
}
T.TypeCondition.prototype.condition = function condition(obj) {
  return T.is(obj, this.type);
}
T.TypeCondition.prototype.test = function test(obj) {
  return this.condition(obj);
}

T.Implicit.prototype.toString = function toString() {
  return "Implicit from " + this.input.type + " to " + this.output.type;
}

// all types descend from Any
T.AnyType = new T.Type("Any", undefined);
T.Types = T.AnyType;

// special Javascript types that can never be objectified
T.NullType = new T.Type("Null", null);
T.Types.addChild(T.NullType);
T.UnknownType = new T.Type("Unknown", undefined);
T.Types.addChild(T.UnknownType);

// create Types for all standard types and place them in the appropriate points on the type tree
T.ObjectType = new T.Type("Object", Object);
T.Types.addChild(T.ObjectType);
T.TypeType = new T.Type("Type", T.Type); // Type is a Type!
T.ObjectType.addChild(T.TypeType);
T.TypeConditionType = new T.Type("TypeCondition", T.TypeCondition);
T.TypeType.addChild(T.TypeConditionType); // TypeCondition is a subtype of Type
T.ImplicitType = new T.Type("Implicit", T.Implicit);
T.TypeType.addChild(T.ImplicitType); // TypeCondition is a subtype of Type
T.BooleanType = new T.Type("Boolean", Boolean);
T.ObjectType.addChild(T.BooleanType);
T.NumberType = new T.Type("Number", Number);
T.ObjectType.addChild(T.NumberType);
T.StringType = new T.Type("String", String);
T.ObjectType.addChild(T.StringType);
T.FunctionType = new T.Type("Function", Function);
T.ObjectType.addChild(T.FunctionType);
T.DateType = new T.Type("Date", Date);
T.ObjectType.addChild(T.DateType);

T.Implicits = {}
T.Implicits.__all = [];
T.Implicits.all = function all() { return this.__all; }
T.Implicits.__active = [];
T.Implicits.activateOnRegistration = true;
T.Implicits.activate = function activate() {
  var argsArr = Array.prototype.slice.call(arguments);
  
  // check that all args are Implicits
  for (var k = 0; k < argsArr.length; k++) {
    T.assertObjectIsType(argsArr[k], T.ImplicitType);
  }

  // loop through args, adding each Implicit to __active if it is not already there
  for (var k = 0; k < argsArr.length; k++) {
    if (T.Implicits.__active.indexOf(argsArr[k]) == -1) {
      // add the element
      T.Implicits.__active.push(argsArr[k]);
    }
  }  
}
T.Implicits.deactivate = function deactivate() {
  var argsArr = Array.prototype.slice.call(arguments);
  
  // check that all args are Implicits
  for (var k = 0; k < argsArr.length; k++) {
    T.assertObjectIsType(argsArr[k], T.ImplicitType);
  }
  
  // loop through args, removing each Implicit from __active if it is there
  for (var k = 0; k < argsArr.length; k++) {
    var locInArr = T.Implicits.__active.indexOf(argsArr[k]);
    if (locInArr > -1) {
      // remove the element
      T.Implicits.__active.splice(locInArr, 1);
    }
  }

}
T.Implicits.register = function register(implicit) {
  T.assertObjectIsType(implicit, T.ImplicitType);
  
  // if not already in the __all array
  if (T.Implicits.__all.indexOf(implicit) == -1) {
    T.Implicits.__all.push(implicit);
  }
  
  // if we should also active
  if (T.Implicits.activateOnRegistration) {
    T.Implicits.activate(implicit);
  }
}
// register our basic implicits to convert between Types and TypeConditions
T.Implicits.register(new T.Implicit(T.TypeType, T.TypeConditionType, T.__type2TypeCondition));
T.Implicits.register(new T.Implicit(T.TypeConditionType, T.TypeType, T.__typeCondition2Type));
