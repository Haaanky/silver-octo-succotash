using LagerApp.Models;

namespace LagerApp.Services;

public interface IProductService
{
    Task<List<Product>> GetAllAsync();
    Task<Product?> GetByIdAsync(string id);
    Task<Product?> GetByBarcodeAsync(string barcode);
    Task SaveAsync(Product product);
    Task DeleteAsync(string id);
}
