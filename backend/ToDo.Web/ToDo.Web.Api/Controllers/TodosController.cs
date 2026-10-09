using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics;

namespace ToDo.Web.Api.Controllers
{

    [ApiController]
    [Route("todos")]
    public sealed class TodosController(ITodoRepository repository) : ControllerBase
    {
        [HttpGet]
        public IReadOnlyList<TodoItem> GetAll() => repository.GetAll();

        [HttpGet("{id:int}")]
        public ActionResult<TodoItem> Get(int id)
        {
            var item = repository.Get(id);
            return item is null ? NotFound() : item;
        }


        [HttpPost]
        public ActionResult<TodoItem> Create(CreateTodoRequest request)
        {
            var item = repository.Add(request.Title!.Trim());
            return CreatedAtAction(nameof(Get), new { id = item.Id }, item);
        }

        [HttpPut("{id:int}")]
        public ActionResult<TodoItem> Update(int id, UpdateTodoRequest request)
        {
            var result = repository.Update(id, request.Title!.Trim(), request.IsCompleted!.Value);
            return result.Outcome switch
            {
                UpdateOutcome.Updated => result.Item!,
                UpdateOutcome.NotFound => NotFound(),
                UpdateOutcome.Locked => Problem(
                    statusCode: StatusCodes.Status409Conflict,
                    title: "A completed todo can't be renamed. Reopen it first."),
                _ => throw new UnreachableException(),
            };
        }

        [HttpDelete("{id:int}")]
        public IActionResult Delete(int id) => repository.Delete(id) ? NoContent() : NotFound();
    }
    public sealed record TodoItem(int Id, string Title, DateTimeOffset CreatedAt, DateTimeOffset? CompletedAt)
    {
        public bool IsCompleted => CompletedAt is not null;
    }
    public sealed record CreateTodoRequest(
    [Required, StringLength(TodoRules.MaxTitleLength)] string? Title);

    public sealed record UpdateTodoRequest(
        [Required, StringLength(TodoRules.MaxTitleLength)] string? Title,
        [Required] bool? IsCompleted);

    public static class TodoRules
    {
        public const int MaxTitleLength = 200;
    }


    public enum UpdateOutcome
    {
        Updated,
        NotFound,
        Locked,
    }

    public readonly record struct UpdateResult(UpdateOutcome Outcome, TodoItem? Item = null);

    public sealed class InMemoryTodoRepository(TimeProvider timeProvider) : ITodoRepository
    {
        private readonly ConcurrentDictionary<int, TodoItem> _items = new();
        private int _lastId;

        public IReadOnlyList<TodoItem> GetAll() => _items.Values.OrderBy(item => item.Id).ToList();

        public TodoItem? Get(int id) => _items.GetValueOrDefault(id);

        public TodoItem Add(string title)
        {
            var item = new TodoItem(Interlocked.Increment(ref _lastId), title, timeProvider.GetUtcNow(), CompletedAt: null);
            _items[item.Id] = item;
            return item;
        }

        public UpdateResult Update(int id, string title, bool isCompleted)
        {
            while (_items.TryGetValue(id, out var current))
            {

                if (current.IsCompleted && title != current.Title)
                {
                    return new UpdateResult(UpdateOutcome.Locked);
                }

                DateTimeOffset? completedAt = isCompleted ? current.CompletedAt ?? timeProvider.GetUtcNow() : null;
                var updated = current with { Title = title, CompletedAt = completedAt };
                if (_items.TryUpdate(id, updated, current))
                {
                    return new UpdateResult(UpdateOutcome.Updated, updated);
                }
            }

            return new UpdateResult(UpdateOutcome.NotFound);
        }

        public bool Delete(int id) => _items.TryRemove(id, out _);
    }
    public interface ITodoRepository
    {
        IReadOnlyList<TodoItem> GetAll();

        TodoItem? Get(int id);

        TodoItem Add(string title);

        UpdateResult Update(int id, string title, bool isCompleted);

        bool Delete(int id);
    }

}
