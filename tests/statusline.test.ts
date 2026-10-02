import { describe, expect, it } from "vitest";
import { STATUS_KEY, formatTodoStatus } from "../src/statusline.ts";

const identity = (_color: string, text: string) => text;

describe("formatTodoStatus", () => {
	it("returns undefined for an empty list", () => {
		expect(formatTodoStatus(0, 0, identity)).toBeUndefined();
	});

	it("returns undefined when every item is complete", () => {
		expect(formatTodoStatus(1, 1, identity)).toBeUndefined();
		expect(formatTodoStatus(7, 7, identity)).toBeUndefined();
	});

	it("shows completed over total while work remains", () => {
		expect(formatTodoStatus(0, 1, identity)).toBe("☑ 0/1");
		expect(formatTodoStatus(3, 7, identity)).toBe("☑ 3/7");
		expect(formatTodoStatus(6, 7, identity)).toBe("☑ 6/7");
	});

	it("colors the glyph and count as success, the total as dim", () => {
		const seen: Array<[string, string]> = [];
		const fg = (color: string, text: string) => {
			seen.push([color, text]);
			return text;
		};
		formatTodoStatus(3, 7, fg);
		expect(seen).toEqual([
			["success", "☑"],
			["success", "3"],
			["dim", "/7"],
		]);
	});

	it("exports a stable status key", () => {
		expect(STATUS_KEY).toBe("todo");
	});
});
