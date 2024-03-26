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
	| "OP_PIPE"
	| "OP_ASSIGN"
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
	| "EOF";

type TokenSite = {
	line: number;
	col: number;
};

export type Token = {
	kind: TokenKind;
	value: string;
	site: TokenSite;
};

const _0 = "0".charCodeAt(0);
const _9 = "9".charCodeAt(0);

const TEMPLATE_START = "{=";
const TEMPLATE_END = "=}";

const CONTROL_START = "{%";
const CONTROL_END = "%}";

const COMMENT_START = "{#";
const COMMENT_END = "#}";

export class Tokenizer {
	#index: number = 0;
	#site: TokenSite = { line: 1, col: 1 };

	public tokens: Token[] = [];

	constructor(private readonly fileContents: string) {}

	#current(length: number = 1): string {
		const start = this.#index;

		return this.fileContents.slice(start, start + length);
	}

	#next(length: number = 1): string {
		const start = this.#index + 1;

		return this.fileContents.slice(start, start + length);
	}

	#append(kind: TokenKind, value: string, site: TokenSite): void {
		this.tokens.push({ kind, value, site });
	}

	#advance(length: number = 1): void {
		const newLine = this.#current() === "\n";

		this.#index = Math.min(this.#index + length, this.fileContents.length);
		this.#site = {
			line: newLine ? this.#site.line + 1 : this.#site.line,
			col: newLine ? 1 : this.#site.col + length,
		};
	}

	#advanceUntil(terminator: () => boolean): void {
		while (!terminator() && this.#index < this.fileContents.length) {
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

		this.#append("RAW", this.fileContents.slice(startIndex, this.#index), site);
	}

	#tokenizeNumber(): void {
		const startIndex = this.#index;
		const site = { ...this.#site };

		this.#advanceUntil(() => !this.#isCurrentDigit());

		this.#append("LITERAL_NUMBER", this.fileContents.slice(startIndex, this.#index), site);
	}

	#tokenizeIdentifier(): void {
		const startIndex = this.#index;
		const endRegex = /[^a-zA-Z0-9_]/;
		const site = { ...this.#site };

		this.#advanceUntil(() => endRegex.test(this.#current()));

		this.#append("LITERAL_IDENTIFIER", this.fileContents.slice(startIndex, this.#index), site);
	}

	#tokenizeString(): void {
		const site = { ...this.#site };
		this.#advance();

		const startIndex = this.#index;
		this.#advanceUntil(() => this.#current() === '"');

		this.#append("LITERAL_STRING", this.fileContents.slice(startIndex, this.#index), site);
		this.#advance();
	}

	#tokenizeComment(): void {
		this.#advance(2);

		this.#advanceUntil(() => this.#current(COMMENT_END.length) === COMMENT_END);

		this.#advance(2);
	}

	#tokenizeControl(): void {
		this.#append("CONTROL_START", CONTROL_START, { ...this.#site });
		this.#advance(2);

		this.#tokenizeInsideTags(CONTROL_END);

		this.#append("CONTROL_END", CONTROL_END, { ...this.#site });
		this.#advance(2);
	}

	#tokenizeTemplate(): void {
		this.#append("TEMPLATE_START", TEMPLATE_START, { ...this.#site });
		this.#advance(2);

		this.#tokenizeInsideTags(TEMPLATE_END);

		this.#append("TEMPLATE_END", TEMPLATE_END, { ...this.#site });
		this.#advance(2);
	}

	#tokenizeInsideTags(endTag: string): void {
		while (this.#current(endTag.length) !== endTag && this.#index < this.fileContents.length) {
			const site = { ...this.#site };

			switch (this.#current()) {
				case " ":
				case "\n":
				case "\t":
					this.#advance();
					continue;
				case "+":
					this.#append("OP_PLUS", "+", site);
					this.#advance();
					continue;
				case "-":
					this.#append("OP_MINUS", "-", site);
					this.#advance();
					continue;
				case "*":
					this.#append("OP_MULTIPLY", "*", site);
					this.#advance();
					continue;
				case "/":
					this.#append("OP_DIVIDE", "/", site);
					this.#advance();
					continue;
				case "(":
					this.#append("L_PAREN", "(", site);
					this.#advance();
					continue;
				case ")":
					this.#append("R_PAREN", ")", site);
					this.#advance();
					continue;
				case ">":
					if (this.#next() === "=") {
						this.#append("OP_GTE", ">=", site);
						this.#advance(2);
						continue;
					} else {
						this.#append("OP_GT", ">", site);
						this.#advance();
						continue;
					}
				case "<":
					if (this.#next() === "=") {
						this.#append("OP_LTE", "<=", site);
						this.#advance(2);
						continue;
					} else {
						this.#append("OP_LT", "<", site);
						this.#advance();
						continue;
					}
				case "=":
					if (this.#next() === "=") {
						this.#append("OP_EQ", "==", site);
						this.#advance(2);
						continue;
					} else if (this.#next() === "!") {
						this.#append("OP_NE", "=!", site);
						this.#advance(2);
						continue;
					} else {
						this.#append("OP_ASSIGN", "=", site);
						this.#advance();
						continue;
					}
				case "|":
					if (this.#next() === ">") {
						this.#append("OP_PIPE", "|>", site);
						this.#advance(2);
						continue;
					}
				case '"':
					this.#tokenizeString();
					continue;
				default:
					if (this.#isCurrentDigit()) {
						this.#tokenizeNumber();
					} else {
						this.#tokenizeIdentifier();
					}
					continue;
			}
		}
	}

	public tokenize(): Tokenizer {
		while (this.#index < this.fileContents.length) {
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

		this.#append("EOF", "", { ...this.#site });

		return this;
	}
}
