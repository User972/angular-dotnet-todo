using ToDo.Web.Api.Models;

namespace ToDo.Web.Api.Repositories.Interfaces
{
    public interface ITodoRepository
    {
        IReadOnlyList<TodoItem> GetAll();

        TodoItem? Get(int id);

        TodoItem Add(string title);

        TodoUpdateResult Update(int id, string title, bool isCompleted);

        bool Delete(int id);
    }

}
