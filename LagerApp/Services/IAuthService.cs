using LagerApp.Models;

namespace LagerApp.Services;

public interface IAuthService
{
    Task<User?> GetCurrentUserAsync();
    Task<bool> LoginAsync(string email, string password);
    Task LogoutAsync();
    Task<bool> RegisterAsync(string email, string password, string role);
    Task SeedDefaultAdminAsync();
}
