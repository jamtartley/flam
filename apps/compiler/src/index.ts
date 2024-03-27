import { Compiler } from "./compiler";
import { Context } from "./context";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer("{= x |> flammify =}").tokenize();
const parser = new Parser(tokenizer.tokens).parse();
const context = new Context();
context.add("x", { kind: "string", value: "The quick brown fox jumps over the lazy dog" });
const compiler = new Compiler(parser.rootNode, context);

console.log(compiler.compile());
