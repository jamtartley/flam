import { RuntimeValue, UnresolvedValue } from "./compiler";

export class Context {
	public variables: Map<string, UnresolvedValue> = new Map();
	#parent?: Context;

	constructor(parent?: Context) {
		this.#parent = parent;
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
