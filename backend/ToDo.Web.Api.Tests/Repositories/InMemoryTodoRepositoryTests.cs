using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text;
using ToDo.Web.Api.Models;
using ToDo.Web.Api.Repositories;
namespace ToDo.Web.Api.Tests.Repositories
{

    public sealed class InMemoryTodoRepositoryTests
    {
        private static readonly DateTimeOffset StartTime =
            new(2026, 10, 9, 5, 0, 0, TimeSpan.Zero);

        private static (
            InMemoryTodoRepository Repository,
            TestTimeProvider Clock)
            CreateRepository()
        {
            var clock = new TestTimeProvider(StartTime);

            return (
                new InMemoryTodoRepository(clock),
                clock);
        }

        [Fact]
        public void GetAll_WhenEmpty_ReturnsEmptyList()
        {
            var (repository, _) = CreateRepository();

            var result = repository.GetAll();

            Assert.Empty(result);
        }

        [Fact]
        public void Add_CreatesTodoWithExpectedValues()
        {
            var (repository, _) = CreateRepository();

            var result = repository.Add("Write tests");

            Assert.Equal(1, result.Id);
            Assert.Equal("Write tests", result.Title);
            Assert.Equal(StartTime, result.CreatedAt);
            Assert.Null(result.CompletedAt);
            Assert.False(result.IsCompleted);
        }

        [Fact]
        public void Add_AssignsSequentialIds()
        {
            var (repository, _) = CreateRepository();

            var first = repository.Add("First");
            var second = repository.Add("Second");
            var third = repository.Add("Third");

            Assert.Equal(1, first.Id);
            Assert.Equal(2, second.Id);
            Assert.Equal(3, third.Id);
        }

        [Fact]
        public void Get_ReturnsExistingTodo()
        {
            var (repository, _) = CreateRepository();

            var created = repository.Add("Test todo");

            var result = repository.Get(created.Id);

            Assert.Equal(created, result);
        }

        [Fact]
        public void Get_WhenMissing_ReturnsNull()
        {
            var (repository, _) = CreateRepository();

            var result = repository.Get(999);

            Assert.Null(result);
        }

        [Fact]
        public void GetAll_ReturnsTodosOrderedById()
        {
            var (repository, _) = CreateRepository();

            repository.Add("First");
            repository.Add("Second");
            repository.Add("Third");

            var result = repository.GetAll();

            Assert.Collection(
                result,
                item => Assert.Equal(1, item.Id),
                item => Assert.Equal(2, item.Id),
                item => Assert.Equal(3, item.Id));
        }

        [Fact]
        public void Update_CanRenameOpenTodo()
        {
            var (repository, _) = CreateRepository();

            var created = repository.Add("Original");

            var result = repository.Update(
                created.Id,
                "Renamed",
                false);

            Assert.Equal(UpdateOutcome.Updated, result.Outcome);

            Assert.NotNull(result.Item);
            Assert.Equal("Renamed", result.Item.Title);
            Assert.False(result.Item.IsCompleted);
        }

        [Fact]
        public void Update_WhenCompleted_SetsCompletedAt()
        {
            var (repository, clock) = CreateRepository();

            var created = repository.Add("Test");

            clock.Advance(TimeSpan.FromMinutes(5));

            var result = repository.Update(
                created.Id,
                created.Title,
                true);

            Assert.Equal(UpdateOutcome.Updated, result.Outcome);
            Assert.NotNull(result.Item);

            Assert.True(result.Item.IsCompleted);
            Assert.Equal(
                StartTime.AddMinutes(5),
                result.Item.CompletedAt);
        }

        [Fact]
        public void Update_WhenAlreadyCompleted_PreservesOriginalCompletedAt()
        {
            var (repository, clock) = CreateRepository();

            var created = repository.Add("Test");

            clock.Advance(TimeSpan.FromMinutes(5));

            var completed = repository.Update(
                created.Id,
                created.Title,
                true);

            var originalCompletedAt =
                completed.Item!.CompletedAt;

            clock.Advance(TimeSpan.FromHours(1));

            var updated = repository.Update(
                created.Id,
                created.Title,
                true);

            Assert.Equal(
                originalCompletedAt,
                updated.Item!.CompletedAt);
        }

        [Fact]
        public void Update_ReopeningTodo_ClearsCompletedAt()
        {
            var (repository, clock) = CreateRepository();

            var created = repository.Add("Test");

            clock.Advance(TimeSpan.FromMinutes(5));

            repository.Update(
                created.Id,
                created.Title,
                true);

            var result = repository.Update(
                created.Id,
                created.Title,
                false);

            Assert.Equal(UpdateOutcome.Updated, result.Outcome);
            Assert.NotNull(result.Item);

            Assert.False(result.Item.IsCompleted);
            Assert.Null(result.Item.CompletedAt);
        }

        [Fact]
        public void Update_CannotRenameCompletedTodo()
        {
            var (repository, _) = CreateRepository();

            var created = repository.Add("Original");

            repository.Update(
                created.Id,
                created.Title,
                true);

            var result = repository.Update(
                created.Id,
                "Changed",
                true);

            Assert.Equal(UpdateOutcome.Locked, result.Outcome);
            Assert.Null(result.Item);

            var stored = repository.Get(created.Id);

            Assert.Equal("Original", stored!.Title);
        }

        [Fact]
        public void Update_WhenTodoDoesNotExist_ReturnsNotFound()
        {
            var (repository, _) = CreateRepository();

            var result = repository.Update(
                999,
                "Missing",
                false);

            Assert.Equal(UpdateOutcome.NotFound, result.Outcome);
            Assert.Null(result.Item);
        }

        [Fact]
        public void Delete_RemovesTodo()
        {
            var (repository, _) = CreateRepository();

            var created = repository.Add("Delete me");

            var deleted = repository.Delete(created.Id);

            Assert.True(deleted);
            Assert.Null(repository.Get(created.Id));
        }

        [Fact]
        public void Delete_WhenTodoDoesNotExist_ReturnsFalse()
        {
            var (repository, _) = CreateRepository();

            var result = repository.Delete(999);

            Assert.False(result);
        }

        [Fact]
        public void ConcurrentAdds_ProduceUniqueSequentialIds()
        {
            var (repository, _) = CreateRepository();

            const int count = 500;

            var created = new ConcurrentBag<TodoItem>();

            Parallel.For(
                0,
                count,
                index =>
                {
                    created.Add(
                        repository.Add($"Todo {index}"));
                });

            Assert.Equal(count, created.Count);

            var ids = created
                .Select(todo => todo.Id)
                .OrderBy(id => id)
                .ToArray();

            Assert.Equal(
                Enumerable.Range(1, count),
                ids);
        }

        [Fact]
        public async Task ConcurrentUpdateAndDelete_NeverResurrectsDeletedTodo()
        {
            var (repository, _) = CreateRepository();

            var created = repository.Add("Original");

            using var barrier = new Barrier(2);

            TodoUpdateResult updateResult = default;
            var deleted = false;

            var updateTask = Task.Run(() =>
            {
                barrier.SignalAndWait();

                updateResult = repository.Update(
                    created.Id,
                    "Updated",
                    false);
            });

            var deleteTask = Task.Run(() =>
            {
                barrier.SignalAndWait();

                deleted = repository.Delete(created.Id);
            });

            await Task.WhenAll(
                updateTask,
                deleteTask);

            Assert.True(deleted);

            Assert.Null(
                repository.Get(created.Id));

            Assert.True(
                updateResult.Outcome is
                    UpdateOutcome.Updated or
                    UpdateOutcome.NotFound);
        }
    }
}