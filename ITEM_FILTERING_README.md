# Item Filtering System - Cartuno Backend

## Overview

The enhanced item filtering system allows clients to filter items using JSON body instead of query parameters, providing more flexibility and better handling of complex filter criteria.

## Key Changes

### 1. **Endpoint Change**
- **Old**: `GET /items` (with query parameters)
- **New**: `POST /items/filter` (with JSON body)

### 2. **Filter Structure**
Filters are now sent as a JSON object where each key represents a filter category and values are arrays of filter options.

## API Endpoints

### Main Filtering Endpoint
```
POST /api/items/filter
```

### Other Available Endpoints
- `GET /api/items/search` - Text search with query parameters
- `GET /api/items/price-range` - Price range filtering
- `GET /api/items/discounted` - Get discounted items
- `GET /api/items/filters/available` - Get available filter options

## Request Body Structure

### Basic Structure
```json
{
  "page": 1,
  "limit": 20,
  "sortBy": "createdAt",
  "sortOrder": -1,
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "subcategoryId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "minPrice": 50,
  "maxPrice": 500,
  "hasDiscount": true,
  "search": "cotton shirt",
  "filters": {
    "brand": ["Nike", "Adidas"],
    "color": ["blue", "black"],
    "size": ["M", "L", "XL"]
  }
}
```

### Field Descriptions

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `page` | number | Page number for pagination | 1 |
| `limit` | number | Items per page | 10 |
| `sortBy` | string | Field to sort by | "createdAt" |
| `sortOrder` | number | Sort order (1: ascending, -1: descending) | -1 |
| `categoryId` | string | Filter by category ID | null |
| `subcategoryId` | string | Filter by subcategory ID | null |
| `minPrice` | number | Minimum price filter | null |
| `maxPrice` | number | Maximum price filter | null |
| `hasDiscount` | boolean | Filter items with discounts | false |
| `search` | string | Text search in name/description | null |
| `filters` | object | Key-value pairs for custom filtering | {} |

### Filter Structure
```json
"filters": {
  "filterKey1": ["value1", "value2"],
  "filterKey2": ["value3"],
  "filterKey3": ["value4", "value5", "value6"]
}
```

## Common Filter Keys

### Brand & Style
- `brand`: ["Nike", "Adidas", "Puma"]
- `style`: ["casual", "formal", "sports"]
- `material`: ["cotton", "polyester", "wool"]

### Physical Attributes
- `color`: ["red", "blue", "black", "white"]
- `size`: ["S", "M", "L", "XL", "XXL"]
- `fit`: ["regular", "slim", "loose"]
- `pattern`: ["solid", "striped", "printed"]

### Demographics
- `gender`: ["men", "women", "unisex"]
- `age_group`: ["kids", "teen", "adult"]
- `occasion`: ["casual", "formal", "party"]

### Business Logic
- `availability`: ["in_stock", "low_stock", "out_of_stock"]
- `trending`: ["true", "false"]
- `featured`: ["true", "false"]
- `new_arrival`: ["true", "false"]

## Usage Examples

### 1. Get All Items (No Filters)
```json
{
  "page": 1,
  "limit": 20,
  "sortBy": "createdAt",
  "sortOrder": -1
}
```

### 2. Basic Category Filtering
```json
{
  "page": 1,
  "limit": 15,
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "subcategoryId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "sortBy": "name",
  "sortOrder": 1
}
```

### 3. Price Range with Discounts
```json
{
  "page": 1,
  "limit": 25,
  "minPrice": 50,
  "maxPrice": 200,
  "hasDiscount": true,
  "sortBy": "price",
  "sortOrder": 1
}
```

### 4. Search with Multiple Filters
```json
{
  "page": 1,
  "limit": 20,
  "search": "cotton shirt",
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "filters": {
    "brand": ["Nike", "Adidas"],
    "size": ["M", "L", "XL"],
    "color": ["blue", "black"]
  }
}
```

### 5. Complex Multi-Filter
```json
{
  "page": 1,
  "limit": 30,
  "sortBy": "price",
  "sortOrder": -1,
  "minPrice": 100,
  "maxPrice": 500,
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "hasDiscount": true,
  "filters": {
    "brand": ["Nike", "Adidas", "Puma"],
    "material": ["cotton", "polyester"],
    "size": ["S", "M", "L", "XL"],
    "color": ["blue", "black", "white", "red"],
    "style": ["casual", "sports"],
    "season": ["summer", "winter"],
    "fit": ["regular", "slim"],
    "pattern": ["solid", "striped"],
    "sleeve": ["short", "long"],
    "neckline": ["round", "v-neck"]
  }
}
```

## Response Structure

### Success Response
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Items retrieved successfully",
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 125,
      "itemsPerPage": 25
    },
    "filters": {
      "brand": ["Nike"],
      "color": ["blue"]
    }
  }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Filter values for 'brand' must be a non-empty array"
}
```

## Validation Rules

1. **Filter Values**: Must be non-empty arrays
2. **Filter Values Content**: Each value must be a non-empty string
3. **Price Range**: minPrice must be less than maxPrice
4. **Pagination**: page and limit must be positive integers
5. **Sort Order**: Must be 1 (ascending) or -1 (descending)

## Performance Considerations

1. **Indexing**: Database indexes are created on filter keys and values
2. **Pagination**: Always use pagination to limit result sets
3. **Filter Complexity**: More filters = more complex queries
4. **Caching**: Consider caching frequently used filter combinations

## Migration Guide

### From Query Parameters to JSON Body

**Old Way (Query Parameters):**
```
GET /api/items?brand=Nike&color=blue&size=M&page=1&limit=20
```

**New Way (JSON Body):**
```json
POST /api/items/filter
{
  "page": 1,
  "limit": 20,
  "filters": {
    "brand": ["Nike"],
    "color": ["blue"],
    "size": ["M"]
  }
}
```

### Benefits of New Approach

1. **Better Structure**: Organized filter hierarchy
2. **Multiple Values**: Support for multiple filter values per key
3. **Complex Queries**: Easier to handle complex filter combinations
4. **Validation**: Better input validation and error handling
5. **Extensibility**: Easy to add new filter types

## Testing

Use the provided Postman collection (`item-filtering-postman.json`) to test all endpoints and filter combinations.

### Test Scenarios

1. **No Filters**: Verify initial page load
2. **Single Filter**: Test individual filter keys
3. **Multiple Filters**: Test filter combinations
4. **Price Range**: Test price filtering
5. **Search + Filters**: Test search with filters
6. **Pagination**: Test pagination with filters
7. **Sorting**: Test different sort options
8. **Edge Cases**: Test invalid filter values

## Support

For questions or issues with the filtering system, refer to:
- API documentation
- Demo examples in `item-filtering-demo.json`
- Postman collection for testing
- Backend logs for debugging
