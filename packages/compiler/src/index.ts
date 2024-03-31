import { readFileSync } from "node:fs";
import { Compiler } from "./compiler";
import { Scope } from "./scope";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

export function compile(absPath: string, ctx: Record<string, unknown>): string {
	const file = readFileSync(absPath).toString();
	const tokenizer = new Tokenizer(file, absPath).tokenize();
	const parser = new Parser(tokenizer.tokens).parse();
	const scope = Scope.from(ctx);
	const compiler = new Compiler(parser.rootNode, scope, absPath);

	return compiler.compile();
}
