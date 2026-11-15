export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  /** The category's id, or null when uncategorized. Optional so older cached copies still load. */
  categoryId?: string | null;
  price: number;
  stock: number;
  sku: string;
};
