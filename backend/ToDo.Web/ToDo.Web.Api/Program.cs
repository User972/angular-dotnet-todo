using ToDo.Web.Api.Controllers;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var cors = builder.Configuration.GetSection("Cors");
var allowedOrigins = cors.GetSection("AllowedOrigins").Get<string[]>() ?? [];
var allowAnyLocalhost = cors.GetValue<bool>("AllowAnyLocalhost");
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .SetIsOriginAllowed(origin =>
        allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase)
        || (allowAnyLocalhost && Uri.TryCreate(origin, UriKind.Absolute, out var uri) && uri.IsLoopback))
    .WithMethods(HttpMethods.Get, HttpMethods.Post, HttpMethods.Put, HttpMethods.Delete)
    .WithHeaders("Content-Type")));

builder.Services.AddSingleton(TimeProvider.System);
// One shared store for the app's lifetime; InMemoryTodoRepository is safe for concurrent requests.
builder.Services.AddSingleton<ITodoRepository, InMemoryTodoRepository>();
var app = builder.Build();

app.UseCors();
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
