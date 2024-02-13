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
  Visitor,
  While,
} from "./ast.ts";

export type IdMap = Map<Id | Assign | Var, number>;

export class FunctionFrame {
  idMap: IdMap = new Map();
  #nameMap: Map<string, number> = new Map();
  frameSize = 0;

  addArgument(name: string) {
    if (this.#nameMap.has(name)) {
      throw new Error(`Duplicate definition of argument ${name}`);
    }

    const id = this.frameSize++;
    this.#nameMap.set(name, id);
  }

  addLocal(v: Var) {
    const id = this.frameSize++;
    this.#nameMap.set(v.name, id);
    this.idMap.set(v, id);
  }

  mapLocal(v: Id | Assign) {
    const name = (v instanceof Id) ? v.value : v.name;
    const id = this.#nameMap.get(name);
    if (id === undefined) {
      throw new Error(`Undefined variable ${name}`);
    }

    this.idMap.set(v, id);
  }

  getOffset(node: Id | Assign | Var): number | undefined {
    return this.idMap.get(node);
  }
}

class FunctionFrameAnalysis implements Visitor<void> {
  #currentFrame?: FunctionFrame;
  functionFrames: Map<string, FunctionFrame> = new Map();

  visitNumber(_: Number): void {}

  visitId(node: Id): void {
    this.#currentFrame!.mapLocal(node);
  }

  visitNot(node: Not): void {
    node.term.visit(this);
  }

  #visitBinOp(node: { left: AST; right: AST }): void {
    node.left.visit(this);
    node.right.visit(this);
  }

  visitEqual(node: Equal): void {
    this.#visitBinOp(node);
  }

  visitNotEqual(node: NotEqual): void {
    this.#visitBinOp(node);
  }

  visitAdd(node: Add): void {
    this.#visitBinOp(node);
  }

  visitSubtract(node: Subtract): void {
    this.#visitBinOp(node);
  }

  visitMultiply(node: Multiply): void {
    this.#visitBinOp(node);
  }

  visitDivide(node: Divide): void {
    this.#visitBinOp(node);
  }

  visitCall(node: Call): void {
    node.args.forEach((arg, _) => arg.visit(this));
  }

  visitReturn(node: Return): void {
    node.term.visit(this);
  }

  visitBlock(node: Block): void {
    node.statements.forEach((statement, _) => statement.visit(this));
  }

  visitIf(node: If): void {
    node.conditional.visit(this);
    node.alternative.visit(this);
    node.consequence.visit(this);
  }

  visitFunction(node: Function): void {
    if (this.functionFrames.has(node.name)) {
      throw new Error(`Redefinition of function ${node.name}`);
    }

    this.#currentFrame = new FunctionFrame();
    node.parameters.forEach((value, _) =>
      this.#currentFrame!.addArgument(value)
    );

    node.body.visit(this);

    this.functionFrames.set(node.name, this.#currentFrame);
    this.#currentFrame = undefined;
  }

  visitVar(node: Var): void {
    node.value.visit(this);
    this.#currentFrame!.addLocal(node);
  }

  visitAssign(node: Assign): void {
    node.value.visit(this);
    this.#currentFrame!.mapLocal(node);
  }

  visitWhile(node: While): void {
    node.conditional.visit(this);
    node.body.visit(this);
  }

  visitModule(node: Module): void {
    node.functions.forEach((func, _) => func.visit(this));
  }
}

export function analyzeFrames(ast: AST): Map<string, FunctionFrame> {
  const analysis = new FunctionFrameAnalysis();
  ast.visit(analysis);
  return analysis.functionFrames;
}
