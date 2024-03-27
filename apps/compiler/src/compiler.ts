import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstExpressionNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstRootNode,
	AstTemplateNode,
} from "./astNodes";
import { filters } from "./filters";

type ValueKind = "number" | "string" | "filter" | "variable" | "operator";

export type RuntimeValue<T> = {
	kind: ValueKind;
	value: T;
};

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

export type VariableValue = RuntimeValue<string> & {
	kind: "variable";
};

export type IdentifierValue = FilterValue | VariableValue;

export type OperatorValue = RuntimeValue<string> & {
	kind: "operator";
};

function isNumberValue(value: RuntimeValue<unknown>): value is NumberValue {
	return value.kind === "number";
}

function isFilterValue(value: RuntimeValue<unknown>): value is FilterValue {
	return value.kind === "filter";
}

function isOperatorValue(value: RuntimeValue<unknown>): value is OperatorValue {
	return value.kind === "operator";
}

export interface Visitor {
	visitRootNode(root: AstRootNode): StringValue;
	visitTemplateNode(template: AstTemplateNode): RuntimeValue<unknown>;
	visitExpressionNode(expression: AstExpressionNode): RuntimeValue<unknown>;
	visitBinaryExpressionNode(binaryExpression: AstBinaryExpressionNode): RuntimeValue<unknown>;
	visitBinaryOperatorNode(binaryOperator: AstBinaryOperatorNode): OperatorValue;
	visitLiteralNumberNode(literalNumber: AstLiteralNumberNode): RuntimeValue<unknown>;
	visitLiteralIdentifierNode(identifier: AstLiteralIdentifierNode): RuntimeValue<unknown>;
}

export class Compiler implements Visitor {
	readonly #rootNode: AstRootNode;

	constructor(rootNode: AstRootNode) {
		this.#rootNode = rootNode;
	}

	visitRootNode(root: AstRootNode): StringValue {
		let output = "";

		for (const statement of root.statements) {
			const val = statement.accept(this);
			output += val.value;
		}

		return { kind: "string", value: output };
	}

	visitTemplateNode(template: AstTemplateNode): RuntimeValue<unknown> {
		return template.expression.accept(this);
	}

	visitExpressionNode(expression: AstExpressionNode): RuntimeValue<unknown> {
		return expression.accept(this);
	}

	visitBinaryExpressionNode(binaryExpression: AstBinaryExpressionNode): RuntimeValue<unknown> {
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
						return { kind: "number", value: right.value(left.value) };
					}
				default:
					throw new Error(`Unexpected operator: ${operator.value}`);
			}
		}
	}

	visitBinaryOperatorNode(binaryOperator: AstBinaryOperatorNode): OperatorValue {
		return { kind: "operator", value: binaryOperator.operator };
	}

	visitLiteralNumberNode(literalNumber: AstLiteralNumberNode): NumberValue {
		return { kind: "number", value: literalNumber.value };
	}

	visitLiteralIdentifierNode(identifier: AstLiteralIdentifierNode): IdentifierValue {
		if (filters.has(identifier.name)) {
			const builtin = filters.get(identifier.name)!;

			return { kind: "filter", value: builtin };
		}

		return { kind: "variable", value: identifier.name };
	}

	compile(): string {
		return this.#rootNode.accept(this).value;
	}
}
