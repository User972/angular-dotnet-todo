using System.Collections.Concurrent;
using ToDo.Web.Api.Models;
using ToDo.Web.Api.Repositories.Interfaces;


namespace ToDo.Web.Api.Repositories
{
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

        public TodoUpdateResult Update(int id, string title, bool isCompleted)
        {
            while (_items.TryGetValue(id, out var current))
            {

                if (current.IsCompleted && title != current.Title)
                {
                    return new TodoUpdateResult(UpdateOutcome.Locked);
                }

                DateTimeOffset? completedAt = isCompleted ? current.CompletedAt ?? timeProvider.GetUtcNow() : null;
                var updated = current with { Title = title, CompletedAt = completedAt };
                if (_items.TryUpdate(id, updated, current))
                {
                    return new TodoUpdateResult(UpdateOutcome.Updated, updated);
                }
            }

            return new TodoUpdateResult(UpdateOutcome.NotFound);
        }

        public bool Delete(int id) => _items.TryRemove(id, out _);
    }

}
