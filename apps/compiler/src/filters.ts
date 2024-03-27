import * as t from "io-ts";
import { PathReporter } from "io-ts/PathReporter";

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
	static uppercase(x: string) {
		return x.toUpperCase();
	}
}

export function applyFilter(name: string, ...args: any[]) {
	if (!filters.has(name)) {
		throw new FilterNotFoundError(name);
	}

	const { func, validators } = filters.get(name)!;

	for (let i = 0; i < validators.length; i++) {
		const validator = validators[i]!;
		const result = validator.decode(args[i]);

		if (result._tag === "Left") {
			// @CLEANUP: Improve error message when applying filters
			throw new FilterExecutionError(name, PathReporter.report(result).join("\n"));
		}
	}

	return func(...args);
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
