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
import { FunctionFrame } from "./function_frame.ts"

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
  #currentFrameInfo?: FunctionFrame;
  #exitLabel?: Label;

  constructor(public frameInfos: Map<string, FunctionFrame>) {}

  visitNumber(node: Number): void {
    emit(`\tldr\tx0, =${node.value}`);
  }

  visitId(node: Id): void {
    const offset = this.#currentFrameInfo!.getOffset(node)!;
    emit(`\tldr\tx0, [x29, #${-offset * 8}]`);
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
    this.#currentFrameInfo = this.frameInfos.get(node.name)!;
    this.#exitLabel = new Label();
  }

  private teardownEnvironment() {
    this.#currentFrameInfo = undefined;
    this.#exitLabel = undefined;
  }

  private emitPrologue(node: Function) {
    // Save the link register and the frame pointer
    emit("\tstp\tx29, x30, [sp, #-16]!");
    // Setup the frame pointer
    emit("\tmov\tx29, sp");
    // Save the arguments
    if (node.parameters.length > 8) {
        throw new Error("Maximum 8 arguments are supported");
    }

    let frameSize = Math.ceil(this.#currentFrameInfo!.frameSize / 2) * 16;

    if (node.parameters.length === 0 && frameSize > 0) {
        emit(`\tsub\tsp, sp, #${frameSize}`);
    } else {
        let argIndex = 0;
        let remainingArgs = node.parameters.length;

        while (remainingArgs > 0) {
            if (remainingArgs > 2) {
                emit(`\tstp\tx${argIndex + 1}, x${argIndex}, [sp, #-16]!`);
                remainingArgs -= 2;
                argIndex += 2;
                frameSize -= 16;
            } else if (remainingArgs == 2) {
                emit(`\tstp\tx${argIndex + 1}, x${argIndex}, [sp, #${-frameSize}]!`);
                remainingArgs -= 2;
            } else if (remainingArgs == 1) {
                emit(`\tstr\tx${argIndex}, [sp, #${-frameSize}]!`);
                remainingArgs -= 1;
            }
        }
    }
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
    this.emitPrologue(node);
    node.body.visit(this);
    this.emitEpilogue();

    this.teardownEnvironment();
  }

  visitVar(node: Var): void {
    node.value.visit(this);
    const offset = this.#currentFrameInfo!.getOffset(node)!;
    emit(`\tstr\tx0, [x29, #${-offset * 8}]`);
  }

  visitAssign(node: Assign): void {
    node.value.visit(this);
    const offset = this.#currentFrameInfo!.getOffset(node)!;
    emit(`\tstr\tx0, [x29, #${-offset * 8}]`);
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
