import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MonoTypeOperatorFunction, Observable, catchError, map, of, throwError } from 'rxjs';
import { Todo } from '../models/todo';
import { API_BASE_URL } from '../../core/api-base-url';


/** Outcome of saving a todo. "not-found" and "locked" are expected results, not errors. */
export type UpdateResult =
  | { status: 'saved'; todo: Todo }
  | { status: 'not-found' }
  /** The todo is completed on the server, so it can't be renamed. */
  | { status: 'locked' };

/**
 * HTTP access to the Todo API, and nothing else: no state, no UI decisions.
 * Expected outcomes (404, 409) are reported as result values rather than errors, so callers
 * can decide what they mean without knowing about HTTP.
 */
@Injectable({ providedIn: 'root' })
export class TodoApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL).replace(/\/+$/, '')}/api/todos`;

  getAll(): Observable<Todo[]> {
    return this.http.get<Todo[]>(this.url);
  }

  create(title: string): Observable<Todo> {
    return this.http.post<Todo>(this.url, { title });
  }

  update(todo: Todo): Observable<UpdateResult> {
    return this.http
      .put<Todo>(`${this.url}/${todo.id}`, { title: todo.title, isCompleted: todo.isCompleted })
      .pipe(
        map((saved): UpdateResult => ({ status: 'saved', todo: saved })),
        whenStatus<UpdateResult>(HttpStatusCode.NotFound, { status: 'not-found' }),
        whenStatus<UpdateResult>(HttpStatusCode.Conflict, { status: 'locked' }),
      );
  }

  /** Emits `true` if the todo was deleted, or `false` if it was already gone. */
  delete(id: number): Observable<boolean> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      map(() => true),
      whenStatus(HttpStatusCode.NotFound, false),
    );
  }
}

/** Whether a request failed because the server couldn't be reached at all. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 0;
}

/** Turns an error response with the given status into a normal value. */
function whenStatus<T>(status: HttpStatusCode, value: T): MonoTypeOperatorFunction<T> {
  return catchError((error: unknown) =>
    error instanceof HttpErrorResponse && error.status === status ? of(value) : throwError(() => error),
  );
}
