import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstFilterNode,
	AstForNode,
	AstIfNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstLiteralStringNode,
	AstMemberAccessNode,
	AstNode,
	AstRawTextNode,
	AstRootNode,
	AstTemplateNode,
} from "./ast";
import { applyFilter, filters } from "./filters";
import { Context } from "./context";

export enum ValueKind {
	NUMBER,
	STRING,
	BOOLEAN,
	ARRAY,
	OBJECT,
}

export interface RuntimeValue {
	kind: ValueKind;
	value: unknown;
}

export interface StringValue extends RuntimeValue {
	kind: ValueKind.STRING;
	value: string;
}

export interface NumberValue extends RuntimeValue {
	kind: ValueKind.NUMBER;
	value: number;
}

export interface BooleanValue extends RuntimeValue {
	kind: ValueKind.BOOLEAN;
	value: boolean;
}

export interface ArrayValue extends RuntimeValue {
	kind: ValueKind.ARRAY;
	value: RuntimeValue[];
}

export interface ObjectValue extends RuntimeValue {
	kind: ValueKind.OBJECT;
	value: Record<string, RuntimeValue>;
}

function isRuntimeValue(value?: RuntimeValue): value is RuntimeValue {
	return !!value;
}

function isNumberValue(value: RuntimeValue): value is NumberValue {
	return value.kind === ValueKind.NUMBER;
}

function isStringValue(value: RuntimeValue): value is StringValue {
	return value.kind === ValueKind.STRING;
}

function isArrayValue(value: RuntimeValue): value is ArrayValue {
	return value.kind === ValueKind.ARRAY;
}

function isObjectValue(value: RuntimeValue): value is ObjectValue {
	return value.kind === ValueKind.OBJECT;
}

export class Compiler {
	readonly #rootNode: AstRootNode;
	readonly #context: Context;

	constructor(rootNode: AstRootNode, context: Context) {
		this.#rootNode = rootNode;
		this.#context = context;
	}

	#evaluateRootNode(root: AstRootNode): StringValue {
		const evaluate = (value: RuntimeValue) => {
			let output = "";

			if (isStringValue(value)) {
				output += value.value;
			} else if (isNumberValue(value)) {
				output += value.value;
			} else if (isArrayValue(value)) {
				for (const statement of value.value) {
					const x = evaluate(statement);
					output += x;
				}
			}

			return output;
		};

		const values = root.statements.map((node) => this.#evaluate(node));

		return { kind: ValueKind.STRING, value: values.map(evaluate).join("") };
	}

	#evaluateRawTextNode(rawText: AstRawTextNode): StringValue {
		const value = rawText.value === "\n" ? "" : rawText.value;

		return { kind: ValueKind.STRING, value };
	}

	#evaluateTemplateNode(template: AstTemplateNode): RuntimeValue {
		return this.#evaluate(template.expression);
	}

	#evaluateFilterNode(filter: AstFilterNode): RuntimeValue {
		const args: RuntimeValue[] = [...filter.args.map((arg) => this.#evaluate(arg))].filter(isRuntimeValue);

		return applyFilter(filter.name.name, args);
	}

	#evaluateMemberAccessNode(memberAccess: AstMemberAccessNode): RuntimeValue {
		let object = this.#evaluateLiteralIdentifierNode(memberAccess.object);

		if (!isObjectValue(object)) {
			throw new Error(`Expected object, got ${object.kind}`);
		}

		for (const propertyRuntime of memberAccess.properties) {
			const prop = propertyRuntime.value;

			if (isObjectValue(object) && object.value.hasOwnProperty(prop)) {
				object = object.value[prop]!;
			} else {
				throw new Error(`Property "${prop}" not found on object`);
			}
		}

		return object;
	}

	#evaluateBinaryExpressionNode(binaryExpression: AstBinaryExpressionNode): RuntimeValue {
		const left = this.#evaluate(binaryExpression.left);
		const right = this.#evaluate(binaryExpression.right);
		const operator = this.#evaluate(binaryExpression.operator);

		switch (operator.value) {
			case "OP_PLUS": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: ValueKind.NUMBER, value: left.value + right.value };
			}
			case "OP_MINUS": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: ValueKind.NUMBER, value: left.value - right.value };
			}
			case "OP_DIVIDE": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: ValueKind.NUMBER, value: left.value / right.value };
			}
			case "OP_MULTIPLY": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: ValueKind.NUMBER, value: left.value * right.value };
			}
			case "OP_GT": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: ValueKind.BOOLEAN, value: left.value > right.value };
			}
			case "OP_LT": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: ValueKind.BOOLEAN, value: left.value < right.value };
			}
			case "OP_GTE": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: ValueKind.BOOLEAN, value: left.value >= right.value };
			}
			case "OP_LTE": {
				if (!isNumberValue(left) || !isNumberValue(right)) {
					throw new Error(`Expected numbers, got ${left.kind}, ${right.kind}`);
				}

				return { kind: ValueKind.BOOLEAN, value: left.value <= right.value };
			}
			case "OP_EQ": {
				return { kind: ValueKind.BOOLEAN, value: left.value === right.value };
			}
			case "OP_NE": {
				return { kind: ValueKind.BOOLEAN, value: left.value !== right.value };
			}
		}

		throw new Error(`Unexpected values: ${left}, ${right}`);
	}

	#evaluateIfNode(ifNode: AstIfNode): ArrayValue {
		const condition = this.#evaluate(ifNode.condition);

		if (condition.kind !== ValueKind.BOOLEAN) {
			throw new Error(`Expected boolean, got ${condition.kind}`);
		}

		if (condition.value) {
			return {
				kind: ValueKind.ARRAY,
				value: ifNode.success.map((node) => this.#evaluate(node)),
			};
		} else {
			return {
				kind: ValueKind.ARRAY,
				value: ifNode.failure.map((node) => this.#evaluate(node)),
			};
		}
	}

	#evaluateForNode(forNode: AstForNode): ArrayValue {
		const collection = this.#evaluateLiteralIdentifierNode(forNode.collection);

		if (!isArrayValue(collection)) {
			throw new Error(`Expected array, got ${collection.kind}`);
		}

		const items = [];

		for (const item of collection.value) {
			this.#context.add(forNode.variable.name, item);

			for (const statement of forNode.body) {
				items.push(this.#evaluate(statement));
			}

			this.#context.delete(forNode.variable.name);
		}

		return {
			kind: ValueKind.ARRAY,
			value: items,
		};
	}

	#evaluateBinaryOperatorNode(binaryOperator: AstBinaryOperatorNode): StringValue {
		return { kind: ValueKind.STRING, value: binaryOperator.operator };
	}

	#evaluateLiteralStringNode(literalString: AstLiteralStringNode): StringValue {
		return { kind: ValueKind.STRING, value: literalString.value };
	}

	#evaluateLiteralNumberNode(literalNumber: AstLiteralNumberNode): NumberValue {
		return { kind: ValueKind.NUMBER, value: literalNumber.value };
	}

	#evaluateLiteralIdentifierNode(identifier: AstLiteralIdentifierNode): RuntimeValue {
		if (filters.has(identifier.name)) {
			return this.#evaluateFilterNode(new AstFilterNode(identifier, []));
		}

		const variable = this.#context.get(identifier.name);
		return variable;
	}

	#evaluate(node: AstNode): RuntimeValue {
		switch (node.kind) {
			case "AstRawTextNode":
				return this.#evaluateRawTextNode(node as AstRawTextNode);
			case "AstTemplateNode":
				return this.#evaluateTemplateNode(node as AstTemplateNode);
			case "AstIfNode":
				return this.#evaluateIfNode(node as AstIfNode);
			case "AstForNode":
				return this.#evaluateForNode(node as AstForNode);
			case "AstBinaryOperatorNode":
				return this.#evaluateBinaryOperatorNode(node as AstBinaryOperatorNode);
			case "AstBinaryExpressionNode":
				return this.#evaluateBinaryExpressionNode(node as AstBinaryExpressionNode);
			case "AstFilterNode":
				return this.#evaluateFilterNode(node as AstFilterNode);
			case "AstMemberAccessNode":
				return this.#evaluateMemberAccessNode(node as AstMemberAccessNode);
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
