import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer("{= 1 + 2 - 3 =}").tokenize();
const parser = new Parser(tokenizer.tokens).parse();

console.log(JSON.stringify(parser.rootNode, null, 2));
