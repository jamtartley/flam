export type TokenKind =
	| "RAW"
	| "LITERAL_IDENTIFIER"
	| "LITERAL_STRING"
	| "TEMPLATE_START"
	| "TEMPLATE_END"
	| "OP_PIPE"
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

	#advance(length: number): void {
		const newLine = this.#current() === "\n";

		this.#index = Math.min(this.#index + length, this.fileContents.length);
		this.#site = {
			line: newLine ? this.#site.line + 1 : this.#site.line,
			col: newLine ? 1 : this.#site.col + length,
		};
	}

	#tokenizeRaw(): void {
		const startIndex = this.#index;
		const site = { ...this.#site };

		while (this.#current(2) !== "{=" && this.#index < this.fileContents.length) {
			this.#advance(1);
		}

		this.#append("RAW", this.fileContents.slice(startIndex, this.#index), site);
	}

	#tokenizeIdent(): void {
		const startIndex = this.#index;
		const endRegex = /[^a-zA-Z0-9_]/;
		const site = { ...this.#site };

		while (!endRegex.test(this.#current())) {
			this.#advance(1);
		}

		this.#append("LITERAL_IDENTIFIER", this.fileContents.slice(startIndex, this.#index), site);
	}

	#tokenizeString(): void {
		const site = { ...this.#site };
		this.#advance(1);

		const startIndex = this.#index;
		while (this.#current() !== '"' && this.#index < this.fileContents.length) {
			this.#advance(1);
		}

		this.#append("LITERAL_STRING", this.fileContents.slice(startIndex, this.#index), site);
		this.#advance(1);
	}

	#tokenizeTemplate(): void {
		this.#append("TEMPLATE_START", "{=", { ...this.#site });
		this.#advance(2);

		while (this.#current(2) !== "=}" && this.#index < this.fileContents.length) {
			const site = { ...this.#site };

			switch (this.#current()) {
				case " ":
				case "\n":
				case "\t":
					this.#advance(1);
					continue;
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
					this.#tokenizeIdent();
					continue;
			}
		}

		this.#append("TEMPLATE_END", "=}", { ...this.#site });
		this.#advance(2);
	}

	public tokenize(): Tokenizer {
		while (this.#index < this.fileContents.length) {
			switch (this.#current()) {
				case "{":
					if (this.#next() === "=") {
						this.#tokenizeTemplate();
						continue;
					}
				default:
					this.#tokenizeRaw();
					continue;
			}
		}

		this.#append("EOF", "", { ...this.#site });

		return this;
	}
}
