import assert from "node:assert/strict";
import { test } from "node:test";
import { Token } from "./tokenizer";
import { Parser } from "./parser";
import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstFilterNode,
	AstForNode,
	AstIfNode,
	AstIncludeNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstLiteralStringNode,
	AstMakeNode,
	AstMemberAccessNode,
	AstRawTextNode,
	AstTemplateNode,
} from "./ast";

test("Parser emits a single AstRootNode", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "TEMPLATE_END" }),
		new Token({ kind: "EOF" }),
	];
	const parser = new Parser(tokens).parse();

	assert.ok(parser.rootNode !== undefined);
});

test("Parser emits an AstTemplateNode", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "TEMPLATE_END" }),
		new Token({ kind: "EOF" }),
	];
	const parser = new Parser(tokens).parse();

	assert.ok(parser.rootNode.statements[0] !== undefined);
	assert.ok(parser.rootNode.statements[0].kind === "AstTemplateNode");
});

test("Parser emits an AstLiteralNumberNode inside template", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "TEMPLATE_END" }),
		new Token({ kind: "EOF" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(parser.rootNode.statements[0], new AstTemplateNode(new AstLiteralNumberNode(42)));
});

test("Parser emits an AstBinaryExpressionNode for a simple addition inside template", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "OP_PLUS" }),
		new Token({ kind: "LITERAL_NUMBER", value: "21" }),
		new Token({ kind: "TEMPLATE_END" }),
		new Token({ kind: "EOF" }),
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
		new Token({ kind: "TEMPLATE_START" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "OP_PLUS" }),
		new Token({ kind: "LITERAL_NUMBER", value: "21" }),
		new Token({ kind: "OP_MINUS" }),
		new Token({ kind: "LITERAL_NUMBER", value: "7" }),
		new Token({ kind: "TEMPLATE_END" }),
		new Token({ kind: "EOF" }),
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

test("Parser emits an AstFilterNode inside a template", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "names" }),
		new Token({ kind: "PIPE" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "join" }),
		new Token({ kind: "L_PAREN" }),
		new Token({ kind: "LITERAL_STRING", value: "," }),
		new Token({ kind: "R_PAREN" }),
		new Token({ kind: "TEMPLATE_END" }),
		new Token({ kind: "EOF" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstTemplateNode(
			new AstFilterNode(new AstLiteralIdentifierNode("join"), [
				new AstLiteralIdentifierNode("names"),
				new AstLiteralStringNode(","),
			])
		)
	);
});

test("Parser handles precedence in an AstBinaryExpressionNode", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "OP_PLUS" }),
		new Token({ kind: "LITERAL_NUMBER", value: "21" }),
		new Token({ kind: "OP_MULTIPLY" }),
		new Token({ kind: "LITERAL_NUMBER", value: "7" }),
		new Token({ kind: "OP_MINUS" }),
		new Token({ kind: "LITERAL_NUMBER", value: "1" }),
		new Token({ kind: "TEMPLATE_END" }),
		new Token({ kind: "EOF" }),
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
		new Token({ kind: "TEMPLATE_START" }),
		new Token({ kind: "LITERAL_NUMBER", value: "42" }),
		new Token({ kind: "OP_MULTIPLY" }),
		new Token({ kind: "L_PAREN" }),
		new Token({ kind: "LITERAL_NUMBER", value: "21" }),
		new Token({ kind: "OP_PLUS" }),
		new Token({ kind: "LITERAL_NUMBER", value: "7" }),
		new Token({ kind: "R_PAREN" }),
		new Token({ kind: "TEMPLATE_END" }),
		new Token({ kind: "EOF" }),
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

test("Parser handles a single if statement", () => {
	const tokens: Token[] = [
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_IF" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "x" }),
		new Token({ kind: "OP_GT" }),
		new Token({ kind: "LITERAL_NUMBER", value: "10" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "RAW", value: "In if statement" }),
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_FI" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "EOF" }),
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
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_IF" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "x" }),
		new Token({ kind: "OP_EQ" }),
		new Token({ kind: "LITERAL_NUMBER", value: "10" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "RAW", value: "In if statement" }),
		new Token({ kind: "RAW", value: "In if statement2" }),
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_FI" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "EOF" }),
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
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_IF" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "x" }),
		new Token({ kind: "OP_GT" }),
		new Token({ kind: "LITERAL_NUMBER", value: "10" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "RAW", value: "In if clause" }),
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_ELSE" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "RAW", value: "In else clause" }),
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_FI" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "EOF" }),
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

test("Parser handles a simple make statement", () => {
	const tokens: Token[] = [
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_MAKE" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "x" }),
		new Token({ kind: "KEYWORD_BECOME" }),
		new Token({ kind: "LITERAL_NUMBER", value: "10" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "EOF" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstMakeNode(new AstLiteralIdentifierNode("x"), new AstLiteralNumberNode(10))
	);
});

test("Parser handles a make with an expression value", () => {
	const tokens: Token[] = [
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_MAKE" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "x" }),
		new Token({ kind: "KEYWORD_BECOME" }),
		new Token({ kind: "LITERAL_NUMBER", value: "10" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "EOF" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstMakeNode(new AstLiteralIdentifierNode("x"), new AstLiteralNumberNode(10))
	);
});

test("Parser handle an include statement", () => {
	const tokens: Token[] = [
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_INCLUDE" }),
		new Token({ kind: "LITERAL_STRING", value: "child" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "EOF" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(parser.rootNode.statements[0], new AstIncludeNode(new AstLiteralStringNode("child")));
});

test("Parser handles a filter outside of a pipe chain", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "now" }),
		new Token({ kind: "L_PAREN" }),
		new Token({ kind: "R_PAREN" }),
		new Token({ kind: "TEMPLATE_END" }),
		new Token({ kind: "EOF" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstTemplateNode(new AstFilterNode(new AstLiteralIdentifierNode("now"), []))
	);
});

test("Parser handles a for loop", () => {
	const tokens: Token[] = [
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_FOR" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "x" }),
		new Token({ kind: "KEYWORD_IN" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "y" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "RAW", value: "Hello, world!" }),
		new Token({ kind: "RAW", value: "I am here" }),
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_ROF" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "EOF" }),
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

test("Parser handles a for loop where the collection is an object member", () => {
	const tokens: Token[] = [
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_FOR" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "x" }),
		new Token({ kind: "KEYWORD_IN" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "y" }),
		new Token({ kind: "PERIOD" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "values" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "RAW", value: "Hello, world!" }),
		new Token({ kind: "RAW", value: "I am here" }),
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_ROF" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "EOF" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstForNode(
			new AstLiteralIdentifierNode("x"),
			new AstMemberAccessNode(new AstLiteralIdentifierNode("y"), [new AstLiteralStringNode("values")]),
			[new AstRawTextNode("Hello, world!"), new AstRawTextNode("I am here")]
		)
	);
});

test("Parser handles a for loop where the collection is complex expression", () => {
	const tokens: Token[] = [
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_FOR" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "name" }),
		new Token({ kind: "KEYWORD_IN" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "employees" }),
		new Token({ kind: "PIPE" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "pluck" }),
		new Token({ kind: "L_PAREN" }),
		new Token({ kind: "LITERAL_STRING", value: "firstName" }),
		new Token({ kind: "R_PAREN" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "RAW", value: "Hello, world!" }),
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_ROF" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "EOF" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstForNode(
			new AstLiteralIdentifierNode("name"),
			new AstFilterNode(new AstLiteralIdentifierNode("pluck"), [
				new AstLiteralIdentifierNode("employees"),
				new AstLiteralStringNode("firstName"),
			]),
			[new AstRawTextNode("Hello, world!")]
		)
	);
});

test("Parser handles a nested for loop", () => {
	const tokens: Token[] = [
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_FOR" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "x" }),
		new Token({ kind: "KEYWORD_IN" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "z" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "RAW", value: "Hello, world!" }),
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_FOR" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "y" }),
		new Token({ kind: "KEYWORD_IN" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "z" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "RAW", value: "I am here" }),
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_ROF" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "CONTROL_START" }),
		new Token({ kind: "KEYWORD_ROF" }),
		new Token({ kind: "CONTROL_END" }),
		new Token({ kind: "EOF" }),
	];
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

test("Parser handles a single level member access", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "company" }),
		new Token({ kind: "PERIOD" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "name" }),
		new Token({ kind: "TEMPLATE_END" }),
		new Token({ kind: "EOF" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstTemplateNode(
			new AstMemberAccessNode(new AstLiteralIdentifierNode("company"), [new AstLiteralStringNode("name")])
		)
	);
});

test("Parser handles a nested member access", () => {
	const tokens: Token[] = [
		new Token({ kind: "TEMPLATE_START" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "company" }),
		new Token({ kind: "PERIOD" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "founders" }),
		new Token({ kind: "PERIOD" }),
		new Token({ kind: "LITERAL_IDENTIFIER", value: "cto" }),
		new Token({ kind: "TEMPLATE_END" }),
		new Token({ kind: "EOF" }),
	];
	const parser = new Parser(tokens).parse();

	assert.deepEqual(
		parser.rootNode.statements[0],
		new AstTemplateNode(
			new AstMemberAccessNode(new AstLiteralIdentifierNode("company"), [
				new AstLiteralStringNode("founders"),
				new AstLiteralStringNode("cto"),
			])
		)
	);
});

test("Parser throws an UnexpectedTokenError if starting with a TEMPLATE_END token", () => {
	const tokens: Token[] = [new Token({ kind: "TEMPLATE_END" }), new Token({ kind: "EOF" })];
	const parser = new Parser(tokens);

	assert.throws(() => parser.parse(), {
		name: "UnexpectedTokenError",
		message: "Unexpected token - expected: EOF but got TEMPLATE_END",
	});
});
