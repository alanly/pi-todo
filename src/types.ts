/**
 * Shared types for pi-todo.
 *
 * The todo list is persisted inside the `details` of each `todo` tool
 * result, never in an external file. That keeps state branch-correct:
 * when the session branches, the list is reconstructed from the entries
 * on the active branch.
 */

export interface Todo {
	id: number;
	text: string;
	done: boolean;
}

export type TodoAction = "list" | "add" | "toggle" | "clear";

/** The `details` payload attached to every `todo` tool result. */
export interface TodoDetails {
	action: TodoAction;
	todos: Todo[];
	nextId: number;
	error?: string;
}
