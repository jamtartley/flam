import * as t from "io-ts";
import { PathReporter } from "io-ts/PathReporter";
import { ArrayValue, ObjectValue, RuntimeValue, ValueKind } from "./compiler";

export const filters = new Map<string, { func: Function; validators?: t.Type<any>[] }>();

function register(validators?: t.Type<any>[]) {
	return function (_: any, name: string, descriptor: PropertyDescriptor) {
		filters.set(name, { func: descriptor.value, validators });
	};
}

export class NumberFilters {
	@register([t.number])
	static double(num: number) {
		return num * 2;
	}
}

export class StringFilters {
	@register([t.string])
	static to_lower(str: string): string {
		return str.toLowerCase();
	}

	@register([t.string])
	static to_upper(str: string): string {
		return str.toUpperCase();
	}

	@register([t.string])
	static to_title(str: string): string {
		return str.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	@register([t.any])
	static to_string(str: any): string {
		return str.toString();
	}

	@register([t.string, t.string])
	static replace(str: string, search: string, replace: string): string {
		return str.replaceAll(search, replace);
	}

	@register([t.array(t.string), t.string])
	static join(str: string[], separator: string): string {
		return str.join(separator);
	}

	@register([t.string, t.string])
	static split(str: string, separator: string): string[] {
		return str.split(separator);
	}

	@register([t.string])
	static to_flam(str: string): string {
		return str
			.split(/\s+/)
			.map((word) => {
				if (word.length <= 4) {
					return "flam".slice(0, word.length);
				} else {
					return "fl" + "a".repeat(word.length - 3) + "m";
				}
			})
			.join(" ");
	}
}

export class ArrayFilters {
	@register([t.array(t.UnknownRecord), t.string])
	static pluck<T extends Record<string, any>>(arr: T[], key: keyof T): T[keyof T][] {
		return arr.map((obj) => obj[key]).flat();
	}

	@register([t.array(t.any)])
	static sort<T>(arr: T[]): T[] {
		return arr.sort();
	}

	@register([t.array(t.string)])
	static alphabetize<T>(arr: T[]): T[] {
		return arr.sort();
	}

	@register([t.array(t.any)])
	static reverse<T>(arr: T[]): T[] {
		return arr.reverse();
	}

	@register([t.array(t.any)])
	static count<T>(arr: T[]): number {
		return arr.length;
	}
}

export class DateFilters {
	@register()
	static now(): number {
		return Date.now();
	}

	@register()
	static today(): string {
		return new Date().toDateString();
	}
}

export class ObjectFilters {
	@register([t.string, t.UnknownRecord])
	static has(key: string, obj: Record<string, unknown>): boolean {
		return key in obj;
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
				Object.entries((value as ObjectValue).value).map(([key, value]) => [
					key,
					runtimeToRaw(value),
				])
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
		return {
			kind: ValueKind.OBJECT,
			value: Object.fromEntries(
				Object.entries(value).map(([key, value]) => [key, rawIntoRuntime(value)])
			),
		};
	}

	throw new Error(`Unsupported type: ${typeof value}`);
}

export function applyFilter(name: string, args: RuntimeValue[]) {
	if (!filters.has(name)) {
		throw new FilterNotFoundError(name);
	}

	const rawArgs = args.map(runtimeToRaw);
	const { func, validators } = filters.get(name)!;

	if (!validators) {
		return rawIntoRuntime(func(...rawArgs));
	}

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
