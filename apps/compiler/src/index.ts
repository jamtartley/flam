import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer("{= 42 + 21 * 7 - 1 =}").tokenize();
const parser = new Parser(tokenizer.tokens).parse();

console.log(JSON.stringify(parser.rootNode, null, 2));
