import { RuntimeValue, Visitor } from "./compiler";

export type NodeType =
	| "AstTemplateNode"
	| "AstBinaryOperatorNode"
	| "AstBinaryExpressionNode"
	| "AstLiteralNumberNode"
	| "AstRootNode";

abstract class AstNode {
	public readonly kind: NodeType;

	public abstract accept(visitor: Visitor): RuntimeValue;

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

	public accept(visitor: Visitor): RuntimeValue {
		return visitor.visitRootNode(this);
	}
}

export class AstTemplateNode extends AstStatementNode {
	public readonly expression: AstExpressionNode;

	constructor(expression: AstExpressionNode) {
		super("AstTemplateNode");
		this.expression = expression;
	}

	public accept(visitor: Visitor): RuntimeValue {
		return visitor.visitTemplateNode(this);
	}
}

export class AstBinaryOperatorNode extends AstExpressionNode {
	public readonly operator: string;

	constructor(operator: string) {
		super("AstBinaryOperatorNode");
		this.operator = operator;
	}

	public accept(visitor: Visitor): RuntimeValue {
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

	public accept(visitor: Visitor): RuntimeValue {
		return visitor.visitBinaryExpressionNode(this);
	}
}

export class AstLiteralNumberNode extends AstExpressionNode {
	public readonly value: number;

	constructor(value: number) {
		super("AstLiteralNumberNode");
		this.value = value;
	}

	public accept(visitor: Visitor): RuntimeValue {
		return visitor.visitLiteralNumberNode(this);
	}
}
