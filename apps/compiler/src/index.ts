import { PathLike, readFileSync } from "node:fs";
import { Compiler } from "./compiler";
import { Scope } from "./scope";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";
import path from "node:path";

export function compile(filePath: PathLike, ctx: Record<string, unknown>): string {
	const absPath = path.resolve(filePath.toString());
	const file = readFileSync(absPath).toString();
	const tokenizer = new Tokenizer(file, absPath).tokenize();
	const parser = new Parser(tokenizer.tokens).parse();
	const scope = Scope.from(ctx);
	const compiler = new Compiler(parser.rootNode, scope, absPath);

	return compiler.compile();
}
