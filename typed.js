T = {
  'types': [this.__typeType], // ooo, Type is a Type!
  'Type': function(name, type) {
    this.name = name;
    this.type = type;
    this.typeChain = T.__getTypeChain(this.type);
  },
  '__typeType': new this.Type("Type", this.Type),
  'getTypeByName': function(name) {
    return this.__findTypeByName(name);
  },
  'getTypeByObject': function(typeObj) {
    return this.__findTypeByObject(typeObj);
  },
  // get the corresponding Type for things like Object and "Function"
  'getType': function(input) {
    // dogfooding here...
    // Checking if input is of Type String, though native methods ((typeof input == "string") || (input instanceof String)) would be simpler and faster here:
    if (this.is(input, this.__findTypeByObject(String))) {
      return this.getTypeByString(input);
    }
    else {
      return this.getTypeByObject(input);
    }
  },
  'getTypeType': function() {
    return this.__typeType;
  },
  
  'typeOf': function(obj) {
    var is = typeof obj;
    // if we have a primative (Number, String, or Boolean (plus Function)
    if (is != "object")
    {
      // ugly way to get Number, String, Boolean, and Function objects, since all Types are based upon objects
      var typeObj = eval(is.substr(0,1).toUpperCase() + is.substr(1));
    }
    // else we need to figure out the highest-level object in the given object's prototype chain and find it 
    else {
      // TODO
      // var typeObj = {};
    }
    return this.__findTypeByObject(typeObj);
  },
  '__findTypeByName': function(name) {
    // look up the actual Type in our list and return the one that matches our typeObj
    for (var k = 0; k < this.types.length; k++) {
      if (this.types[k].name == name) {
        return this.types[k];
      }
    }
    throw new Error(name + " is not a known Type");
  },
  '__findTypeByObject': function(typeObj) {
    // look up the actual Type in our list and return the one that matches our typeObj
    for (var k = 0; k < this.types.length; k++) {
      if (this.types[k].type == typeObj) {
        return this.types[k];
      }
    }
    throw new Error(typeObj + " is not a known Type");
  },
  'is': function(obj, type) {
    this.assertIsAType(type);
    return (this.typeOf(obj) == type);
  },
  'isSubtype': function(obj, type) {
    this.assertIsAType(type);
    return (this.typeOf(obj).isSubtypeOf(type));
  },
  'isSupertype': function(obj, type) {
    this.assertIsAType(type);
    return (this.typeOf(obj).isSupertypeOf(type));
  },
  'assertIsAType': function(type) {
    if (!(type instanceof this.Type) {
      throw new Error(type + " is not a Type");
    }
  },
  'assertObjectIsType': function(obj, type) {
    this.assertIsAType(type);
    if (!this.is(obj, type)) {
      throw new Error(obj + " is not a " + type);
    }
  },
  'assertObjectIsSubtype': function(obj, type) {
    this.assertIsAType(type);
    if (!(this.typeOf(obj).isSubtypeOf(type))) {
      thrown new Error(obj + " is not a child type of " + type);
    }
  },
  'assertObjectIsSupertype': function(obj, type) {
    this.assertIsAType(type);
    if (!(this.typeOf(obj).isSupertypeOf(type))) {
      thrown new Error(obj + " is not a parent type of " + type);
    }
  },
  'assertTypeIsType': function(type1, type2) {
    this.assertIsAType(type1);
    this.assertIsAType(type2);
    if (type1 != type2) {
      throw new Error(type1 + " is not " + type2);
    }
  }
  'assertTypeIsSubtype': function(child, parent) {
    this.assertIsAType(child);
    this.assertIsAType(parent);
    if (!child.isSubtypeOf(parent)) {
      throw new Error(child + " is not a subtype of " + parent);
    }
  },
  'assertTypeIsSupertype': function(parent, child) {
    this.assertIsAType(parent);
    this.assertIsAType(child);
    if (!parent.isSupertype(child)) {
      throw new Error(parent + " is not a supertype of " + child);
    }
  },
  'register': function(type) {
    this.assertIsAType(type);
    this.types.push(type);
  },
  // given a Type, return the chain of its Types all the way back to Object
  'getTypeChain': function(type) {
    this.assertIsAType(type);
    return this.__getTypeChain(type.type);
  },
  // given an object, return the chain of its Types all the way back to Object
  '__getTypeChain': function(obj) {
    var arr = [];
    
    // TODO: for obj.prototype... , arr.push(prototypeObj)
    
    // map arr's objects to Type objects found in this.types
    arr = arr.map(this.__findTypeByObject);
    
    // some nice helper methods
    arr.head = function() {
      return this.slice(0, 1);
    }
    arr.tail = function() {
      return this.slice(1); // only for Object will this be undefined
    }
    
    return arr;
  }
};

T.Type.prototype.toString = function() {
  return "Type " + this.name;
}

T.Type.prototype.is = function(type) {
  T.assertIsAType(type);
  return (this == type);
}

T.Type.prototype.isSubtypeOf = function(type) {
  T.assertIsAType(type);
  // a Type is not a subtype of itself
  if (this == type) {
    return false;
  }
  // 'this' (the Type calling the method) has 'type' in its type chain
  return (this.typeChain.indexOf(type) > -1);
}

T.Type.prototype.isSupertypeOf = function(type) {
  // make sure that type is a Type
  T.assertIsAType(type);
  // a Type is not a supertype of itself
  if (this == type) {
    return false;
  }
  // 'this' (the Type calling the method) is in the type chain of 'type'
  // or, put another way, 'type' (the Type calling the method) has 'this' in its type chain
  return (type.typeChain.indexOf(this) > -1);
}

// create Types for all standard types and register them
T.register(new T.Type("Object", Object));
T.register(new T.Type("Number", Number));
T.register(new T.Type("String", String));
T.register(new T.Type("Function", Function));
T.register(new T.Type("Date", Date));