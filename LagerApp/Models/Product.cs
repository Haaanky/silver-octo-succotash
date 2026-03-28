namespace LagerApp.Models;

public class Product
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty;
    public string Unit { get; set; } = "st";
    public int MinStock { get; set; } = 0;
    public int CurrentStock { get; set; } = 0;

    public bool IsLowStock => CurrentStock <= MinStock;
}
