import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstExpressionNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstLiteralStringNode,
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
	constructor(expected: TokenKind | TokenKind[], got: TokenKind) {
		const expectedStr = Array.isArray(expected) ? `[${expected.join(" or ")}]` : expected;
		super(`Unexpected token - expected: ${expectedStr} but got ${got}`);

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
			case "OP_PIPE":
				return 0;
			default:
				return -1;
		}
	}

	#parseExpressionFactor(): AstExpressionNode {
		switch (this.#current().kind) {
			case "LITERAL_IDENTIFIER": {
				const value = this.#eat("LITERAL_IDENTIFIER").value;
				return new AstLiteralIdentifierNode(value);
			}
			case "LITERAL_STRING": {
				const str = this.#eat("LITERAL_STRING");

				return new AstLiteralStringNode(str.value);
			}
			case "LITERAL_NUMBER": {
				const number = this.#eat("LITERAL_NUMBER");
				const value = parseFloat(number.value);

				return new AstLiteralNumberNode(value);
			}
			case "L_PAREN": {
				this.#eat("L_PAREN");
				const expression = this.#parseBinaryExpression(this.#parseExpressionFactor(), 0);
				this.#eat("R_PAREN");

				return expression;
			}
			default: {
				throw new UnexpectedTokenError(["L_PAREN", "LITERAL_NUMBER"], this.#current().kind);
			}
		}
	}

	#parseBinaryExpression(left: AstExpressionNode, minPrecedence: number): AstExpressionNode {
		while (
			this.#current().flag === "BINARY_OPERATOR" &&
			this.#getOperatorPrecedence(this.#current()) >= minPrecedence
		) {
			const op = this.#eat(this.#current().kind);
			let right = this.#parseExpressionFactor();

			while (this.#getOperatorPrecedence(this.#current()) > this.#getOperatorPrecedence(op)) {
				right = this.#parseBinaryExpression(right, this.#getOperatorPrecedence(this.#current()));
			}

			left = new AstBinaryExpressionNode(left, new AstBinaryOperatorNode(op.kind), right);
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
