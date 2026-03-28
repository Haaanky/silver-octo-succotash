namespace LagerApp.Models;

public class StockTransaction
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ProductId { get; set; } = string.Empty;
    public string Type { get; set; } = "in"; // "in" | "out"
    public int Quantity { get; set; }
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("O");
    public string UserId { get; set; } = string.Empty;
}
