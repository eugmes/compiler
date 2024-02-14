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
import { FunctionFrame } from "./function_frame.ts";

// FIXME: per-function?
class Value {
  static #counter = 0;
  #value: number;

  constructor() {
    this.#value = Value.#counter++;
  }

  toString() {
    return `%${this.#value}`;
  }
}

// FIXME: make it per-function
class Label {
  static #counter = 0;
  #value: number;

  constructor() {
    this.#value = Label.#counter++;
  }

  toString() {
    return `^bb${this.#value}`;
  }
}

const ty = "i64";
const emit = console.log;

export class MlirCodegen implements Visitor<Value | undefined> {
  #currentFrame?: FunctionFrame;
  #frameVars?: Value[];

  constructor(public frameInfos: Map<string, FunctionFrame>) {}

  #emitLabel(label: Label) {
    emit(`  ${label}:`);
  }

  #emitBr(jumpLabel: Label, nextLabel: Label) {
    emit(`    cf.br ${jumpLabel}`);
    this.#emitLabel(nextLabel);
  }

  #loadNumber(n: number): Value {
    const v = new Value();
    emit(`    ${v} = arith.constant ${n} : ${ty}`);
    return v;
  }

  visitNumber(node: Number): Value {
    return this.#loadNumber(node.value);
  }

  visitId(node: Id): Value {
    const offset = this.#currentFrame!.getOffset(node)!;
    const ref = this.#frameVars![offset];
    const v = new Value();
    emit(`    ${v} = memref.load ${ref}[] : memref<${ty}>`);
    return v;
  }

  visitNot(node: Not): Value {
    const term = node.term.visit(this);
    const zero = this.#loadNumber(0);
    const one = this.#loadNumber(1);
    const cond = new Value();
    const v = new Value();
    emit(`    ${cond} = arith.cmpi eq, ${term}, ${one} : ${ty}`);
    emit(`    ${v} = arith.select ${cond}, ${zero}, ${one} : ${ty}`);
    return v;
  }

  #visitComp(node: { left: AST; right: AST }, pred: string): Value {
    const left = node.left.visit(this);
    const right = node.right.visit(this);

    const zero = this.#loadNumber(0);
    const one = this.#loadNumber(1);
    const cond = new Value();
    const v = new Value();

    emit(`    ${cond} = arith.cmpi ${pred}, ${left}, ${right} : ${ty}`);
    emit(`    ${v} = arith.select ${cond}, ${one}, ${zero} : ${ty}`);

    return v;
  }

  visitEqual(node: Equal): Value {
    return this.#visitComp(node, "eq");
  }

  visitNotEqual(node: NotEqual): Value {
    return this.#visitComp(node, "ne");
  }

  #visitArithOp(node: { left: AST; right: AST }, op: string): Value {
    const left = node.left.visit(this);
    const right = node.right.visit(this);

    const v = new Value();
    emit(`    ${v} = arith.${op} ${left}, ${right} : ${ty}`);
    return v;
  }

  visitAdd(node: Add): Value {
    return this.#visitArithOp(node, "addi");
  }

  visitSubtract(node: Subtract): Value {
    return this.#visitArithOp(node, "subi");
  }

  visitMultiply(node: Multiply): Value {
    return this.#visitArithOp(node, "muli");
  }

  visitDivide(node: Divide): Value {
    return this.#visitArithOp(node, "divsi"); // FIXME
  }

  visitCall(node: Call): Value {
    // TODO: add globals
    const args = node.args.map((arg) => arg.visit(this)!);
    const argStr = args.join(", ");
    const typeStr = Array(node.args.length).fill(ty).join(", ");
    const v = new Value();
    emit(`    ${v} = call @${node.callee}(${argStr}) : (${typeStr}) -> ${ty}`);
    return v;
  }

  visitReturn(node: Return): undefined {
    const term = node.term.visit(this);
    emit(`    return ${term} : ${ty}`);
    const wasteLabel = new Label();
    this.#emitLabel(wasteLabel);
  }

  visitBlock(node: Block): undefined {
    node.statements.forEach((statement, _) => statement.visit(this));
  }

  visitIf(node: If): undefined {
    const conditional = node.conditional.visit(this);

    const ifTrueLabel = new Label();
    const ifFalseLabel = new Label();
    const endIfLabel = new Label();

    emit(`    cf.switch ${conditional} : ${ty}, [`);
    emit(`      default: ${ifFalseLabel},`)
    emit(`      1: ${ifTrueLabel}`)
    emit("    ]");

    this.#emitLabel(ifTrueLabel);
    node.consequence.visit(this);
    this.#emitBr(endIfLabel, ifFalseLabel);
    node.alternative.visit(this);
    this.#emitBr(endIfLabel, endIfLabel);
  }

  visitFunction(node: Function): undefined {
    const argStr = node.parameters.map((param) => `%${param} : ${ty}`).join(
      ", ",
    );
    emit(`  func.func @${node.name}(${argStr}) -> ${ty} {`);

    const currentFrame = this.frameInfos.get(node.name)!;
    const frameVars: Value[] = [];

    for (let i = 0; i < currentFrame.frameSize; i++) {
      const v = new Value();
      emit(`    ${v} = memref.alloca() : memref<${ty}>`);
      frameVars.push(v);
    }

    node.parameters.forEach((param, i) => {
      emit(`    memref.store %${param}, ${frameVars[i]}[] : memref<${ty}>`);
    });

    this.#currentFrame = currentFrame;
    this.#frameVars = frameVars;
    node.body.visit(this);
    this.#currentFrame = undefined;
    this.#frameVars = undefined;

    const zero = this.#loadNumber(0);
    emit(`    return ${zero} : ${ty}`);
    emit("  }");
  }

  visitVar(node: Var): undefined {
    const value = node.value.visit(this);
    const offset = this.#currentFrame!.getOffset(node)!;
    const ref = this.#frameVars![offset];
    emit(`    memref.store ${value}, ${ref}[] : memref<${ty}>`);
  }

  visitAssign(node: Assign): undefined {
    const value = node.value.visit(this);
    const offset = this.#currentFrame!.getOffset(node)!;
    const ref = this.#frameVars![offset];
    emit(`    memref.store ${value}, ${ref}[] : memref<${ty}>`);
  }

  visitWhile(node: While): undefined {
    const loopStartLabel = new Label();
    const loopBodyLabel = new Label();
    const loopEndLabel = new Label();

    this.#emitBr(loopStartLabel, loopStartLabel);
    const conditional = node.conditional.visit(this);

    emit(`    cf.switch ${conditional} : ${ty}, [`);
    emit(`      default: ${loopEndLabel},`)
    emit(`      1: ${loopBodyLabel}`)
    emit("    ]");

    this.#emitLabel(loopBodyLabel);
    node.body.visit(this);
    this.#emitBr(loopStartLabel, loopEndLabel);
  }

  visitModule(node: Module): undefined {
    emit("module {");
    node.functions.forEach((func, _) => func.visit(this));

    emit("  func.func private @print(i64) -> i64"); // FIXME
    emit("}");
  }
}
