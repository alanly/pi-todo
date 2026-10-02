/**
 * pi-todo — a todo list for the agent, with a contextual footer status line.
 *
 * Entry point. Wires the TodoStore, the TodoStatusLine, the `todo` tool,
 * and the `/todos` command.
 *
 * Lifecycle rules: the factory starts nothing. State is reconstructed from
 * the session branch on session_start and session_tree, and refreshed from
 * each `todo` tool result. The status line exists only while the list is
 * non-empty and unfinished.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { TodoStore } from "./src/store.ts";
import { TodoStatusLine } from "./src/statusline.ts";
import { registerTodoTool } from "./src/tools.ts";
import { TodoListComponent } from "./src/ui.ts";
import type { TodoDetails } from "./src/types.ts";

export default function (pi: ExtensionAPI) {
	const store = new TodoStore();
	const statusline = new TodoStatusLine(store);

	registerTodoTool(pi, { store });

	// Rebuild from the active branch so the list follows forks and switches.
	const resync = (ctx: ExtensionContext) => {
		store.restoreFromBranch(ctx.sessionManager.getBranch());
		statusline.capture(ctx);
		statusline.refresh();
	};

	pi.on("session_start", async (_event, ctx) => resync(ctx));
	pi.on("session_tree", async (_event, ctx) => resync(ctx));

	// A todo tool result carries the authoritative list; refresh the line.
	pi.on("tool_result", async (event, ctx) => {
		if (event.toolName !== "todo") return;
		const details = event.details as TodoDetails | undefined;
		if (details) store.restore(details);
		statusline.capture(ctx);
		statusline.refresh();
	});

	pi.registerCommand("todos", {
		description: "Show all todos on the current branch",
		handler: async (_args, ctx) => {
			if (ctx.mode !== "tui") {
				ctx.ui.notify("/todos requires interactive mode", "error");
				return;
			}

			await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
				return new TodoListComponent(store.all(), theme, () => done());
			});
		},
	});
}
