export const filters = new Map<string, Function>();

class FilterNotFoundError extends Error {
	constructor(name: string) {
		super(`Filter "${name}" not found.`);
	}
}

export function applyFilter(name: string, ...args: any[]): any {
	if (!filters.has(name)) {
		throw new FilterNotFoundError(name);
	}

	const filter = filters.get(name)!;

	return filter(args);
}

function register(_: any, name: string, { value }: any) {
	filters.set(name, value);
}

export class NumberFilters {
	@register
	double(x: number): number {
		return x * 2;
	}

	@register
	halve(x: number): number {
		return x / 2;
	}
}

export class StringFilters {
	@register
	uppercase(x: string): string {
		return x.toUpperCase();
	}
}
