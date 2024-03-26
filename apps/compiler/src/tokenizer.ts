type TokenKind =
	| "RAW"
	| "LITERAL_IDENTIFIER"
	| "LITERAL_STRING"
	| "TEMPLATE_START"
	| "TEMPLATE_END"
	| "OP_PIPE"
	| "EOF";

type Token = {
	kind: TokenKind;
	value: string;
};

export class Tokenizer {
	#index = 0;
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

	#append(kind: TokenKind, value: string): void {
		this.tokens.push({ kind, value });
	}

	#advance(length: number): void {
		this.#index = Math.min(this.#index + length, this.fileContents.length);
	}

	#tokenizeRaw(): void {
		const startIndex = this.#index;

		while (this.#current(2) !== "{=" && this.#index < this.fileContents.length) {
			this.#advance(1);
		}

		this.#append("RAW", this.fileContents.slice(startIndex, this.#index));
	}

	#tokenizeIdent(): void {
		const startIndex = this.#index;
		const endRegex = /[^a-zA-Z0-9_]/;

		while (!endRegex.test(this.#current())) {
			this.#advance(1);
		}

		this.#append("LITERAL_IDENTIFIER", this.fileContents.slice(startIndex, this.#index));
	}

	#tokenizeString(): void {
		this.#advance(1);

		const startIndex = this.#index;
		while (this.#current() !== '"' && this.#index < this.fileContents.length) {
			this.#advance(1);
		}

		console.log("HER");
		this.#advance(1);
		this.#append("LITERAL_STRING", this.fileContents.slice(startIndex, this.#index));
	}

	#tokenizeTemplate(): void {
		this.#append("TEMPLATE_START", "{=");
		this.#advance(2);

		while (this.#current(2) !== "=}" && this.#index < this.fileContents.length) {
			switch (this.#current()) {
				case " ":
				case "\n":
				case "\t":
					this.#advance(1);
					continue;
				case "|":
					if (this.#next() === ">") {
						this.#append("OP_PIPE", "|>");
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

		this.#append("TEMPLATE_END", "=}");
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

		this.#append("EOF", "");

		return this;
	}
}
