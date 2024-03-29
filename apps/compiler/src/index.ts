import { ArrayValue, Compiler, NumberValue, ValueKind } from "./compiler";
import { Context } from "./context";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer(`
{! for number in numbers !}
number: {=number=}
{! rof !}
`).tokenize();
const parser = new Parser(tokenizer.tokens).parse();
const context = new Context();
context.add("numbers", {
	kind: ValueKind.ARRAY,
	value: [
		{ kind: ValueKind.NUMBER, value: 1 } as NumberValue,
		{ kind: ValueKind.NUMBER, value: 2 } as NumberValue,
		{ kind: ValueKind.NUMBER, value: 3 } as NumberValue,
	],
} as ArrayValue);
const compiler = new Compiler(parser.rootNode, context);

console.log(compiler.compile());
