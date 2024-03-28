import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstExpressionNode,
	AstIfNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstLiteralStringNode,
	AstRawTextNode,
	AstRootNode,
	AstStatementNode,
	AstTemplateNode,
} from "./ast";
import { applyFilter, filters } from "./filters";
import { Context } from "./context";

type ValueKind = "number" | "string" | "boolean" | "filter" | "statements" | "operator";

export type RuntimeValue<T> = {
	kind: ValueKind;
	value: T;
};

export type UnresolvedValue = RuntimeValue<unknown>;

export type StringValue = RuntimeValue<string> & {
	kind: "string";
	value: string;
};

export type NumberValue = RuntimeValue<number> & {
	kind: "number";
	value: number;
};

export type BooleanValue = RuntimeValue<boolean> & {
	kind: "boolean";
	value: boolean;
};

export type StatementsValue = RuntimeValue<UnresolvedValue[]> & {
	kind: "statements";
};

export type FilterValue = RuntimeValue<Function> & {
	kind: "filter";
};

export type IdentifierValue = FilterValue | StringValue | NumberValue;

export type OperatorValue = RuntimeValue<string> & {
	kind: "operator";
};

function isNumberValue(value: UnresolvedValue): value is NumberValue {
	return value.kind === "number";
}

function isFilterValue(value: UnresolvedValue): value is FilterValue {
	return value.kind === "filter";
}

function isOperatorValue(value: UnresolvedValue): value is OperatorValue {
	return value.kind === "operator";
}

export interface Visitor {
	visitRootNode(root: AstRootNode): StringValue;
	visitRawTextNode(rawText: AstRawTextNode): StringValue;
	visitTemplateNode(template: AstTemplateNode): UnresolvedValue;
	visitBinaryExpressionNode(binaryExpression: AstBinaryExpressionNode): UnresolvedValue;
	visitBinaryOperatorNode(binaryOperator: AstBinaryOperatorNode): OperatorValue;
	visitIfNode(ifNode: AstIfNode): StatementsValue;
	visitLiteralStringNode(literalString: AstLiteralStringNode): StringValue;
	visitLiteralNumberNode(literalNumber: AstLiteralNumberNode): NumberValue;
	visitLiteralIdentifierNode(identifier: AstLiteralIdentifierNode): UnresolvedValue;
}

export class Compiler implements Visitor {
	readonly #rootNode: AstRootNode;
	readonly #context: Context;

	constructor(rootNode: AstRootNode, context: Context) {
		this.#rootNode = rootNode;
		this.#context = context;
	}

	#applyFilter(filter: FilterValue, left: UnresolvedValue): UnresolvedValue {
		const applied = applyFilter(filter.value.name, left.value);

		if (typeof applied === "number") {
			return { kind: "number", value: applied };
		} else if (typeof applied === "string") {
			return { kind: "string", value: applied };
		}

		throw new Error(`Unexpected filter output: ${applied}`);
	}

	visitRootNode(root: AstRootNode): StringValue {
		let output = "";

		for (const statement of root.statements) {
			const val = statement.accept(this);

			if (Array.isArray(val.value)) {
				output += val.value.map((node) => node.value).join("");
			} else {
				output += val.value;
			}
		}

		return { kind: "string", value: output };
	}

	visitRawTextNode(rawText: AstRawTextNode): StringValue {
		return { kind: "string", value: rawText.value };
	}

	visitNodes(nodes: AstStatementNode[]): UnresolvedValue[] {
		return nodes.map((node) => node.accept(this));
	}

	visitTemplateNode(template: AstTemplateNode): UnresolvedValue {
		return template.expression.accept(this);
	}

	visitBinaryExpressionNode(binaryExpression: AstBinaryExpressionNode): UnresolvedValue {
		const left = binaryExpression.left.accept(this);
		const right = binaryExpression.right.accept(this);
		const operator = binaryExpression.operator.accept(this);

		switch (operator.value) {
			case "OP_PIPE": {
				if (isFilterValue(right)) {
					return this.#applyFilter(right, left);
				}

				throw new Error(`Expected filter, got ${right.kind}`);
			}
			case "OP_PLUS": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: "number", value: left.value + right.value };
			}
			case "OP_MINUS": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: "number", value: left.value - right.value };
			}
			case "OP_DIVIDE": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: "number", value: left.value / right.value };
			}
			case "OP_MULTIPLY": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: "number", value: left.value * right.value };
			}
			case "OP_GT": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: "boolean", value: left.value > right.value };
			}
			case "OP_LT": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: "boolean", value: left.value < right.value };
			}
			case "OP_GTE": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: "boolean", value: left.value >= right.value };
			}
			case "OP_LTE": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: "boolean", value: left.value <= right.value };
			}
			case "OP_EQ": {
				return { kind: "boolean", value: left.value === right.value };
			}
			case "OP_NE": {
				return { kind: "boolean", value: left.value !== right.value };
			}
		}

		throw new Error(`Unexpected values: ${left}, ${right}`);
	}

	visitIfNode(ifNode: AstIfNode): StatementsValue {
		const condition = ifNode.condition.accept(this);

		if (condition.kind !== "boolean") {
			throw new Error(`Expected boolean, got ${condition.kind}`);
		}

		if (condition.value) {
			return {
				kind: "statements",
				value: ifNode.success.map((node) => node.accept(this)),
			};
		} else {
			return {
				kind: "statements",
				value: ifNode.failure?.map((node) => node.accept(this)) || [],
			};
		}
	}

	visitBinaryOperatorNode(binaryOperator: AstBinaryOperatorNode): OperatorValue {
		return { kind: "operator", value: binaryOperator.operator };
	}

	visitLiteralStringNode(literalString: AstLiteralStringNode): StringValue {
		return { kind: "string", value: literalString.value };
	}

	visitLiteralNumberNode(literalNumber: AstLiteralNumberNode): NumberValue {
		return { kind: "number", value: literalNumber.value };
	}

	visitLiteralIdentifierNode(identifier: AstLiteralIdentifierNode): UnresolvedValue {
		if (filters.has(identifier.name)) {
			const builtin = filters.get(identifier.name)!;

			return { kind: "filter", value: builtin.func };
		}

		const variable = this.#context.get(identifier.name);
		return variable;
	}

	compile(): string {
		return this.#rootNode.accept(this).value;
	}
}
