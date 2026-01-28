# Torod (طرود) API — Integration README (Full Endpoint Index)

> هذا الملف مرجع داخلي داخل المشروع لربط **Torod (طرود)** بشكل صحيح، خصوصًا في أنظمة **Marketplace / Multi‑Warehouse**.  
> يعتمد فهرس الـ Endpoints على توثيق Torod على Postman (الأكثر تفصيلاً عمليًا).

## 1) Environments

> استخدم متغير واحد في الكود: `BASE_URL`

```text
# Stage / Sandbox
BASE_URL = https://demo.stage.torod.co/en/api/

# Production / Live
BASE_URL = https://torod.co/en/api/
```

## 2) Authentication

### 2.1 Get Token
- **POST** `{{BASE_URL}}token`
- **Body**: `form-data`
  - `client_id`
  - `client_secret`
- **Response**: Access Token
- **Usage**: أرسل التوكن في كل الطلبات التالية:

```http
Authorization: Bearer <TOKEN>
Accept: application/json
```

---

## 3) Core Rules (قواعد لازم تتثبت في المنطق)

### 3.1 قاعدة Torod الذهبية
> **كل شحنة = مستودع واحد (Warehouse واحد فقط)**  
لا يمكن دمج أكثر من مستودع في بوليصة واحدة حتى لو نفس الحي/المدينة.

### 3.2 Marketplace الصحيح
- التقسيم عند Checkout/Shipping يكون **Warehouse-first** (حسب المستودع).
- التجميع مسموح فقط إذا كانت العناصر من **نفس المستودع**.

---

## 4) Endpoints Index (فهرس كامل حسب Postman)

> كل المسارات أدناه تُكتب على شكل: `{{BASE_URL}}<path>`

### 4.1 Auth
- **POST** `token` — Get Token

### 4.2 Locations / Geo
- **GET** `get-all/countries`
- **GET** `get-all/regions?country_id={id}`
- **GET** `get-all/regions-access`
- **GET** `get-all/cities?region_id={id}`
- **GET** `get-all/cities-access`
- **GET** `get-all/districts?cities_id={id}`

### 4.3 Address / Warehouse
- **POST** `get-address-details`
- **POST** `get-latlong-details`
- **POST** `create/address`
- **GET**  `address-list`
- **POST** `get-single-address-details`
- **POST** `update/address`
- **POST** `address-wise-carriers` — Enable/Disable carriers per address

### 4.4 Orders
- **POST** `order/create`
- **GET**  `order/list`
- **POST** `order/details`
- **POST** `order/update`
- **POST** `order/bulk-update`
- **POST** `order/cancel` ✅

### 4.5 Courier Partners / Carriers
- **GET**  `get-all-courier-partners`
- **POST** `courier-partners-by-city-ids`
- **POST** `courier-partners-list`
- **POST** `order/courier-partners-list`
- **POST** `order/courier-partners` (قد يظهر في بعض الإصدارات كـ “Order Courier Partners List” في Postman)

### 4.6 Shipping / Shipments
- **POST** `order/ship-process`
- **GET**  `shipments/list`
- **POST** `shipment/details`
- **POST** `order/track` — Shipment / Order Track
- **POST** `shipment/order/cancel` ✅ (Cancel & Refund)

### 4.7 Returns
- **GET**  `return/type/data`
- **POST** `order/return-request`
- **POST** `order/return-request/accept-reject`

### 4.8 Payments / Wallet
- **POST** `get-payment-link`
- **GET**  `get-wallet-balance`

---

## 5) Key Payload Notes (مختصر عملي)

### 5.1 Create Address — أهم الحقول (form-data)
- `warehouse_name`
- `warehouse` (Warehouse Code: alphanumeric مثل ABC001)
- `contact_name`
- `phone_number`
- `email`
- `type` (normal / latlong / address / address_city)
- قيم المدينة/الحي/الإحداثيات حسب `type`

### 5.2 Tracking
- `POST order/track` غالبًا يحتاج body فيه `order_id` أو `shipment_id` (حسب التوثيق داخل Postman request نفسه).

### 5.3 Cancel
- `POST order/cancel` لإلغاء Order داخل Torod (قد يرفض حسب الحالة).
- `POST shipment/order/cancel` لإلغاء الشحنة/الطلب على مستوى الشحن + Refund حسب سياسة Torod.

---

## 6) Marketplace Checkout (تصميم موصى به داخل مشروعنا)

### 6.1 Grouping (Warehouse-first)
- Group السلة حسب `sellerWarehouseId`
- إذا المنتج بدون `sellerWarehouseId`:
  - استخدم default warehouse للبائع (resolveSellerWarehouse)
  - إن لم يوجد default → امنع الطلب برسالة واضحة

### 6.2 Shipping Options API (داخل مشروعنا)
- رجّع `groups[]` وكل group فيه `partners[]`
- احسب:
  - `common_partners` (تقاطع كامل)
  - `partner_coverage` (مين يغطي أي groups)

### 6.3 UI Rules (A/B/C)
- A: `common_partners.length > 0` → اختيار موحد
- B: تقاطع جزئي → تنبيه + زر اختيار متقدم
- C: لا تقاطع → اختيار شركة لكل شحنة

---

## 7) Official References
```text
Torod docs (Stoplight): https://docs.torod.co/
Torod Postman Documentation: https://www.postman.com/torod-team/documentation/19185564-5a513d8c-a517-4284-8119-1310fbece124
```

---

## Change Log
- v3: Full endpoint index + cancel endpoints + returns + wallet/payment endpoints.
