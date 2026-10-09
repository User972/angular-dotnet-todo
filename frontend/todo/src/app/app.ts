import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TodoList } from './todo/components/todo-list/todo-list';

/** App shell: page layout only. Feature UI lives under ./todo. */
@Component({
  selector: 'app-root',
  imports: [TodoList],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
