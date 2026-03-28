using LagerApp.Models;

namespace LagerApp.Services;

public class ProductService : IProductService
{
    private const string ProductsKey = "lager_products";
    private readonly ILocalStorageService _storage;

    public ProductService(ILocalStorageService storage)
    {
        _storage = storage;
    }

    public async Task<List<Product>> GetAllAsync()
    {
        return await _storage.GetItemAsync<List<Product>>(ProductsKey) ?? new List<Product>();
    }

    public async Task<Product?> GetByIdAsync(string id)
    {
        var products = await GetAllAsync();
        return products.FirstOrDefault(p => p.Id == id);
    }

    public async Task<Product?> GetByBarcodeAsync(string barcode)
    {
        var products = await GetAllAsync();
        return products.FirstOrDefault(p =>
            p.Barcode == barcode || p.Sku.Equals(barcode, StringComparison.OrdinalIgnoreCase));
    }

    public async Task SaveAsync(Product product)
    {
        var products = await GetAllAsync();
        var existing = products.FindIndex(p => p.Id == product.Id);
        if (existing >= 0)
            products[existing] = product;
        else
            products.Add(product);
        await _storage.SetItemAsync(ProductsKey, products);
    }

    public async Task DeleteAsync(string id)
    {
        var products = await GetAllAsync();
        products.RemoveAll(p => p.Id == id);
        await _storage.SetItemAsync(ProductsKey, products);
    }
}
