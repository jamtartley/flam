import { readFileSync, writeFileSync } from "node:fs";
import { Compiler } from "./compiler";
import { Scope } from "./scope";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";
import path from "node:path";
import { Command } from "commander";

export function compile(absPath: string, ctx: Record<string, unknown>): string {
	const file = readFileSync(absPath).toString();
	const tokenizer = new Tokenizer(file, absPath).tokenize();
	const parser = new Parser(tokenizer.tokens).parse();
	const scope = Scope.from(ctx);
	const compiler = new Compiler(parser.rootNode, scope, absPath);

	return compiler.compile();
}

const program = new Command();

program.name("flam").description("Compile and output your .flam files").version("0.0.1");
program
	.command("compile")
	.description("Run the compiler against your entry file")
	.argument("<file>", "The entry file to compile")
	.option("-o, --output <file>", "Path to which the compiled output will be written")
	.option("-i, --input <file>", "Path to the input file in JSON format")
	.action((entryPath: string, { input, output }) => {
		let ctx = {};

		if (input) {
			const absInput = path.resolve(process.cwd(), input);
			console.log(absInput);
			ctx = JSON.parse(readFileSync(absInput).toString());
		}

		const absPath = path.resolve(process.cwd(), entryPath);
		const compiled = compile(absPath, ctx);

		if (output) {
			const absOutput = path.resolve(process.cwd(), output);
			writeFileSync(absOutput, compiled);
		} else {
			console.log(compiled);
		}
	});

program.parse();
