import {
  Add,
  Assign,
  AST,
  Block,
  Call,
  Divide,
  Equal,
  Function,
  Id,
  If,
  Module,
  Multiply,
  Not,
  NotEqual,
  Number,
  Return,
  Subtract,
  Var,
  While,
} from "./ast.ts";

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
const blockStatement: Parser<AST> = LEFT_BRACE.and(zeroOrMore(statement))
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
