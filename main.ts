// Register usage:
//    SP - stack pointer
//    r30 - LR
//    r29 - FP
//    r19..r28 - callee-saved registers
//    r18      - platform register
//    r17      - IP1
//    r16      - IP0
//    r9..r15  - temporary registers
//    r8       - indirect result location register
//    r0..r7   - parameter/result registers
const emit = console.log;

export class Environment {
  constructor(
    public locals: Map<string, number>,
    public nextLocalOffset: number,
    public exitLabel: Label,
  ) {}
}

export interface AST {
  emit(env: Environment): void;
  equals(other: AST): boolean;
}

export class Number implements AST {
  constructor(public value: number) {}

  emit(_: Environment) {
    emit(`\tldr\tx0, =${this.value}`);
  }

  equals(other: AST): boolean {
    return other instanceof Number && this.value == other.value;
  }
}

export class Id implements AST {
  constructor(public value: string) {}

  emit(env: Environment) {
    const offset = env.locals.get(this.value);
    if (offset) {
      emit(`\tldr\tx0, [x29, #${offset}]`);
    } else {
      throw Error(`Undefined variable: ${this.value}`);
    }
  }

  equals(other: AST): boolean {
    return other instanceof Id && this.value == other.value;
  }
}

export class Not implements AST {
  constructor(public term: AST) {}

  emit(env: Environment) {
    this.term.emit(env);
    emit("\tcmp\tx0, #1");
    emit("\tcset\tx0, ne");
  }

  equals(other: AST): boolean {
    return other instanceof Not && this.term.equals(other.term);
  }
}

export class Equal implements AST {
  constructor(public left: AST, public right: AST) {}

  emit(env: Environment) {
    this.left.emit(env);
    emit("\tstr\tx0, [sp, #-16]!");
    this.right.emit(env);
    emit("\tldr\tx1, [sp], #16");
    emit("\tcmp\tx1, x0");
    emit("\tcset\tx0, eq");
  }

  equals(other: AST): boolean {
    return other instanceof Equal && this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

export class NotEqual implements AST {
  constructor(public left: AST, public right: AST) {}

  emit(env: Environment) {
    this.left.emit(env);
    emit("\tstr\tx0, [sp, #-16]!");
    this.right.emit(env);
    emit("\tldr\tx1, [sp], #16");
    emit("\tcmp\tx1, x0");
    emit("\tcset\tx0, ne");
  }

  equals(other: AST): boolean {
    return other instanceof NotEqual && this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

export class Add implements AST {
  constructor(public left: AST, public right: AST) {}

  emit(env: Environment) {
    this.left.emit(env);
    emit("\tste\tx0, [sp, #-16]!");
    this.right.emit(env);
    emit("\tldr\tx1, [sp], #16");
    emit("\tadd\tx0, x1, x0");
  }

  equals(other: AST): boolean {
    return other instanceof Add && this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

export class Subtract implements AST {
  constructor(public left: AST, public right: AST) {}

  emit(env: Environment) {
    this.left.emit(env);
    emit("\tstr\tx0, [sp, #-16]!");
    this.right.emit(env);
    emit("\tldr\tx1, [sp], #16");
    emit("\tsub\tx0, x1, x0");
  }

  equals(other: AST): boolean {
    return other instanceof Subtract && this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

export class Multiply implements AST {
  constructor(public left: AST, public right: AST) {}

  emit(env: Environment) {
    this.left.emit(env);
    emit("\tstr\tx0, [sp, #-16]!");
    this.right.emit(env);
    emit("\tldr\tx1, [sp], #16");
    emit("\tmul\tx0, x1, x0");
  }

  equals(other: AST): boolean {
    return other instanceof Multiply && this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

export class Divide implements AST {
  constructor(public left: AST, public right: AST) {}

  emit(env: Environment) {
    this.left.emit(env);
    emit("\tstr\tx0, [sp, #-16]!");
    this.right.emit(env);
    emit("\tldr\tx1, [sp], #16");
    emit("\tdiv\tx0, x1, x0");
  }

  equals(other: AST): boolean {
    return other instanceof Divide && this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

export class Call implements AST {
  constructor(public callee: string, public args: AST[]) {}

  emit(env: Environment) {
    emit("\tsub\tsp, sp, #32");
    this.args.forEach((arg, i) => {
      arg.emit(env);
      emit(`\tstr\tx0, [sp, #${8 * i}]`);
    });
    emit("\tldp\tx0, x1, [sp], #16");
    emit("\tldp\tx2, x3, [sp], #16");
    emit(`\tbl\t_${this.callee}`);
  }

  equals(other: AST): boolean {
    return other instanceof Call && this.callee === other.callee &&
      this.args.length == other.args.length &&
      this.args.every((arg, i) => arg === other.args[i]);
  }
}

export class Return implements AST {
  constructor(public term: AST) {}

  emit(env: Environment) {
    this.term.emit(env);
    emit(`\tb\t${env.exitLabel}`);
  }

  equals(other: AST): boolean {
    return other instanceof Return && this.term.equals(other.term);
  }
}

export class Block implements AST {
  constructor(public statements: AST[]) {}

  emit(env: Environment) {
    this.statements.forEach((statement) => statement.emit(env));
  }

  equals(other: AST): boolean {
    return other instanceof Block &&
      this.statements.length === other.statements.length &&
      this.statements.every((stmt, i) => stmt.equals(other.statements[i]));
  }
}

export class If implements AST {
  constructor(
    public conditional: AST,
    public consequence: AST,
    public alternative: AST,
  ) {}

  emit(env: Environment) {
    const ifFalseLabel = new Label();
    const endIfLabel = new Label();

    this.conditional.emit(env);
    emit("\tcmp\tx0, #1");
    emit(`\tbne\t${ifFalseLabel}`);
    this.consequence.emit(env);
    emit(`\tb\t${endIfLabel}`);
    emit(`${ifFalseLabel}:`);
    this.alternative.emit(env);
    emit(`${endIfLabel}:`);
  }

  equals(other: AST): boolean {
    return other instanceof If && this.conditional.equals(other.conditional) &&
      this.consequence.equals(other.consequence) &&
      this.alternative.equals(other.alternative);
  }
}

export class Function implements AST {
  constructor(
    public name: string,
    public parameters: string[],
    public body: AST,
  ) {}

  emit(_: Environment | null) {
    if (this.parameters.length > 4) {
      throw Error("More than 4 params is not supported");
    }

    const env = this.setupEnvironment();

    emit(`\t.globl\t_${this.name}`);
    emit("\t.p2align\t2");
    emit(`_${this.name}:`);
    this.emitPrologue();
    this.body.emit(env);
    this.emitEpilogue(env);
  }

  emitPrologue() {
    // Save the link register and the frame pointer
    emit("\tstp\tx29, x30, [sp, #-16]!");
    // Setup the frame pointer
    emit("\tmov\tx29, sp");
    // Save the arguments
    emit("\tstp\tx2, x3, [sp, #-16]!");
    emit("\tstp\tx0, x1, [sp, #-16]!");
  }

  emitEpilogue(env: Environment) {
    // Default zero return
    emit("\tmov\tx0, #0");
    emit(`${env.exitLabel}:`)
    // Restore the stack pointer
    emit("\tmov\tsp, x29");
    // Restore the link register and the frame pointer
    emit("\tldp\tx29, x30, [sp], #16");
    emit("\tret");
  }

  setupEnvironment() {
    const locals = new Map();
    this.parameters.forEach((parameter, i) => {
      locals.set(parameter, 8 * i - 32);
    });
    const nextLocalOffset = -40;
    const exitLabel = new Label();
    return new Environment(locals, nextLocalOffset, exitLabel);
  }

  equals(other: AST): boolean {
    return other instanceof Function && this.name === other.name &&
      this.parameters.length === other.parameters.length &&
      this.parameters.every((param, i) => param === other.parameters[i]) &&
      this.body.equals(other.body);
  }
}

export class Var implements AST {
  constructor(public name: string, public value: AST) {}

  emit(env: Environment) {
    this.value.emit(env);
    emit(`\tstr\tx0, [sp, #-16]!`);
    env.locals.set(this.name, env.nextLocalOffset - 8);
    env.nextLocalOffset -= 16;
  }

  equals(other: AST): boolean {
    return other instanceof Var && this.name === other.name &&
      this.value.equals(other.value);
  }
}

export class Assign implements AST {
  constructor(public name: string, public value: AST) {}

  emit(env: Environment) {
    this.value.emit(env);
    const offset = env.locals.get(this.name);
    if (offset) {
      emit(`\tstr\tx0, [x29, #${offset}]`);
    } else {
      throw Error(`Undefined variable: ${this.name}`);
    }
  }

  equals(other: AST): boolean {
    return other instanceof Assign && this.name === other.name &&
      this.value.equals(other.value);
  }
}

export class While implements AST {
  constructor(public conditional: AST, public body: AST) {}

  emit(env: Environment) {
    const startLoopLabel = new Label();
    const endLoopLabel = new Label();

    emit(`${startLoopLabel}:`);
    this.conditional.emit(env);
    emit("\tcmp\tx0, #1");
    emit(`\tbne\t${endLoopLabel}`);
    this.body.emit(env);
    emit(`\tb\t${startLoopLabel}`);
    emit(`${endLoopLabel}:`);
  }

  equals(other: AST): boolean {
    return other instanceof While &&
      this.conditional.equals(other.conditional) &&
      this.body.equals(other.body);
  }
}

export class Module implements AST{
  constructor(public functions: Function[]) {}

  emit(env: Environment | null) {
    emit("\t.section\t__TEXT,__text,regular,pure_instructions");
    this.functions.forEach((func) => {
      emit("");
      func.emit(env);
    });
  }

  equals(other: AST): boolean {
    return other instanceof Module &&
      this.functions.length === other.functions.length &&
      this.functions.every((func, i) => func.equals(other.functions[i]));
  }
}

export class Assert implements AST {
  constructor(public condition: AST) {}

  emit(env: Environment) {
    this.condition.emit(env);
    emit("\tcmp\tx0, #1");
    emit("\tmov\tw0, #'.'");
    emit("\tmov\tw1, #'F'");
    emit("\tcsel\tw0, w0, w1, eq");
    emit("\tbl\t_putchar");
  }

  equals(other: AST): boolean {
    return other instanceof Assert && this.condition.equals(other.condition);
  }
}

class Label {
  static counter = 0;
  value: number;

  constructor() {
    this.value = Label.counter++;
  }

  toString() {
    return `.L${this.value}`;
  }
}

export class Source {
  constructor(public string: string, public index: number) {}

  match(regexp: RegExp): ParseResult<string> | null {
    console.assert(regexp.sticky);
    regexp.lastIndex = this.index;
    const match = this.string.match(regexp);
    if (match) {
      const value = match[0];
      const newIndex = this.index + value.length;
      const source = new Source(this.string, newIndex);
      return new ParseResult(value, source);
    }
    return null;
  }
}

export class ParseResult<T> {
  constructor(public value: T, public source: Source) {}
}

export class Parser<T> {
  constructor(public parse: (source: Source) => ParseResult<T> | null) {}

  static regexp(regexp: RegExp): Parser<string> {
    return new Parser((source) => source.match(regexp));
  }

  static constant<U>(value: U): Parser<U> {
    return new Parser((source) => new ParseResult(value, source));
  }

  static error<U>(message: string): Parser<U> {
    return new Parser((_) => {
      throw Error(message);
    });
  }

  or(parser: Parser<T>): Parser<T> {
    return new Parser((source) => {
      const result = this.parse(source);
      if (result) {
        return result;
      } else {
        return parser.parse(source);
      }
    });
  }

  static zeroOrMore<U>(parser: Parser<U>): Parser<U[]> {
    return new Parser((source) => {
      const results = [];
      let item;
      // deno-lint-ignore no-cond-assign
      while (item = parser.parse(source)) {
        source = item.source;
        results.push(item.value);
      }
      return new ParseResult(results, source);
    });
  }

  bind<U>(callback: (value: T) => Parser<U>): Parser<U> {
    return new Parser((source) => {
      const result = this.parse(source);
      if (result) {
        const value = result.value;
        const source = result.source;
        return callback(value).parse(source);
      }
      return null;
    });
  }

  and<U>(parser: Parser<U>): Parser<U> {
    return this.bind((_) => parser);
  }

  map<U>(callback: (t: T) => U): Parser<U> {
    return this.bind((value) => Parser.constant(callback(value)));
  }

  static maybe<U>(parser: Parser<U>): Parser<U | null> {
    return (parser as Parser<U | null>).or(Parser.constant(null));
  }

  parseStringToCompletion(string: string): T {
    const source = new Source(string, 0);
    const result = this.parse(source);
    if (!result) {
      throw Error("Parse error at index 0");
    }

    const index = result.source.index;
    if (index != result.source.string.length) {
      throw Error(`Parse error at index ${index}`);
    }

    return result.value;
  }
}

const { regexp, constant, error, zeroOrMore, maybe } = Parser;

const whitespace = regexp(/[ \n\r\t]+/y);
const comments = regexp(/[/][/].*/y).or(regexp(/[/][*].*[*][/]/sy));
const ignored = zeroOrMore(whitespace.or(comments));

const token = (pattern: RegExp) =>
  regexp(pattern).bind((value) => ignored.and(constant(value)));

const FUNCTION = token(/function\b/y);
const IF = token(/if\b/y);
const ELSE = token(/else\b/y);
const RETURN = token(/return\b/y);
const VAR = token(/var\b/y);
const WHILE = token(/while\b/y);

const ASSIGN = token(/=(?![=!])/y);
const COMMA = token(/,/y);
const SEMICOLON = token(/;/y);
const LEFT_PAREN = token(/[(]/y);
const RIGHT_PAREN = token(/[)]/y);
const LEFT_BRACE = token(/{/y);
const RIGHT_BRACE = token(/}/y);

const NUMBER = token(/[0-9]+/y).map((digits) => new Number(parseInt(digits)));

const ID = token(/[a-zA-Z_][a-zA-Z0-9_]*/y);
const id = ID.map((x) => new Id(x));

const NOT = token(/!/y).map((_) => Not);
const EQUAL = token(/==/y).map((_) => Equal);
const NOT_EQUAL = token(/!=/y).map((_) => NotEqual);
const PLUS = token(/[+]/y).map((_) => Add);
const MINUS = token(/-/y).map((_) => Subtract);
const STAR = token(/[*]/y).map((_) => Multiply);
const SLASH = token(/[/]/y).map((_) => Divide);

const expression: Parser<AST> = error(
  "expression parser used before definition",
);

// args <- (expression (COMMA expression)*)?
const args: Parser<AST[]> = expression.bind((arg) =>
  zeroOrMore(COMMA.and(expression)).bind((args) => constant([arg, ...args]))
).or(constant([]));

/// call <- ID LEFT_PAREN args RIGHT_PAREN
// TODO: better error checking for assert
const call: Parser<AST> = ID.bind((callee) =>
  LEFT_PAREN.and(
    args.bind((args) =>
      RIGHT_PAREN.and(
        constant(
          callee === "assert" ? new Assert(args[0]) : new Call(callee, args),
        ),
      )
    ),
  )
);

// atom <- call / ID / NUMBER / LEFT_PAREN expression RIGHT_PAREN
const atom: Parser<AST> = call.or(id).or(NUMBER).or(
  LEFT_PAREN.and(expression).bind((e) => RIGHT_PAREN.and(constant(e))),
);

// unary <- NOT? atom
const unary: Parser<AST> = maybe(NOT).bind((not) =>
  atom.map((term) => not ? new Not(term) : term)
);

const infix = (
  operatorParser: Parser<new (left: AST, right: AST) => AST>,
  termParser: Parser<AST>,
) =>
  termParser.bind((term) =>
    zeroOrMore(
      operatorParser.bind((operator) =>
        termParser.bind((term) => constant({ operator, term }))
      ),
    ).map((operatorTerms) =>
      operatorTerms.reduce(
        (left, { operator, term }) => new operator(left, term),
        term,
      )
    )
  );

// product <- unary ((STAR / SLASH) unary)*
const product: Parser<AST> = infix(STAR.or(SLASH), unary);

// sum <- product ((PLUS / MINUS) product)*
const sum: Parser<AST> = infix(PLUS.or(MINUS), product);

// comparison <- sum ((EQUAL / NOT_EQUAL) sum)*
const comparison: Parser<AST> = infix(EQUAL.or(NOT_EQUAL), sum);

// expression <- comparison
expression.parse = comparison.parse;

const statement: Parser<AST> = error("statement parser used before definition");

// returnStatement <- RETURN expression SEMICOLON
const returnStatement: Parser<AST> = RETURN.and(expression).bind((term) =>
  SEMICOLON.and(constant(new Return(term)))
);

// expressionStatement <- expression SEMICOLON
const expressionStatement: Parser<AST> = expression.bind((term) =>
  SEMICOLON.and(constant(term))
);

// ifStatement <- IF LEFT_PAREN expression RIGHT_PAREN statement ELSE statement
const ifStatement: Parser<AST> = IF.and(LEFT_PAREN).and(expression).bind((
  conditional,
) =>
  RIGHT_PAREN.and(statement).bind((consequence) =>
    ELSE.and(statement).bind((alternative) =>
      constant(new If(conditional, consequence, alternative))
    )
  )
);

// whileStatement <- WHILE LEFT_PAREN expression RIGHT_PAREN statement
const whileStatement: Parser<AST> = WHILE.and(LEFT_PAREN).and(expression).bind(
  (conditional) =>
    RIGHT_PAREN.and(statement).bind((body) =>
      constant(new While(conditional, body))
    ),
);

// varStatement <- VAR ID ASSIGN expression SEMICOLON
const varStatement: Parser<AST> = VAR.and(ID).bind((name) =>
  ASSIGN.and(expression).bind((value) =>
    SEMICOLON.and(constant(new Var(name, value)))
  )
);

// assignmentStatement <- ID ASSIGN EXPRESSION SEMICOLON
const assignmentStatement: Parser<AST> = ID.bind((name) =>
  ASSIGN.and(expression).bind((value) =>
    SEMICOLON.and(constant(new Assign(name, value)))
  )
);

// blockStatement <- LEFT_BRACE statement* RIGHT_BRACE
const blockStatement: Parser<Block> = LEFT_BRACE.and(zeroOrMore(statement))
  .bind(
    (statements) => RIGHT_BRACE.and(constant(new Block(statements))),
  );

// parameters <- (ID (COMMA ID)*)?
const parameters: Parser<string[]> = ID.bind((param) =>
  zeroOrMore(COMMA.and(ID)).bind((params) => constant([param, ...params]))
).or(constant([]));

// functionDecl <- FUNCTION ID LEFT_PAREN parameters RIGHT_PAREN blockStatement
const functionDecl: Parser<Function> = FUNCTION.and(
  ID.bind((name) =>
    LEFT_PAREN.and(parameters).bind((parameters) =>
      RIGHT_PAREN.and(blockStatement).bind((body) =>
        constant(new Function(name, parameters, body))
      )
    )
  ),
);

// statement <- returnStatement
//            / ifStatement
//            / whileStatement
//            / varStatement
//            / assignmentStatement
//            / blockStatement
//            / expressionStatement
const statementParser: Parser<AST> = returnStatement.or(ifStatement).or(
  whileStatement,
).or(varStatement).or(assignmentStatement).or(blockStatement).or(
  expressionStatement,
);

statement.parse = statementParser.parse;

export const parser: Parser<Module> = ignored.and(zeroOrMore(functionDecl)).map(
  (functions) => new Module(functions),
);

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
  `).emit(null);
}

if (import.meta.main) main();
