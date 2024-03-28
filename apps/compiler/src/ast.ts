export type NodeType =
	| "AstTemplateNode"
	| "AstBinaryOperatorNode"
	| "AstBinaryExpressionNode"
	| "AstIfNode"
	| "AstRawTextNode"
	| "AstLiteralStringNode"
	| "AstLiteralNumberNode"
	| "AstLiteralIdentifierNode"
	| "AstRootNode";

export abstract class AstNode {
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

export class AstIfNode extends AstStatementNode {
	public readonly condition: AstExpressionNode;
	public readonly success: AstStatementNode[];
	public readonly failure: AstStatementNode[];

	constructor(condition: AstExpressionNode, success: AstStatementNode[], failure: AstStatementNode[]) {
		super("AstIfNode");

		this.condition = condition;
		this.success = success;
		this.failure = failure;
	}
}

export class AstRawTextNode extends AstExpressionNode {
	public readonly value: string;

	constructor(value: string) {
		super("AstRawTextNode");
		this.value = value;
	}
}

export class AstLiteralStringNode extends AstExpressionNode {
	public readonly value: string;

	constructor(value: string) {
		super("AstLiteralStringNode");
		this.value = value;
	}
}

export class AstLiteralNumberNode extends AstExpressionNode {
	public readonly value: number;

	constructor(value: number) {
		super("AstLiteralNumberNode");
		this.value = value;
	}
}

export class AstLiteralIdentifierNode extends AstExpressionNode {
	public readonly name: string;

	constructor(name: string) {
		super("AstLiteralIdentifierNode");
		this.name = name;
	}
}
