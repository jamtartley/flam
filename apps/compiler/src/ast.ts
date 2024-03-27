import { NumberValue, OperatorValue, RuntimeValue, StringValue, Visitor } from "./compiler";

export type NodeType =
	| "AstTemplateNode"
	| "AstBinaryOperatorNode"
	| "AstBinaryExpressionNode"
	| "AstLiteralStringNode"
	| "AstLiteralNumberNode"
	| "AstLiteralIdentifierNode"
	| "AstRootNode";

abstract class AstNode {
	public readonly kind: NodeType;

	public abstract accept(visitor: Visitor): RuntimeValue<unknown>;

	constructor(kind: NodeType) {
		this.kind = kind;
	}
}

export abstract class AstStatementNode extends AstNode {
	constructor(kind: NodeType) {
		super(kind);
	}
}

export abstract class AstExpressionNode extends AstNode {
	constructor(kind: NodeType) {
		super(kind);
	}
}

export class AstRootNode extends AstNode {
	public readonly statements: AstStatementNode[];

	constructor(statements: AstStatementNode[]) {
		super("AstRootNode");

		this.statements = statements;
	}

	public accept(visitor: Visitor): StringValue {
		return visitor.visitRootNode(this);
	}
}

export class AstTemplateNode extends AstStatementNode {
	public readonly expression: AstExpressionNode;

	constructor(expression: AstExpressionNode) {
		super("AstTemplateNode");
		this.expression = expression;
	}

	public accept(visitor: Visitor): RuntimeValue<unknown> {
		return visitor.visitTemplateNode(this);
	}
}

export class AstBinaryOperatorNode extends AstExpressionNode {
	public readonly operator: string;

	constructor(operator: string) {
		super("AstBinaryOperatorNode");
		this.operator = operator;
	}

	public accept(visitor: Visitor): OperatorValue {
		return visitor.visitBinaryOperatorNode(this);
	}
}

export class AstBinaryExpressionNode extends AstExpressionNode {
	public readonly left: AstExpressionNode;
	public readonly right: AstExpressionNode;
	public readonly operator: AstBinaryOperatorNode;

	constructor(left: AstExpressionNode, operator: AstBinaryOperatorNode, right: AstExpressionNode) {
		super("AstBinaryExpressionNode");

		this.left = left;
		this.operator = operator;
		this.right = right;
	}

	public accept(visitor: Visitor): RuntimeValue<unknown> {
		return visitor.visitBinaryExpressionNode(this);
	}
}

export class AstLiteralStringNode extends AstExpressionNode {
	public readonly value: string;

	constructor(value: string) {
		super("AstLiteralStringNode");
		this.value = value;
	}

	public accept(visitor: Visitor): StringValue {
		return visitor.visitLiteralStringNode(this);
	}
}

export class AstLiteralNumberNode extends AstExpressionNode {
	public readonly value: number;

	constructor(value: number) {
		super("AstLiteralNumberNode");
		this.value = value;
	}

	public accept(visitor: Visitor): NumberValue {
		return visitor.visitLiteralNumberNode(this);
	}
}

export class AstLiteralIdentifierNode extends AstExpressionNode {
	public readonly name: string;

	constructor(name: string) {
		super("AstLiteralIdentifierNode");
		this.name = name;
	}

	public accept(visitor: Visitor): RuntimeValue<unknown> {
		return visitor.visitLiteralIdentifierNode(this);
	}
}
