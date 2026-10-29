/**
 * Footer status line: `📝 done/total`.
 *
 * It appears only while the list is non-empty AND unfinished, so
 * `setStatus(key, undefined)` clears it the moment everything is done
 * or the list is emptied.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { TodoStore } from "./store.ts";

export const STATUS_KEY = "todo";

/** The subset of theme colors the status line uses. */
export type StatusFg = (color: "success" | "dim", text: string) => string;

/**
 * Pure formatter. Returns undefined while the list is empty or every item
 * is complete, which clears the status line.
 */
export function formatTodoStatus(done: number, total: number, fg: StatusFg): string | undefined {
	if (total <= 0 || done >= total) return undefined;
	return `${fg("success", "📝")} ${fg("success", String(done))}${fg("dim", `/${total}`)}`;
}

export class TodoStatusLine {
	private ctx?: ExtensionContext;

	constructor(private store: TodoStore) {}

	/** Capture (or refresh) the extension context. */
	capture(ctx: ExtensionContext): void {
		this.ctx = ctx;
	}

	/** Recompute the line after a state change. */
	refresh(): void {
		const ctx = this.ctx;
		// Mode safety: no setStatus when the session has no TUI.
		if (!ctx || ctx.mode !== "tui") return;
		const { done, total } = this.store.counts();
		ctx.ui.setStatus(STATUS_KEY, formatTodoStatus(done, total, (color, text) => ctx.ui.theme.fg(color, text)));
	}
}
