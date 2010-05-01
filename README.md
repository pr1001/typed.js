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

\* `typeof null` return `"object"`, suggesting that `null` could be considered an object. I disagree.

The tree organization of types means there must be a root type under which all types are descended. `Object` is _not_ the root, instead it is the artificial catch-all type `Any`:
    T.StringType.getTypeChain() // -> [T.StringType, T.ObjectType, T.AnyType]

`Any` can also be accessed at `T.Types` and has the following children:
    T.Types.children // -> [T.NullType, T.UnknownType, T.Object]
    T.typeOf(undefined) // -> T.AnyType

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

Many assertion methods are available. In all of them nothing is done if they pass, while an appropriate exception is thrown if not:

    T.assertObjectIsType("test", T.StringType) // no errors
    T.assertObjectIsSupertype("test", T.ObjectType) // Error "test is not a parent type of type Object."
    T.typeIsSupertype(T.StringType, T.ObjectType) // Error "type String is not a parent type of type Object."
    T.typeIsSupertype(T.ObjectType, T.StringType) // no errors

# To Do

- Type Conversions: Internal conversions are desirable between primitives and their corresponding classes, which typed uses. For example, from primitive `true` to `new Boolean(true)` and vice versa. This is done by `T.typeOf` but there may be other cases where it is desirable. User-defined implicit (ie automatic) conversions may also be nice.

- Type Requirements: Right now the arguments and return values of typedFunctions must equal the predetermined types. Users should be able to specify other options, namely supertypes or subtypes of the given types. Optional arguments would also be useful.

- Duck Typing: It'd rock. Related to this, user-defined methods to determine when an object is an instance of a type.

- A Native Array Type & Compound Types: Javascript does a bad job distinguishing Arrays from general objects. typed should do better. Specifically, Array should support compound types, things like `Array[String]`. A Type should be able to have 0-n internal type requirements.

- Automatic Type Registration: Rather than manually placing a user-defined type manually, typed should determine the best locate for the user.


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