import assert from "node:assert/strict";
import { test } from "node:test";
import { Context } from "./context";
import { ValueKind } from "./compiler";

test("Context.fromObj converts a simple string", () => {
	const input = {
		name: "Cameron",
	};
	const context = Context.fromObj(input);

	assert.deepEqual(context.variables.get("name"), { kind: ValueKind.STRING, value: "Cameron" });
});

test("Context.fromObj converts a simple number", () => {
	const input = {
		age: 42,
	};
	const context = Context.fromObj(input);

	assert.deepEqual(context.variables.get("age"), { kind: ValueKind.NUMBER, value: 42 });
});

test("Context.fromObj converts a simple boolean", () => {
	const input = {
		isCorrect: false,
	};
	const context = Context.fromObj(input);

	assert.deepEqual(context.variables.get("isCorrect"), { kind: ValueKind.BOOLEAN, value: false });
});

test("Context.fromObj converts an array of strings", () => {
	const input = {
		names: ["Cameron", "Donna", "Gordon"],
	};
	const context = Context.fromObj(input);

	assert.deepEqual(context.variables.get("names"), {
		kind: ValueKind.ARRAY,
		value: [
			{ kind: ValueKind.STRING, value: "Cameron" },
			{ kind: ValueKind.STRING, value: "Donna" },
			{
				kind: ValueKind.STRING,
				value: "Gordon",
			},
		],
	});
});

test("Context.fromObj converts a nested array of items", () => {
	const input = {
		ageGroups: [
			[0, 10],
			[11, 20],
		],
	};
	const context = Context.fromObj(input);

	assert.deepEqual(context.variables.get("ageGroups"), {
		kind: ValueKind.ARRAY,
		value: [
			{
				kind: ValueKind.ARRAY,
				value: [
					{ kind: ValueKind.NUMBER, value: 0 },
					{ kind: ValueKind.NUMBER, value: 10 },
				],
			},
			{
				kind: ValueKind.ARRAY,
				value: [
					{ kind: ValueKind.NUMBER, value: 11 },
					{ kind: ValueKind.NUMBER, value: 20 },
				],
			},
		],
	});
});

test("findContextForVariable finds a variable in the current context", () => {
	const context = new Context({
		variables: new Map([["name", { kind: ValueKind.STRING, value: "Cameron" }]]),
	});
	const found = context.findContextForVariable("name");

	assert.strictEqual(found, context);
});

test("findContextForVariable finds a variable in the parent context", () => {
	const parent = new Context({
		variables: new Map([["name", { kind: ValueKind.STRING, value: "Cameron" }]]),
	});
	const child = new Context({ parent });
	const found = child.findContextForVariable("name");

	assert.strictEqual(found, parent);
});

test("get finds a variable in the parent context", () => {
	const parent = new Context({
		variables: new Map([["name", { kind: ValueKind.STRING, value: "Cameron" }]]),
	});
	const child = new Context({ parent });
	const found = child.get("name");

	assert.deepEqual(found, { kind: ValueKind.STRING, value: "Cameron" });
});
