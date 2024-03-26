import assert from "node:assert/strict";
import { test } from "node:test";
import { Tokenizer } from "./tokenizer";

test("Tokenizer generates a RAW token", () => {
	const tokenizer = new Tokenizer("Hello, world!").tokenize();

	assert.ok(tokenizer.tokens[0]?.kind === "RAW");
});

test("Tokenizer generates an EOF token", () => {
	const tokenizer = new Tokenizer("").tokenize();

	assert.ok(tokenizer.tokens[0]?.kind === "EOF");
});

test("Tokenizer generates valid template tokens", () => {
	const tokenizer = new Tokenizer("{= name =}").tokenize();

	assert.ok(tokenizer.tokens[0]?.kind === "TEMPLATE_START");
	assert.ok(tokenizer.tokens[1]?.kind === "LIT_IDENTIFIER");
	assert.ok(tokenizer.tokens[2]?.kind === "TEMPLATE_END");
});

test("Tokenizer generated both RAW and valid template tokens", () => {
	const tokenizer = new Tokenizer("Hello, {= name =}!").tokenize();

	assert.ok(tokenizer.tokens[0]?.kind === "RAW");
	assert.ok(tokenizer.tokens[1]?.kind === "TEMPLATE_START");
	assert.ok(tokenizer.tokens[2]?.kind === "LIT_IDENTIFIER");
	assert.ok(tokenizer.tokens[3]?.kind === "TEMPLATE_END");
	assert.ok(tokenizer.tokens[4]?.kind === "EOF");
});
