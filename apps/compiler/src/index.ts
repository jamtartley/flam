import { Compiler } from "./compiler";
import { Context } from "./context";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer(`
{# Turn into flam #}
{% if x == "Hello, world!" %}
This is what flamming looks like: {= x |> flammify =}!
{% else %}
This is not what flamming looks like: {= x =}!
{% fi %}
`).tokenize();
const parser = new Parser(tokenizer.tokens).parse();
const context = new Context();
context.add("x", { kind: "string", value: "Hello, world!" });
const compiler = new Compiler(parser.rootNode, context);

console.log(compiler.compile());
