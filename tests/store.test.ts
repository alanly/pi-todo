import { describe, expect, it } from "vitest";
import { TodoStore, latestTodoDetails } from "../src/store.ts";
import type { TodoDetails } from "../src/types.ts";

describe("TodoStore", () => {
	it("starts empty", () => {
		const store = new TodoStore();
		expect(store.all()).toEqual([]);
		expect(store.counts()).toEqual({ total: 0, done: 0 });
	});

	it("adds todos with incrementing ids", () => {
		const store = new TodoStore();
		expect(store.add("first").id).toBe(1);
		expect(store.add("second").id).toBe(2);
		expect(store.all().map((t) => t.text)).toEqual(["first", "second"]);
		expect(store.counts()).toEqual({ total: 2, done: 0 });
	});

	it("toggles a todo and reports unknown ids", () => {
		const store = new TodoStore();
		store.add("first");
		expect(store.toggle(1)?.done).toBe(true);
		expect(store.counts()).toEqual({ total: 1, done: 1 });
		expect(store.toggle(1)?.done).toBe(false);
		expect(store.toggle(99)).toBeUndefined();
	});

	it("clears all todos and resets ids", () => {
		const store = new TodoStore();
		store.add("a");
		store.add("b");
		expect(store.clear()).toBe(2);
		expect(store.all()).toEqual([]);
		expect(store.add("c").id).toBe(1);
	});

	it("returns defensive copies from all()", () => {
		const store = new TodoStore();
		store.add("a");
		const copy = store.all();
		copy[0].done = true;
		expect(store.counts().done).toBe(0);
	});

	it("restores from details", () => {
		const store = new TodoStore();
		const details: TodoDetails = { action: "list", todos: [{ id: 5, text: "x", done: true }], nextId: 6 };
		store.restore(details);
		expect(store.counts()).toEqual({ total: 1, done: 1 });
		expect(store.add("y").id).toBe(6);
	});

	it("builds a details payload for an action", () => {
		const store = new TodoStore();
		store.add("a");
		expect(store.toDetails("add")).toEqual({
			action: "add",
			todos: [{ id: 1, text: "a", done: false }],
			nextId: 2,
		});
		expect(store.toDetails("toggle", "id required")).toEqual({
			action: "toggle",
			todos: [{ id: 1, text: "a", done: false }],
			nextId: 2,
			error: "id required",
		});
	});
});

describe("latestTodoDetails", () => {
	it("ignores non-message entries and other tools", () => {
		expect(
			latestTodoDetails([
				{ type: "message", message: { role: "assistant" } },
				{ type: "label", message: { role: "toolResult", toolName: "todo" } },
				{ type: "message", message: { role: "toolResult", toolName: "bash" } },
			]),
		).toBeUndefined();
	});

	it("returns the last todo details on the branch", () => {
		const first: TodoDetails = { action: "add", todos: [{ id: 1, text: "a", done: false }], nextId: 2 };
		const second: TodoDetails = { action: "toggle", todos: [{ id: 1, text: "a", done: true }], nextId: 2 };
		expect(
			latestTodoDetails([
				{ type: "message", message: { role: "toolResult", toolName: "todo", details: first } },
				{ type: "message", message: { role: "toolResult", toolName: "todo", details: second } },
			]),
		).toBe(second);
	});
});

describe("TodoStore.restoreFromBranch", () => {
	it("restores the latest details", () => {
		const store = new TodoStore();
		const details: TodoDetails = { action: "add", todos: [{ id: 1, text: "a", done: false }], nextId: 2 };
		store.restoreFromBranch([{ type: "message", message: { role: "toolResult", toolName: "todo", details } }]);
		expect(store.counts()).toEqual({ total: 1, done: 0 });
	});

	it("resets when the branch has no todo results", () => {
		const store = new TodoStore();
		store.add("stale");
		store.restoreFromBranch([]);
		expect(store.all()).toEqual([]);
	});
});
