/**
 * The `/todos` viewer: a read-only TUI component that lists the todos on
 * the current branch. Escape or Ctrl+C closes it.
 */

import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, Text, truncateToWidth } from "@earendil-works/pi-tui";
import type { Todo } from "./types.ts";

export class TodoListComponent {
	private theme: Theme;
	private onClose: () => void;
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(
		private todos: Todo[],
		theme: Theme,
		onClose: () => void,
	) {
		this.theme = theme;
		this.onClose = onClose;
	}

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
			this.onClose();
		}
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const lines: string[] = [];
		const th = this.theme;

		lines.push("");
		const title = th.fg("accent", " Todos ");
		const headerLine =
			th.fg("borderMuted", "─".repeat(3)) + title + th.fg("borderMuted", "─".repeat(Math.max(0, width - 10)));
		lines.push(truncateToWidth(headerLine, width));
		lines.push("");

		if (this.todos.length === 0) {
			lines.push(truncateToWidth(`  ${th.fg("dim", "No todos yet. Ask the agent to add some!")}`, width));
		} else {
			const done = this.todos.filter((t) => t.done).length;
			const total = this.todos.length;
			lines.push(truncateToWidth(`  ${th.fg("muted", `${done}/${total} completed`)}`, width));
			lines.push("");

			for (const todo of this.todos) {
				const check = todo.done ? th.fg("success", "✓") : th.fg("dim", "○");
				const id = th.fg("accent", `#${todo.id}`);
				const text = todo.done ? th.fg("dim", todo.text) : th.fg("text", todo.text);
				lines.push(truncateToWidth(`  ${check} ${id} ${text}`, width));
			}
		}

		lines.push("");
		lines.push(truncateToWidth(`  ${th.fg("dim", "Press Escape to close")}`, width));
		lines.push("");

		this.cachedWidth = width;
		this.cachedLines = lines;
		return lines;
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}
}
