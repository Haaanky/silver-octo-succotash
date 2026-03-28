namespace LagerApp.Models;

public class User
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = "worker"; // "admin" | "worker"
    public string PasswordHash { get; set; } = string.Empty;

    public bool IsAdmin => Role == "admin";
}
