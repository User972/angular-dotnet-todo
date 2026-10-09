namespace ToDo.Web.Api.Models
{
    public sealed record TodoItem(int Id, string Title, DateTimeOffset CreatedAt, DateTimeOffset? CompletedAt)
    {
        public bool IsCompleted => CompletedAt is not null;
    }

}
