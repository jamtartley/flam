import path from "node:path";
import fs from "node:fs";
import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstFilterNode,
	AstForNode,
	AstIfNode,
	AstIncludeNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstLiteralStringNode,
	AstMakeNode,
	AstMemberAccessNode,
	AstNode,
	AstRawTextNode,
	AstRootNode,
	AstTemplateNode,
} from "./ast";
import { applyFilter, filters } from "./filters";
import { Parser } from "./parser";
import { Scope } from "./scope";
import { Tokenizer } from "./tokenizer";

export enum ValueKind {
	NUMBER,
	STRING,
	BOOLEAN,
	ARRAY,
	OBJECT,
	NULL,
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

export interface NullValue extends RuntimeValue {
	kind: ValueKind.NULL;
	value: null;
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

function isBooleanValue(value: RuntimeValue): value is BooleanValue {
	return value.kind === ValueKind.BOOLEAN;
}

function isArrayValue(value: RuntimeValue): value is ArrayValue {
	return value.kind === ValueKind.ARRAY;
}

function isObjectValue(value: RuntimeValue): value is ObjectValue {
	return value.kind === ValueKind.OBJECT;
}

export class Compiler {
	readonly #rootNode: AstRootNode;
	readonly #scope: Scope;
	readonly #filePath: string;

	constructor(rootNode: AstRootNode, scope: Scope, filePath: string) {
		this.#rootNode = rootNode;
		this.#scope = scope;
		this.#filePath = filePath;
	}

	#evaluateRootNode(root: AstRootNode): StringValue {
		const evaluate = (value: RuntimeValue) => {
			let output = "";

			if (isStringValue(value)) {
				output += value.value;
			} else if (isNumberValue(value)) {
				output += value.value;
			} else if (isBooleanValue(value)) {
				output += value.value;
			} else if (isArrayValue(value)) {
				for (const statement of value.value) {
					const x = evaluate(statement);
					output += x;
				}
			} else if (isObjectValue(value)) {
				output += JSON.stringify(value.value);
			}

			return output;
		};

		const values = root.statements.map((node) => this.#evaluate(node));

		return { kind: ValueKind.STRING, value: values.map(evaluate).join("") };
	}

	#evaluateRawTextNode(rawText: AstRawTextNode): StringValue {
		return { kind: ValueKind.STRING, value: rawText.value };
	}

	#evaluateTemplateNode(template: AstTemplateNode): RuntimeValue {
		return this.#evaluate(template.expression);
	}

	#evaluateFilterNode(filter: AstFilterNode): RuntimeValue {
		const args: RuntimeValue[] = filter.args.map((arg) => this.#evaluate(arg)).filter(isRuntimeValue);

		return applyFilter(filter.name.name, args);
	}

	#evaluateMemberAccessNode(memberAccess: AstMemberAccessNode): RuntimeValue {
		let object = this.#evaluateLiteralIdentifierNode(memberAccess.object);

		if (!isObjectValue(object)) {
			throw new Error(`Expected object, got ${object.kind}`);
		}

		for (const propertyRuntime of memberAccess.properties) {
			const prop = propertyRuntime.value;

			if (isObjectValue(object) && prop in object.value) {
				object = object.value[prop]!;
			} else {
				return { kind: ValueKind.NULL, value: null };
			}
		}

		return object;
	}

	#evaluateIncludeNode(includeNode: AstIncludeNode): StringValue {
		const name = this.#evaluateLiteralStringNode(includeNode.name);
		// @FEATURE: Infer file extension as .flam if not provided
		const filePath = path.join(path.dirname(this.#filePath), name.value);
		const contents = fs.readFileSync(filePath).toString();
		const tokenizer = new Tokenizer(contents, filePath).tokenize();
		const parser = new Parser(tokenizer.tokens).parse();

		const namedScope = includeNode.namedScope;
		const newScope = new Scope({ parent: this.#scope, variables: this.#scope.variables });

		for (const [key, value] of (namedScope || new Map()).entries()) {
			newScope.add(key, this.#evaluate(value));
		}

		const compiler = new Compiler(parser.rootNode, newScope, filePath);

		return { kind: ValueKind.STRING, value: compiler.compile() };
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
		const collection = this.#evaluate(forNode.collection);

		if (!isArrayValue(collection)) {
			throw new Error(`Expected array, got ${collection.kind}`);
		}

		const items: RuntimeValue[] = [];

		for (const item of collection.value) {
			this.#scope.add(forNode.variable.name, item);

			for (const statement of forNode.body) {
				items.push(this.#evaluate(statement));
			}

			this.#scope.delete(forNode.variable.name);
		}

		return {
			kind: ValueKind.ARRAY,
			value: items,
		};
	}

	#evaluateMakeNode(makeNode: AstMakeNode): NullValue {
		const value = this.#evaluate(makeNode.value);

		this.#scope.add(makeNode.name.name, value);

		return { kind: ValueKind.NULL, value: null };
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

		const variable = this.#scope.get(identifier.name);
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
			case "AstMakeNode":
				return this.#evaluateMakeNode(node as AstMakeNode);
			case "AstBinaryOperatorNode":
				return this.#evaluateBinaryOperatorNode(node as AstBinaryOperatorNode);
			case "AstBinaryExpressionNode":
				return this.#evaluateBinaryExpressionNode(node as AstBinaryExpressionNode);
			case "AstFilterNode":
				return this.#evaluateFilterNode(node as AstFilterNode);
			case "AstMemberAccessNode":
				return this.#evaluateMemberAccessNode(node as AstMemberAccessNode);
			case "AstIncludeNode":
				return this.#evaluateIncludeNode(node as AstIncludeNode);
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
