import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Todo } from '../../models/todo';
import { TodoItem } from './todo-item';

describe('TodoItem', () => {
  const milk: Todo = {
    id: 1,
    title: 'Buy milk',
    isCompleted: false,
    createdAt: '2026-10-09T00:05:00Z',
    completedAt: null,
  };

  let fixture: ComponentFixture<TodoItem>;
  let el: HTMLElement;
  let renamed: string[];
  let toggled: number;
  let removed: number;

  async function render(todo: Todo): Promise<void> {
    fixture.componentRef.setInput('todo', todo);
    await fixture.whenStable();
  }

  async function startEditing(): Promise<HTMLInputElement> {
    el.querySelector('.title')!.dispatchEvent(new MouseEvent('dblclick'));
    await fixture.whenStable();
    return el.querySelector<HTMLInputElement>('input.edit')!;
  }

  async function press(input: HTMLInputElement, key: string): Promise<void> {
    input.dispatchEvent(new KeyboardEvent('keydown', { key }));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(TodoItem);
    el = fixture.nativeElement;
    renamed = [];
    toggled = 0;
    removed = 0;
    fixture.componentInstance.renamed.subscribe((title) => renamed.push(title));
    fixture.componentInstance.toggled.subscribe(() => toggled++);
    fixture.componentInstance.removed.subscribe(() => removed++);
    await render(milk);
  });

  it('shows the title, with its created time in AEST on hover', () => {
    expect(el.querySelector('.title')?.textContent?.trim()).toBe('Buy milk');
    expect(el.classList).not.toContain('completed');
    expect(el.getAttribute('title')).toBe('Created on 9 Oct 2026, 10:05 am AEST');
  });

  it('marks a completed todo and adds its completed time to the hover text', async () => {
    await render({ ...milk, isCompleted: true, completedAt: '2026-10-09T03:30:00+00:00' });

    expect(el.classList).toContain('completed');
    expect(el.getAttribute('title')).toBe(
      'Created on 9 Oct 2026, 10:05 am AEST\nCompleted on 9 Oct 2026, 1:30 pm AEST',
    );
  });

  it('does not allow editing a completed todo', async () => {
    await render({ ...milk, isCompleted: true, completedAt: '2026-10-09T03:30:00+00:00' });

    expect(el.querySelector('button[aria-label="Edit"]')).toBeNull();
    expect(el.querySelector('button[aria-label="Delete"]')).not.toBeNull();

    el.querySelector('.title')!.dispatchEvent(new MouseEvent('dblclick'));
    await fixture.whenStable();
    expect(el.querySelector('input.edit')).toBeNull();
  });

  it('emits toggled and removed', () => {
    el.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    el.querySelector<HTMLButtonElement>('button[aria-label="Delete"]')!.click();

    expect(toggled).toBe(1);
    expect(removed).toBe(1);
  });

  it('edits on double-click without toggling the todo', async () => {
    // A real double-click delivers two clicks before the dblclick event.
    const title = el.querySelector<HTMLElement>('.title')!;
    title.click();
    title.click();
    title.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await fixture.whenStable();

    expect(toggled).toBe(0);
    expect(el.querySelector('input.edit')).not.toBeNull();
  });

  it('names the checkbox after the todo title', () => {
    const checkbox = el.querySelector('input[type="checkbox"]')!;
    const labelId = checkbox.getAttribute('aria-labelledby');

    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent?.trim()).toBe('Buy milk');
  });

  it('renames on Enter with the trimmed title, then leaves edit mode', async () => {
    const input = await startEditing();
    expect(input.value).toBe('Buy milk');
    expect(document.activeElement).toBe(input);

    input.value = '  Buy oat milk  ';
    await press(input, 'Enter');

    expect(renamed).toEqual(['Buy oat milk']);
    expect(el.querySelector('input.edit')).toBeNull();
  });

  it('does not rename on Escape, or when the title is blank or unchanged', async () => {
    let input = await startEditing();
    input.value = 'Something else';
    await press(input, 'Escape');

    input = await startEditing();
    input.value = '   ';
    await press(input, 'Enter');

    input = await startEditing();
    input.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();

    expect(renamed).toEqual([]);
    expect(el.querySelector('input.edit')).toBeNull();
  });
});
