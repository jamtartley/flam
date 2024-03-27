import assert from "node:assert/strict";
import { test } from "node:test";
import { Token } from "./tokenizer";
import { Parser } from "./parser";

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

test("Parser throws an UnexpectedTokenError if starting with a TEMPLATE_END token", () => {
	const tokens: Token[] = [
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 1 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 3 } },
	];
	const parser = new Parser(tokens);

	assert.throws(() => parser.parse(), {
		name: "UnexpectedTokenError",
		message: "Unexpected token - expected: TEMPLATE_START but got TEMPLATE_END",
	});
});
