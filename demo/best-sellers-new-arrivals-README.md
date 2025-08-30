# Best Sellers & New Arrivals APIs Documentation

## Overview
This document provides comprehensive documentation for the Best Sellers and New Arrivals APIs, including Postman configuration and usage examples.

## API Endpoints

### 🚀 Item APIs (`/api/items/`)

#### 1. Get Best Sellers
**Endpoint:** `GET /api/items/best-sellers`

**Description:** Retrieves best-selling items based on order data and sales statistics.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | Integer | 10 | Number of items to return |
| `days` | Integer | 30 | Date range in days for calculating best sellers |
| `categoryId` | String | - | Filter by specific category ID (MongoDB ObjectId) |
| `subcategoryId` | String | - | Filter by specific subcategory ID (MongoDB ObjectId) |

**Example Request:**
```
GET /api/items/best-sellers?limit=10&days=30&categoryId=64a1b2c3d4e5f678901234a
```

**Response Format:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Best sellers retrieved successfully",
  "data": {
    "items": [
      {
        "_id": "64a1b2c3d4e5f6789012345",
        "name": "Premium Cotton T-Shirt",
        "description": "High-quality cotton t-shirt",
        "price": 299,
        "discountPrice": 249,
        "discountPercentage": 0,
        "thumbnailImage": "https://example.com/image.jpg",
        "categoryId": {
          "_id": "64a1b2c3d4e5f678901234a",
          "name": "Clothing"
        },
        "subcategoryId": {
          "_id": "64a1b2c3d4e5f678901234b",
          "name": "T-Shirts"
        },
        "variants": [...],
        "salesStats": {
          "totalQuantitySold": 125,
          "totalRevenue": 31125,
          "orderCount": 89
        },
        "finalPrice": 249,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:45:00.000Z"
      }
    ],
    "count": 1,
    "dateRange": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.999Z",
      "days": 30
    }
  }
}
```

#### 2. Get New Arrivals
**Endpoint:** `GET /api/items/new-arrivals`

**Description:** Retrieves recently added items sorted by creation date.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | Integer | 10 | Number of items to return |
| `days` | Integer | 7 | Date range in days for new arrivals |
| `categoryId` | String | - | Filter by specific category ID (MongoDB ObjectId) |
| `subcategoryId` | String | - | Filter by specific subcategory ID (MongoDB ObjectId) |

**Example Request:**
```
GET /api/items/new-arrivals?limit=8&days=14&subcategoryId=64a1b2c3d4e5f678901234b
```

**Response Format:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "New arrivals retrieved successfully",
  "data": {
    "items": [
      {
        "_id": "64a1b2c3d4e5f6789012346",
        "name": "Latest Fashion Jacket",
        "description": "Trendy jacket for the season",
        "price": 899,
        "discountPrice": 0,
        "discountPercentage": 15,
        "thumbnailImage": "https://example.com/jacket.jpg",
        "categoryId": {
          "_id": "64a1b2c3d4e5f678901234a",
          "name": "Clothing"
        },
        "subcategoryId": {
          "_id": "64a1b2c3d4e5f678901234c",
          "name": "Jackets"
        },
        "variants": [...],
        "finalPrice": 764.15,
        "isNew": true,
        "daysOld": 2,
        "createdAt": "2024-01-29T08:15:00.000Z",
        "updatedAt": "2024-01-29T08:15:00.000Z"
      }
    ],
    "count": 1,
    "dateRange": {
      "startDate": "2024-01-24T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.999Z",
      "days": 7
    }
  }
}
```

### 🏠 Homepage APIs (`/api/homepage/`)

#### 3. Get Homepage Best Sellers
**Endpoint:** `GET /api/homepage/best-sellers`

**Description:** Retrieves best sellers with homepage banners for homepage display.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | Integer | 8 | Number of items to return |

**Example Request:**
```
GET /api/homepage/best-sellers?limit=8
```

**Response Format:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Homepage best sellers retrieved successfully",
  "data": {
    "bestSellers": [...],
    "banners": {
      "hero": [
        "https://example.com/hero-banner1.jpg",
        "https://example.com/hero-banner2.jpg"
      ],
      "promotional": [
        "https://example.com/promo-banner.jpg"
      ]
    },
    "count": 8
  }
}
```

#### 4. Get Homepage New Arrivals
**Endpoint:** `GET /api/homepage/new-arrivals`

**Description:** Retrieves new arrivals with homepage banners for homepage display.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | Integer | 8 | Number of items to return |

**Example Request:**
```
GET /api/homepage/new-arrivals?limit=8
```

**Response Format:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Homepage new arrivals retrieved successfully",
  "data": {
    "newArrivals": [...],
    "banners": {
      "hero": [
        "https://example.com/hero-banner1.jpg",
        "https://example.com/hero-banner2.jpg"
      ],
      "promotional": [
        "https://example.com/promo-banner.jpg"
      ]
    },
    "count": 8
  }
}
```

## Postman Configuration

### Import Collection
1. Open Postman
2. Click "Import" button
3. Select the file: `cartunoBackend/demo/best-sellers-new-arrivals-postman.json`
4. The collection will be imported with all endpoints and examples

### Environment Variables
The collection uses the following variable:
- `baseUrl`: Set to `http://localhost:3000/api` (modify as needed for your environment)

### Pre-configured Requests
The collection includes:
- ✅ **4 Main API endpoints** with example parameters
- ✅ **Sample responses** for each endpoint
- ✅ **Test scenarios** including edge cases
- ✅ **Automatic response validation** tests
- ✅ **Parameterized requests** for easy testing

### Test Scenarios Included
1. **Basic functionality tests** - Normal API calls
2. **Filtering tests** - Category and subcategory filtering
3. **Edge case tests** - Empty results, invalid parameters
4. **Performance tests** - Response time validation

## Usage Examples

### Frontend Integration

#### React/JavaScript Example
```javascript
// Fetch best sellers
const fetchBestSellers = async () => {
  try {
    const response = await fetch('/api/items/best-sellers?limit=10&days=30');
    const data = await response.json();
    
    if (data.success) {
      setBestSellers(data.data.items);
    }
  } catch (error) {
    console.error('Error fetching best sellers:', error);
  }
};

// Fetch new arrivals with category filter
const fetchNewArrivals = async (categoryId) => {
  try {
    const url = categoryId 
      ? `/api/items/new-arrivals?limit=8&categoryId=${categoryId}`
      : '/api/items/new-arrivals?limit=8';
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      setNewArrivals(data.data.items);
    }
  } catch (error) {
    console.error('Error fetching new arrivals:', error);
  }
};

// Fetch homepage data with banners
const fetchHomepageData = async () => {
  try {
    const [bestSellersRes, newArrivalsRes] = await Promise.all([
      fetch('/api/homepage/best-sellers'),
      fetch('/api/homepage/new-arrivals')
    ]);
    
    const bestSellersData = await bestSellersRes.json();
    const newArrivalsData = await newArrivalsRes.json();
    
    if (bestSellersData.success) {
      setBestSellers(bestSellersData.data.bestSellers);
      setBanners(bestSellersData.data.banners);
    }
    
    if (newArrivalsData.success) {
      setNewArrivals(newArrivalsData.data.newArrivals);
    }
  } catch (error) {
    console.error('Error fetching homepage data:', error);
  }
};
```

## Error Handling

### Common Error Responses
```json
{
  "statusCode": 500,
  "success": false,
  "message": "Failed to retrieve best sellers",
  "error": "Database connection error"
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `500` - Internal Server Error

## Performance Notes

### Database Optimization
- Uses MongoDB aggregation for efficient best seller calculation
- Indexed queries for fast category/subcategory filtering
- Optimized date range queries

### Caching Recommendations
- Consider caching best sellers data (updates every few hours)
- Cache new arrivals for shorter periods (updates more frequently)
- Homepage APIs ideal for CDN caching

## Testing Checklist

### Manual Testing
- [ ] Test all endpoints with default parameters
- [ ] Test with different limit values (1, 10, 50)
- [ ] Test with different date ranges (1, 7, 30, 90 days)
- [ ] Test category and subcategory filtering
- [ ] Test with invalid ObjectId formats
- [ ] Test with non-existent category/subcategory IDs
- [ ] Verify response times are acceptable
- [ ] Check response data structure matches documentation

### Automated Testing
- [ ] Import Postman collection
- [ ] Run all requests in collection
- [ ] Verify all tests pass
- [ ] Check response validation tests
- [ ] Test edge cases and error scenarios

## Support

For issues or questions regarding these APIs:
1. Check the error response for specific details
2. Verify your request parameters match the documentation
3. Ensure your MongoDB has sample order and item data
4. Check server logs for detailed error information

---

**Note:** Make sure your database has sample data for testing. You can use the seed script to populate test data if needed.
