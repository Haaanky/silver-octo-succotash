using LagerApp.Models;

namespace LagerApp.Services;

public interface ITransactionService
{
    Task<List<StockTransaction>> GetAllAsync();
    Task<List<StockTransaction>> GetByProductAsync(string productId);
    Task RegisterAsync(string productId, string type, int quantity, string userId);
}
