using System.ComponentModel.DataAnnotations;
using ToDo.Web.Api.Models;

namespace ToDo.Web.Api.Contracts
{
    public sealed record CreateTodoRequest(
    [Required, StringLength(TodoConstraints.MaxTitleLength)] string? Title);

}
