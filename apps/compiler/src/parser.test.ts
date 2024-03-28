import assert from "node:assert/strict";
import { test } from "node:test";
import { Token } from "./tokenizer";
import { Parser } from "./parser";
import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstForNode,
	AstIfNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstRawTextNode,
	AstTemplateNode,
} from "./ast";

test("Parser emits a single AstRootNode", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START", value: "{=" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "TEMPLATE_END", value: "=}" }),
		new Token({ kind: "EOF", value: "" }),
	];
	const parser = new Parser(tokens).parse();

	assert.ok(parser.rootNode !== undefined);
});

test("Parser emits an AstTemplateNode", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START", value: "{=" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "TEMPLATE_END", value: "=}" }),
		new Token({ kind: "EOF", value: "" }),
	];
	const parser = new Parser(tokens).parse();

	assert.ok(parser.rootNode.statements[0] !== undefined);
	assert.ok(parser.rootNode.statements[0].kind === "AstTemplateNode");
});

test("Parser emits an AstLiteralNumberNode inside template", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START", value: "{=" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "TEMPLATE_END", value: "=}" }),
		new Token({ kind: "EOF", value: "" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(parser.rootNode.statements[0], new AstTemplateNode(new AstLiteralNumberNode(42)));
});

test("Parser emits an AstBinaryExpressionNode for a simple addition inside template", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START", value: "{=" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "OP_PLUS", value: "+" }),
		new Token({ kind: "LITERAL_NUMBER", value: "21" }),
		new Token({ kind: "TEMPLATE_END", value: "=}" }),
		new Token({ kind: "EOF", value: "" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstTemplateNode(
			new AstBinaryExpressionNode(
				new AstLiteralNumberNode(42),
				new AstBinaryOperatorNode("OP_PLUS"),
				new AstLiteralNumberNode(21)
			)
		)
	);
});

test("Parser emits an AstBinaryExpressionNode for a nested addition inside template", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START", value: "{=" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "OP_PLUS", value: "+" }),
		new Token({ kind: "LITERAL_NUMBER", value: "21" }),
		new Token({ kind: "OP_MINUS", value: "-" }),
		new Token({ kind: "LITERAL_NUMBER", value: "7" }),
		new Token({ kind: "TEMPLATE_END", value: "=}" }),
		new Token({ kind: "EOF", value: "" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstTemplateNode(
			new AstBinaryExpressionNode(
				new AstBinaryExpressionNode(
					new AstLiteralNumberNode(42),
					new AstBinaryOperatorNode("OP_PLUS"),
					new AstLiteralNumberNode(21)
				),
				new AstBinaryOperatorNode("OP_MINUS"),
				new AstLiteralNumberNode(7)
			)
		)
	);
});

test("Parser handles precedence in an AstBinaryExpressionNode", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START", value: "{=" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "OP_PLUS", value: "+" }),
		new Token({ kind: "LITERAL_NUMBER", value: "21" }),
		new Token({ kind: "OP_MULTIPLY", value: "*" }),
		new Token({ kind: "LITERAL_NUMBER", value: "7" }),
		new Token({ kind: "OP_MINUS", value: "-" }),
		new Token({ kind: "LITERAL_NUMBER", value: "1" }),
		new Token({ kind: "TEMPLATE_END", value: "=}" }),
		new Token({ kind: "EOF", value: "" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstTemplateNode(
			new AstBinaryExpressionNode(
				new AstBinaryExpressionNode(
					new AstLiteralNumberNode(42),
					new AstBinaryOperatorNode("OP_PLUS"),
					new AstBinaryExpressionNode(
						new AstLiteralNumberNode(21),
						new AstBinaryOperatorNode("OP_MULTIPLY"),
						new AstLiteralNumberNode(7)
					)
				),
				new AstBinaryOperatorNode("OP_MINUS"),
				new AstLiteralNumberNode(1)
			)
		)
	);
});

test("Parser handles precedence in an AstBinaryExpressionNode with parentheses", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START", value: "{=" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "OP_MULTIPLY", value: "*" }),
		new Token({ kind: "L_PAREN", value: "(" }),
		new Token({ kind: "LITERAL_NUMBER", value: "21" }),
		new Token({ kind: "OP_PLUS", value: "+" }),
		new Token({ kind: "LITERAL_NUMBER", value: "7" }),
		new Token({ kind: "R_PAREN", value: ")" }),
		new Token({ kind: "TEMPLATE_END", value: "=}" }),
		new Token({ kind: "EOF", value: "" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
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
		)
	);
});

test("Parser accepts a pipe as a binary operator", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START", value: "{=" }),
		new Token({ kind: "LITERAL_NUMBER", value: "21" }),
		new Token({ kind: "OP_PIPE", value: "|>" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "double" }),
		new Token({ kind: "TEMPLATE_END", value: "=}" }),
		new Token({ kind: "EOF", value: "" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstTemplateNode(
			new AstBinaryExpressionNode(
				new AstLiteralNumberNode(21),
				new AstBinaryOperatorNode("OP_PIPE"),
				new AstLiteralIdentifierNode("double")
			)
		)
	);
});

test("Parser handles a single if statement", () => {
	const tokens: Token[] = [
		new Token({ kind: "CONTROL_START", value: "{%" }),
		new Token({ kind: "KEYWORD_IF", value: "" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "x" }),
		new Token({ kind: "OP_GT", value: ">" }),
		new Token({ kind: "LITERAL_NUMBER", value: "10" }),
		new Token({ kind: "CONTROL_END", value: "%}" }),
		new Token({ kind: "RAW", value: "In if statement" }),
		new Token({ kind: "CONTROL_START", value: "{%" }),
		new Token({ kind: "KEYWORD_FI", value: "" }),
		new Token({ kind: "CONTROL_END", value: "%}" }),
		new Token({ kind: "EOF", value: "" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstIfNode(
			new AstBinaryExpressionNode(
				new AstLiteralIdentifierNode("x"),
				new AstBinaryOperatorNode("OP_GT"),
				new AstLiteralNumberNode(10)
			),
			[new AstRawTextNode("In if statement")],
			[]
		)
	);
});

test("Parser handles a single if statement with multiple statements", () => {
	const tokens: Token[] = [
		new Token({ kind: "CONTROL_START", value: "{%" }),
		new Token({ kind: "KEYWORD_IF", value: "" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "x" }),
		new Token({ kind: "OP_EQ", value: "==" }),
		new Token({ kind: "LITERAL_NUMBER", value: "10" }),
		new Token({ kind: "CONTROL_END", value: "%}" }),
		new Token({ kind: "RAW", value: "In if statement" }),
		new Token({ kind: "RAW", value: "In if statement2" }),
		new Token({ kind: "CONTROL_START", value: "{%" }),
		new Token({ kind: "KEYWORD_FI", value: "" }),
		new Token({ kind: "CONTROL_END", value: "%}" }),
		new Token({ kind: "EOF", value: "" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstIfNode(
			new AstBinaryExpressionNode(
				new AstLiteralIdentifierNode("x"),
				new AstBinaryOperatorNode("OP_EQ"),
				new AstLiteralNumberNode(10)
			),
			[new AstRawTextNode("In if statement"), new AstRawTextNode("In if statement2")],
			[]
		)
	);
});

test("Parser handles an if statement with else clause", () => {
	const tokens: Token[] = [
		new Token({ kind: "CONTROL_START", value: "{%" }),
		new Token({ kind: "KEYWORD_IF", value: "" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "x" }),
		new Token({ kind: "OP_GT", value: ">" }),
		new Token({ kind: "LITERAL_NUMBER", value: "10" }),
		new Token({ kind: "CONTROL_END", value: "%}" }),
		new Token({ kind: "RAW", value: "In if clause" }),
		new Token({ kind: "CONTROL_START", value: "{%" }),
		new Token({ kind: "KEYWORD_ELSE", value: "" }),
		new Token({ kind: "CONTROL_END", value: "%}" }),
		new Token({ kind: "RAW", value: "In else clause" }),
		new Token({ kind: "CONTROL_START", value: "{%" }),
		new Token({ kind: "KEYWORD_FI", value: "" }),
		new Token({ kind: "CONTROL_END", value: "%}" }),
		new Token({ kind: "EOF", value: "" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstIfNode(
			new AstBinaryExpressionNode(
				new AstLiteralIdentifierNode("x"),
				new AstBinaryOperatorNode("OP_GT"),
				new AstLiteralNumberNode(10)
			),
			[new AstRawTextNode("In if clause")],
			[new AstRawTextNode("In else clause")]
		)
	);
});

test("Parser handles a for loop", () => {
	const tokens: Token[] = [
		new Token({ kind: "CONTROL_START", value: "{%" }),
		new Token({ kind: "KEYWORD_FOR", value: "" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "x" }),
		new Token({ kind: "KEYWORD_IN", value: "" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "y" }),
		new Token({ kind: "CONTROL_END", value: "%}" }),
		new Token({ kind: "RAW", value: "Hello, world!" }),
		new Token({ kind: "RAW", value: "I am here" }),
		new Token({ kind: "CONTROL_START", value: "{%" }),
		new Token({ kind: "KEYWORD_ROF", value: "" }),
		new Token({ kind: "CONTROL_END", value: "%}" }),
		new Token({ kind: "EOF", value: "" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstForNode(new AstLiteralIdentifierNode("x"), new AstLiteralIdentifierNode("y"), [
			new AstRawTextNode("Hello, world!"),
			new AstRawTextNode("I am here"),
		])
	);
});

test("Parser handles a nested for loop", () => {
	const tokens: Token[] = [
		new Token({ kind: "CONTROL_START", value: "{%" }),
		new Token({ kind: "KEYWORD_FOR", value: "" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "x" }),
		new Token({ kind: "KEYWORD_IN", value: "" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "z" }),
		new Token({ kind: "CONTROL_END", value: "%}" }),
		new Token({ kind: "RAW", value: "Hello, world!" }),
		new Token({ kind: "CONTROL_START", value: "{%" }),
		new Token({ kind: "KEYWORD_FOR", value: "" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "y" }),
		new Token({ kind: "KEYWORD_IN", value: "" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "z" }),
		new Token({ kind: "CONTROL_END", value: "%}" }),
		new Token({ kind: "RAW", value: "I am here" }),
		new Token({ kind: "CONTROL_START", value: "{%" }),
		new Token({ kind: "KEYWORD_ROF", value: "" }),
		new Token({ kind: "CONTROL_END", value: "%}" }),
		new Token({ kind: "CONTROL_START", value: "{%" }),
		new Token({ kind: "KEYWORD_ROF", value: "" }),
		new Token({ kind: "CONTROL_END", value: "%}" }),
		new Token({ kind: "EOF", value: "" }),
	];
	console.log(tokens);
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstForNode(new AstLiteralIdentifierNode("x"), new AstLiteralIdentifierNode("z"), [
			new AstRawTextNode("Hello, world!"),
			new AstForNode(new AstLiteralIdentifierNode("y"), new AstLiteralIdentifierNode("z"), [
				new AstRawTextNode("I am here"),
			]),
		])
	);
});

test("Parser throws an UnexpectedTokenError if starting with a TEMPLATE_END token", () => {
	const tokens: Token[] = [new Token({ kind: "TEMPLATE_END", value: "=}" }), new Token({ kind: "EOF", value: "" })];
	const parser = new Parser(tokens);

	assert.throws(() => parser.parse(), {
		name: "UnexpectedTokenError",
		message: "Unexpected token - expected: EOF but got TEMPLATE_END",
	});
});
