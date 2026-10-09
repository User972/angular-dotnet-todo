using System.ComponentModel.DataAnnotations;
using ToDo.Web.Api.Models;

namespace ToDo.Web.Api.Contracts
{
    public sealed record UpdateTodoRequest(
        [Required, StringLength(TodoConstraints.MaxTitleLength)] string? Title,
        [Required] bool? IsCompleted);

}
