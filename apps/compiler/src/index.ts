import { ArrayValue, Compiler, ValueKind } from "./compiler";
import { Context } from "./context";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer('{= names |> join(", ") =}').tokenize();
const parser = new Parser(tokenizer.tokens).parse();
const context = new Context();
context.add("names", {
	kind: ValueKind.ARRAY,
	value: [
		{ kind: ValueKind.STRING, value: "Cameron" },
		{ kind: ValueKind.STRING, value: "Donna" },
		{ kind: ValueKind.STRING, value: "Gordon" },
	],
} as ArrayValue);
const compiler = new Compiler(parser.rootNode, context);

console.log(compiler.compile());
