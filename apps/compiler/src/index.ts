import { Tokenizer } from "./tokenizer";

const t = new Tokenizer("1 + 2 = 3 {# name #}");
const tokens = t.tokenize();

console.log({ tokens: tokens.tokens });
