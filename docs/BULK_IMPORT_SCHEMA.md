# Bulk Import Schema & Header Alias Reference

This document defines the canonical import schema, header alias mappings, data types, and derivation rules for the Intelligent Bulk Product Importer in the VC Organic Billing System.

---

## 1. Canonical Fields & Accepted Header Aliases

All incoming spreadsheet column names are normalized (BOM removed, non-alphanumeric stripped, lowercased) and matched against the following canonical fields:

| Canonical Field | Type | Required | Default Fallback | Accepted Header Aliases |
| :--- | :--- | :--- | :--- | :--- |
| **`productName`** | `string` | **Yes** | — | `productname`, `name`, `itemname`, `title`, `product`, `item`, `description`, `itemdescription`, `particulars`, `productservice`, `nameofitem`, `producttitle`, `itemdesc`, `item_name`, `product_name`, `item_description` |
| **`sku`** | `string` | No (Derived) | Derives from barcode | `sku`, `productsku`, `itemsku`, `skucode`, `itemcode`, `code`, `productcode`, `item_sku`, `product_sku`, `item_code` |
| **`barcode`** | `string` | No (Derived) | Derives from SKU or auto-generated `VC{timestamp}{i}` | `barcode`, `barcodenumber`, `upc`, `ean`, `gtin`, `bar_code`, `barcode_number`, `eancode`, `upccode`, `primarybarcode` |
| **`category`** | `string` | No | `"Dairy & Ghee"` | `category`, `categoryname`, `group`, `type`, `section`, `class`, `itemcategory`, `productcategory`, `category_name`, `item_category` |
| **`brand`** | `string` | No | `"VC Organic"` | `brand`, `brandname`, `company`, `manufacturer`, `make`, `brand_name` |
| **`supplier`** | `string` | No | `"Direct Farmer Market"` | `supplier`, `suppliername`, `vendor`, `source`, `distributor`, `supplier_name` |
| **`type`** | `string` (`OWN` / `EXTERNAL`) | No | `"OWN"` | `producttype`, `ownexternal`, `ownership`, `itemtype`, `type` |
| **`unit`** | `string` | No | `"1 Unit"` | `unit`, `uom`, `pack`, `packaging`, `measure`, `size`, `package`, `packsize` |
| **`weight`** | `number` | No | `0` | `weight`, `volume`, `netweight`, `quantityperpack`, `netweightvolume` |
| **`weightUnit`** | `string` | No | `"g"` | `weightunit`, `volumeunit`, `measurementunit` |
| **`purchasePrice`** | `number` | **Yes** | `0` | `purchaseprice`, `buyingprice`, `costprice`, `cost`, `buying`, `cp`, `unitcost`, `purchase`, `wholesale`, `wholesaleprice`, `purchase_price`, `buying_price`, `cost_price` |
| **`sellingPrice`** | `number` | **Yes** | `0` | `sellingprice`, `saleprice`, `retailprice`, `price`, `mrp`, `sp`, `rate`, `retail`, `selling`, `selling_price`, `sale_price`, `retail_price`, `unitprice` |
| **`mrp`** | `number` | No | Derives from `sellingPrice` | `mrp`, `maximumretailprice`, `maxprice`, `listprice` |
| **`gst`** | `number` (`0, 5, 12, 18, 28`) | No | `5` | `gst`, `gstslab`, `tax`, `vat`, `taxrate`, `gstrate`, `gst_rate`, `tax_rate` |
| **`openingStock`** | `number` | No | `0` | `openingstock`, `stock`, `initialstock`, `qty`, `quantity`, `count`, `onhand`, `initialquantity`, `opening_stock`, `initial_stock` |
| **`store`** | `string` | No | Target Selected Store | `store`, `location`, `outlet`, `locationid`, `storeid`, `branch`, `store_name`, `location_name`, `outlet_name` |
| **`reorderLevel`** | `number` | No | `10` | `reorderlevel`, `reorder`, `minstock`, `safety`, `threshold`, `min_stock` |
| **`maxStock`** | `number` | No | `100` | `maxstock`, `limit`, `maxcapacity`, `max_stock` |
| **`dom`** | `string` (`YYYY-MM-DD`) | No | Current Date | `dom`, `mfgdate`, `manufacturingdate`, `mfg`, `dateofmfg`, `mfg_date` |
| **`doe`** | `string` (`YYYY-MM-DD`) | No | `""` | `doe`, `expiry`, `expdate`, `expirydate`, `useby`, `exp_date` |
| **`imageUrl`** | `string` | No | `"/uploads/system/default-product.webp"` | `imageurl`, `image`, `imagepath`, `productimage`, `picture`, `photo`, `image_url` |
| **`description`** | `string` | No | `""` | `longdescription`, `details`, `notes`, `remarks`, `productdetails` |
| **`sellingMode`** | `string` (`packaged` / `loose`) | No | `"packaged"` | `sellingmode`, `mode`, `weightmode`, `selling_mode` |

---

## 2. Product Master vs Authoritative Inventory

* **Product Master Document**:
  * Stored in `products` collection.
  * Contains immutable identifiers (`id`, `sku`, `barcode`), metadata (`name`, `category`, `brand`), catalog pricing (`purchasePrice`, `sellingPrice`, `mrp`, `gst`), and configuration.
  * **Does NOT hold authoritative store balances.**
* **Inventory & Ledger**:
  * Opening stock quantities (`openingStock > 0`) are allocated to specific store locations (`locationId`) via `inventoryService.addStockBatch()`.
  * Every opening stock write generates an immutable movement entry in `inventory_ledger` with type `OPENING_STOCK` and reference `IMPORT:<importId>`.
