import { Compiler } from "./compiler";
import { Context } from "./context";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

const tokenizer = new Tokenizer(
	`<p>Mutiny has {= company.employees |> count =} employees:</p>
<p>{= company.employees |> pluck("name") |> alphabetize |> reverse |> join(", ") |> titlecase =}</p>
`
).tokenize();
const parser = new Parser(tokenizer.tokens).parse();
const context = Context.fromObj({
	company: {
		name: "Mutiny",
		established: 1983,
		founders: {
			cto: "Cameron",
			ceo: "Donna",
		},
		employees: [
			{ name: "Yo-Yo Engberk", title: "Software Engineer" },
			{ name: "John Bosworth", title: "Director of Engineering" },
			{ name: "Tom Rendon", title: "Software Engineer" },
		],
	},
});
const compiler = new Compiler(parser.rootNode, context);

console.log(compiler.compile());
