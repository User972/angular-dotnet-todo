import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { formatAest } from '../../utils/aest';
import { MAX_TITLE_LENGTH, Todo } from '../../models/todo';

@Component({
  selector: 'app-todo-item',
  templateUrl: './todo-item.html',
  styleUrl: './todo-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.completed]': 'todo().isCompleted',
    '[attr.title]': 'timestamps()',
  },
})
export class TodoItem {
  readonly todo = input.required<Todo>();
  readonly toggled = output<void>();
  readonly renamed = output<string>();
  readonly removed = output<void>();

  protected readonly maxTitleLength = MAX_TITLE_LENGTH;
  protected readonly editing = signal(false);
  protected readonly titleId = computed(() => `todo-title-${this.todo().id}`);
  /** Hover tooltip; browsers render the newline as a second line. */
  protected readonly timestamps = computed(() => {
    const { createdAt, completedAt } = this.todo();
    const created = `Created on ${formatAest(createdAt)}`;
    return completedAt ? `${created}\nCompleted on ${formatAest(completedAt)}` : created;
  });
  private readonly editInput = viewChild<ElementRef<HTMLInputElement>>('editInput');

  constructor() {
    effect(() => {
      if (this.editing()) {
        this.editInput()?.nativeElement.focus();
      }
    });
  }

  protected startEditing(): void {
    // Completed todos are read-only (the API rejects renaming them too).
    if (!this.todo().isCompleted) {
      this.editing.set(true);
    }
  }

  protected commitEdit(value: string): void {
    // Enter and the blur that follows both land here; only the first one counts.
    if (!this.editing()) {
      return;
    }
    this.editing.set(false);

    const title = value.trim();
    if (title && title !== this.todo().title) {
      this.renamed.emit(title);
    }
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }
}
