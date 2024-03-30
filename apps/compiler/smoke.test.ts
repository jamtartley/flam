import assert from "node:assert";
import test from "node:test";
import { compile } from "./src";
import { PathLike } from "node:fs";
import path from "node:path";

function filePathFor(relative: string): PathLike {
	return path.join(process.cwd(), "examples", relative);
}

test("/complex_filters.flam", () => {
	const filePath = filePathFor("complex_filters.flam");
	const output = compile(filePath, {
		company: {
			employees: [
				{ name: "Cameron", title: "cto", reports: [{ name: "Tom Rendon" }] },
				{ name: "Donna", title: "ceo", reports: [{ name: "John Bosworth" }, { name: "Cameron Howe" }] },
			],
		},
	});

	assert.equal(output, "\nrendon.tom\n\nbosworth.john\n\nhowe.cameron\n\n");
});

test("/filter.flam", () => {
	const filePath = filePathFor("filter.flam");
	const output = compile(filePath, { name: "Cameron Howe" });

	assert.equal(output, "CAMERON HOWE\n");
});

test("/filter.flam", () => {
	const filePath = filePathFor("for.flam");
	const output = compile(filePath, { names: ["Cameron Howe", "Donna Clark"] });

	assert.equal(output, "\nCameron Howe\n\nDonna Clark\n\n");
});

test("/hello.flam", () => {
	const filePath = filePathFor("hello.flam");
	const output = compile(filePath, {});

	assert.equal(output, "Hello, world!\n");
});

test("/include.flam", () => {
	const filePath = filePathFor("include.flam");
	const output = compile(filePath, {});

	assert.equal(output, "Hello, world!\n");
});

test("/if.flam when the condition is true", () => {
	const filePath = filePathFor("if.flam");
	const output = compile(filePath, { name: "Gordon" });

	assert.equal(output, "\nHello, Gordon!\n\n");
});

test("/if.flam when the condition is false", () => {
	const filePath = filePathFor("if.flam");
	const output = compile(filePath, { name: "Joe" });

	assert.equal(output, "\nWho are you?\n\n");
});

test("/member_access.flam", () => {
	const filePath = filePathFor("member_access.flam");
	const output = compile(filePath, {
		company: {
			employees: [
				{ name: "Donna Clark", title: "CEO" },
				{ name: "Cameron Howe", title: "CTO" },
			],
		},
	});

	assert.equal(output, "\n[Name] Donna Clark\n[Title] CEO\n\n[Name] Cameron Howe\n[Title] CTO\n\n");
});

test("/variable.flam", () => {
	const filePath = filePathFor("variable.flam");
	const output = compile(filePath, {});

	assert.equal(output, "\nHello, Gordon!\n");
});
