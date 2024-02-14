import { CodeGenerator } from "./codegen.ts";
import { parser } from "./parser.ts";
import { analyzeFrames } from "./function_frame.ts";
import { MlirCodegen } from "./mlir.ts";

function main() {
  const ast = parser.parseStringToCompletion(`
    function factorial_rec(n) {
      if (n == 1) {
        return 1;
      } else {
        return n * factorial_rec(n - 1);
      }
    }

    function factorial(n) {
      var result = 1;
      while (n != 1) {
        result = result * n;
        n = n - 1;
      }
      return result;
    }

    function print_args(a, b, c, d) {
      var e = 42;
      print(a);
      var f = 43;
      print(b);
      var g = 44;
      print(c);
      print(d);
      print(e);
      print(f);
      print(g);
    }

    function f() {
      var x = 1;
      {
        var x = 2;
      }
      print(x);
    }

    function g() {
      var x = 1;
      while (0) {
        var x = 2;
      }
      print(x);
    }

    function main() {
      print(42);
      print_args(1,2,3,4);
      print(factorial(5));
      print(factorial_rec(5));
      f();
      g();
    }
  `);

  const frameInfos = analyzeFrames(ast);
  ast.visit(new MlirCodegen(frameInfos));
}

if (import.meta.main) main();
