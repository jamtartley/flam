import * as t from "io-ts";
import { PathReporter } from "io-ts/PathReporter";
import { ArrayValue, ObjectValue, RuntimeValue, ValueKind } from "./compiler";

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
		return x.toLowerCase();
	}

	@register([t.string])
	static uppercase(x: string) {
		return x.toUpperCase();
	}

	@register([t.string])
	static titlecase(x: string) {
		return x.replace(/\b\w/g, (c) => c.toUpperCase());
	}

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

export class ArrayFilters {
	@register([t.array(t.UnknownRecord), t.string])
	static pluck(x: object[], key: keyof (typeof x)[number]) {
		return x.map((obj) => obj[key]);
	}

	@register([t.array(t.string)])
	static alphabetize(x: string[]) {
		return x.sort();
	}

	@register([t.array(t.any)])
	static reverse(x: any[]) {
		return x.reverse();
	}

	@register([t.array(t.any)])
	static count(x: any[]) {
		return x.length;
	}
}

function runtimeToRaw(value: any): any {
	switch (value.kind) {
		case ValueKind.NUMBER:
		case ValueKind.STRING:
		case ValueKind.BOOLEAN:
			return value.value;
		case ValueKind.ARRAY:
			return (value as ArrayValue).value.map(runtimeToRaw);
		case ValueKind.OBJECT:
			return Object.fromEntries(
				Object.entries((value as ObjectValue).value).map(([key, value]) => [key, runtimeToRaw(value)])
			);
	}
}

function rawIntoRuntime(value: any): RuntimeValue {
	if (typeof value === "number") {
		return { kind: ValueKind.NUMBER, value: value };
	} else if (typeof value === "string") {
		return { kind: ValueKind.STRING, value: value };
	} else if (typeof value === "boolean") {
		return { kind: ValueKind.BOOLEAN, value: value };
	} else if (Array.isArray(value)) {
		return { kind: ValueKind.ARRAY, value: value.map(rawIntoRuntime) };
	} else if (typeof value === "object") {
		return { kind: ValueKind.OBJECT, value: value.map(rawIntoRuntime) };
	}

	throw new Error(`Unsupported type: ${typeof value}`);
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

	return rawIntoRuntime(func(...rawArgs));
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
