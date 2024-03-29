import assert from "node:assert/strict";
import { test } from "node:test";
import { Context } from "./context";
import { ValueKind } from "./compiler";

test("Context.from converts a simple string", () => {
	const input = {
		name: "Cameron",
	};
	const context = Context.from(input);

	assert.deepEqual(context.variables.get("name"), { kind: ValueKind.STRING, value: "Cameron" });
});

test("Context.from converts a simple number", () => {
	const input = {
		age: 42,
	};
	const context = Context.from(input);

	assert.deepEqual(context.variables.get("age"), { kind: ValueKind.NUMBER, value: 42 });
});

test("Context.from converts a simple boolean", () => {
	const input = {
		isCorrect: false,
	};
	const context = Context.from(input);

	assert.deepEqual(context.variables.get("isCorrect"), { kind: ValueKind.BOOLEAN, value: false });
});

test("Context.from converts an array of strings", () => {
	const input = {
		names: ["Cameron", "Donna", "Gordon"],
	};
	const context = Context.from(input);

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

test("Context.from converts a nested array of items", () => {
	const input = {
		ageGroups: [
			[0, 10],
			[11, 20],
		],
	};
	const context = Context.from(input);

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

test("Context.from converts a flat object", () => {
	const input = {
		company: {
			name: "Mutiny",
			established: 1983,
		},
	};
	const context = Context.from(input);

	assert.deepEqual(context.variables.get("company"), {
		kind: ValueKind.OBJECT,
		value: {
			name: { kind: ValueKind.STRING, value: "Mutiny" },
			established: { kind: ValueKind.NUMBER, value: 1983 },
		},
	});
});

test("Context.from converts an object with nested array", () => {
	const input = {
		company: {
			name: "Mutiny",
			established: 1983,
			founders: ["Cameron", "Donna"],
		},
	};
	const context = Context.from(input);

	assert.deepEqual(context.variables.get("company"), {
		kind: ValueKind.OBJECT,
		value: {
			name: { kind: ValueKind.STRING, value: "Mutiny" },
			established: { kind: ValueKind.NUMBER, value: 1983 },
			founders: {
				kind: ValueKind.ARRAY,
				value: [
					{ kind: ValueKind.STRING, value: "Cameron" },
					{ kind: ValueKind.STRING, value: "Donna" },
				],
			},
		},
	});
});

test("Context.from converts an object with nested objects", () => {
	const input = {
		company: {
			name: "Mutiny",
			established: 1983,
			founders: {
				ceo: "Donna",
				cto: "Cameron",
			},
			employees: [
				{ name: "Bosworth", title: "Director of Engineering" },
				{ name: "Yo-Yo", title: "Software Engineer" },
			],
		},
	};
	const context = Context.from(input);

	assert.deepEqual(context.variables.get("company"), {
		kind: ValueKind.OBJECT,
		value: {
			name: { kind: ValueKind.STRING, value: "Mutiny" },
			established: { kind: ValueKind.NUMBER, value: 1983 },
			founders: {
				kind: ValueKind.OBJECT,
				value: {
					ceo: { kind: ValueKind.STRING, value: "Donna" },
					cto: { kind: ValueKind.STRING, value: "Cameron" },
				},
			},
			employees: {
				kind: ValueKind.ARRAY,
				value: [
					{
						kind: ValueKind.OBJECT,
						value: {
							name: { kind: ValueKind.STRING, value: "Bosworth" },
							title: { kind: ValueKind.STRING, value: "Director of Engineering" },
						},
					},
					{
						kind: ValueKind.OBJECT,
						value: {
							name: { kind: ValueKind.STRING, value: "Yo-Yo" },
							title: { kind: ValueKind.STRING, value: "Software Engineer" },
						},
					},
				],
			},
		},
	});
});

test("findContextForVariable finds a variable in the current context", () => {
	const context = Context.from({ name: "Cameron" });
	const found = context.findContextForVariable("name");

	assert.strictEqual(found, context);
});

test("findContextForVariable finds a variable in the parent context", () => {
	const parent = Context.from({ name: "Cameron" });
	const child = new Context({ parent });
	const found = child.findContextForVariable("name");

	assert.strictEqual(found, parent);
});

test("get finds a variable in the parent context", () => {
	const parent = Context.from({ name: "Cameron" });
	const child = new Context({ parent });
	const found = child.get("name");

	assert.deepEqual(found, { kind: ValueKind.STRING, value: "Cameron" });
});
