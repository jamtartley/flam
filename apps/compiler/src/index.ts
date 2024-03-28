import { Compiler } from "./compiler";
import { Context } from "./context";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer(`
{# Turn into flam #}
{% if x == "Hello, world!" %}
This is what flamming looks like: {= x |> flammify =}!
{% if y == 2 %}
y is 2!
{% fi %}
{% else %}
This is not what flamming looks like: {= x =}
{% fi %}
`).tokenize();
const parser = new Parser(tokenizer.tokens).parse();
const context = new Context({
	variables: new Map([
		["x", { kind: "string", value: "Hello, world!" }],
		["y", { kind: "number", value: 2 }],
	]),
});
const compiler = new Compiler(parser.rootNode, context);

console.log(compiler.compile());
