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

test("Tokenizer generates both raw and valid template tokens", () => {
	const tokenizer = new Tokenizer("Hello, {= name =}!").tokenize();

	expectTokenKinds(tokenizer.tokens, ["RAW", "TEMPLATE_START", "LITERAL_IDENTIFIER", "TEMPLATE_END", "RAW", "EOF"]);
});

test("Tokenizer handles literal strings inside template", () => {
	const tokenizer = new Tokenizer('Hello, {= "Hello" =}').tokenize();

	expectTokenKinds(tokenizer.tokens, ["RAW", "TEMPLATE_START", "LITERAL_STRING", "TEMPLATE_END", "EOF"]);
});

test("Tokenizer removes speech marks from literal string values", () => {
	const tokenizer = new Tokenizer('{= "Hello" =}').tokenize();

	assert.equal(tokenizer.tokens[1]?.value, "Hello");
});

test("Tokenizer ignores speech marks outside template", () => {
	const tokenizer = new Tokenizer('Hello, "world"').tokenize();

	expectTokenKinds(tokenizer.tokens, ["RAW", "EOF"]);
});

test("Tokenizer generates pipe token inside template", () => {
	const tokenizer = new Tokenizer('{= "Hello" |> uppercase =}').tokenize();

	expectTokenKinds(tokenizer.tokens, [
		"TEMPLATE_START",
		"LITERAL_STRING",
		"OP_PIPE",
		"LITERAL_IDENTIFIER",
		"TEMPLATE_END",
		"EOF",
	]);
});

test("Tokenizer ignores pipe token outside template", () => {
	const tokenizer = new Tokenizer('"Hello" |> {= "world" =}').tokenize();

	expectTokenKinds(tokenizer.tokens, ["RAW", "TEMPLATE_START", "LITERAL_STRING", "TEMPLATE_END", "EOF"]);
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
