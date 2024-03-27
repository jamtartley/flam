import { Compiler } from "./compiler";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer('{= "The quick brown fox jumps over the lazy dog" |> flammify =}').tokenize();
const parser = new Parser(tokenizer.tokens).parse();
const compiler = new Compiler(parser.rootNode);

console.log(compiler.compile());
