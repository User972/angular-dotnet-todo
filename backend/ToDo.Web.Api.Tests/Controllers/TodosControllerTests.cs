using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System;
using System.Collections.Generic;
using System.Text;
using System.Timers;
using ToDo.Web.Api.Contracts;
using ToDo.Web.Api.Controllers;
using ToDo.Web.Api.Models;
using ToDo.Web.Api.Repositories;
using ToDo.Web.Api.Repositories.Interfaces;

namespace ToDo.Web.Api.Tests.Controllers
{


    public sealed class TodosControllerTests
    {
        private readonly Mock<ITodoRepository> _repository = new();

        private TodosController CreateController()
            => new(_repository.Object);

        private static TodoItem CreateTodo(
            int id = 1,
            string title = "Test todo",
            bool completed = false)
        {
            var createdAt =
                new DateTimeOffset(
                    2026, 10, 9,
                    5, 0, 0,
                    TimeSpan.Zero);

            return new TodoItem(
                id,
                title,
                createdAt,
                completed
                    ? createdAt.AddMinutes(5)
                    : null);
        }

        [Fact]
        public void GetAll_ReturnsTodosFromRepository()
        {
            var todos = new[]
            {
            CreateTodo(1, "First"),
            CreateTodo(2, "Second")
        };

            _repository
                .Setup(x => x.GetAll())
                .Returns(todos);

            var controller = CreateController();

            var result = controller.GetAll();

            Assert.Equal(2, result.Count);
            Assert.Equal("First", result[0].Title);
            Assert.Equal("Second", result[1].Title);

            _repository.Verify(
                x => x.GetAll(),
                Times.Once);
        }

        [Fact]
        public void Get_WhenTodoExists_ReturnsTodo()
        {
            var todo =
                CreateTodo(
                    id: 42,
                    title: "Existing");

            _repository
                .Setup(x => x.Get(42))
                .Returns(todo);

            var controller = CreateController();

            var result = controller.Get(42);

            Assert.NotNull(result.Value);
            Assert.Equal(todo, result.Value);

            _repository.Verify(
                x => x.Get(42),
                Times.Once);
        }

        [Fact]
        public void Get_WhenTodoDoesNotExist_Returns404()
        {
            _repository
                .Setup(x => x.Get(999))
                .Returns((TodoItem?)null);

            var controller = CreateController();

            var result = controller.Get(999);

            Assert.IsType<NotFoundResult>(
                result.Result);

            _repository.Verify(
                x => x.Get(999),
                Times.Once);
        }

        [Fact]
        public void Create_TrimsTitleBeforeSaving()
        {
            var created =
                CreateTodo(
                    id: 1,
                    title: "Write tests");

            _repository
                .Setup(x => x.Add("Write tests"))
                .Returns(created);

            var controller = CreateController();

            controller.Create(
                new CreateTodoRequest(
                    "   Write tests   "));

            _repository.Verify(
                x => x.Add("Write tests"),
                Times.Once);
        }

        [Fact]
        public void Create_ReturnsCreatedAtAction()
        {
            var created =
                CreateTodo(
                    id: 7,
                    title: "Write tests");

            _repository
                .Setup(x => x.Add("Write tests"))
                .Returns(created);

            var controller = CreateController();

            var result =
                controller.Create(
                    new CreateTodoRequest(
                        "Write tests"));

            var createdResult =
                Assert.IsType<CreatedAtActionResult>(
                    result.Result);

            Assert.Equal(
                nameof(TodosController.Get),
                createdResult.ActionName);

            Assert.Equal(
                7,
                createdResult.RouteValues!["id"]);

            Assert.Equal(
                created,
                createdResult.Value);
        }

        [Fact]
        public void Update_WhenSuccessful_ReturnsUpdatedTodo()
        {
            var updated =
                CreateTodo(
                    id: 1,
                    title: "Updated title");

            _repository
                .Setup(x => x.Update(
                    1,
                    "Updated title",
                    false))
                .Returns(
                    new TodoUpdateResult(
                        UpdateOutcome.Updated,
                        updated));

            var controller = CreateController();

            var result =
                controller.Update(
                    1,
                    new UpdateTodoRequest(
                        "Updated title",
                        false));

            Assert.NotNull(result.Value);
            Assert.Equal(updated, result.Value);

            _repository.Verify(
                x => x.Update(
                    1,
                    "Updated title",
                    false),
                Times.Once);
        }

        [Fact]
        public void Update_TrimsTitleBeforeSaving()
        {
            var updated =
                CreateTodo(
                    id: 1,
                    title: "Updated");

            _repository
                .Setup(x => x.Update(
                    1,
                    "Updated",
                    false))
                .Returns(
                    new TodoUpdateResult(
                        UpdateOutcome.Updated,
                        updated));

            var controller = CreateController();

            controller.Update(
                1,
                new UpdateTodoRequest(
                    "   Updated   ",
                    false));

            _repository.Verify(
                x => x.Update(
                    1,
                    "Updated",
                    false),
                Times.Once);
        }

        [Fact]
        public void Update_WhenTodoDoesNotExist_Returns404()
        {
            _repository
                .Setup(x => x.Update(
                    999,
                    "Missing",
                    false))
                .Returns(
                    new TodoUpdateResult(
                        UpdateOutcome.NotFound));

            var controller = CreateController();

            var result =
                controller.Update(
                    999,
                    new UpdateTodoRequest(
                        "Missing",
                        false));

            Assert.IsType<NotFoundResult>(
                result.Result);
        }

        [Fact]
        public void Update_WhenCompletedTodoIsRenamed_Returns409()
        {
            _repository
                .Setup(x => x.Update(
                    1,
                    "Changed",
                    true))
                .Returns(
                    new TodoUpdateResult(
                        UpdateOutcome.Locked));

            var controller = CreateController();

            var result =
                controller.Update(
                    1,
                    new UpdateTodoRequest(
                        "Changed",
                        true));

            var objectResult =
                Assert.IsType<ObjectResult>(
                    result.Result);

            Assert.Equal(
                StatusCodes.Status409Conflict,
                objectResult.StatusCode);

            var problem =
                Assert.IsType<ProblemDetails>(
                    objectResult.Value);

            Assert.Equal(
                StatusCodes.Status409Conflict,
                problem.Status);

            Assert.Equal(
                "A completed todo can't be renamed. Reopen it first.",
                problem.Title);
        }

        [Fact]
        public void Update_PassesCompletionStateToRepository()
        {
            var completed =
                CreateTodo(
                    id: 1,
                    title: "Finish tests",
                    completed: true);

            _repository
                .Setup(x => x.Update(
                    1,
                    "Finish tests",
                    true))
                .Returns(
                    new TodoUpdateResult(
                        UpdateOutcome.Updated,
                        completed));

            var controller = CreateController();

            controller.Update(
                1,
                new UpdateTodoRequest(
                    "Finish tests",
                    true));

            _repository.Verify(
                x => x.Update(
                    1,
                    "Finish tests",
                    true),
                Times.Once);
        }

        [Fact]
        public void Delete_WhenTodoExists_Returns204()
        {
            _repository
                .Setup(x => x.Delete(1))
                .Returns(true);

            var controller = CreateController();

            var result =
                controller.Delete(1);

            Assert.IsType<NoContentResult>(
                result);

            _repository.Verify(
                x => x.Delete(1),
                Times.Once);
        }

        [Fact]
        public void Delete_WhenTodoDoesNotExist_Returns404()
        {
            _repository
                .Setup(x => x.Delete(999))
                .Returns(false);

            var controller = CreateController();

            var result =
                controller.Delete(999);

            Assert.IsType<NotFoundResult>(
                result);

            _repository.Verify(
                x => x.Delete(999),
                Times.Once);
        }
    }
}