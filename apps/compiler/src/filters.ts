export const filters = new Map<string, Function>();

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
