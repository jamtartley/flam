import assert from "node:assert/strict";
import { test } from "node:test";
import { Token } from "./tokenizer";
import { Parser } from "./parser";
import { Compiler } from "./compiler";

test("Compiler outputs simple literal number", () => {
	const tokens: Token[] = [
		{ kind: "TEMPLATE_START", value: "{=", site: { line: 1, col: 1 } },
		{ kind: "LITERAL_NUMBER", value: "42", site: { line: 1, col: 4 } },
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 6 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 8 } },
	];
	const parser = new Parser(tokens).parse();
	const compiler = new Compiler(parser);

	const output = compiler.compile();

	assert.equal(output, "42");
});

test("Compiler outputs simple binary expression value", () => {
	const tokens: Token[] = [
		{ kind: "TEMPLATE_START", value: "{=", site: { line: 1, col: 1 } },
		{ kind: "LITERAL_NUMBER", value: "42", site: { line: 1, col: 4 } },
		{ kind: "OP_PLUS", value: "+", site: { line: 1, col: 4 } },
		{ kind: "LITERAL_NUMBER", value: "21", site: { line: 1, col: 4 } },
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 6 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 8 } },
	];
	const parser = new Parser(tokens).parse();
	const compiler = new Compiler(parser);

	const output = compiler.compile();

	assert.equal(output, "63");
});

test("Compiler outputs binary expression with parentheses value", () => {
	const tokens: Token[] = [
		{ kind: "TEMPLATE_START", value: "{=", site: { line: 1, col: 1 } },
		{ kind: "LITERAL_NUMBER", value: "42", site: { line: 1, col: 4 } },
		{ kind: "OP_MULTIPLY", value: "*", site: { line: 1, col: 5 } },
		{ kind: "L_PAREN", value: "(", site: { line: 1, col: 6 } },
		{ kind: "LITERAL_NUMBER", value: "21", site: { line: 1, col: 6 } },
		{ kind: "OP_PLUS", value: "+", site: { line: 1, col: 7 } },
		{ kind: "LITERAL_NUMBER", value: "7", site: { line: 1, col: 8 } },
		{ kind: "R_PAREN", value: ")", site: { line: 1, col: 6 } },
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 12 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 13 } },
	];
	const parser = new Parser(tokens).parse();
	const compiler = new Compiler(parser);

	const output = compiler.compile();

	assert.equal(output, "1176");
});

test("Compiler outputs binary expression with parentheses value", () => {
	const tokens: Token[] = [
		{ kind: "TEMPLATE_START", value: "{=", site: { line: 1, col: 1 } },
		{ kind: "LITERAL_NUMBER", value: "42", site: { line: 1, col: 4 } },
		{ kind: "OP_MULTIPLY", value: "+", site: { line: 1, col: 5 } },
		{ kind: "L_PAREN", value: "(", site: { line: 1, col: 6 } },
		{ kind: "LITERAL_NUMBER", value: "10", site: { line: 1, col: 6 } },
		{ kind: "OP_DIVIDE", value: "/", site: { line: 1, col: 7 } },
		{ kind: "L_PAREN", value: "(", site: { line: 1, col: 8 } },
		{ kind: "LITERAL_NUMBER", value: "4", site: { line: 1, col: 6 } },
		{ kind: "OP_MINUS", value: "-", site: { line: 1, col: 7 } },
		{ kind: "LITERAL_NUMBER", value: "1", site: { line: 1, col: 6 } },
		{ kind: "R_PAREN", value: ")", site: { line: 1, col: 6 } },
		{ kind: "R_PAREN", value: ")", site: { line: 1, col: 6 } },
		{ kind: "TEMPLATE_END", value: "=}", site: { line: 1, col: 12 } },
		{ kind: "EOF", value: "", site: { line: 1, col: 13 } },
	];
	const parser = new Parser(tokens).parse();
	const compiler = new Compiler(parser);

	const output = compiler.compile();

	assert.equal(output, "45.333333333333336");
});
