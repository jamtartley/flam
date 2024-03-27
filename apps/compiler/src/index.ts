import { Compiler } from "./compiler";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer("{= 42 + 21 =}").tokenize();
const parser = new Parser(tokenizer.tokens).parse();
const compiler = new Compiler(parser);

console.log(compiler.compile());
