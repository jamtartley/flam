import { Compiler } from "./compiler";
import { Context } from "./context";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer('{= names |> join(", ") =}').tokenize();
const parser = new Parser(tokenizer.tokens).parse();
const context = Context.fromObj({
	names: ["Cameron", "Donna", "Gordon"],
});
const compiler = new Compiler(parser.rootNode, context);

console.log(compiler.compile());
