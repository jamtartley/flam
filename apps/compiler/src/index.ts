import { PathLike, readFileSync } from "node:fs";
import { Compiler } from "./compiler";
import { Context } from "./context";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

export function compile(path: PathLike, ctx: Record<string, unknown>): string {
	const file = readFileSync(path).toString();
	const tokenizer = new Tokenizer(file).tokenize();
	const parser = new Parser(tokenizer.tokens).parse();
	const context = Context.from(ctx);
	const compiler = new Compiler(parser.rootNode, context);

	return compiler.compile();
}
