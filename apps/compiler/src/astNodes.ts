export type NodeType =
	| "AstTemplateNode"
	| "AstBinaryOperatorNode"
	| "AstBinaryExpressionNode"
	| "AstLiteralNumberNode"
	| "AstRootNode";

abstract class AstNode {
	public readonly kind: NodeType;

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
}

export class AstTemplateNode extends AstStatementNode {
	public readonly expression: AstExpressionNode;

	constructor(expression: AstExpressionNode) {
		super("AstTemplateNode");
		this.expression = expression;
	}
}

export class AstBinaryOperatorNode extends AstExpressionNode {
	public readonly operator: string;

	constructor(operator: string) {
		super("AstBinaryOperatorNode");
		this.operator = operator;
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
}

export class AstLiteralNumberNode extends AstExpressionNode {
	public readonly value: number;

	constructor(value: number) {
		super("AstLiteralNumberNode");
		this.value = value;
	}
}
