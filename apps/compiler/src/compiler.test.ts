import assert from "node:assert/strict";
import { test } from "node:test";
import { Compiler, ValueKind } from "./compiler";
import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstFilterNode,
	AstForNode,
	AstIfNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstLiteralStringNode,
	AstRawTextNode,
	AstRootNode,
	AstTemplateNode,
} from "./ast";
import { Context } from "./context";

test("Compiler outputs simple literal number", () => {
	const context = new Context();
	const compiler = new Compiler(new AstRootNode([new AstTemplateNode(new AstLiteralNumberNode(42))]), context);

	const output = compiler.compile();

	assert.equal(output, "42");
});

test("Compiler outputs value of 42 + 21", () => {
	const context = new Context();
	const compiler = new Compiler(
		new AstRootNode([
			new AstTemplateNode(
				new AstBinaryExpressionNode(
					new AstLiteralNumberNode(42),
					new AstBinaryOperatorNode("OP_PLUS"),
					new AstLiteralNumberNode(21)
				)
			),
		]),
		context
	);

	const output = compiler.compile();

	assert.equal(output, "63");
});

test("Compiler outputs value of 42 * (21 + 7)", () => {
	const context = new Context();
	const rootNode = new AstRootNode([
		new AstTemplateNode(
			new AstBinaryExpressionNode(
				new AstLiteralNumberNode(42),
				new AstBinaryOperatorNode("OP_MULTIPLY"),
				new AstBinaryExpressionNode(
					new AstLiteralNumberNode(21),
					new AstBinaryOperatorNode("OP_PLUS"),
					new AstLiteralNumberNode(7)
				)
			)
		),
	]);
	const compiler = new Compiler(rootNode, context);

	const output = compiler.compile();

	assert.equal(output, "1176");
});

test("Compiler outputs value of 42 + (10 / (4 - 1))", () => {
	const context = new Context();
	const compiler = new Compiler(
		new AstRootNode([
			new AstTemplateNode(
				new AstBinaryExpressionNode(
					new AstLiteralNumberNode(42),
					new AstBinaryOperatorNode("OP_PLUS"),
					new AstBinaryExpressionNode(
						new AstLiteralNumberNode(10),
						new AstBinaryOperatorNode("OP_DIVIDE"),
						new AstBinaryExpressionNode(
							new AstLiteralNumberNode(4),
							new AstBinaryOperatorNode("OP_MINUS"),
							new AstLiteralNumberNode(1)
						)
					)
				)
			),
		]),
		context
	);

	const output = compiler.compile();

	assert.equal(output, "45.333333333333336");
});

test("Compiler outputs value of number filter application", () => {
	const context = new Context();
	const compiler = new Compiler(
		new AstRootNode([new AstTemplateNode(new AstFilterNode("double", [new AstLiteralNumberNode(21)]))]),
		context
	);

	const output = compiler.compile();

	assert.equal(output, "42");
});

test("Compiler outputs value of string filter application", () => {
	const context = new Context();
	const compiler = new Compiler(
		new AstRootNode([new AstTemplateNode(new AstFilterNode("uppercase", [new AstLiteralStringNode("hello, world!")]))]),
		context
	);

	const output = compiler.compile();

	assert.equal(output, "HELLO, WORLD!");
});

test("Compiler outputs success clause in if statement", () => {
	const context = new Context({ variables: new Map([["x", { kind: ValueKind.STRING, value: "Hello, world!" }]]) });
	const compiler = new Compiler(
		new AstRootNode([
			new AstIfNode(
				new AstBinaryExpressionNode(
					new AstLiteralIdentifierNode("x"),
					new AstBinaryOperatorNode("OP_EQ"),
					new AstLiteralStringNode("Hello, world!")
				),
				[new AstRawTextNode("In success clause!")],
				[]
			),
		]),
		context
	);

	const output = compiler.compile();

	assert.equal(output, "In success clause!");
});

test("Compiler outputs multiple success clauses in if statement", () => {
	const context = new Context({ variables: new Map([["x", { kind: ValueKind.STRING, value: "Hello, world!" }]]) });
	const compiler = new Compiler(
		new AstRootNode([
			new AstIfNode(
				new AstBinaryExpressionNode(
					new AstLiteralIdentifierNode("x"),
					new AstBinaryOperatorNode("OP_EQ"),
					new AstLiteralStringNode("Hello, world!")
				),
				[new AstRawTextNode("In success clause!"), new AstRawTextNode("In success clause2!")],
				[]
			),
		]),
		context
	);

	const output = compiler.compile();

	assert.equal(output, "In success clause!In success clause2!");
});

test("Compiler outputs failure clause in if statement", () => {
	const context = new Context({
		variables: new Map([["x", { kind: ValueKind.STRING, value: "Hello, world!" }]]),
	});
	const compiler = new Compiler(
		new AstRootNode([
			new AstIfNode(
				new AstBinaryExpressionNode(
					new AstLiteralIdentifierNode("x"),
					new AstBinaryOperatorNode("OP_NE"),
					new AstLiteralStringNode("Hello, world!")
				),
				[new AstRawTextNode("In success clause!")],
				[new AstRawTextNode("In failure clause!")]
			),
		]),
		context
	);

	const output = compiler.compile();

	assert.equal(output, "In failure clause!");
});

test("Compiler outputs nested clauses in if statement", () => {
	const context = new Context({
		variables: new Map([
			["x", { kind: ValueKind.STRING, value: "Hello, world!" }],
			["y", { kind: ValueKind.NUMBER, value: 2 }],
		]),
	});
	const compiler = new Compiler(
		new AstRootNode([
			new AstIfNode(
				new AstBinaryExpressionNode(
					new AstLiteralIdentifierNode("x"),
					new AstBinaryOperatorNode("OP_EQ"),
					new AstLiteralStringNode("Hello, world!")
				),
				[
					new AstRawTextNode("In success clause!"),
					new AstIfNode(
						new AstBinaryExpressionNode(
							new AstLiteralIdentifierNode("y"),
							new AstBinaryOperatorNode("OP_EQ"),
							new AstLiteralNumberNode(10)
						),
						[],
						[new AstRawTextNode("y is not 10!")]
					),
				],
				[]
			),
		]),
		context
	);

	const output = compiler.compile();

	assert.equal(output, "In success clause!y is not 10!");
});

test("Compiler outputs for loop", () => {
	const context = new Context({
		variables: new Map([
			[
				"y",
				{
					kind: ValueKind.ARRAY,
					value: [
						{ kind: ValueKind.NUMBER, value: 1 },
						{ kind: ValueKind.NUMBER, value: 2 },
						{ kind: ValueKind.NUMBER, value: 3 },
					],
				},
			],
		]),
	});
	const compiler = new Compiler(
		new AstRootNode([
			new AstForNode(new AstLiteralIdentifierNode("x"), new AstLiteralIdentifierNode("y"), [
				new AstTemplateNode(new AstLiteralIdentifierNode("x")),
			]),
		]),
		context
	);

	const output = compiler.compile();

	assert.equal(output, "123");
});

test("Compiler outputs nested for loop", () => {
	const context = new Context({
		variables: new Map([
			[
				"z",
				{
					kind: ValueKind.ARRAY,
					value: [
						{ kind: ValueKind.NUMBER, value: 1 },
						{ kind: ValueKind.NUMBER, value: 2 },
						{ kind: ValueKind.NUMBER, value: 3 },
					],
				},
			],
		]),
	});
	const compiler = new Compiler(
		new AstRootNode([
			new AstForNode(new AstLiteralIdentifierNode("x"), new AstLiteralIdentifierNode("z"), [
				new AstForNode(new AstLiteralIdentifierNode("y"), new AstLiteralIdentifierNode("z"), [
					new AstTemplateNode(new AstLiteralIdentifierNode("x")),
					new AstTemplateNode(new AstLiteralIdentifierNode("y")),
					new AstRawTextNode("\n"),
				]),
			]),
		]),
		context
	);

	const output = compiler.compile();

	assert.equal(output, "111213212223313233");
});
