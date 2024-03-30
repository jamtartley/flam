import { ArrayValue, RuntimeValue, ValueKind } from "./compiler";

type ContextConstructor = {
	parent?: Context;
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

export class VariableAlreadyExistsError extends Error {
	constructor(name: string) {
		super(`Variable "${name}" already exists`);

		this.name = "VariableAlreadyExistsError";
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

export class Context {
	public variables: Map<string, RuntimeValue> = new Map();
	#parent?: Context;

	constructor(init?: ContextConstructor) {
		if (init) {
			const { parent, variables } = init;

			this.#parent = parent;
			this.variables = variables ?? new Map();
		}
	}

	static from(obj: object): Context {
		const variables = new Map(Object.entries(obj).map(([name, value]) => [name, convertToRuntimeValue(name, value)]));
		const context = new Context({
			variables,
		});

		return context;
	}

	add(name: string, value: RuntimeValue): RuntimeValue {
		if (this.variables.has(name)) {
			throw new VariableAlreadyExistsError(name);
		}

		this.variables.set(name, value);

		return value;
	}

	get(name: string): RuntimeValue {
		const context = this.findContextForVariable(name);

		return context.variables.get(name)!;
	}

	delete(name: string): void {
		this.variables.delete(name);
	}

	findContextForVariable(name: string): Context {
		if (this.variables.has(name)) {
			return this;
		}

		if (!this.#parent) {
			throw new VariableNotFoundError(name);
		}

		return this.#parent.findContextForVariable(name);
	}
}
