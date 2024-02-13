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

export class CodeGenerator implements Visitor<void> {
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
