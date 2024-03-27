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

	#getOperatorPrecedence(operator: Token): number {
		switch (operator.kind) {
			case "OP_MULTIPLY":
			case "OP_DIVIDE":
				return 2;
			case "OP_PLUS":
			case "OP_MINUS":
				return 1;
			default:
				return -1;
		}
	}

	#parseExpressionFactor(): AstExpressionNode {
		const number = this.#eat("LITERAL_NUMBER");

		// @FIXME: check that the value is a valid number
		return new AstLiteralNumberNode(Number(number.value));
	}

	#parseBinaryExpression(left: AstExpressionNode, minPrecedence: number): AstExpressionNode {
		const binaryOperators: TokenKind[] = ["OP_PLUS", "OP_MINUS", "OP_MULTIPLY", "OP_DIVIDE"];

		while (
			binaryOperators.includes(this.#current().kind) &&
			this.#getOperatorPrecedence(this.#current()) >= minPrecedence
		) {
			const op = this.#eat(this.#current().kind);
			let right = this.#parseExpressionFactor();

			while (this.#getOperatorPrecedence(this.#current()) > this.#getOperatorPrecedence(op)) {
				right = this.#parseBinaryExpression(right, this.#getOperatorPrecedence(this.#current()));
			}

			left = new AstBinaryExpressionNode(left, new AstBinaryOperatorNode(op.value), right);
		}

		return left;
	}

	#parseTemplate(): AstTemplateNode {
		this.#eat("TEMPLATE_START");

		const left = this.#parseExpressionFactor();
		const expression = this.#parseBinaryExpression(left, 0);

		this.#eat("TEMPLATE_END");

		return new AstTemplateNode(expression);
	}

	public parse(): Parser {
		this.rootNode.statements.push(this.#parseTemplate());

		return this;
	}
}
