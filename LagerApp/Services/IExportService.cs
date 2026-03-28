using LagerApp.Models;

namespace LagerApp.Services;

public interface IExportService
{
    string GenerateCsv(List<StockTransaction> transactions, List<Product> products);
    string GenerateJson(List<StockTransaction> transactions, List<Product> products);
    Task DownloadFileAsync(string filename, string content, string mimeType);
}
