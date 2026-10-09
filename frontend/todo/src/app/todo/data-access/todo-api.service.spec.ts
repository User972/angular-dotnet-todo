import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api-base-url';
import { Todo } from '../models/todo';
import { TodoApiService, isNetworkError } from './todo-api.service';

describe('TodoApiService', () => {
  const milk: Todo = {
    id: 1,
    title: 'Buy milk',
    isCompleted: false,
    createdAt: '2026-10-09T00:00:00Z',
    completedAt: null,
  };

  let api: TodoApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TodoApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets all todos', async () => {
    const result = firstValueFrom(api.getAll());
    http.expectOne({ method: 'GET', url: '/api/todos' }).flush([milk]);

    expect(await result).toEqual([milk]);
  });

  it('creates a todo from a title', async () => {
    const result = firstValueFrom(api.create('Buy milk'));
    const req = http.expectOne({ method: 'POST', url: '/api/todos' });
    expect(req.request.body).toEqual({ title: 'Buy milk' });
    req.flush(milk);

    expect(await result).toEqual(milk);
  });

  it('updates a todo, sending only the editable fields', async () => {
    const saved = { ...milk, isCompleted: true, completedAt: '2026-10-09T01:00:00Z' };

    const result = firstValueFrom(api.update({ ...milk, isCompleted: true }));
    const req = http.expectOne({ method: 'PUT', url: '/api/todos/1' });
    expect(req.request.body).toEqual({ title: 'Buy milk', isCompleted: true });
    req.flush(saved);

    expect(await result).toEqual({ status: 'saved', todo: saved });
  });

  it('reports a missing todo on update as not-found', async () => {
    const result = firstValueFrom(api.update(milk));
    http.expectOne('/api/todos/1').flush(null, { status: 404, statusText: 'Not Found' });

    expect(await result).toEqual({ status: 'not-found' });
  });

  it('reports a rename rejected because the todo is completed as locked', async () => {
    const result = firstValueFrom(api.update(milk));
    http.expectOne('/api/todos/1').flush(null, { status: 409, statusText: 'Conflict' });

    expect(await result).toEqual({ status: 'locked' });
  });

  it('reports whether a delete removed the todo', async () => {
    const deleted = firstValueFrom(api.delete(1));
    http.expectOne({ method: 'DELETE', url: '/api/todos/1' }).flush(null, { status: 204, statusText: 'No Content' });
    expect(await deleted).toBe(true);

    const alreadyGone = firstValueFrom(api.delete(2));
    http.expectOne('/api/todos/2').flush(null, { status: 404, statusText: 'Not Found' });
    expect(await alreadyGone).toBe(false);
  });

  it('passes other HTTP errors through', async () => {
    const result = firstValueFrom(api.update(milk));
    http.expectOne('/api/todos/1').flush(null, { status: 500, statusText: 'Server Error' });

    await expect(result).rejects.toMatchObject({ status: 500 });
  });

  it('sends requests to the configured API origin', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.com/' },
      ],
    });
    const remote = TestBed.inject(HttpTestingController);

    const result = firstValueFrom(TestBed.inject(TodoApiService).delete(1));
    remote.expectOne({ method: 'DELETE', url: 'https://api.example.com/api/todos/1' }).flush(null);

    expect(await result).toBe(true);
    remote.verify();
  });

  it('recognises network failures', () => {
    expect(isNetworkError(new HttpErrorResponse({ status: 0 }))).toBe(true);
    expect(isNetworkError(new HttpErrorResponse({ status: 500 }))).toBe(false);
    expect(isNetworkError(new Error('boom'))).toBe(false);
  });
});
