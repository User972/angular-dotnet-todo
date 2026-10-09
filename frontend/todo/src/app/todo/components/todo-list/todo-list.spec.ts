import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMPLETED_LINGER_MS, TodoList } from './todo-list';
import { Todo } from '../../models/todo';

describe('TodoList', () => {
  const milk: Todo = {
    id: 1,
    title: 'Buy milk',
    isCompleted: false,
    createdAt: '2026-10-09T00:05:00Z',
    completedAt: null,
  };
  const bread: Todo = {
    id: 2,
    title: 'Buy bread',
    isCompleted: true,
    createdAt: '2026-10-08T22:00:00Z',
    completedAt: '2026-10-09T03:30:00+00:00',
  };

  let http: HttpTestingController;
  let fixture: ComponentFixture<TodoList>;
  let el: HTMLElement;

  /** Lets pending timers and the store's awaited HTTP response land, then waits for the re-render. */
  async function settle(ms = 0): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await fixture.whenStable();
  }

  const titles = () =>
    Array.from(el.querySelectorAll('.todo-list .title'), (node) => node.textContent?.trim());
  const row = (title: string) =>
    Array.from(el.querySelectorAll('app-todo-item')).find((r) => r.textContent?.includes(title))!;
  const filterButton = (name: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('.filters button')).find(
      (b) => b.textContent?.trim() === name,
    )!;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TodoList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(TodoList);
    el = fixture.nativeElement;
    // Runs ngOnInit, which issues the initial load. whenStable() would wait on that
    // request forever, so it has to be flushed first.
    fixture.detectChanges();
    http.expectOne('/api/todos').flush([milk, bread]);
    await settle();
  });

  afterEach(() => http.verify());

  it('shows active todos by default, with a remaining count and other filters', async () => {
    expect(filterButton('active').getAttribute('aria-pressed')).toBe('true');
    expect(titles()).toEqual(['Buy milk']);
    expect(el.querySelector('footer')?.textContent).toContain('1 item left');

    filterButton('all').click();
    await fixture.whenStable();
    expect(titles()).toEqual(['Buy milk', 'Buy bread']);

    filterButton('completed').click();
    await fixture.whenStable();
    expect(titles()).toEqual(['Buy bread']);
  });

  it('adds a todo and clears the input once the API confirms it', async () => {
    const input = el.querySelector<HTMLInputElement>('.new-todo input')!;
    input.value = '  Walk dog  ';
    el.querySelector('form')!.dispatchEvent(new Event('submit'));

    const req = http.expectOne({ method: 'POST', url: '/api/todos' });
    expect(req.request.body).toEqual({ title: 'Walk dog' });
    req.flush({ id: 3, title: 'Walk dog', isCompleted: false, createdAt: '2026-10-09T01:00:00Z', completedAt: null });
    await settle();

    expect(input.value).toBe('');
    expect(el.querySelector('.add-panel .hint')?.textContent).toContain('Added “Walk dog”');
    expect(titles()).toEqual(['Buy milk', 'Walk dog']);
  });

  it('keeps a todo completed from the Active view on screen while it fades, then removes it', async () => {
    row('Buy milk').querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();

    const req = http.expectOne({ method: 'PUT', url: '/api/todos/1' });
    expect(req.request.body).toEqual({ title: 'Buy milk', isCompleted: true });
    req.flush({ ...milk, isCompleted: true, completedAt: '2026-10-09T02:00:00Z' });
    await settle();

    expect(row('Buy milk').classList).toContain('completed');
    expect(row('Buy milk').closest('li')!.classList).toContain('leaving');
    expect(el.querySelector('footer')?.textContent).toContain('0 items left');

    await settle(COMPLETED_LINGER_MS);
    expect(titles()).toEqual([]);
    expect(el.querySelector('.todo-list')?.textContent).toContain('No active todos.');
  });
});
