using LagerApp.Models;

namespace LagerApp.Services;

public class TransactionService : ITransactionService
{
    private const string TransactionsKey = "lager_transactions";
    private readonly ILocalStorageService _storage;
    private readonly IProductService _productService;

    public TransactionService(ILocalStorageService storage, IProductService productService)
    {
        _storage = storage;
        _productService = productService;
    }

    public async Task<List<StockTransaction>> GetAllAsync()
    {
        var txs = await _storage.GetItemAsync<List<StockTransaction>>(TransactionsKey) ?? new List<StockTransaction>();
        return txs.OrderByDescending(t => t.Timestamp).ToList();
    }

    public async Task<List<StockTransaction>> GetByProductAsync(string productId)
    {
        var txs = await GetAllAsync();
        return txs.Where(t => t.ProductId == productId).ToList();
    }

    public async Task RegisterAsync(string productId, string type, int quantity, string userId)
    {
        var product = await _productService.GetByIdAsync(productId)
            ?? throw new InvalidOperationException("Product not found");

        var tx = new StockTransaction
        {
            ProductId = productId,
            Type = type,
            Quantity = quantity,
            Timestamp = DateTime.UtcNow.ToString("O"),
            UserId = userId
        };

        if (type == "in")
            product.CurrentStock += quantity;
        else
            product.CurrentStock = Math.Max(0, product.CurrentStock - quantity);

        await _productService.SaveAsync(product);

        var txs = await _storage.GetItemAsync<List<StockTransaction>>(TransactionsKey) ?? new List<StockTransaction>();
        txs.Add(tx);
        await _storage.SetItemAsync(TransactionsKey, txs);
    }
}
