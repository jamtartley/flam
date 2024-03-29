import { Compiler } from "./compiler";
import { Context } from "./context";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer('{= company.name |> join(", ") =}').tokenize();
const parser = new Parser(tokenizer.tokens).parse();
const context = Context.fromObj({
	company: {
		name: "Mutiny",
		established: 1983,
		founders: {
			cto: "Cameron",
			ceo: "Donna",
		},
		employees: [{ name: "Bosworth", title: "Director of Engineering" }],
	},
});
const compiler = new Compiler(parser.rootNode, context);

console.log(compiler.compile());
