import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstExpressionNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstLiteralStringNode,
	AstRootNode,
	AstTemplateNode,
} from "./ast";
import { applyFilter, filters } from "./filters";
import { Context } from "./context";

type ValueKind = "number" | "string" | "filter" | "operator";

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
	visitTemplateNode(template: AstTemplateNode): UnresolvedValue;
	visitExpressionNode(expression: AstExpressionNode): UnresolvedValue;
	visitBinaryExpressionNode(binaryExpression: AstBinaryExpressionNode): UnresolvedValue;
	visitBinaryOperatorNode(binaryOperator: AstBinaryOperatorNode): OperatorValue;
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
			output += val.value;
		}

		return { kind: "string", value: output };
	}

	visitTemplateNode(template: AstTemplateNode): UnresolvedValue {
		return template.expression.accept(this);
	}

	visitExpressionNode(expression: AstExpressionNode): UnresolvedValue {
		return expression.accept(this);
	}

	visitBinaryExpressionNode(binaryExpression: AstBinaryExpressionNode): UnresolvedValue {
		const left = binaryExpression.left.accept(this);
		const right = binaryExpression.right.accept(this);
		const operator = binaryExpression.operator.accept(this);

		if (isNumberValue(left) && isNumberValue(right) && isOperatorValue(operator)) {
			switch (operator.value) {
				case "OP_PLUS":
					return { kind: "number", value: left.value + right.value };
				case "OP_MINUS":
					return { kind: "number", value: left.value - right.value };
				case "OP_MULTIPLY":
					return { kind: "number", value: left.value * right.value };
				case "OP_DIVIDE":
					return { kind: "number", value: left.value / right.value };
				default:
					throw new Error(`Unexpected operator: ${operator.value}`);
			}
		} else {
			switch (operator.value) {
				case "OP_PIPE":
					if (isFilterValue(right)) {
						return this.#applyFilter(right, left);
					}
				default:
					throw new Error(`Unexpected operator: ${operator.value}`);
			}
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
