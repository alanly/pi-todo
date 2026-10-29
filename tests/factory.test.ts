import { describe, expect, it, vi } from "vitest";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import factory from "../index.ts";
import type { TodoDetails } from "../src/types.ts";

type Handler = (event: unknown, ctx: ExtensionContext) => Promise<void>;

function mockPi() {
	const tools: Array<{ name: string }> = [];
	const commands: string[] = [];
	const events: Array<[string, Handler]> = [];
	const pi = {
		registerTool: vi.fn((t: { name: string }) => {
			tools.push(t);
		}),
		registerCommand: vi.fn((name: string) => {
			commands.push(name);
		}),
		on: vi.fn((event: string, handler: Handler) => {
			events.push([event, handler]);
		}),
	} as unknown as ExtensionAPI;
	return { pi, tools, commands, events };
}

interface FakeCtx extends ExtensionContext {
	status: Array<[string, string | undefined]>;
}

function fakeCtx(mode: "tui" | "rpc" = "tui", branch: unknown[] = []): FakeCtx {
	const status: Array<[string, string | undefined]> = [];
	return {
		mode,
		sessionManager: { getBranch: () => branch },
		ui: {
			theme: { fg: (_color: string, text: string) => text },
			setStatus: (key: string, text: string | undefined) => {
				status.push([key, text]);
			},
		},
		status,
	} as unknown as FakeCtx;
}

function handlerFor(events: Array<[string, Handler]>, name: string): Handler {
	const entry = events.find(([event]) => event === name);
	if (!entry) throw new Error(`no handler registered for ${name}`);
	return entry[1];
}

describe("factory smoke test", () => {
	it("registers the todo tool, the /todos command, and the lifecycle handlers", () => {
		const { pi, tools, commands, events } = mockPi();
		expect(() => factory(pi)).not.toThrow();
		expect(tools.map((t) => t.name)).toEqual(["todo"]);
		expect(commands).toEqual(["todos"]);
		expect(events.map(([event]) => event)).toEqual(["session_start", "session_tree", "tool_result"]);
	});
});

describe("status line integration", () => {
	it("clears the status line on an empty session", async () => {
		const { pi, events } = mockPi();
		factory(pi);
		const ctx = fakeCtx("tui");
		await handlerFor(events, "session_start")({}, ctx);
		expect(ctx.status).toEqual([["todo", undefined]]);
	});

	it("shows completed over total after a todo tool result", async () => {
		const { pi, events } = mockPi();
		factory(pi);
		const ctx = fakeCtx("tui");
		await handlerFor(events, "session_start")({}, ctx);

		const details: TodoDetails = {
			action: "toggle",
			todos: [
				{ id: 1, text: "a", done: true },
				{ id: 2, text: "b", done: false },
				{ id: 3, text: "c", done: false },
			],
			nextId: 4,
		};
		await handlerFor(events, "tool_result")({ toolName: "todo", details }, ctx);
		expect(ctx.status.at(-1)).toEqual(["todo", "📝 1/3"]);
	});

	it("hides the status line once everything is complete", async () => {
		const { pi, events } = mockPi();
		factory(pi);
		const ctx = fakeCtx("tui");
		await handlerFor(events, "session_start")({}, ctx);

		const details: TodoDetails = {
			action: "toggle",
			todos: [{ id: 1, text: "a", done: true }],
			nextId: 2,
		};
		await handlerFor(events, "tool_result")({ toolName: "todo", details }, ctx);
		expect(ctx.status.at(-1)).toEqual(["todo", undefined]);
	});

	it("ignores results from other tools", async () => {
		const { pi, events } = mockPi();
		factory(pi);
		const ctx = fakeCtx("tui");
		await handlerFor(events, "session_start")({}, ctx);
		await handlerFor(events, "tool_result")({ toolName: "bash", details: {} }, ctx);
		expect(ctx.status).toEqual([["todo", undefined]]);
	});

	it("does not call setStatus outside TUI mode", async () => {
		const { pi, events } = mockPi();
		factory(pi);
		const ctx = fakeCtx("rpc");
		await handlerFor(events, "session_start")({}, ctx);
		expect(ctx.status).toEqual([]);
	});
});
