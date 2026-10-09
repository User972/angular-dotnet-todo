import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MAX_TITLE_LENGTH, Todo, TodoFilter } from '../../models/todo';
import { TodoItem } from '../todo-item/todo-item';
import { TodoStore } from '../../data-access/todo-store';

/**
 * How long a todo completed from the Active view stays on screen so its green "done" fade
 * can play before it leaves. Keep in sync with the `li.leaving` animation in todo-list.css.
 */
export const COMPLETED_LINGER_MS = 1200;

@Component({
  selector: 'app-todo-list',
  imports: [TodoItem],
  templateUrl: './todo-list.html',
  styleUrl: './todo-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoList implements OnInit {
  protected readonly store = inject(TodoStore);

  protected readonly maxTitleLength = MAX_TITLE_LENGTH;
  protected readonly filters: readonly TodoFilter[] = ['all', 'active', 'completed'];
  protected readonly filter = signal<TodoFilter>('active');
  protected readonly addPanelOpen = signal(false);
  protected readonly lastAdded = signal<string | null>(null);
  private readonly addLink = viewChild.required<ElementRef<HTMLButtonElement>>('addLink');
  private readonly justCompleted = signal<ReadonlySet<number>>(new Set());

  protected readonly visibleTodos = computed(() => {
    const todos = this.store.todos();
    switch (this.filter()) {
      case 'active':
        return todos.filter((t) => !t.isCompleted || this.justCompleted().has(t.id));
      case 'completed':
        return todos.filter((t) => t.isCompleted);
      default:
        return todos;
    }
  });
  protected readonly remainingCount = computed(
    () => this.store.todos().filter((t) => !t.isCompleted).length,
  );

  ngOnInit(): void {
    void this.store.load();
  }

  protected onAddPanelToggle(event: ToggleEvent): void {
    const open = event.newState === 'open';
    this.addPanelOpen.set(open);
    if (open) {
      this.lastAdded.set(null);
    } else {
      // Closing (✕ or Esc) always starts inside the panel, and the browser drops focus
      // to <body> when it hides, so hand it back to the link that opened it.
      this.addLink().nativeElement.focus();
    }
  }

  protected async add(event: Event, input: HTMLInputElement): Promise<void> {
    event.preventDefault();
    const title = input.value.trim();
    if (title && (await this.store.add(title))) {
      input.value = '';
      this.lastAdded.set(title);
    }
  }

  protected async toggle(todo: Todo): Promise<void> {
    const completing = !todo.isCompleted;
    if (completing) {
      this.justCompleted.update((ids) => new Set(ids).add(todo.id));
    }
    await this.store.update({ ...todo, isCompleted: completing });
    if (completing) {
      setTimeout(() => {
        this.justCompleted.update((ids) => {
          const next = new Set(ids);
          next.delete(todo.id);
          return next;
        });
      }, COMPLETED_LINGER_MS);
    }
  }

  protected rename(todo: Todo, title: string): void {
    void this.store.update({ ...todo, title });
  }

  protected remove(todo: Todo): void {
    void this.store.remove(todo.id);
  }
}
