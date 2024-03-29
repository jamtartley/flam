import { Compiler } from "./compiler";
import { Context } from "./context";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer(`
{! make favourite become "Gordon" !}
{! make isGoodChoice become favourite == "Joe" !}

{! if isGoodChoice !}
You made a good choice!
{! else !}
You made a bad choice!
{! fi !}
`).tokenize();

const parser = new Parser(tokenizer.tokens).parse();
const context = Context.from({
	company: {
		employees: [
			{ name: "Cameron", title: "cto", reports: [{ name: "Yo-yo" }, { name: "Tom" }] },
			{ name: "Donna", title: "ceo", reports: [{ name: "John" }, { name: "Cameron" }] },
		],
	},
});
const compiler = new Compiler(parser.rootNode, context);

console.log(compiler.compile());
