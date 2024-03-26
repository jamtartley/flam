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

	console.log(tokenizer.tokens);
	assert.ok(tokenizer.tokens[0]?.kind === "TEMPLATE_START");
	assert.ok(tokenizer.tokens[1]?.kind === "LITERAL_IDENTIFIER");
	assert.ok(tokenizer.tokens[2]?.kind === "TEMPLATE_END");
});

test("Tokenizer generates both raw and valid template tokens", () => {
	const tokenizer = new Tokenizer("Hello, {= name =}!").tokenize();

	assert.ok(tokenizer.tokens[0]?.kind === "RAW");
	assert.ok(tokenizer.tokens[1]?.kind === "TEMPLATE_START");
	assert.ok(tokenizer.tokens[2]?.kind === "LITERAL_IDENTIFIER");
	assert.ok(tokenizer.tokens[3]?.kind === "TEMPLATE_END");
	assert.ok(tokenizer.tokens[4]?.kind === "RAW");
	assert.ok(tokenizer.tokens[5]?.kind === "EOF");
});

test("Tokenizer handles literal strings inside template", () => {
	const tokenizer = new Tokenizer('Hello, {= "Hi" =}').tokenize();

	assert.ok(tokenizer.tokens[0]?.kind === "RAW");
	assert.ok(tokenizer.tokens[1]?.kind === "TEMPLATE_START");
	assert.ok(tokenizer.tokens[2]?.kind === "LITERAL_STRING");
	assert.ok(tokenizer.tokens[3]?.kind === "TEMPLATE_END");
	assert.ok(tokenizer.tokens[4]?.kind === "EOF");
});

test("Tokenizer ignores speech marks outside template", () => {
	const tokenizer = new Tokenizer('Hello, "world"').tokenize();

	assert.ok(tokenizer.tokens[0]?.kind === "RAW");
	assert.ok(tokenizer.tokens[1]?.kind === "EOF");
});

test("Tokenizer generates pipe token inside template", () => {
	const tokenizer = new Tokenizer('{= "Hi" |> uppercase =}').tokenize();

	assert.ok(tokenizer.tokens[0]?.kind === "TEMPLATE_START");
	assert.ok(tokenizer.tokens[1]?.kind === "LITERAL_STRING");
	assert.ok(tokenizer.tokens[2]?.kind === "OP_PIPE");
	assert.ok(tokenizer.tokens[3]?.kind === "LITERAL_IDENTIFIER");
	assert.ok(tokenizer.tokens[4]?.kind === "TEMPLATE_END");
	assert.ok(tokenizer.tokens[5]?.kind === "EOF");
});

test("Tokenizer ignores pipe token outside template", () => {
	const tokenizer = new Tokenizer('"Hello" |> {= "world" =}').tokenize();

	assert.ok(tokenizer.tokens[0]?.kind === "RAW");
	assert.ok(tokenizer.tokens[1]?.kind === "TEMPLATE_START");
	assert.ok(tokenizer.tokens[2]?.kind === "LITERAL_STRING");
	assert.ok(tokenizer.tokens[3]?.kind === "TEMPLATE_END");
	assert.ok(tokenizer.tokens[4]?.kind === "EOF");
});
