import assert from "node:assert/strict";
import { test } from "node:test";
import { Scope } from "./scope";
import { ValueKind } from "./compiler";

test("Scope.from converts a simple string", () => {
	const input = {
		name: "Cameron",
	};
	const scope = Scope.from(input);

	assert.deepEqual(scope.variables.get("name"), { kind: ValueKind.STRING, value: "Cameron" });
});

test("Scope.from converts a simple number", () => {
	const input = {
		age: 42,
	};
	const scope = Scope.from(input);

	assert.deepEqual(scope.variables.get("age"), { kind: ValueKind.NUMBER, value: 42 });
});

test("Scope.from converts a simple boolean", () => {
	const input = {
		isCorrect: false,
	};
	const scope = Scope.from(input);

	assert.deepEqual(scope.variables.get("isCorrect"), { kind: ValueKind.BOOLEAN, value: false });
});

test("Scope.from converts an array of strings", () => {
	const input = {
		names: ["Cameron", "Donna", "Gordon"],
	};
	const scope = Scope.from(input);

	assert.deepEqual(scope.variables.get("names"), {
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

test("Scope.from converts a nested array of items", () => {
	const input = {
		ageGroups: [
			[0, 10],
			[11, 20],
		],
	};
	const scope = Scope.from(input);

	assert.deepEqual(scope.variables.get("ageGroups"), {
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

test("Scope.from converts a flat object", () => {
	const input = {
		company: {
			name: "Mutiny",
			established: 1983,
		},
	};
	const scope = Scope.from(input);

	assert.deepEqual(scope.variables.get("company"), {
		kind: ValueKind.OBJECT,
		value: {
			name: { kind: ValueKind.STRING, value: "Mutiny" },
			established: { kind: ValueKind.NUMBER, value: 1983 },
		},
	});
});

test("Scope.from converts an object with nested array", () => {
	const input = {
		company: {
			name: "Mutiny",
			established: 1983,
			founders: ["Cameron", "Donna"],
		},
	};
	const scope = Scope.from(input);

	assert.deepEqual(scope.variables.get("company"), {
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

test("Scope.from converts an object with nested objects", () => {
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
	const scope = Scope.from(input);

	assert.deepEqual(scope.variables.get("company"), {
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

test("Scope.findScopeForVariable finds a variable in the current scope", () => {
	const scope = Scope.from({ name: "Cameron" });
	const found = scope.findScopeForVariable("name");

	assert.strictEqual(found, scope);
});

test("Scope.findScopeForVariable finds a variable in the parent scope", () => {
	const parent = Scope.from({ name: "Cameron" });
	const child = new Scope({ parent });
	const found = child.findScopeForVariable("name");

	assert.strictEqual(found, parent);
});

test("Scope.get finds a variable in the parent scope", () => {
	const parent = Scope.from({ name: "Cameron" });
	const child = new Scope({ parent });
	const found = child.get("name");

	assert.deepEqual(found, { kind: ValueKind.STRING, value: "Cameron" });
});

test("Scope.from throws a VariableTypeUnsupportedError when given a function", () => {
	assert.throws(() => Scope.from({ toUpper: (v: string) => v.toUpperCase() }), {
		name: "VariableTypeUnsupportedError",
		message: `Variable "toUpper" has unsupported type: "function"`,
	});
});

test("Scope.from throws a VariableNotFoundError when attempting to get a variable which has not been set", () => {
	const scope = new Scope();

	assert.throws(() => scope.get("boss"), {
		name: "VariableNotFoundError",
		message: `Variable "boss" not found`,
	});
});
