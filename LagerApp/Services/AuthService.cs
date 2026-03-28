using LagerApp.Models;
using System.Security.Cryptography;
using System.Text;

namespace LagerApp.Services;

public class AuthService : IAuthService
{
    private const string UsersKey = "lager_users";
    private const string CurrentUserKey = "lager_current_user";

    private readonly ILocalStorageService _storage;

    public AuthService(ILocalStorageService storage)
    {
        _storage = storage;
    }

    public async Task<User?> GetCurrentUserAsync()
    {
        return await _storage.GetItemAsync<User>(CurrentUserKey);
    }

    public async Task<bool> LoginAsync(string email, string password)
    {
        var users = await _storage.GetItemAsync<List<User>>(UsersKey) ?? new List<User>();
        var hash = HashPassword(password);
        var user = users.FirstOrDefault(u =>
            u.Email.Equals(email, StringComparison.OrdinalIgnoreCase) &&
            u.PasswordHash == hash);

        if (user is null) return false;

        await _storage.SetItemAsync(CurrentUserKey, user);
        return true;
    }

    public async Task LogoutAsync()
    {
        await _storage.RemoveItemAsync(CurrentUserKey);
    }

    public async Task<bool> RegisterAsync(string email, string password, string role)
    {
        var users = await _storage.GetItemAsync<List<User>>(UsersKey) ?? new List<User>();
        if (users.Any(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase)))
            return false;

        users.Add(new User
        {
            Email = email,
            Role = role,
            PasswordHash = HashPassword(password)
        });

        await _storage.SetItemAsync(UsersKey, users);
        return true;
    }

    public async Task SeedDefaultAdminAsync()
    {
        var users = await _storage.GetItemAsync<List<User>>(UsersKey) ?? new List<User>();
        if (!users.Any())
        {
            users.Add(new User
            {
                Email = "admin@lager.se",
                Role = "admin",
                PasswordHash = HashPassword("admin123")
            });
            await _storage.SetItemAsync(UsersKey, users);
        }
    }

    private static string HashPassword(string password)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
