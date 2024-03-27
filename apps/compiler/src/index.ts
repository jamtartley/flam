import { Compiler } from "./compiler";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer("{= 21 |> double =}").tokenize();
const parser = new Parser(tokenizer.tokens).parse();
const compiler = new Compiler(parser.rootNode);

console.log(compiler.compile());
