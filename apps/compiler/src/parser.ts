import { Token, TokenKind } from "./tokenizer";

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

export class UnexpectedEofError extends Error {
	constructor() {
		super("Unexpected EOF");

		this.name = "UnexpectedEofError";
	}
}

export class UnexpectedTokenError extends Error {
	constructor(expected: TokenKind, got: TokenKind) {
		super(`Unexpected token - expected: ${expected} but got ${got}`);

		this.name = "UnexpectedTokenError";
	}
}

export class Parser {
	readonly #tokens: Token[];
	#currentTokenIndex: number = 0;
	public readonly rootNode: AstRootNode;

	constructor(tokens: Token[]) {
		this.#tokens = tokens;
		this.rootNode = {
			kind: "AstRootNode",
			statements: [],
		};
	}

	#current(): Token {
		if (this.#currentTokenIndex >= this.#tokens.length) {
			throw new UnexpectedEofError();
		}

		return this.#tokens[this.#currentTokenIndex]!;
	}

	#eat(expected: TokenKind): Token {
		if (this.#current().kind !== expected) {
			throw new UnexpectedTokenError(expected, this.#current().kind);
		}

		return this.#tokens.shift()!;
	}

	#parseTemplate(): AstTemplateNode {
		this.#eat("TEMPLATE_START");

		return {
			kind: "AstTemplateNode",
		};
	}

	public parse(): Parser {
		this.rootNode.statements.push(this.#parseTemplate());

		return this;
	}
}
