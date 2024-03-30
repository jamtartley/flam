import {
	AstBinaryExpressionNode,
	AstBinaryOperatorNode,
	AstExpressionNode,
	AstFilterNode,
	AstForNode,
	AstIfNode,
	AstIncludeNode,
	AstLiteralIdentifierNode,
	AstLiteralNumberNode,
	AstLiteralStringNode,
	AstMakeNode,
	AstMemberAccessNode,
	AstRawTextNode,
	AstRootNode,
	AstStatementNode,
	AstTemplateNode,
} from "./ast";
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

	#peek(): Token | null {
		if (this.#currentTokenIndex + 1 >= this.#tokens.length) {
			return null;
		}

		return this.#tokens[this.#currentTokenIndex + 1]!;
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
				return 3;
			case "OP_PLUS":
			case "OP_MINUS":
				return 2;
			case "OP_GT":
			case "OP_LT":
			case "OP_GTE":
			case "OP_LTE":
			case "OP_EQ":
			case "OP_NE":
				return 1;
			case "PIPE":
				return 0;
			default:
				return -1;
		}
	}

	#parseExpressionFactor(): AstExpressionNode {
		switch (this.#current().kind) {
			case "LITERAL_IDENTIFIER": {
				switch (this.#peek()?.kind) {
					case "L_PAREN":
						return this.#parseFilter();
					case "PERIOD":
						return this.#parseMemberAccess();
					default:
						return new AstLiteralIdentifierNode(this.#eat("LITERAL_IDENTIFIER").value);
				}
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
				throw new UnexpectedTokenError(
					["L_PAREN", "LITERAL_NUMBER", "LITERAL_STRING", "LITERAL_IDENTIFIER"],
					this.#current().kind
				);
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

	#parseFilter(): AstFilterNode {
		const filterName = new AstLiteralIdentifierNode(this.#eat("LITERAL_IDENTIFIER").value);
		const filterNode = new AstFilterNode(filterName, []);

		if (this.#current().kind === "L_PAREN") {
			this.#eat("L_PAREN");

			while (this.#current().kind !== "R_PAREN") {
				const arg = this.#parseExpressionFactor();
				filterNode.args.push(arg);

				if (this.#current().kind === "COMMA") {
					this.#eat("COMMA");
				}
			}

			this.#eat("R_PAREN");
		}

		return filterNode;
	}

	#parseMemberAccess(): AstMemberAccessNode {
		const initial = new AstLiteralIdentifierNode(this.#eat("LITERAL_IDENTIFIER").value);
		const memberChain: AstLiteralStringNode[] = [];

		while (this.#current().kind === "PERIOD") {
			this.#eat("PERIOD");

			memberChain.push(new AstLiteralStringNode(this.#eat("LITERAL_IDENTIFIER").value));
		}

		return new AstMemberAccessNode(initial, memberChain);
	}

	#parseExpression(): AstExpressionNode {
		let base = this.#parseBinaryExpression(this.#parseExpressionFactor(), 0);

		while (this.#current().kind === "PIPE") {
			this.#eat("PIPE");
			const filterNode = this.#parseFilter();

			filterNode.args.unshift(base);
			base = filterNode;
		}

		return base;
	}

	#parseIf(): AstIfNode {
		this.#eat("KEYWORD_IF");

		const condition = this.#parseBinaryExpression(this.#parseExpressionFactor(), 0);

		this.#eat("CONTROL_END");

		const success: AstStatementNode[] = [];
		const failure: AstStatementNode[] = [];

		while (
			!(
				this.#current().kind === "CONTROL_START" &&
				(this.#peek()?.kind === "KEYWORD_ELSE" || this.#peek()?.kind === "KEYWORD_FI")
			)
		) {
			const statement = this.#parseNode();
			if (!statement) {
				break;
			}

			success.push(statement);
		}

		if (this.#current().kind === "CONTROL_START" && this.#peek()?.kind === "KEYWORD_ELSE") {
			this.#eat("CONTROL_START");
			this.#eat("KEYWORD_ELSE");
			this.#eat("CONTROL_END");

			while (!(this.#current().kind === "CONTROL_START" && this.#peek()?.kind === "KEYWORD_FI")) {
				const statement = this.#parseNode();
				if (!statement) {
					break;
				}

				failure.push(statement);
			}
		}

		this.#eat("CONTROL_START");
		this.#eat("KEYWORD_FI");
		this.#eat("CONTROL_END");

		return new AstIfNode(condition, success, failure);
	}

	#parseFor(): AstForNode {
		this.#eat("KEYWORD_FOR");
		const variable = new AstLiteralIdentifierNode(this.#eat("LITERAL_IDENTIFIER").value);
		this.#eat("KEYWORD_IN");
		let collection = this.#parseExpression();
		this.#eat("CONTROL_END");

		const body: AstStatementNode[] = [];

		while (!(this.#current().kind === "CONTROL_START" && this.#peek()?.kind === "KEYWORD_ROF")) {
			const next = this.#parseNode();
			if (!next) {
				break;
			}

			body.push(next);
		}

		this.#eat("CONTROL_START");
		this.#eat("KEYWORD_ROF");
		this.#eat("CONTROL_END");

		return new AstForNode(variable, collection, body);
	}

	#parseMake(): AstMakeNode {
		this.#eat("KEYWORD_MAKE");
		const name = new AstLiteralIdentifierNode(this.#eat("LITERAL_IDENTIFIER").value);
		this.#eat("KEYWORD_BECOME");
		let value = this.#parseExpression();
		this.#eat("CONTROL_END");

		return new AstMakeNode(name, value);
	}

	#parseInclude(): AstIncludeNode {
		this.#eat("KEYWORD_INCLUDE");
		const name = new AstLiteralStringNode(this.#eat("LITERAL_STRING").value);
		let namedScope: Map<string, AstExpressionNode> | undefined;

		while (this.#current().kind === "COMMA") {
			if (!namedScope) {
				namedScope = new Map<string, AstExpressionNode>();
			}

			this.#eat("COMMA");
			const key = this.#eat("LITERAL_IDENTIFIER").value;

			if (this.#current().kind !== "COLON") {
				namedScope.set(key, new AstLiteralIdentifierNode(key));
				continue;
			}

			this.#eat("COLON");
			const value = this.#parseExpression();

			namedScope.set(key, value);
		}

		this.#eat("CONTROL_END");

		return new AstIncludeNode(name, namedScope);
	}

	#parseControl(): AstStatementNode {
		this.#eat("CONTROL_START");

		let statement: AstStatementNode;

		switch (this.#current().kind) {
			case "KEYWORD_IF":
				statement = this.#parseIf();
				break;
			case "KEYWORD_FOR":
				statement = this.#parseFor();
				break;
			case "KEYWORD_MAKE":
				statement = this.#parseMake();
				break;
			case "KEYWORD_INCLUDE":
				statement = this.#parseInclude();
				break;
			default:
				throw new UnexpectedTokenError(["KEYWORD_IF", "KEYWORD_FOR", "KEYWORD_MAKE"], this.#current().kind);
		}

		return statement;
	}

	#parseTemplate(): AstTemplateNode {
		this.#eat("TEMPLATE_START");
		let expression = this.#parseExpression();
		this.#eat("TEMPLATE_END");

		return new AstTemplateNode(expression);
	}

	#parseNode(): AstStatementNode | null {
		switch (this.#current().kind) {
			case "RAW":
				const value = new AstRawTextNode(this.#eat("RAW").value);
				return value;
			case "TEMPLATE_START":
				return this.#parseTemplate();
			case "CONTROL_START":
				return this.#parseControl();
			default:
				this.#eat("EOF");
				return null;
		}
	}

	public parse(): Parser {
		while (this.#tokens.length > 0) {
			const node = this.#parseNode();
			if (!node) {
				break;
			}

			this.rootNode.statements.push(node);
		}

		return this;
	}
}
