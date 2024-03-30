import { build as esbuild } from "esbuild";
import path from "path";

type Overrides = Partial<Parameters<typeof esbuild>>[0];

const build = (overrides?: Overrides) =>
	esbuild({
		bundle: true,
		entryPoints: [path.join(process.cwd(), "src", "index.ts")],
		minify: false,
		outdir: path.join(process.cwd(), "dist"),
		platform: "node",
		sourcemap: true,
		target: "node20",
		...overrides,
	});

export default build;
