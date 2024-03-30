export type TokenKind =
	| "RAW"
	| "LITERAL_IDENTIFIER"
	| "LITERAL_STRING"
	| "LITERAL_NUMBER"
	| "CONTROL_START"
	| "CONTROL_END"
	| "TEMPLATE_START"
	| "TEMPLATE_END"
	| "L_PAREN"
	| "R_PAREN"
	| "PERIOD"
	| "COMMA"
	| "PIPE"
	| "OP_EQ"
	| "OP_NE"
	| "OP_PLUS"
	| "OP_MINUS"
	| "OP_MULTIPLY"
	| "OP_DIVIDE"
	| "OP_GT"
	| "OP_LT"
	| "OP_GTE"
	| "OP_LTE"
	| "KEYWORD_MAKE"
	| "KEYWORD_BECOME"
	| "KEYWORD_INCLUDE"
	| "KEYWORD_FOR"
	| "KEYWORD_IN"
	| "KEYWORD_ROF"
	| "KEYWORD_IF"
	| "KEYWORD_ELSE"
	| "KEYWORD_FI"
	| "EOF";

const keywords = new Map<string, TokenKind>([
	["make", "KEYWORD_MAKE"],
	["become", "KEYWORD_BECOME"],
	["include", "KEYWORD_INCLUDE"],
	["for", "KEYWORD_FOR"],
	["in", "KEYWORD_IN"],
	["rof", "KEYWORD_ROF"],
	["if", "KEYWORD_IF"],
	["else", "KEYWORD_ELSE"],
	["fi", "KEYWORD_FI"],
]);

type TokenFlag = "BINARY_OPERATOR" | "NONE";

type TokenSite = {
	line: number;
	col: number;
};

export class Token {
	public readonly kind: TokenKind;
	public readonly value: string;
	public readonly site: TokenSite;
	public readonly flag: TokenFlag;

	constructor({ kind, value, site }: { kind: TokenKind; value?: string; site?: TokenSite }) {
		this.kind = kind;
		this.value = value || "";
		this.site = site || { line: -1, col: -1 };
		this.flag = this.kind.startsWith("OP_") ? "BINARY_OPERATOR" : "NONE";
	}
}

class UnexpectedCharacterError extends Error {
	constructor(character: string, site: TokenSite) {
		// @TODO: Print the line of input where the error occurred
		super(`Unexpected character: "${character}" at line ${site.line}, column ${site.col}`);

		this.name = "UnexpectedCharacterError";
	}
}

const _0 = "0".charCodeAt(0);
const _9 = "9".charCodeAt(0);

const TEMPLATE_START = "{=";
const TEMPLATE_END = "=}";

const CONTROL_START = "{!";
const CONTROL_END = "!}";

const COMMENT_START = "{#";
const COMMENT_END = "#}";

const IDENTIFIER_START = /[a-zA-Z]/;
const IDENTIFIER_END = /[^a-zA-Z0-9_]/;

export class Tokenizer {
	#fileContents: string;
	#index: number = 0;
	#site: TokenSite = { line: 1, col: 1 };

	public tokens: Token[] = [];

	constructor(fileContents: string) {
		this.#fileContents = fileContents;
	}

	#current(length: number = 1): string {
		const start = this.#index;

		return this.#fileContents.slice(start, start + length);
	}

	#next(length: number = 1): string {
		const start = this.#index + 1;

		return this.#fileContents.slice(start, start + length);
	}

	#append(kind: TokenKind, site: TokenSite, value?: string): void {
		this.tokens.push(new Token({ kind, value, site }));
	}

	#advance(length: number = 1): void {
		const newLine = this.#current() === "\n";

		this.#index = Math.min(this.#index + length, this.#fileContents.length);
		this.#site = {
			line: newLine ? this.#site.line + 1 : this.#site.line,
			col: newLine ? 1 : this.#site.col + length,
		};
	}

	#advanceUntil(terminator: () => boolean): void {
		while (!terminator() && this.#index < this.#fileContents.length) {
			this.#advance();
		}
	}

	#isCurrentDigit(): boolean {
		const current = this.#current();
		const currentCharCode = current.charCodeAt(0);

		return currentCharCode >= _0 && currentCharCode <= _9;
	}

	#tokenizeRaw(): void {
		const startIndex = this.#index;
		const site = { ...this.#site };

		const endRawStarts = [TEMPLATE_START, CONTROL_START, COMMENT_START];
		this.#advanceUntil(() => endRawStarts.some((s) => this.#current(s.length) === s));

		this.#append("RAW", site, this.#fileContents.slice(startIndex, this.#index));
	}

	#tokenizeNumber(): void {
		const startIndex = this.#index;
		const site = { ...this.#site };

		this.#advanceUntil(() => !this.#isCurrentDigit());

		this.#append("LITERAL_NUMBER", site, this.#fileContents.slice(startIndex, this.#index));
	}

	#tokenizeIdentifier(): void {
		const startIndex = this.#index;
		const site = { ...this.#site };

		this.#advanceUntil(() => IDENTIFIER_END.test(this.#current()));

		const value = this.#fileContents.slice(startIndex, this.#index);

		if (keywords.has(value)) {
			this.#append(keywords.get(value)!, site, value);
		} else {
			this.#append("LITERAL_IDENTIFIER", site, value);
		}
	}

	#tokenizeString(): void {
		const site = { ...this.#site };
		this.#advance();

		const startIndex = this.#index;
		this.#advanceUntil(() => this.#current() === '"');

		this.#append("LITERAL_STRING", site, this.#fileContents.slice(startIndex, this.#index));
		this.#advance();
	}

	#tokenizeComment(): void {
		this.#advance(2);

		this.#advanceUntil(() => this.#current(COMMENT_END.length) === COMMENT_END);

		this.#advance(2);
	}

	#tokenizeControl(): void {
		this.#append("CONTROL_START", { ...this.#site });
		this.#advance(2);

		this.#tokenizeInsideTags(CONTROL_END);

		this.#append("CONTROL_END", { ...this.#site });
		this.#advance(2);
	}

	#tokenizeTemplate(): void {
		this.#append("TEMPLATE_START", { ...this.#site });
		this.#advance(2);

		this.#tokenizeInsideTags(TEMPLATE_END);

		this.#append("TEMPLATE_END", { ...this.#site });
		this.#advance(2);
	}

	#tokenizeInsideTags(endTag: string): void {
		while (this.#current(endTag.length) !== endTag && this.#index < this.#fileContents.length) {
			const site = { ...this.#site };

			switch (this.#current()) {
				case " ":
				case "\n":
				case "\t":
					this.#advance();
					continue;
				case "+":
					this.#append("OP_PLUS", site);
					this.#advance();
					continue;
				case "-":
					if (this.#next() === ">") {
						this.#append("PIPE", site);
						this.#advance(2);
						continue;
					}

					this.#append("OP_MINUS", site);
					this.#advance();
					continue;
				case "*":
					this.#append("OP_MULTIPLY", site);
					this.#advance();
					continue;
				case "/":
					this.#append("OP_DIVIDE", site);
					this.#advance();
					continue;
				case "(":
					this.#append("L_PAREN", site);
					this.#advance();
					continue;
				case ")":
					this.#append("R_PAREN", site);
					this.#advance();
					continue;
				case ".":
					this.#append("PERIOD", site);
					this.#advance();
					continue;
				case ",":
					this.#append("COMMA", site);
					this.#advance();
					continue;
				case ">":
					if (this.#next() === "=") {
						this.#append("OP_GTE", site);
						this.#advance(2);
						continue;
					} else {
						this.#append("OP_GT", site);
						this.#advance();
						continue;
					}
				case "<":
					if (this.#next() === "=") {
						this.#append("OP_LTE", site);
						this.#advance(2);
						continue;
					} else {
						this.#append("OP_LT", site);
						this.#advance();
						continue;
					}
				case "=":
					if (this.#next() === "=") {
						this.#append("OP_EQ", site);
						this.#advance(2);
						continue;
					} else if (this.#next() === "!") {
						this.#append("OP_NE", site);
						this.#advance(2);
						continue;
					}
				case '"':
					this.#tokenizeString();
					continue;
				default:
					if (this.#isCurrentDigit()) {
						this.#tokenizeNumber();
					} else if (IDENTIFIER_START.test(this.#current())) {
						this.#tokenizeIdentifier();
					} else {
						throw new UnexpectedCharacterError(this.#current(), site);
					}

					continue;
			}
		}
	}

	public tokenize(): Tokenizer {
		while (this.#index < this.#fileContents.length) {
			if (this.#current(2) === TEMPLATE_START) {
				this.#tokenizeTemplate();
			} else if (this.#current(2) === CONTROL_START) {
				this.#tokenizeControl();
			} else if (this.#current(2) === COMMENT_START) {
				this.#tokenizeComment();
			} else {
				this.#tokenizeRaw();
			}
		}

		this.#append("EOF", { ...this.#site });

		return this;
	}
}
