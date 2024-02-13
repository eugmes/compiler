	.section	__TEXT,__text,regular,pure_instructions

	.globl	_factorial_rec
	.p2align	2
_factorial_rec:
	stp	x29, x30, [sp, #-16]!
	mov	x29, sp
	stp	x2, x3, [sp, #-16]!
	stp	x0, x1, [sp, #-16]!
	ldr	x0, [x29, #-32]
	stp	x0, xzr, [sp, #-16]!
	ldr	x0, =1
	ldp	x1, xzr, [sp], #16
	cmp	x1, x0
	cset	x0, eq
	cmp	x0, #1
	bne	.L1
	ldr	x0, =1
	b	.L0
	b	.L2
.L1:
	ldr	x0, [x29, #-32]
	stp	x0, xzr, [sp, #-16]!
	sub	sp, sp, #32
	ldr	x0, [x29, #-32]
	stp	x0, xzr, [sp, #-16]!
	ldr	x0, =1
	ldp	x1, xzr, [sp], #16
	sub	x0, x1, x0
	str	x0, [sp, #0]
	ldp	x0, x1, [sp], #16
	ldp	x2, x3, [sp], #16
	bl	_factorial_rec
	ldp	x1, xzr, [sp], #16
	mul	x0, x1, x0
	b	.L0
.L2:
	mov	x0, #0
.L0:
	mov	sp, x29
	ldp	x29, x30, [sp], #16
	ret

	.globl	_factorial
	.p2align	2
_factorial:
	stp	x29, x30, [sp, #-16]!
	mov	x29, sp
	stp	x2, x3, [sp, #-16]!
	stp	x0, x1, [sp, #-16]!
	ldr	x0, =1
	stp	x0, xzr, [sp, #-16]!
.L4:
	ldr	x0, [x29, #-32]
	stp	x0, xzr, [sp, #-16]!
	ldr	x0, =1
	ldp	x1, xzr, [sp], #16
	cmp	x1, x0
	cset	x0, ne
	cmp	x0, #1
	bne	.L5
	ldr	x0, [x29, #-48]
	stp	x0, xzr, [sp, #-16]!
	ldr	x0, [x29, #-32]
	ldp	x1, xzr, [sp], #16
	mul	x0, x1, x0
	str	x0, [x29, #-48]
	ldr	x0, [x29, #-32]
	stp	x0, xzr, [sp, #-16]!
	ldr	x0, =1
	ldp	x1, xzr, [sp], #16
	sub	x0, x1, x0
	str	x0, [x29, #-32]
	b	.L4
.L5:
	ldr	x0, [x29, #-48]
	b	.L3
	mov	x0, #0
.L3:
	mov	sp, x29
	ldp	x29, x30, [sp], #16
	ret

	.globl	_main
	.p2align	2
_main:
	stp	x29, x30, [sp, #-16]!
	mov	x29, sp
	stp	x2, x3, [sp, #-16]!
	stp	x0, x1, [sp, #-16]!
	sub	sp, sp, #32
	sub	sp, sp, #32
	ldr	x0, =5
	str	x0, [sp, #0]
	ldp	x0, x1, [sp], #16
	ldp	x2, x3, [sp], #16
	bl	_factorial
	str	x0, [sp, #0]
	ldp	x0, x1, [sp], #16
	ldp	x2, x3, [sp], #16
	bl	_print
	sub	sp, sp, #32
	sub	sp, sp, #32
	ldr	x0, =5
	str	x0, [sp, #0]
	ldp	x0, x1, [sp], #16
	ldp	x2, x3, [sp], #16
	bl	_factorial_rec
	str	x0, [sp, #0]
	ldp	x0, x1, [sp], #16
	ldp	x2, x3, [sp], #16
	bl	_print
	mov	x0, #0
.L6:
	mov	sp, x29
	ldp	x29, x30, [sp], #16
	ret
