export interface BulkSellerItem {
  id: string;
  rowId: string | null;
  seller: string;
  itemName: string;
  priceLabel: string;
  priceAmount: string | null;
  currencyIconUrl: string | null;
  currencyIconAlt: string | null;
  itemKey: string;
}

export interface BulkSellerGroup {
  seller: string;
  total: number;
  items: BulkSellerItem[];
}
