import { ArrayValue, RuntimeValue, ValueKind } from "./compiler";

type ScopeConstructor = {
	parent?: Scope;
	variables?: Map<string, RuntimeValue>;
};

export class VariableTypeUnsupportedError extends Error {
	constructor(name: string, value: unknown) {
		super(`Variable "${name}" has unsupported type: "${typeof value}"`);

		this.name = "VariableTypeUnsupportedError";
	}
}

export class VariableNotFoundError extends Error {
	constructor(name: string) {
		super(`Variable "${name}" not found`);

		this.name = "VariableNotFoundError";
	}
}

function convertToRuntimeValue(name: string, input: unknown): RuntimeValue {
	if (typeof input === "string") {
		return { kind: ValueKind.STRING, value: input };
	} else if (typeof input === "number") {
		return { kind: ValueKind.NUMBER, value: input };
	} else if (typeof input === "boolean") {
		return { kind: ValueKind.BOOLEAN, value: input };
	} else if (Array.isArray(input)) {
		const arrayValue: ArrayValue = { kind: ValueKind.ARRAY, value: [] };

		for (const item of input) {
			arrayValue.value.push(convertToRuntimeValue(name, item));
		}

		return arrayValue;
	} else if (typeof input === "object" && input !== null) {
		const objectValue: Record<string, RuntimeValue> = {};

		for (const [key, value] of Object.entries(input)) {
			objectValue[key] = convertToRuntimeValue(name, value);
		}

		return { kind: ValueKind.OBJECT, value: objectValue };
	}

	throw new VariableTypeUnsupportedError(name, input);
}

export class Scope {
	public variables: Map<string, RuntimeValue> = new Map();
	#parent?: Scope;

	constructor(init?: ScopeConstructor) {
		if (init) {
			const { parent, variables } = init;

			this.#parent = parent;
			this.variables = variables ?? new Map();
		}
	}

	static from(obj: object): Scope {
		const variables = new Map(
			Object.entries(obj).map(([name, value]) => [name, convertToRuntimeValue(name, value)])
		);
		const scope = new Scope({
			variables,
		});

		return scope;
	}

	add(name: string, value: RuntimeValue): RuntimeValue {
		this.variables.set(name, value);

		return value;
	}

	get(name: string): RuntimeValue {
		const scope = this.findScopeForVariable(name);

		return scope?.variables.get(name) || { kind: ValueKind.NULL, value: null };
	}

	delete(name: string): void {
		this.variables.delete(name);
	}

	findScopeForVariable(name: string): Scope | undefined {
		if (this.variables.has(name)) {
			return this;
		}

		return this.#parent?.findScopeForVariable(name);
	}
}
