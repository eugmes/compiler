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

export interface AST {
  visit<T>(v: Visitor<T>): T;
  equals(other: AST): boolean;
}

interface Visitor<T> {
  visitNumber(node: Number): T;
  visitId(node: Id): T;
  visitNot(node: Not): T;
  visitEqual(node: Equal): T;
  visitNotEqual(node: NotEqual): T;
  visitAdd(node: Add): T;
  visitSubtract(node: Subtract): T;
  visitMultiply(node: Multiply): T;
  visitDivide(node: Divide): T;
  visitCall(node: Call): T;
  visitReturn(node: Return): T;
  visitBlock(node: Block): T;
  visitIf(node: If): T;
  visitFunction(node: Function): T;
  visitVar(node: Var): T;
  visitAssign(node: Assign): T;
  visitWhile(node: While): T;
  visitModule(node: Module): T;
}

export class Number implements AST {
  constructor(public value: number) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitNumber(this);
  }

  equals(other: AST): boolean {
    return other instanceof Number && this.value == other.value;
  }
}

export class Id implements AST {
  constructor(public value: string) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitId(this);
  }

  equals(other: AST): boolean {
    return other instanceof Id && this.value == other.value;
  }
}

export class Not implements AST {
  constructor(public term: AST) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitNot(this);
  }

  equals(other: AST): boolean {
    return other instanceof Not && this.term.equals(other.term);
  }
}

export class Equal implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitEqual(this);
  }

  equals(other: AST): boolean {
    return other instanceof Equal && this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

export class NotEqual implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitNotEqual(this);
  }

  equals(other: AST): boolean {
    return other instanceof NotEqual && this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

export class Add implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitAdd(this);
  }

  equals(other: AST): boolean {
    return other instanceof Add && this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

export class Subtract implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitSubtract(this);
  }

  equals(other: AST): boolean {
    return other instanceof Subtract && this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

export class Multiply implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitMultiply(this);
  }

  equals(other: AST): boolean {
    return other instanceof Multiply && this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

export class Divide implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitDivide(this);
  }

  equals(other: AST): boolean {
    return other instanceof Divide && this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

export class Call implements AST {
  constructor(public callee: string, public args: AST[]) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitCall(this);
  }

  equals(other: AST): boolean {
    return other instanceof Call && this.callee === other.callee &&
      this.args.length == other.args.length &&
      this.args.every((arg, i) => arg === other.args[i]);
  }
}

export class Return implements AST {
  constructor(public term: AST) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitReturn(this);
  }

  equals(other: AST): boolean {
    return other instanceof Return && this.term.equals(other.term);
  }
}

export class Block implements AST {
  constructor(public statements: AST[]) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitBlock(this);
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

  visit<T>(v: Visitor<T>): T {
    return v.visitIf(this);
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

  visit<T>(v: Visitor<T>): T {
    return v.visitFunction(this);
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

  visit<T>(v: Visitor<T>): T {
    return v.visitVar(this);
  }

  equals(other: AST): boolean {
    return other instanceof Var && this.name === other.name &&
      this.value.equals(other.value);
  }
}

export class Assign implements AST {
  constructor(public name: string, public value: AST) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitAssign(this);
  }

  equals(other: AST): boolean {
    return other instanceof Assign && this.name === other.name &&
      this.value.equals(other.value);
  }
}

export class While implements AST {
  constructor(public conditional: AST, public body: AST) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitWhile(this);
  }

  equals(other: AST): boolean {
    return other instanceof While &&
      this.conditional.equals(other.conditional) &&
      this.body.equals(other.body);
  }
}

export class Module implements AST {
  constructor(public functions: Function[]) {}

  visit<T>(v: Visitor<T>): T {
    return v.visitModule(this);
  }

  equals(other: AST): boolean {
    return other instanceof Module &&
      this.functions.length === other.functions.length &&
      this.functions.every((func, i) => func.equals(other.functions[i]));
  }
}

class CodeGenerator implements Visitor<void> {
  #locals?: Map<string, number>;
  #nextLocalOffset = 0;
  #exitLabel?: Label;

  visitNumber(node: Number): void {
    emit(`\tldr\tx0, =${node.value}`);
  }

  visitId(node: Id): void {
    const offset = this.#locals!.get(node.value);
    if (offset) {
      emit(`\tldr\tx0, [x29, #${offset}]`);
    } else {
      throw Error(`Undefined variable: ${node.value}`);
    }
  }

  visitNot(node: Not): void {
    node.term.visit(this);
    emit("\tcmp\tx0, #1");
    emit("\tcset\tx0, ne");
  }

  private prepareBinaryOp(node: { left: AST; right: AST }): void {
    node.left.visit(this);
    emit("\tstr\tx0, [sp, #-16]!");
    node.right.visit(this);
    emit("\tldr\tx1, [sp], #16");
  }

  visitEqual(node: Equal): void {
    this.prepareBinaryOp(node);
    emit("\tcmp\tx1, x0");
    emit("\tcset\tx0, eq");
  }

  visitNotEqual(node: NotEqual): void {
    this.prepareBinaryOp(node);
    emit("\tcmp\tx1, x0");
    emit("\tcset\tx0, ne");
  }

  visitAdd(node: Add): void {
    this.prepareBinaryOp(node);
    emit("\tadd\tx0, x1, x0");
  }

  visitSubtract(node: Subtract): void {
    this.prepareBinaryOp(node);
    emit("\tsub\tx0, x1, x0");
  }

  visitMultiply(node: Multiply): void {
    this.prepareBinaryOp(node);
    emit("\tmul\tx0, x1, x0");
  }

  visitDivide(node: Divide): void {
    this.prepareBinaryOp(node);
    emit("\tdiv\tx0, x1, x0");
  }

  visitCall(node: Call): void {
    if (node.args.length > 1) {
      emit("\tsub\tsp, sp, #32");
      node.args.forEach((arg, i) => {
        arg.visit(this);
        emit(`\tstr\tx0, [sp, #${8 * i}]`);
      });
      emit("\tldp\tx0, x1, [sp], #16");
      emit("\tldp\tx2, x3, [sp], #16");
    } else {
      // Don't use stack for functions with less than 2 arguments.
      node.args.forEach((arg, _i) => {
        arg.visit(this);
      });
    }
    emit(`\tbl\t_${node.callee}`);
  }

  visitReturn(node: Return): void {
    node.term.visit(this);
    emit(`\tb\t${this.#exitLabel}`);
  }

  visitBlock(node: Block): void {
    node.statements.forEach((statement) => statement.visit(this));
  }

  visitIf(node: If): void {
    const ifFalseLabel = new Label();
    const endIfLabel = new Label();

    node.conditional.visit(this);
    emit("\tcmp\tx0, #1");
    emit(`\tbne\t${ifFalseLabel}`);
    node.consequence.visit(this);
    emit(`\tb\t${endIfLabel}`);
    emit(`${ifFalseLabel}:`);
    node.alternative.visit(this);
    emit(`${endIfLabel}:`);
  }

  private setupEnvironment(node: Function) {
    const locals = new Map();
    node.parameters.forEach((parameter, i) => {
      locals.set(parameter, 8 * i - 32);
    });

    this.#locals = locals;
    this.#nextLocalOffset = -40;
    this.#exitLabel = new Label();
  }

  private teardownEnvironment() {
    this.#locals = undefined;
    this.#nextLocalOffset = 0;
    this.#exitLabel = undefined;
  }

  private emitPrologue() {
    // Save the link register and the frame pointer
    emit("\tstp\tx29, x30, [sp, #-16]!");
    // Setup the frame pointer
    emit("\tmov\tx29, sp");
    // Save the arguments
    emit("\tstp\tx2, x3, [sp, #-16]!");
    emit("\tstp\tx0, x1, [sp, #-16]!");
  }

  private emitEpilogue() {
    // Default zero return
    emit("\tmov\tx0, #0");
    emit(`${this.#exitLabel}:`);
    // Restore the stack pointer
    emit("\tmov\tsp, x29");
    // Restore the link register and the frame pointer
    emit("\tldp\tx29, x30, [sp], #16");
    emit("\tret");
  }

  visitFunction(node: Function): void {
    if (node.parameters.length > 4) {
      throw Error("More than 4 params is not supported");
    }

    this.setupEnvironment(node);

    emit(`\t.globl\t_${node.name}`);
    emit("\t.p2align\t2");
    emit(`_${node.name}:`);
    this.emitPrologue();
    node.body.visit(this);
    this.emitEpilogue();

    this.teardownEnvironment();
  }

  visitVar(node: Var): void {
    node.value.visit(this);
    emit(`\tstr\tx0, [sp, #-16]!`);
    this.#locals!.set(node.name, this.#nextLocalOffset - 8);
    this.#nextLocalOffset -= 16;
  }

  visitAssign(node: Assign): void {
    node.value.visit(this);
    const offset = this.#locals!.get(node.name);
    if (offset) {
      emit(`\tstr\tx0, [x29, #${offset}]`);
    } else {
      throw Error(`Undefined variable: ${node.name}`);
    }
  }

  visitWhile(node: While): void {
    const startLoopLabel = new Label();
    const endLoopLabel = new Label();

    emit(`${startLoopLabel}:`);
    node.conditional.visit(this);
    emit("\tcmp\tx0, #1");
    emit(`\tbne\t${endLoopLabel}`);
    node.body.visit(this);
    emit(`\tb\t${startLoopLabel}`);
    emit(`${endLoopLabel}:`);
  }

  visitModule(node: Module): void {
    emit("\t.section\t__TEXT,__text,regular,pure_instructions");
    node.functions.forEach((func) => {
      emit("");
      func.visit(this);
    });
  }
}

class Label {
  static #counter = 0;
  #value: number;

  constructor() {
    this.#value = Label.#counter++;
  }

  toString() {
    return `.L${this.#value}`;
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

export class Parser<out T> {
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
const call: Parser<AST> = ID.bind((callee) =>
  LEFT_PAREN.and(
    args.bind((args) =>
      RIGHT_PAREN.and(
        constant(new Call(callee, args)),
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
  `).visit(new CodeGenerator());
}

if (import.meta.main) main();
