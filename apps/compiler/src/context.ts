import { RuntimeValue, UnresolvedValue } from "./compiler";

type ContextConstructor = {
	parent?: Context;
	variables?: Map<string, UnresolvedValue>;
};

export class Context {
	public variables: Map<string, UnresolvedValue> = new Map();
	#parent?: Context;

	constructor(init?: ContextConstructor) {
		if (init) {
			const { parent, variables } = init;

			this.#parent = parent;
			this.variables = variables ?? new Map();
		}
	}

	add<T>(name: string, value: RuntimeValue<T>): RuntimeValue<T> {
		if (this.variables.has(name)) {
			throw new Error(`Variable "${name}" already exists`);
		}

		this.variables.set(name, value);

		return value;
	}

	get(name: string): UnresolvedValue {
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
			throw new Error(`Variable "${name}" not found`);
		}

		return this.#parent.findContextForVariable(name);
	}
}
