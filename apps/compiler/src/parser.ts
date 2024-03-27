import { Token } from "./tokenizer";

type NodeType = "AstTemplateNode" | "AstRootNode";

type AstNode = {
	kind: NodeType;
};

type AstStatementNode = AstNode & {};
type AstExpressionNode = AstNode & {};

type AstRootNode = AstNode & {
	kind: "AstRootNode";
	statements: AstStatementNode[];
};

type AstTemplateNode = AstStatementNode & {
	kind: "AstTemplateNode";
};

export class Parser {
	readonly #tokens: Token[];
	public readonly rootNode: AstRootNode;

	constructor(tokens: Token[]) {
		this.#tokens = tokens;
		this.rootNode = {
			kind: "AstRootNode",
			statements: [],
		};
	}

	#parseTemplate(): AstTemplateNode {
		return {
			kind: "AstTemplateNode",
		};
	}

	public parse(): Parser {
		this.rootNode.statements.push(this.#parseTemplate());

		return this;
	}
}
