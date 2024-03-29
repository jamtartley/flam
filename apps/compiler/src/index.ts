import { Compiler } from "./compiler";
import { Context } from "./context";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer(`
{! for name in company.employees |> pluck("reports") |> pluck("name") !}
{= name =}
{! rof !}
`).tokenize();

const parser = new Parser(tokenizer.tokens).parse();
const context = Context.fromObj({
	company: {
		employees: [
			{ name: "Cameron", title: "cto", reports: [{ name: "Yo-yo" }, { name: "Tom" }] },
			{ name: "Donna", title: "ceo", reports: [{ name: "John" }, { name: "Cameron" }] },
		],
	},
});
const compiler = new Compiler(parser.rootNode, context);

console.log(compiler.compile());
