import assert from "node:assert/strict";
import { test } from "node:test";
import { Token } from "./tokenizer";
import { Parser } from "./parser";
import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstIfNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstRawTextNode,
	AstTemplateNode,
} from "./ast";

test("Parser emits a single AstRootNode", () => {
	const tokens: Token[] = [
		{ kind: "TEMPLATE_START", value: "{=", site: { line: 1, col: 1 } },
		{ kind: "LITERAL_NUMBER", value: "42", site: { line: 1, col: 4 } },
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 6 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 8 } },
	];
	const parser = new Parser(tokens).parse();

	assert.ok(parser.rootNode !== undefined);
});

test("Parser emits an AstTemplateNode", () => {
	const tokens: Token[] = [
		{ kind: "TEMPLATE_START", value: "{=", site: { line: 1, col: 1 } },
		{ kind: "LITERAL_NUMBER", value: "42", site: { line: 1, col: 4 } },
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 6 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 8 } },
	];
	const parser = new Parser(tokens).parse();

	assert.ok(parser.rootNode.statements[0] !== undefined);
	assert.ok(parser.rootNode.statements[0].kind === "AstTemplateNode");
});

test("Parser emits an AstLiteralNumberNode inside template", () => {
	const tokens: Token[] = [
		{ kind: "TEMPLATE_START", value: "{=", site: { line: 1, col: 1 } },
		{ kind: "LITERAL_NUMBER", value: "42", site: { line: 1, col: 4 } },
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 6 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 8 } },
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(parser.rootNode.statements[0], new AstTemplateNode(new AstLiteralNumberNode(42)));
});

test("Parser emits an AstBinaryExpressionNode for a simple addition inside template", () => {
	const tokens: Token[] = [
		{ kind: "TEMPLATE_START", value: "{=", site: { line: 1, col: 1 } },
		{ kind: "LITERAL_NUMBER", value: "42", site: { line: 1, col: 4 } },
		{ kind: "OP_PLUS", value: "+", site: { line: 1, col: 5 }, flag: "BINARY_OPERATOR" },
		{ kind: "LITERAL_NUMBER", value: "21", site: { line: 1, col: 6 } },
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 8 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 8 } },
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
		{ kind: "TEMPLATE_START", value: "{=", site: { line: 1, col: 1 } },
		{ kind: "LITERAL_NUMBER", value: "42", site: { line: 1, col: 4 } },
		{ kind: "OP_PLUS", value: "+", site: { line: 1, col: 5 }, flag: "BINARY_OPERATOR" },
		{ kind: "LITERAL_NUMBER", value: "21", site: { line: 1, col: 6 } },
		{ kind: "OP_MINUS", value: "-", site: { line: 1, col: 7 }, flag: "BINARY_OPERATOR" },
		{ kind: "LITERAL_NUMBER", value: "7", site: { line: 1, col: 8 } },
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 9 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 11 } },
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
		{ kind: "TEMPLATE_START", value: "{=", site: { line: 1, col: 1 } },
		{ kind: "LITERAL_NUMBER", value: "42", site: { line: 1, col: 4 } },
		{ kind: "OP_PLUS", value: "+", site: { line: 1, col: 5 }, flag: "BINARY_OPERATOR" },
		{ kind: "LITERAL_NUMBER", value: "21", site: { line: 1, col: 6 } },
		{ kind: "OP_MULTIPLY", value: "*", site: { line: 1, col: 7 }, flag: "BINARY_OPERATOR" },
		{ kind: "LITERAL_NUMBER", value: "7", site: { line: 1, col: 8 } },
		{ kind: "OP_MINUS", value: "-", site: { line: 1, col: 9 }, flag: "BINARY_OPERATOR" },
		{ kind: "LITERAL_NUMBER", value: "1", site: { line: 1, col: 10 } },
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 12 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 13 } },
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
		{ kind: "TEMPLATE_START", value: "{=", site: { line: 1, col: 1 } },
		{ kind: "LITERAL_NUMBER", value: "42", site: { line: 1, col: 4 } },
		{ kind: "OP_MULTIPLY", value: "*", site: { line: 1, col: 5 }, flag: "BINARY_OPERATOR" },
		{ kind: "L_PAREN", value: "(", site: { line: 1, col: 6 } },
		{ kind: "LITERAL_NUMBER", value: "21", site: { line: 1, col: 6 } },
		{ kind: "OP_PLUS", value: "+", site: { line: 1, col: 7 }, flag: "BINARY_OPERATOR" },
		{ kind: "LITERAL_NUMBER", value: "7", site: { line: 1, col: 8 } },
		{ kind: "R_PAREN", value: ")", site: { line: 1, col: 6 } },
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 12 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 13 } },
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
		{ kind: "TEMPLATE_START", value: "{=", site: { line: 1, col: 1 } },
		{ kind: "LITERAL_NUMBER", value: "21", site: { line: 1, col: 3 } },
		{ kind: "OP_PIPE", value: "|>", site: { line: 1, col: 3 }, flag: "BINARY_OPERATOR" },
		{ kind: "LITERAL_IDENTIFIER", value: "double", site: { line: 1, col: 3 } },
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 1 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 3 } },
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
		{ kind: "CONTROL_START", value: "{%", site: { line: 1, col: 1 } },
		{ kind: "KEYWORD_IF", value: "", site: { line: 1, col: 3 } },
		{ kind: "LITERAL_IDENTIFIER", value: "x", site: { line: 1, col: 3 } },
		{ kind: "OP_GT", value: ">", site: { line: 1, col: 3 }, flag: "BINARY_OPERATOR" },
		{ kind: "LITERAL_NUMBER", value: "10", site: { line: 1, col: 3 } },
		{ kind: "CONTROL_END", value: "%}", site: { line: 1, col: 1 } },
		{ kind: "RAW", value: "In if statement", site: { line: 1, col: 1 } },
		{ kind: "CONTROL_START", value: "{%", site: { line: 1, col: 1 } },
		{ kind: "KEYWORD_FI", value: "", site: { line: 1, col: 3 } },
		{ kind: "CONTROL_END", value: "%}", site: { line: 1, col: 1 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 3 } },
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
			[new AstRawTextNode("In if statement")]
		)
	);
});

test("Parser handles a single if statement with multiple statements", () => {
	const tokens: Token[] = [
		{ kind: "CONTROL_START", value: "{%", site: { line: 1, col: 1 } },
		{ kind: "KEYWORD_IF", value: "", site: { line: 1, col: 3 } },
		{ kind: "LITERAL_IDENTIFIER", value: "x", site: { line: 1, col: 3 } },
		{ kind: "OP_EQ", value: "==", site: { line: 1, col: 3 }, flag: "BINARY_OPERATOR" },
		{ kind: "LITERAL_NUMBER", value: "10", site: { line: 1, col: 3 } },
		{ kind: "CONTROL_END", value: "%}", site: { line: 1, col: 1 } },
		{ kind: "RAW", value: "In if statement", site: { line: 1, col: 1 } },
		{ kind: "RAW", value: "In if statement2", site: { line: 1, col: 1 } },
		{ kind: "CONTROL_START", value: "{%", site: { line: 1, col: 1 } },
		{ kind: "KEYWORD_FI", value: "", site: { line: 1, col: 3 } },
		{ kind: "CONTROL_END", value: "%}", site: { line: 1, col: 1 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 3 } },
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
			[new AstRawTextNode("In if statement"), new AstRawTextNode("In if statement2")]
		)
	);
});

test("Parser handles an if statement with else clause", () => {
	const tokens: Token[] = [
		{ kind: "CONTROL_START", value: "{%", site: { line: 1, col: 1 } },
		{ kind: "KEYWORD_IF", value: "", site: { line: 1, col: 3 } },
		{ kind: "LITERAL_IDENTIFIER", value: "x", site: { line: 1, col: 3 } },
		{ kind: "OP_GT", value: ">", site: { line: 1, col: 3 }, flag: "BINARY_OPERATOR" },
		{ kind: "LITERAL_NUMBER", value: "10", site: { line: 1, col: 3 } },
		{ kind: "CONTROL_END", value: "%}", site: { line: 1, col: 1 } },
		{ kind: "RAW", value: "In if clause", site: { line: 1, col: 1 } },
		{ kind: "CONTROL_START", value: "{%", site: { line: 1, col: 1 } },
		{ kind: "KEYWORD_ELSE", value: "", site: { line: 1, col: 3 } },
		{ kind: "CONTROL_END", value: "%}", site: { line: 1, col: 1 } },
		{ kind: "RAW", value: "In else clause", site: { line: 1, col: 1 } },
		{ kind: "CONTROL_START", value: "{%", site: { line: 1, col: 1 } },
		{ kind: "KEYWORD_FI", value: "", site: { line: 1, col: 3 } },
		{ kind: "CONTROL_END", value: "%}", site: { line: 1, col: 1 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 3 } },
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

test("Parser throws an UnexpectedTokenError if starting with a TEMPLATE_END token", () => {
	const tokens: Token[] = [
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 1 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 3 } },
	];
	const parser = new Parser(tokens);

	assert.throws(() => parser.parse(), {
		name: "UnexpectedTokenError",
		message: "Unexpected token - expected: EOF but got TEMPLATE_END",
	});
});
