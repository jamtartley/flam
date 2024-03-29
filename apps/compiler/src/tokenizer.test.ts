import assert from "node:assert/strict";
import { test } from "node:test";
import { Token, TokenKind, Tokenizer } from "./tokenizer";

function expectTokenKinds(tokens: Token[], kinds: TokenKind[]) {
	assert.equal(tokens.length, kinds.length);

	for (let i = 0; i < tokens.length; i++) {
		assert.equal(tokens[i]?.kind, kinds[i]);
	}
}

test("Tokenizer generates a RAW token", () => {
	const tokenizer = new Tokenizer("Hello, world!").tokenize();

	expectTokenKinds(tokenizer.tokens, ["RAW", "EOF"]);
});

test("Tokenizer generates an EOF token", () => {
	const tokenizer = new Tokenizer("").tokenize();

	expectTokenKinds(tokenizer.tokens, ["EOF"]);
});

test("Tokenizer generates valid template tokens", () => {
	const tokenizer = new Tokenizer("{= name =}").tokenize();

	expectTokenKinds(tokenizer.tokens, ["TEMPLATE_START", "LITERAL_IDENTIFIER", "TEMPLATE_END", "EOF"]);
});

test("Tokenizer generates keyword tokens for known identifiers", () => {
	const tokenizer = new Tokenizer("{! for name in names !}").tokenize();

	expectTokenKinds(tokenizer.tokens, [
		"CONTROL_START",
		"KEYWORD_FOR",
		"LITERAL_IDENTIFIER",
		"KEYWORD_IN",
		"LITERAL_IDENTIFIER",
		"CONTROL_END",
		"EOF",
	]);
});

test("Tokenizer generates both raw and valid template tokens", () => {
	const tokenizer = new Tokenizer("Hello, {= name =}!").tokenize();

	expectTokenKinds(tokenizer.tokens, ["RAW", "TEMPLATE_START", "LITERAL_IDENTIFIER", "TEMPLATE_END", "RAW", "EOF"]);
});

test("Tokenizer generates no tokens for comments and advances", () => {
	const tokenizer = new Tokenizer(`
		{# The following people are mutineers: #}
		Cameron Howe
		Donna Clark
`).tokenize();

	expectTokenKinds(tokenizer.tokens, ["RAW", "RAW", "EOF"]);
});

test("Tokenizer generates no tokens for comments embedded in control block", () => {
	const tokenizer = new Tokenizer(`
		{! if name !}
		{# The following people are mutineers: #}
		{! fi !}
`).tokenize();

	expectTokenKinds(tokenizer.tokens, [
		"RAW",
		"CONTROL_START",
		"KEYWORD_IF",
		"LITERAL_IDENTIFIER",
		"CONTROL_END",
		"RAW",
		"RAW",
		"CONTROL_START",
		"KEYWORD_FI",
		"CONTROL_END",
		"RAW",
		"EOF",
	]);
});

test("Tokenizer handles literal strings inside tags", () => {
	const tokenizer = new Tokenizer('Hello, {= "Hello" =}').tokenize();

	expectTokenKinds(tokenizer.tokens, ["RAW", "TEMPLATE_START", "LITERAL_STRING", "TEMPLATE_END", "EOF"]);
});

test("Tokenizer removes speech marks from literal string values", () => {
	const tokenizer = new Tokenizer('{= "Hello" =}').tokenize();

	assert.equal(tokenizer.tokens[1]?.value, "Hello");
});

test("Tokenizer ignores speech marks outside tags", () => {
	const tokenizer = new Tokenizer('Hello, "world"').tokenize();

	expectTokenKinds(tokenizer.tokens, ["RAW", "EOF"]);
});

test("Tokenizer generates pipe token inside tags", () => {
	const tokenizer = new Tokenizer('{= "Hello" -> uppercase =}').tokenize();

	expectTokenKinds(tokenizer.tokens, [
		"TEMPLATE_START",
		"LITERAL_STRING",
		"PIPE",
		"LITERAL_IDENTIFIER",
		"TEMPLATE_END",
		"EOF",
	]);
});

test("Tokenizer ignores pipe token outside tags", () => {
	const tokenizer = new Tokenizer('"Hello" -> {= "world" =}').tokenize();

	expectTokenKinds(tokenizer.tokens, ["RAW", "TEMPLATE_START", "LITERAL_STRING", "TEMPLATE_END", "EOF"]);
});

test("Tokenizer generates parens inside tags", () => {
	const tokenizer = new Tokenizer('{= name -> join(",") =}').tokenize();

	expectTokenKinds(tokenizer.tokens, [
		"TEMPLATE_START",
		"LITERAL_IDENTIFIER",
		"PIPE",
		"LITERAL_IDENTIFIER",
		"L_PAREN",
		"LITERAL_STRING",
		"R_PAREN",
		"TEMPLATE_END",
		"EOF",
	]);
});

test("Tokenizer ignores parens outside tags", () => {
	const tokenizer = new Tokenizer("Hello (world)").tokenize();

	expectTokenKinds(tokenizer.tokens, ["RAW", "EOF"]);
});

test("Tokenizer ignores periods outside tags", () => {
	const tokenizer = new Tokenizer("Hello. World.").tokenize();

	expectTokenKinds(tokenizer.tokens, ["RAW", "EOF"]);
});

test("Tokenizer generates periods inside tags", () => {
	const tokenizer = new Tokenizer('{= name.first -> join(",") =}').tokenize();

	expectTokenKinds(tokenizer.tokens, [
		"TEMPLATE_START",
		"LITERAL_IDENTIFIER",
		"PERIOD",
		"LITERAL_IDENTIFIER",
		"PIPE",
		"LITERAL_IDENTIFIER",
		"L_PAREN",
		"LITERAL_STRING",
		"R_PAREN",
		"TEMPLATE_END",
		"EOF",
	]);
});

test("Tokenizer handles literal numbers inside tags", () => {
	const tokenizer = new Tokenizer("{= 123 =}").tokenize();

	expectTokenKinds(tokenizer.tokens, ["TEMPLATE_START", "LITERAL_NUMBER", "TEMPLATE_END", "EOF"]);
});

test("Tokenizer handles arithmetic operators inside tags", () => {
	const tokenizer = new Tokenizer("{= 1 + 2 - 3 / 4 * 5 =}").tokenize();
	expectTokenKinds(tokenizer.tokens, [
		"TEMPLATE_START",
		"LITERAL_NUMBER",
		"OP_PLUS",
		"LITERAL_NUMBER",
		"OP_MINUS",

		"LITERAL_NUMBER",
		"OP_DIVIDE",
		"LITERAL_NUMBER",
		"OP_MULTIPLY",
		"LITERAL_NUMBER",

		"TEMPLATE_END",
		"EOF",
	]);
});

test("Tokenizer handles single character boolean operators inside tags", () => {
	const tokenizerGt = new Tokenizer("{= age > 30 =}").tokenize();
	const tokenizerLt = new Tokenizer("{= age < 30 =}").tokenize();

	expectTokenKinds(tokenizerGt.tokens, [
		"TEMPLATE_START",
		"LITERAL_IDENTIFIER",
		"OP_GT",
		"LITERAL_NUMBER",
		"TEMPLATE_END",
		"EOF",
	]);
	expectTokenKinds(tokenizerLt.tokens, [
		"TEMPLATE_START",
		"LITERAL_IDENTIFIER",
		"OP_LT",
		"LITERAL_NUMBER",
		"TEMPLATE_END",
		"EOF",
	]);
});

test("Tokenizer handles multi-character boolean operators inside tags", () => {
	const tokenizerEq = new Tokenizer("{= age == 30 =}").tokenize();
	const tokenizerNe = new Tokenizer("{= age =! 30 =}").tokenize();
	const tokenizerGte = new Tokenizer("{= age >= 30 =}").tokenize();
	const tokenizerLte = new Tokenizer("{= age <= 30 =}").tokenize();

	expectTokenKinds(tokenizerEq.tokens, [
		"TEMPLATE_START",
		"LITERAL_IDENTIFIER",
		"OP_EQ",
		"LITERAL_NUMBER",
		"TEMPLATE_END",
		"EOF",
	]);
	expectTokenKinds(tokenizerNe.tokens, [
		"TEMPLATE_START",
		"LITERAL_IDENTIFIER",
		"OP_NE",
		"LITERAL_NUMBER",
		"TEMPLATE_END",
		"EOF",
	]);
	expectTokenKinds(tokenizerLte.tokens, [
		"TEMPLATE_START",
		"LITERAL_IDENTIFIER",
		"OP_LTE",
		"LITERAL_NUMBER",
		"TEMPLATE_END",
		"EOF",
	]);
	expectTokenKinds(tokenizerGte.tokens, [
		"TEMPLATE_START",
		"LITERAL_IDENTIFIER",
		"OP_GTE",
		"LITERAL_NUMBER",
		"TEMPLATE_END",
		"EOF",
	]);
});

test("Tokenizer tracks line/column position across newline", () => {
	const tokenizer = new Tokenizer(`
      {= name =}
	`).tokenize();

	assert.equal(tokenizer.tokens[1]?.site.line, 2);
	assert.equal(tokenizer.tokens[1]?.site.col, 7);
});

test("Tokenizer tracks line/column position when literal string spans multiple lines", () => {
	const tokenizer = new Tokenizer(`
      {= "Hello

" =}
	`).tokenize();

	assert.equal(tokenizer.tokens[2]?.value, "Hello\n\n");
	assert.equal(tokenizer.tokens[2]?.site.line, 2);
	assert.equal(tokenizer.tokens[2]?.site.col, 10);
});

test("Tokenizer throws an UnexpectedCharacterError when encountering malformed input", () => {
	const tokenizer = new Tokenizer(`{= "Hello" _> uppercase =} `);

	assert.throws(() => tokenizer.tokenize(), {
		name: "UnexpectedCharacterError",
		message: 'Unexpected character: "_" at line 1, column 12',
	});
});
