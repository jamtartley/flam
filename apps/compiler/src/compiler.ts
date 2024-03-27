import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstExpressionNode,
	AstLiteralNumberNode,
	AstRootNode,
	AstTemplateNode,
} from "./astNodes";

export type RuntimeValue = {
	kind: string;
	value: any;
};

export interface Visitor {
	visitRootNode(root: AstRootNode): RuntimeValue;
	visitTemplateNode(template: AstTemplateNode): RuntimeValue;
	visitExpressionNode(expression: AstExpressionNode): RuntimeValue;
	visitBinaryExpressionNode(binaryExpression: AstBinaryExpressionNode): RuntimeValue;
	visitBinaryOperatorNode(binaryOperator: AstBinaryOperatorNode): RuntimeValue;
	visitLiteralNumberNode(literalNumber: AstLiteralNumberNode): RuntimeValue;
}

export class Compiler implements Visitor {
	readonly #rootNode: AstRootNode;

	constructor(rootNode: AstRootNode) {
		this.#rootNode = rootNode;
	}

	visitRootNode(root: AstRootNode): RuntimeValue {
		let output = "";

		for (const statement of root.statements) {
			const val = statement.accept(this);
			output += val.value;
		}

		return { kind: "string", value: output };
	}

	visitTemplateNode(template: AstTemplateNode): RuntimeValue {
		return template.expression.accept(this);
	}

	visitExpressionNode(expression: AstExpressionNode): RuntimeValue {
		return expression.accept(this);
	}

	visitBinaryExpressionNode(literalNumber: AstBinaryExpressionNode): RuntimeValue {
		const left = literalNumber.left.accept(this);
		const right = literalNumber.right.accept(this);
		const operator = literalNumber.operator.accept(this);

		if (left.kind !== "number" || right.kind !== "number") {
			throw new Error("Unexpected binary expression kind");
		}

		switch (operator.value) {
			case "+":
				return { kind: "number", value: left.value + right.value };
			case "-":
				return { kind: "number", value: left.value - right.value };
			case "*":
				return { kind: "number", value: left.value * right.value };
			case "/":
				return { kind: "number", value: left.value / right.value };
			default:
				throw new Error(`Unknown operator: ${operator.value}`);
		}
	}

	visitBinaryOperatorNode(binaryOperator: AstBinaryOperatorNode): RuntimeValue {
		return { kind: "operator", value: binaryOperator.operator };
	}

	visitLiteralNumberNode(literalNumber: AstLiteralNumberNode): RuntimeValue {
		return { kind: "number", value: literalNumber.value };
	}

	compile(): string {
		return this.#rootNode.accept(this).value;
	}
}
