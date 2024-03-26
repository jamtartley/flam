type TokenKind = "RAW" | "LIT_IDENTIFIER" | "TEMPLATE_START" | "TEMPLATE_END" | "EOF";

type Token = {
	kind: TokenKind;
	value: string;
};

export class Tokenizer {
	#index = 0;
	public tokens: Token[] = [];

	constructor(private readonly fileContents: string) {}

	#append(kind: TokenKind, value: string): void {
		this.tokens.push({ kind, value });
	}

	#peek(length: number): string {
		return this.fileContents.slice(this.#index, this.#index + length);
	}

	#advance(length: number): void {
		this.#index = Math.min(this.#index + length, this.fileContents.length);
	}

	#tokenizeRaw(): void {
		const startIndex = this.#index;

		while (this.#peek(2) !== "{=" && this.#index < this.fileContents.length) {
			this.#advance(1);
		}

		this.#append("RAW", this.fileContents.slice(startIndex, this.#index));
	}

	#tokenizeTemplate(): void {
		this.#append("TEMPLATE_START", "=}");
		this.#advance(2);

		const startIndex = this.#index;

		while (this.#peek(2) !== "{=" && this.#index < this.fileContents.length) {
			this.#advance(1);
		}

		this.#append("LIT_IDENTIFIER", this.fileContents.slice(startIndex, this.#index));

		this.#append("TEMPLATE_END", "=}");
		this.#advance(2);
	}

	public tokenize(): Tokenizer {
		while (this.#index < this.fileContents.length) {
			switch (this.#peek(2)) {
				case "{=":
					this.#tokenizeTemplate();
					continue;
				default:
					this.#tokenizeRaw();
					continue;
			}
		}

		this.#append("EOF", "");

		return this;
	}
}
