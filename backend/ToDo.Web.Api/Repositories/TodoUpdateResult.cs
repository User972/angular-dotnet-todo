using ToDo.Web.Api.Models;

namespace ToDo.Web.Api.Repositories
{
    public readonly record struct TodoUpdateResult(UpdateOutcome Outcome, TodoItem? Item = null);

}
