import * as t from "io-ts";
import { PathReporter } from "io-ts/PathReporter";
import { ArrayValue, RuntimeValue, ValueKind } from "./compiler";

export const filters = new Map<string, { func: Function; validators: t.Type<any>[] }>();

function register(validators: t.Type<any>[]) {
	return function (_: any, name: string, descriptor: PropertyDescriptor) {
		filters.set(name, { func: descriptor.value, validators });
	};
}

export class NumberFilters {
	@register([t.number])
	static double(x: number) {
		return x * 2;
	}
}

export class StringFilters {
	@register([t.string])
	static lowercase(x: string) {
		return x.toUpperCase();
	}

	@register([t.string])
	static uppercase(x: string) {
		return x.toUpperCase();
	}

	/* @register([t.array(t.string), t.string])
	static join(x: string[], y: string) {
		return x.join(y);
	} */

	@register([t.array(t.string), t.string])
	static join(x: string[], y: string) {
		return x.join(y);
	}

	@register([t.string])
	static flammify(x: string) {
		return x
			.split(/\s+/)
			.map((word) => {
				if (word.length <= 4) {
					return "flam".slice(0, word.length);
				} else {
					return "fl" + "a".repeat(word.length - 2) + "m";
				}
			})
			.join(" ");
	}
}

function runtimeToRaw(value: RuntimeValue): any {
	switch (value.kind) {
		case ValueKind.NUMBER:
		case ValueKind.STRING:
		case ValueKind.BOOLEAN:
			return value.value;
		case ValueKind.ARRAY:
			return (value as ArrayValue).value.map(runtimeToRaw);
	}
}

export function applyFilter(name: string, args: RuntimeValue[]) {
	if (!filters.has(name)) {
		throw new FilterNotFoundError(name);
	}

	const rawArgs = args.map(runtimeToRaw);
	const { func, validators } = filters.get(name)!;

	for (let i = 0; i < validators.length; i++) {
		const validator = validators[i]!;
		const result = validator.decode(rawArgs[i]);

		if (result._tag === "Left") {
			// @CLEANUP: Improve error message when applying filters
			throw new FilterExecutionError(name, PathReporter.report(result).join("\n"));
		}
	}

	return func(...rawArgs);
}

class FilterNotFoundError extends Error {
	constructor(name: string) {
		super(`Filter "${name}" not found.`);
	}
}

class FilterExecutionError extends Error {
	constructor(name: string, error: string) {
		super(`Error executing "${name}":\n${error}`);
	}
}
