import assert from "node:assert/strict";
import { test } from "node:test";
import { Compiler } from "./compiler";
import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstFilterNode,
	AstForNode,
	AstIfNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstLiteralStringNode,
	AstMakeNode,
	AstMemberAccessNode,
	AstRawTextNode,
	AstRootNode,
	AstTemplateNode,
} from "./ast";
import { Scope } from "./scope";

test("Compiler outputs simple literal number", () => {
	const scope = new Scope();
	const compiler = new Compiler(
		new AstRootNode([new AstTemplateNode(new AstLiteralNumberNode(42))]),
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "42");
});

test("Compiler outputs value of 42 + 21", () => {
	const scope = new Scope();
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
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "63");
});

test("Compiler outputs value of 42 * (21 + 7)", () => {
	const scope = new Scope();
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
	const compiler = new Compiler(rootNode, scope, "");

	const output = compiler.compile();

	assert.equal(output, "1176");
});

test("Compiler outputs value of 42 + (10 / (4 - 1))", () => {
	const scope = new Scope();
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
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "45.333333333333336");
});

test("Compiler outputs value of number filter application", () => {
	const scope = new Scope();
	const compiler = new Compiler(
		new AstRootNode([
			new AstTemplateNode(
				new AstFilterNode(new AstLiteralIdentifierNode("double"), [new AstLiteralNumberNode(21)])
			),
		]),
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "42");
});

test("Compiler outputs value of string filter application", () => {
	const scope = new Scope();
	const compiler = new Compiler(
		new AstRootNode([
			new AstTemplateNode(
				new AstFilterNode(new AstLiteralIdentifierNode("to_upper"), [
					new AstLiteralStringNode("hello, world!"),
				])
			),
		]),
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "HELLO, WORLD!");
});

test("Compiler outputs success clause in if statement", () => {
	const scope = Scope.from({ x: "Hello, world!" });
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
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "In success clause!");
});

test("Compiler outputs multiple success clauses in if statement", () => {
	const scope = Scope.from({ x: "Hello, world!" });
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
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "In success clause!In success clause2!");
});

test("Compiler outputs failure clause in if statement", () => {
	const scope = Scope.from({ x: "Hello, world!" });
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
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "In failure clause!");
});

test("Compiler outputs nested clauses in if statement", () => {
	const scope = Scope.from({ x: "Hello, world!", y: 2 });
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
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "In success clause!y is not 10!");
});

test("Compiler outputs for loop", () => {
	const scope = Scope.from({ y: [1, 2, 3] });
	const compiler = new Compiler(
		new AstRootNode([
			new AstForNode(new AstLiteralIdentifierNode("x"), new AstLiteralIdentifierNode("y"), [
				new AstTemplateNode(new AstLiteralIdentifierNode("x")),
			]),
		]),
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "123");
});

test("Compiler outputs for loop when collection is nested member", () => {
	const scope = Scope.from({
		company: {
			name: "Mutiny",
			employees: [
				{ name: "Cameron", title: "cto" },
				{ name: "Donna", title: "ceo" },
			],
		},
	});
	const compiler = new Compiler(
		new AstRootNode([
			new AstForNode(
				new AstLiteralIdentifierNode("employee"),
				new AstMemberAccessNode(new AstLiteralIdentifierNode("company"), [
					new AstLiteralStringNode("employees"),
				]),
				[
					new AstTemplateNode(
						new AstMemberAccessNode(new AstLiteralIdentifierNode("employee"), [
							new AstLiteralStringNode("name"),
						])
					),
				]
			),
		]),
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "CameronDonna");
});

test("Compiler outputs for loop when collection is a filter expression", () => {
	const scope = Scope.from({
		company: {
			employees: [
				{ name: "Cameron", title: "cto", reports: [{ name: "Yo-yo" }, { name: "Tom" }] },
				{ name: "Donna", title: "ceo", reports: [{ name: "John" }, { name: "Cameron" }] },
			],
		},
	});
	const compiler = new Compiler(
		new AstRootNode([
			new AstForNode(
				new AstLiteralIdentifierNode("name"),
				new AstFilterNode(new AstLiteralIdentifierNode("pluck"), [
					new AstFilterNode(new AstLiteralIdentifierNode("pluck"), [
						new AstMemberAccessNode(new AstLiteralIdentifierNode("company"), [
							new AstLiteralStringNode("employees"),
						]),
						new AstLiteralStringNode("reports"),
					]),
					new AstLiteralStringNode("name"),
				]),
				[new AstTemplateNode(new AstLiteralIdentifierNode("name"))]
			),
		]),
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "Yo-yoTomJohnCameron");
});

test("Compiler assigns variable when encountering a make node", () => {
	const scope = new Scope();
	const compiler = new Compiler(
		new AstRootNode([
			new AstMakeNode(new AstLiteralIdentifierNode("x"), new AstLiteralNumberNode(42)),
			new AstTemplateNode(new AstLiteralIdentifierNode("x")),
		]),
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "42");
});

test("Compiler assigns variable when encountering a make node with complex expression", () => {
	const scope = new Scope();
	const compiler = new Compiler(
		new AstRootNode([
			new AstMakeNode(
				new AstLiteralIdentifierNode("x"),

				new AstBinaryExpressionNode(
					new AstLiteralNumberNode(21),
					new AstBinaryOperatorNode("OP_MULTIPLY"),
					new AstLiteralNumberNode(2)
				)
			),
			new AstTemplateNode(new AstLiteralIdentifierNode("x")),
		]),
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "42");
});

test("Compiler outputs nested for loop", () => {
	const scope = Scope.from({ z: [1, 2, 3] });
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
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(
		output,
		`11
12
13
21
22
23
31
32
33
`
	);
});

test("Compiler outputs member access", () => {
	const scope = Scope.from({
		company: {
			name: "Mutiny",
		},
	});
	const compiler = new Compiler(
		new AstRootNode([
			new AstTemplateNode(
				new AstMemberAccessNode(new AstLiteralIdentifierNode("company"), [
					new AstLiteralStringNode("name"),
				])
			),
		]),
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "Mutiny");
});

test("Compiler outputs nested member access", () => {
	const scope = Scope.from({
		company: {
			name: "Mutiny",
			founders: {
				cto: "Cameron",
			},
		},
	});
	const compiler = new Compiler(
		new AstRootNode([
			new AstTemplateNode(
				new AstMemberAccessNode(new AstLiteralIdentifierNode("company"), [
					new AstLiteralStringNode("founders"),
					new AstLiteralStringNode("cto"),
				])
			),
		]),
		scope,
		""
	);

	const output = compiler.compile();

	assert.equal(output, "Cameron");
});
