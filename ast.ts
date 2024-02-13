export interface AST {
  visit<T>(v: Visitor<T>): T;
  equals(other: AST): boolean;
}

export interface Visitor<T> {
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
