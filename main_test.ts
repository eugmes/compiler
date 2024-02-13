import {
  assert,
  assertEquals,
  assertInstanceOf,
} from "https://deno.land/std@0.215.0/assert/mod.ts";
import {
  Assign,
  Block,
  Function,
  Id,
  Module,
  Multiply,
  NotEqual,
  Number,
  Return,
  Subtract,
  Var,
  While,
} from "./ast.ts";
import { Parser, parser, ParseResult, Source } from "./parser.ts";

Deno.test(function sourceTest() {
  const source = new Source("hello1 bye2", 0);
  const result = Parser.regexp(/hello[0-9]/y).parse(source);

  assertInstanceOf(result, ParseResult<string>);
  assertEquals(result.value, "hello1");
  assertEquals(result.source.index, 6);
});

Deno.test(function parserTest() {
  const source = `
    function factorial(n) {
      var result = 1;
      while (n != 1) {
        result = result * n;
        n = n - 1;
      }
      return result;
    }
  `;
  const expected = new Module([
    new Function(
      "factorial",
      ["n"],
      new Block([
        new Var("result", new Number(1)),
        new While(
          new NotEqual(new Id("n"), new Number(1)),
          new Block([
            new Assign("result", new Multiply(new Id("result"), new Id("n"))),
            new Assign("n", new Subtract(new Id("n"), new Number(1))),
          ]),
        ),
        new Return(new Id("result")),
      ]),
    ),
  ]);

  const result = parser.parseStringToCompletion(source);
  assert(result.equals(expected), `${JSON.stringify(result)}`);
});
