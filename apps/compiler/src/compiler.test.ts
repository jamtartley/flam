import assert from "node:assert/strict";
import { test } from "node:test";
import { Compiler } from "./compiler";
import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstLiteralStringNode,
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
		new AstRootNode([
			new AstTemplateNode(
				new AstBinaryExpressionNode(
					new AstLiteralNumberNode(21),
					new AstBinaryOperatorNode("OP_PIPE"),
					new AstLiteralIdentifierNode("double")
				)
			),
		]),
		context
	);

	const output = compiler.compile();

	assert.equal(output, "42");
});

test("Compiler outputs value of string filter application", () => {
	const context = new Context();
	const compiler = new Compiler(
		new AstRootNode([
			new AstTemplateNode(
				new AstBinaryExpressionNode(
					new AstLiteralStringNode("hello, world!"),
					new AstBinaryOperatorNode("OP_PIPE"),
					new AstLiteralIdentifierNode("uppercase")
				)
			),
		]),
		context
	);

	const output = compiler.compile();

	assert.equal(output, "HELLO, WORLD!");
});
