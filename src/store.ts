/**
 * Todo state: the in-memory list plus reconstruction from the session
 * branch. Passive data — tools.ts drives the changes and statusline.ts
 * reads the counts.
 */

import type { Todo, TodoAction, TodoDetails } from "./types.ts";

/**
 * Minimal structural view of a session branch entry. Pi's `SessionEntry`
 * union is assignable to this, so the store stays decoupled from the
 * coding-agent types and is easy to unit test.
 */
export interface BranchEntry {
	type: string;
	message?: unknown;
}

/**
 * Find the details of the most recent `todo` tool result on the branch.
 * Only the last one matters: every result carries the full todo list.
 */
export function latestTodoDetails(entries: readonly BranchEntry[]): TodoDetails | undefined {
	let latest: TodoDetails | undefined;
	for (const entry of entries) {
		if (entry.type !== "message") continue;
		const message = entry.message as { role?: string; toolName?: string; details?: unknown } | undefined;
		if (message?.role !== "toolResult" || message.toolName !== "todo") continue;
		const details = message.details as TodoDetails | undefined;
		if (details && Array.isArray(details.todos)) latest = details;
	}
	return latest;
}

export class TodoStore {
	private todos: Todo[] = [];
	private nextId = 1;

	/** Snapshot of the list. Callers get copies, so they cannot mutate state. */
	all(): Todo[] {
		return this.todos.map((todo) => ({ ...todo }));
	}

	counts(): { total: number; done: number } {
		let done = 0;
		for (const todo of this.todos) {
			if (todo.done) done++;
		}
		return { total: this.todos.length, done };
	}

	add(text: string): Todo {
		const todo: Todo = { id: this.nextId++, text, done: false };
		this.todos.push(todo);
		return { ...todo };
	}

	toggle(id: number): Todo | undefined {
		const todo = this.todos.find((t) => t.id === id);
		if (!todo) return undefined;
		todo.done = !todo.done;
		return { ...todo };
	}

	/** Remove every todo and reset the id counter. Returns the removed count. */
	clear(): number {
		const count = this.todos.length;
		this.todos = [];
		this.nextId = 1;
		return count;
	}

	/** Replace the state from a persisted tool result. */
	restore(details: TodoDetails): void {
		this.todos = details.todos.map((todo) => ({ ...todo }));
		this.nextId = details.nextId;
	}

	/** Rebuild state from the session branch, or reset when none exists. */
	restoreFromBranch(entries: readonly BranchEntry[]): void {
		const details = latestTodoDetails(entries);
		if (details) {
			this.restore(details);
			return;
		}
		this.todos = [];
		this.nextId = 1;
	}

	/** The details payload to persist for a tool result. */
	toDetails(action: TodoAction, error?: string): TodoDetails {
		const base: TodoDetails = { action, todos: this.all(), nextId: this.nextId };
		return error ? { ...base, error } : base;
	}
}
