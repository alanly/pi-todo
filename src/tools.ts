/**
 * The `todo` tool. State lives in the shared TodoStore, so the tool runs
 * with executionMode "sequential" to keep parallel sibling calls from
 * interleaving against the same list.
 */

import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import type { TodoStore } from "./store.ts";
import type { TodoDetails } from "./types.ts";

const TodoParams = Type.Object({
	action: StringEnum(["list", "add", "toggle", "clear"] as const),
	text: Type.Optional(Type.String({ description: "Todo text (for add)" })),
	id: Type.Optional(Type.Number({ description: "Todo ID (for toggle)" })),
});

function textContent(text: string) {
	return [{ type: "text" as const, text }];
}

export interface RegisterTodoToolDeps {
	store: TodoStore;
}

export function registerTodoTool(pi: ExtensionAPI, deps: RegisterTodoToolDeps): void {
	const { store } = deps;

	pi.registerTool({
		name: "todo",
		label: "Todo",
		description: "Manage a todo list. Actions: list, add (text), toggle (id), clear",
		promptSnippet: "Manage a todo list to plan and track multi-step work",
		promptGuidelines: [
			"Use the `todo` tool to plan multi-step work: add items before you start, then toggle each one done as you finish it.",
			"Keep the list current as the work evolves by adding newly discovered steps and marking completed ones done, so progress stays visible to the user.",
		],
		executionMode: "sequential",
		parameters: TodoParams,

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			switch (params.action) {
				case "list": {
					const todos = store.all();
					const text = todos.length
						? todos.map((t) => `[${t.done ? "x" : " "}] #${t.id}: ${t.text}`).join("\n")
						: "No todos";
					return { content: textContent(text), details: store.toDetails("list") };
				}

				case "add": {
					if (!params.text) {
						return {
							content: textContent("Error: text required for add"),
							details: store.toDetails("add", "text required"),
						};
					}
					const todo = store.add(params.text);
					return {
						content: textContent(`Added todo #${todo.id}: ${todo.text}`),
						details: store.toDetails("add"),
					};
				}

				case "toggle": {
					if (params.id === undefined) {
						return {
							content: textContent("Error: id required for toggle"),
							details: store.toDetails("toggle", "id required"),
						};
					}
					const todo = store.toggle(params.id);
					if (!todo) {
						return {
							content: textContent(`Todo #${params.id} not found`),
							details: store.toDetails("toggle", `#${params.id} not found`),
						};
					}
					return {
						content: textContent(`Todo #${todo.id} ${todo.done ? "completed" : "uncompleted"}`),
						details: store.toDetails("toggle"),
					};
				}

				case "clear": {
					const count = store.clear();
					return {
						content: textContent(`Cleared ${count} todos`),
						details: store.toDetails("clear"),
					};
				}

				default:
					return {
						content: textContent(`Unknown action: ${params.action}`),
						details: store.toDetails("list", `unknown action: ${params.action}`),
					};
			}
		},

		renderCall(args, theme, _context) {
			let text = theme.fg("toolTitle", theme.bold("todo ")) + theme.fg("muted", args.action);
			if (args.text) text += ` ${theme.fg("dim", `"${args.text}"`)}`;
			if (args.id !== undefined) text += ` ${theme.fg("accent", `#${args.id}`)}`;
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded }, theme, _context) {
			const details = result.details as TodoDetails | undefined;
			if (!details) {
				const first = result.content[0];
				return new Text(first?.type === "text" ? first.text : "", 0, 0);
			}

			if (details.error) {
				return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
			}

			const todoList = details.todos;

			switch (details.action) {
				case "list": {
					if (todoList.length === 0) {
						return new Text(theme.fg("dim", "No todos"), 0, 0);
					}
					let listText = theme.fg("muted", `${todoList.length} todo(s):`);
					const display = expanded ? todoList : todoList.slice(0, 5);
					for (const t of display) {
						const check = t.done ? theme.fg("success", "✓") : theme.fg("dim", "○");
						const itemText = t.done ? theme.fg("dim", t.text) : theme.fg("muted", t.text);
						listText += `\n${check} ${theme.fg("accent", `#${t.id}`)} ${itemText}`;
					}
					if (!expanded && todoList.length > 5) {
						listText += `\n${theme.fg("dim", `... ${todoList.length - 5} more`)}`;
					}
					return new Text(listText, 0, 0);
				}

				case "add": {
					const added = todoList[todoList.length - 1];
					return new Text(
						theme.fg("success", "✓ Added ") +
							theme.fg("accent", `#${added.id}`) +
							" " +
							theme.fg("muted", added.text),
						0,
						0,
					);
				}

				case "toggle": {
					const first = result.content[0];
					const msg = first?.type === "text" ? first.text : "";
					return new Text(theme.fg("success", "✓ ") + theme.fg("muted", msg), 0, 0);
				}

				case "clear":
					return new Text(theme.fg("success", "✓ ") + theme.fg("muted", "Cleared all todos"), 0, 0);
			}
		},
	});
}
