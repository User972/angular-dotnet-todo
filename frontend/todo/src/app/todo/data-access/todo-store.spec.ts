import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Todo } from '../models/todo';
import { TodoApiService } from './todo-api.service';
import { TodoStore } from './todo-store';

describe('TodoStore', () => {
  const milk: Todo = {
    id: 1,
    title: 'Buy milk',
    isCompleted: false,
    createdAt: '2026-10-09T00:00:00Z',
    completedAt: null,
  };
  const bread: Todo = {
    id: 2,
    title: 'Buy bread',
    isCompleted: true,
    createdAt: '2026-10-09T00:00:00Z',
    completedAt: '2026-10-09T01:00:00Z',
  };

  // The store is tested against a fake API; HTTP details are covered in todo-api.service.spec.ts.
  function fakeApi() {
    return {
      getAll: vi.fn<TodoApiService['getAll']>(() => of([milk, bread])),
      create: vi.fn<TodoApiService['create']>(),
      update: vi.fn<TodoApiService['update']>(),
      delete: vi.fn<TodoApiService['delete']>(),
    };
  }

  let api: ReturnType<typeof fakeApi>;
  let store: TodoStore;

  beforeEach(async () => {
    api = fakeApi();
    TestBed.configureTestingModule({ providers: [{ provide: TodoApiService, useValue: api }] });
    store = TestBed.inject(TodoStore);
    await store.load();
  });

  it('loads todos', () => {
    expect(store.loaded()).toBe(true);
    expect(store.todos()).toEqual([milk, bread]);
  });

  it('appends a created todo', async () => {
    const walk: Todo = { ...milk, id: 3, title: 'Walk dog' };
    api.create.mockReturnValue(of(walk));

    expect(await store.add('Walk dog')).toBe(true);
    expect(api.create).toHaveBeenCalledWith('Walk dog');
    expect(store.todos()).toEqual([milk, bread, walk]);
  });

  it('keeps state unchanged and reports an error when an action fails', async () => {
    api.create.mockReturnValue(throwError(() => new Error('boom')));

    expect(await store.add('Walk dog')).toBe(false);
    expect(store.todos()).toEqual([milk, bread]);
    expect(store.error()).toBe("Couldn't add the todo.");
  });

  it('says when the server is unreachable', async () => {
    api.getAll.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    await store.load();

    expect(store.error()).toBe("Couldn't load your todos. The server is unreachable.");
  });

  it('replaces a todo with the saved version', async () => {
    const saved = { ...milk, isCompleted: true, completedAt: '2026-10-09T03:00:00Z' };
    api.update.mockReturnValue(of({ status: 'saved', todo: saved }));

    await store.update({ ...milk, isCompleted: true });

    expect(api.update).toHaveBeenCalledWith({ ...milk, isCompleted: true });
    expect(store.todos()).toEqual([saved, bread]);
  });

  it('drops a todo that was deleted elsewhere when saving it', async () => {
    api.update.mockReturnValue(of({ status: 'not-found' }));

    await store.update({ ...milk, title: 'Buy oat milk' });

    expect(store.todos()).toEqual([bread]);
    expect(store.error()).toBe('That todo was already deleted.');
  });

  it('reloads and explains when a rename hits a todo completed elsewhere', async () => {
    const completedElsewhere = { ...milk, isCompleted: true, completedAt: '2026-10-09T02:00:00Z' };
    api.update.mockReturnValue(of({ status: 'locked' }));
    api.getAll.mockReturnValue(of([completedElsewhere, bread]));

    await store.update({ ...milk, title: 'Buy oat milk' });

    expect(store.todos()).toEqual([completedElsewhere, bread]);
    expect(store.error()).toBe("That todo was already completed, so it can't be renamed.");
  });

  it('removes a todo, whether or not it still existed on the server', async () => {
    api.delete.mockReturnValueOnce(of(true)).mockReturnValueOnce(of(false));

    await store.remove(1);
    await store.remove(2);

    expect(store.todos()).toEqual([]);
    expect(store.error()).toBeNull();
  });

  it('keeps a todo whose delete failed', async () => {
    api.delete.mockReturnValue(throwError(() => new Error('boom')));

    await store.remove(1);

    expect(store.todos()).toEqual([milk, bread]);
    expect(store.error()).toBe("Couldn't delete the todo.");
  });
});
