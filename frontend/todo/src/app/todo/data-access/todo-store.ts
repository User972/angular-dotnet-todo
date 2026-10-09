import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Todo } from '../models/todo';
import { TodoApiService, isNetworkError } from './todo-api.service';

/**
 * Single source of truth for todos on the client, and the actions the UI can take on them.
 * State changes only after the API confirms them, so the list always reflects what the
 * server actually stored.
 */
@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly api = inject(TodoApiService);

  private readonly todosState = signal<Todo[]>([]);
  private readonly loadedState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly todos = this.todosState.asReadonly();
  readonly loaded = this.loadedState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async load(): Promise<void> {
    this.errorState.set(null);
    try {
      this.todosState.set(await firstValueFrom(this.api.getAll()));
      this.loadedState.set(true);
    } catch (error) {
      this.fail('load your todos', error);
    }
  }

  /** @returns whether the todo was created, so the caller knows when to clear its input. */
  async add(title: string): Promise<boolean> {
    this.errorState.set(null);
    try {
      const created = await firstValueFrom(this.api.create(title));
      this.todosState.update((todos) => [...todos, created]);
      return true;
    } catch (error) {
      this.fail('add the todo', error);
      return false;
    }
  }

  async update(todo: Todo): Promise<void> {
    this.errorState.set(null);
    try {
      const result = await firstValueFrom(this.api.update(todo));
      switch (result.status) {
        case 'saved':
          this.todosState.update((todos) => todos.map((t) => (t.id === todo.id ? result.todo : t)));
          break;
        case 'not-found':
          this.drop(todo.id);
          this.errorState.set('That todo was already deleted.');
          break;
        case 'locked':
          // Completed elsewhere (e.g. another tab) before this change arrived: show its real state.
          await this.load();
          this.errorState.set("That todo was already completed, so it can't be renamed.");
          break;
      }
    } catch (error) {
      this.fail('save the todo', error);
    }
  }

  async remove(id: number): Promise<void> {
    this.errorState.set(null);
    try {
      // Whether we deleted it or it was already gone, it no longer exists on the server.
      await firstValueFrom(this.api.delete(id));
      this.drop(id);
    } catch (error) {
      this.fail('delete the todo', error);
    }
  }

  clearError(): void {
    this.errorState.set(null);
  }

  private drop(id: number): void {
    this.todosState.update((todos) => todos.filter((t) => t.id !== id));
  }

  private fail(action: string, error: unknown): void {
    const unreachable = isNetworkError(error) ? ' The server is unreachable.' : '';
    this.errorState.set(`Couldn't ${action}.${unreachable}`);
  }
}
