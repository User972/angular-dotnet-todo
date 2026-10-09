using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using ToDo.Web.Api.Contracts;
using ToDo.Web.Api.Models;

using ToDo.Web.Api.Repositories.Interfaces;


namespace ToDo.Web.Api.Controllers
{

    [ApiController]
    [Route("api/todos")]
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

}
