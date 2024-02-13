import { CodeGenerator } from "./codegen.ts";
import { parser } from "./parser.ts";

function main() {
  parser.parseStringToCompletion(`
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

    function main() {
      print(factorial(5));
      print(factorial_rec(5));
    }
  `).visit(new CodeGenerator());
}

if (import.meta.main) main();
