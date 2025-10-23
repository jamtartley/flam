import test from "node:test";
import { ArrayFilters, StringFilters } from "./filters";
import assert from "node:assert/strict";

test("StringFilters.to_title capitalizes the first letter per word", () => {
	const result = StringFilters.to_title("cameron howe is our CTO");

	assert.equal(result, "Cameron Howe Is Our CTO");
});

test("StringFilters.replace replaces every occurence of search with the replacement case-sensitively", () => {
	const result = StringFilters.replace("cameron howe is our CTO", "o", "u");

	assert.equal(result, "camerun huwe is uur CTO");
});

test("StringFilters.to_flam replaces 4-letter words with 'flam'", () => {
	const result = StringFilters.to_flam("this will turn into flam");

	assert.equal(result, "flam flam flam flam flam");
});

test("StringFilters.to_flam replaces sub-4-letter words with the equivalent of 'flam'", () => {
	const result = StringFilters.to_flam("a is the");

	assert.equal(result, "f fl fla");
});

test("StringFilters.to_flam replaces super-4-letter words with the equivalent of 'flam' and stretched 'a's", () => {
	const result = StringFilters.to_flam("Lorem ipsum dolor sit amet, consectetur adipiscing elit.");

	assert.equal(result, "flaam flaam flaam fla flaam flaaaaaaaam flaaaaaaam flaam");
});

test("ArrayFilters.pluck grabs the given key off the given object and flattens", () => {
	const employees = [
		{ name: "Donna Clark", title: "CEO" },
		{ name: "Cameron Howe", title: "CTO" },
	];
	const result = ArrayFilters.pluck(employees, "name");

	assert.deepEqual(result, ["Donna Clark", "Cameron Howe"]);
});
