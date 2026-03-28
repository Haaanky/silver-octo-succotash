using LagerApp.Models;
using Microsoft.JSInterop;
using System.Text;
using System.Text.Json;

namespace LagerApp.Services;

public class ExportService : IExportService
{
    private readonly IJSRuntime _js;

    public ExportService(IJSRuntime js)
    {
        _js = js;
    }

    public string GenerateCsv(List<StockTransaction> transactions, List<Product> products)
    {
        var productMap = products.ToDictionary(p => p.Id, p => p.Name);
        var sb = new StringBuilder();
        sb.AppendLine("Id,ProductId,ProductName,Type,Quantity,Timestamp,UserId");

        foreach (var tx in transactions)
        {
            var productName = productMap.TryGetValue(tx.ProductId, out var name) ? name : tx.ProductId;
            sb.AppendLine($"{tx.Id},{tx.ProductId},{EscapeCsv(productName)},{tx.Type},{tx.Quantity},{tx.Timestamp},{tx.UserId}");
        }

        return sb.ToString();
    }

    public string GenerateJson(List<StockTransaction> transactions, List<Product> products)
    {
        var export = new { products, transactions };
        return JsonSerializer.Serialize(export, new JsonSerializerOptions { WriteIndented = true });
    }

    public async Task DownloadFileAsync(string filename, string content, string mimeType)
    {
        await _js.InvokeVoidAsync("lagerExport.downloadFile", filename, content, mimeType);
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}
