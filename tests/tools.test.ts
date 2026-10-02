import { describe, expect, it, vi } from "vitest";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { TodoStore } from "../src/store.ts";
import { registerTodoTool } from "../src/tools.ts";

interface CapturedTool {
	name: string;
	executionMode?: string;
	promptSnippet?: string;
	promptGuidelines?: string[];
	execute: (
		toolCallId: string,
		params: Record<string, unknown>,
		signal: undefined,
		onUpdate: undefined,
		ctx: undefined,
	) => Promise<{ content: Array<{ text: string }>; details: { action: string; todos: unknown[]; error?: string } }>;
}

function setup() {
	const store = new TodoStore();
	let tool: CapturedTool | undefined;
	const pi = {
		registerTool: vi.fn((t: CapturedTool) => {
			tool = t;
		}),
	} as unknown as ExtensionAPI;
	registerTodoTool(pi, { store });
	if (!tool) throw new Error("tool was not registered");
	return { store, tool };
}

async function run(tool: CapturedTool, params: Record<string, unknown>) {
	return tool.execute("call-1", params, undefined, undefined, undefined);
}

describe("todo tool", () => {
	it("registers with a stable name and sequential execution", () => {
		const { tool } = setup();
		expect(tool.name).toBe("todo");
		expect(tool.executionMode).toBe("sequential");
	});

	it("hints the agent with a prompt snippet and guidelines", () => {
		const { tool } = setup();
		expect(tool.promptSnippet?.trim()).toBeTruthy();
		expect(tool.promptGuidelines?.length).toBeGreaterThan(0);
		for (const guideline of tool.promptGuidelines ?? []) {
			expect(guideline.trim()).toBeTruthy();
		}
	});

	it("lists an empty list", async () => {
		const { tool } = setup();
		const result = await run(tool, { action: "list" });
		expect(result.content[0].text).toBe("No todos");
		expect(result.details.action).toBe("list");
	});

	it("adds a todo and persists the new list", async () => {
		const { tool } = setup();
		const result = await run(tool, { action: "add", text: "write tests" });
		expect(result.content[0].text).toBe("Added todo #1: write tests");
		expect(result.details.todos).toHaveLength(1);
	});

	it("rejects add without text", async () => {
		const { tool } = setup();
		const result = await run(tool, { action: "add" });
		expect(result.content[0].text).toContain("Error");
		expect(result.details.error).toBe("text required");
	});

	it("toggles a todo by id", async () => {
		const { store, tool } = setup();
		store.add("a");
		const result = await run(tool, { action: "toggle", id: 1 });
		expect(result.content[0].text).toBe("Todo #1 completed");
		expect(result.details.todos[0]).toMatchObject({ id: 1, done: true });
	});

	it("reports an unknown toggle id", async () => {
		const { tool } = setup();
		const result = await run(tool, { action: "toggle", id: 42 });
		expect(result.content[0].text).toBe("Todo #42 not found");
		expect(result.details.error).toBe("#42 not found");
	});

	it("rejects toggle without an id", async () => {
		const { tool } = setup();
		const result = await run(tool, { action: "toggle" });
		expect(result.details.error).toBe("id required");
	});

	it("clears the list", async () => {
		const { store, tool } = setup();
		store.add("a");
		store.add("b");
		const result = await run(tool, { action: "clear" });
		expect(result.content[0].text).toBe("Cleared 2 todos");
		expect(result.details.todos).toHaveLength(0);
	});
});
