typed.js is a library for working with types in Javascript. It is intended to be more consistent and robust that native Javascript type checking. Everything lives under the `T` object and type names are capitalized.

# Examples

Basic usage:

    T.getType(Number) // -> type Number
    T.getType("Function") // -> type Function
    T.getType("function") // -> type Unknown
    T.NumberType.getString() // -> "type Number"
    T.NumberType.name // -> "Number"
    T.NumberType.value === Number // -> true
    T.typeOf("test") // -> type String
    T.typeOf(true) // -> type Boolean
    
Native Javascript objects have corresponding types with logical relationships.

    T.StringType.isSubtypeOf(T.ObjectType) // -> true
    T.NullType.isSubtypeOf(T.ObjectType) // -> false*

\* `typeof null` returns `"object"`, suggesting that `null` could be considered an object. I disagree.

The tree organization of types means there must be a root type under which all types are descended. `Object` is _not_ the root, instead it is the artificial type `Unit`:
    T.StringType.getTypeChain() // -> [T.StringType, T.ObjectType, T.UnitType]

`Unit` can also be accessed at `T.Types` and has the following children:
    T.Types.children // -> [T.NullType, T.UnknownType, T.Object]
    T.typeOf(undefined) // -> T.UnitType

`UnknownType` is returned when a type is expected but one cannot be found:

    T.getType("an unknown type name") // -> T.UnknownType

You can define your own types:

    function A() {}
    var a = new A();
    T.getType(A) // -> type Function
    T.getType(a) // -> type Object
    var AType = new Type("A", A);
    T.ObjectType.addChild(AType);
    T.getType(a) // -> type A
    AType.getTypeChain() // -> [type AType, type Object, type Any]
    AType.children // -> []
    AType.parents // -> [T.ObjectType]*

\* While having multiple parents is technically possible in this system, many internal methods currently assume only one parent.

You can also define strongly-typed functions where both the input and output must match declared types. For example:

    var hello = T.typedFunction(
      {name: T.StringType, age: T.NumberType},
      T.StringType,
      function(name, age) {
        return "Hi, " + name + ", you are " + age + ".";
      }
    );
    hello("John Doe", 35) // -> "Hello, John Doe, you are 35."
    hello("John Doe", "35") // Error: Parameter age is not type Number.
    hello("John Doe") // Error: Missing one or more function parameters.
    
    var hello2 = T.typedFunction(
      {name: T.StringType, age:T.NumberType},
      T.StringType,
      function(name, age) { return age; }
    );
    hello2("John Doe", 35) // -> Error: Return value of type Number is not type String.
    
Strongly-typed functions can even be used to create class constructors. Note that because our constructor doesn't return anything we use the `T.Any` `TypeCondition`:

    var Person = T.typedFunction({name: T.StringType, age: T.NumberType}, T.Any, function(name, age) { this.name = name; this.age = age; });
    var jd = new Person("John Doe", 35);
    jd.name // -> "John Doe"
    var js = new Person("John Doe", "35"); // Error: Parameter age does not satisfy type condition of type Number with condition function condition(obj) { return T.is(obj, this.type); }
    T.typeOf(peter) // -> type Object
    T.is(peter, Person) // Error: function () { ... } is not a Type
    T.PersonType = new T.Type("Person", Person);
    T.ObjectType.addChild(T.PersonType);
    T.typeOf(peter) // -> type Person
    T.is(peter, T.PersonType) // -> true

Many testing methods are available. The standard ones return `true` or `false`. In the assertion methods nothing is done if the test passes, while an appropriate exception is thrown if not:

    T.is("test", T.StringType) // -> true
    T.assertObjectIsType("test", T.StringType) // no errors
    T.isSupertype("test", T.ObjectType) // -> false
    T.assertObjectIsSupertype("test", T.ObjectType) // Error: test is not a parent type of type Object.
    T.isSupertype(T.StringType, T.ObjectType) // -> true
    T.assertTypeIsSupertype(T.StringType, T.ObjectType) // Error: type String is not a parent type of type Object.
    T.isSupertype(T.ObjectType, T.StringType) // -> true
    T.assertTypeIsSupertype(T.ObjectType, T.StringType) // no errors
    
## Type Conditions

A `TypeCondition` is an extension of Type that provides a test to which objects can be submitted to see if they satisfy. The default test is simply whether the object has the specified type. However, you may wish provide your own, for instance when creating a `typedFunction`:

    var hello = T.typedFunction(
      {
        name: new T.TypeCondition(
          T.StringType,
          function(object) {
            return T.isSubtype(object, this.type);
          }
        )
      },
      T.StringType,
      function(name) {
        return "Hello. " + name.toString();
      }
    );
    function RichString(input) {
      this.value = input;
    }
    RichString.prototype = new String;
    RichString.prototype.toString = function toString() { return "I'm " + this.value; }
    hello(new RichString("John Doe")) // -> "Hello. I'm John Doe."

In the example above we've declared a strongly-typed function that takes object that is a subtype of String (including String itself) and returns a String. We then create a subtype of String, RichString, and prove that it works.

One `TypeCondition` is defined for you, `Any`. `T.Any` will always return true - that is, it matches `Unit` and all its subtypes.

## Implicit Type Conversions

An `Implicit` object that has been registered with typed's system of implicit type conversions will automatically be used to convert objects of the appropriate input type to the stated output type when the specific output type is desired. Note that the conversion function should *not* return a value if a valid conversion cannot be made. No return value, or rather that of `undefined`, is used as a signal that the conversion was unsuccessful and the next Implicit object should be tried.
    
    var string2Float = new T.Implicit(T.StringType, T.NumberType, function (object) {
      T.assertObjectIsType(object, T.StringType);
      var f = parseFloat(object.toString());
      if (!isNaN(f)) {
        return f;
      }
    });
    T.Implicits.register(string2Float);
    T.implicitlyConvert("1.0", T.NumberType) // -> 1
    T.implicitlyConvert("X1.0", T.NumberType) // -> "X1.0"
    T.implicitlyConvert("1.0", T.StringType) // -> "1.0"
    
Because implicit conversions can have dramatic effects on your type reasoning and can circumvent strong typing, you should use them with care. You are encouraged to only activate specific implicit conversions when you know they will save you time and lead to clearer code, for instance in an internal method.
    
`T.Implicits.activateOnRegistration` is set to `true` by default. You may set this to `false` to require an additional activation step. Implicits are activated and deactivated by calls to the appropriate methods with a variable number of Implicit object parameters. They remain registered (but not used!) regardless of their activation status.

    T.Implicits.activate(string2Float);
    T.Implicits.deactivate(string2Float);

Note that we've actually being using the two built-in implicit conversions, which convert between Types and TypeConditions, for input and output type parameters of the Implicit constructor. Here is an example of `string2Float` that takes any subtype of `String`, which could be useful if you create your own `RichString` implementation in the future:

    var string2Float = new T.Implict(
      new T.TypeCondition(
        T.StringType,
        function(object) {
          return T.isSubtype(object, T.StringType);
        }
      ),
      T.NumberType,
      function (object) {
        T.assertObjectIsSubtype(object, T.StringType);
        var f = parseFloat(object.toString());
        if (!isNaN(f)) {
          return f;
        }
      }
    );

## Arrays

Arrays can be strongly typed, allowing you to specify. All Types have corresponding Array subtypes.

    T.typeOf([true, false]) // -> type Array[Boolean]
    T.typeOf([1, 2]) // -> type Array[Number]
    T.is([1, "2"], T.ArrayStringType) // -> false
    T.isSubtype([1, "2"], T.ArrayType) // -> true
    T.typeOf([new Date(), {}]) // -> type Array[Any]
    T.is([1, 2], T.ArrayNumberType) // -> true

As you'll notice, right now heterogenous arrays are always found to be 'type Array[Any]'. Future versions of this library will attempt to find other, more-specific common ancestors.

Of course you can create your own Array types. Reusing our Person type from our earlier example:

    var ArrayPersonType = new T.Type("Array[Person]", Array, [Person]);
    T.ArrayType.addChild(ArrayPersonType);
    var people = [new Person("John Doe", 35), new Person("Jane Doe", 35)];
    T.is(people, ArrayPersonType) // -> true
    T.typeOf(people) // -> type Array[Person]
    
// Notice the addition of a third parameter to the Type constructor, the Type's inner types. This must an one-element Array of Types or TypeConditions (note that an implicit conversion is done from the former to the latter). Future version will let you specify multiple inner types.

# To Do

- Type Requirements: Optional arguments would be useful.

- Duck Typing: It'd rock. Related to this, using TypeConditions to determine when an object is an instance of a type. NOTE: It's probably possible right now if you write your TypeConditions carefully.

- Better Compound Types:  Arrays with heterogeneous contents should be of the lowest subclass possible, not the greatest (i.e. 'type Array[Any]'). For example, T.typeOf([1, boolean]) should return 'type Array[Object]' instead of 'type Array[Any]'. Also, support for Object-based compound types (e.g. 'type Object[Function]') and for multiple inner types (e.g. 'type Array[Number, Function]), which should probably be based upon the former.

- Automatic Type Registration: Rather than manually placing a user-defined type manually, typed should determine the best locate for the user.

- Figure out implicits and registration of implicit types such that this works: function A(){}; var a1 = new A(); T.is(a1, A) === true. Watch for introducing crazy implicits or littering the type tree with implicit temporary types.


# Credits

By Peter Robinett of [Bubble Foundry](http://www.bubblefoundry.com). Patches welcome. Released under the MIT license:

> Copyright (c) 2010 Peter Robinett
> 
> Permission is hereby granted, free of charge, to any person
> obtaining a copy of this software and associated documentation
> files (the "Software"), to deal in the Software without
> restriction, including without limitation the rights to use,
> copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the
> Software is furnished to do so, subject to the following
> conditions:
>
> The above copyright notice and this permission notice shall be
> included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
> EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
> OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
> NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
> HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
> WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
> FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
> OTHER DEALINGS IN THE SOFTWARE.