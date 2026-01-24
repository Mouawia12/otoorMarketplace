import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useTranslation } from "react-i18next";

type Warehouse = {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  isDefault: boolean;
};

type Product = {
  id: number;
  name_ar?: string;
  name_en?: string;
  base_price?: number;
  stock_quantity?: number;
  seller_warehouse_id?: number | null;
};

export default function SellerWarehouseManagementPage() {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>("");
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWarehouses = async () => {
    try {
      const res = await api.get("/seller/warehouses");
      const list = res.data?.warehouses ?? [];
      setWarehouses(list);
      if (!sourceWarehouseId && list.length > 0) {
        setSourceWarehouseId(String(list[0].id));
      }
    } catch (_err) {
      setWarehouses([]);
    }
  };

  const loadProducts = async (warehouseId: string) => {
    if (!warehouseId) {
      setProducts([]);
      return;
    }
    try {
      setLoadingProducts(true);
      const res = await api.get("/seller/products", {
        params: { warehouse_id: warehouseId },
      });
      setProducts(res.data ?? []);
    } catch (_err) {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    setSelectedProductIds([]);
    setMessage(null);
    setError(null);
    loadProducts(sourceWarehouseId);
  }, [sourceWarehouseId]);

  const toggleProduct = (productId: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((product) => product.id));
    }
  };

  const canTransfer = useMemo(() => {
    return (
      sourceWarehouseId &&
      targetWarehouseId &&
      sourceWarehouseId !== targetWarehouseId &&
      selectedProductIds.length > 0
    );
  }, [sourceWarehouseId, targetWarehouseId, selectedProductIds]);

  const handleTransfer = async () => {
    if (!canTransfer) return;
    try {
      setMessage(null);
      setError(null);
      await api.post("/seller/warehouses/transfer-products", {
        source_warehouse_id: Number(sourceWarehouseId),
        target_warehouse_id: Number(targetWarehouseId),
        product_ids: selectedProductIds,
      });
      setMessage(t("seller.transferSuccess", "تم نقل المنتجات بنجاح"));
      setSelectedProductIds([]);
      await loadProducts(sourceWarehouseId);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t("common.error"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-lg font-semibold text-charcoal">
          {t("seller.warehouseManagementTitle", "إدارة المستودعات")}
        </h2>
        <p className="text-sm text-taupe mt-1">
          {t(
            "seller.warehouseManagementSubtitle",
            "عرض المنتجات حسب المستودع ونقلها بين المستودعات."
          )}
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.sourceWarehouse", "المستودع المصدر")}
            </label>
            <select
              value={sourceWarehouseId}
              onChange={(e) => setSourceWarehouseId(e.target.value)}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
            >
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.warehouseName} ({warehouse.warehouseCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.targetWarehouse", "المستودع الهدف")}
            </label>
            <select
              value={targetWarehouseId}
              onChange={(e) => setTargetWarehouseId(e.target.value)}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">
                {t("seller.selectWarehouse", "اختر المستودع")}
              </option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.warehouseName} ({warehouse.warehouseCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-sm text-charcoal underline hover:text-gold"
            disabled={products.length === 0}
          >
            {selectedProductIds.length === products.length
              ? t("seller.clearSelection", "إلغاء التحديد")
              : t("seller.selectAll", "تحديد الكل")}
          </button>
          <button
            type="button"
            onClick={handleTransfer}
            disabled={!canTransfer}
            className="bg-gold text-charcoal px-4 py-2 rounded-luxury text-sm font-semibold hover:bg-gold-hover transition disabled:opacity-60"
          >
            {t("seller.transferProducts", "نقل المنتجات")}
          </button>
          {message && <span className="text-sm text-green-600">{message}</span>}
          {error && <span className="text-sm text-alert">{error}</span>}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-charcoal">
            {t("seller.warehouseProducts", "منتجات المستودع")}
          </h3>
          {loadingProducts && (
            <span className="text-xs text-taupe">{t("common.loading")}</span>
          )}
        </div>
        {products.length === 0 ? (
          <p className="text-sm text-taupe mt-3">
            {t("seller.noProducts", "لا توجد منتجات في هذا المستودع")}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {products.map((product) => (
              <label
                key={product.id}
                className="flex items-center gap-3 border border-sand/70 rounded-xl px-3 py-3"
              >
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(product.id)}
                  onChange={() => toggleProduct(product.id)}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-charcoal">
                    {product.name_ar || product.name_en}
                  </p>
                  <p className="text-xs text-taupe">
                    #{product.id} · {product.base_price ?? 0} SAR · {t("seller.stock", "الكمية")}: {product.stock_quantity ?? 0}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
