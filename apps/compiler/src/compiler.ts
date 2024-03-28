import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstIfNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstLiteralStringNode,
	AstNode,
	AstRawTextNode,
	AstRootNode,
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

function isStringValue(value: UnresolvedValue): value is StringValue {
	return value.kind === "string";
}

function isFilterValue(value: UnresolvedValue): value is FilterValue {
	return value.kind === "filter";
}

function isStatementsValue(value: UnresolvedValue): value is StatementsValue {
	return value.kind === "statements";
}

export class Compiler {
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

	#evaluateRootNode(root: AstRootNode): StringValue {
		const evaluate = (value: UnresolvedValue) => {
			let output = "";

			if (isStringValue(value)) {
				output += value.value;
			} else if (isNumberValue(value)) {
				output += value.value;
			} else if (isStatementsValue(value)) {
				for (const statement of value.value) {
					output += evaluate(statement);
				}
			}

			return output;
		};

		const values = root.statements.map((node) => this.#evaluate(node));

		return { kind: "string", value: values.map(evaluate).join("") };
	}

	#evaluateRawTextNode(rawText: AstRawTextNode): StringValue {
		return { kind: "string", value: rawText.value };
	}

	#evaluateTemplateNode(template: AstTemplateNode): UnresolvedValue {
		return this.#evaluate(template.expression);
	}

	#evaluateBinaryExpressionNode(binaryExpression: AstBinaryExpressionNode): UnresolvedValue {
		const left = this.#evaluate(binaryExpression.left);
		const right = this.#evaluate(binaryExpression.right);
		const operator = this.#evaluate(binaryExpression.operator);

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

	#evaluateIfNode(ifNode: AstIfNode): StatementsValue {
		const condition = this.#evaluate(ifNode.condition);

		if (condition.kind !== "boolean") {
			throw new Error(`Expected boolean, got ${condition.kind}`);
		}

		if (condition.value) {
			return {
				kind: "statements",
				value: ifNode.success.map((node) => this.#evaluate(node)),
			};
		} else {
			return {
				kind: "statements",
				value: ifNode.failure.map((node) => this.#evaluate(node)),
			};
		}
	}

	#evaluateBinaryOperatorNode(binaryOperator: AstBinaryOperatorNode): OperatorValue {
		return { kind: "operator", value: binaryOperator.operator };
	}

	#evaluateLiteralStringNode(literalString: AstLiteralStringNode): StringValue {
		return { kind: "string", value: literalString.value };
	}

	#evaluateLiteralNumberNode(literalNumber: AstLiteralNumberNode): NumberValue {
		return { kind: "number", value: literalNumber.value };
	}

	#evaluateLiteralIdentifierNode(identifier: AstLiteralIdentifierNode): UnresolvedValue {
		if (filters.has(identifier.name)) {
			const builtin = filters.get(identifier.name)!;

			return { kind: "filter", value: builtin.func };
		}

		const variable = this.#context.get(identifier.name);
		return variable;
	}

	#evaluate(node: AstNode): UnresolvedValue {
		switch (node.kind) {
			case "AstRawTextNode":
				return this.#evaluateRawTextNode(node as AstRawTextNode);
			case "AstTemplateNode":
				return this.#evaluateTemplateNode(node as AstTemplateNode);
			case "AstIfNode":
				return this.#evaluateIfNode(node as AstIfNode);
			case "AstBinaryOperatorNode":
				return this.#evaluateBinaryOperatorNode(node as AstBinaryOperatorNode);
			case "AstBinaryExpressionNode":
				return this.#evaluateBinaryExpressionNode(node as AstBinaryExpressionNode);
			case "AstLiteralStringNode":
				return this.#evaluateLiteralStringNode(node as AstLiteralStringNode);
			case "AstLiteralNumberNode":
				return this.#evaluateLiteralNumberNode(node as AstLiteralNumberNode);
			case "AstLiteralIdentifierNode":
				return this.#evaluateLiteralIdentifierNode(node as AstLiteralIdentifierNode);
			default:
				throw new Error(`Unexpected node kind: ${node.kind}`);
		}
	}

	compile(): string {
		return this.#evaluateRootNode(this.#rootNode).value;
	}
}
