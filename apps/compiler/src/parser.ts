import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstExpressionNode,
	AstLiteralNumberNode,
	AstRootNode,
	AstTemplateNode,
} from "./astNodes";
import { Token, TokenKind } from "./tokenizer";

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
		this.rootNode = new AstRootNode([]);
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

	#parseExpressionFactor(): AstExpressionNode {
		const number = this.#eat("LITERAL_NUMBER");

		// @FIXME: check that the value is a valid number
		return new AstLiteralNumberNode(Number(number.value));
	}

	#parseBinaryExpression(): AstExpressionNode {
		const binaryOperators = ["OP_PLUS", "OP_MINUS", "OP_MUL", "OP_DIV"];
		let left = this.#parseExpressionFactor();

		while (binaryOperators.includes(this.#current().kind)) {
			const operator = this.#eat(this.#current().kind);
			const right = this.#parseExpressionFactor();

			left = new AstBinaryExpressionNode(left, new AstBinaryOperatorNode(operator.value), right);
		}

		return left;
	}

	#parseTemplate(): AstTemplateNode {
		this.#eat("TEMPLATE_START");

		const expression = this.#parseBinaryExpression();

		this.#eat("TEMPLATE_END");

		return new AstTemplateNode(expression);
	}

	public parse(): Parser {
		this.rootNode.statements.push(this.#parseTemplate());

		return this;
	}
}
