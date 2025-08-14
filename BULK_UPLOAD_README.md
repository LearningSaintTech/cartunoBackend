# Bulk Upload API for Items

This API allows you to upload multiple items at once using a JSON file and associated images.

## Endpoint

```
POST /api/items/bulk-upload
```

**Authentication Required:** Admin only

## Request Format

The request should be a `multipart/form-data` with the following fields:

1. **`jsonFile`** (required): A JSON file containing an array of items
2. **`images`** (optional): Up to 25 image files

## JSON File Structure

The JSON file should contain an array of item objects. Each item object should follow this structure:

```json
{
  "name": "Item Name",
  "description": "Item description",
  "price": 99.99,
  "discountPrice": 79.99,
  "discountPercentage": 20,
  "thumbnailImageKey": "thumbnail.jpg",
  "keyHighlights": [
    {
      "key": "Material",
      "value": "Premium cotton"
    }
  ],
  "variants": [
    {
      "size": "M",
      "colors": [
        {
          "name": "Blue",
          "hexCode": "#0000FF",
          "imageKeys": ["blue-front.jpg", "blue-back.jpg", "blue-side.jpg"],
          "sku": "ITEM1-M-BLUE",
          "stock": 50
        }
      ]
    }
  ]
}
```

### Field Descriptions

#### Required Fields
- **`name`**: Item name (max 200 characters)
- **`price`**: Item price (must be positive number)

#### Optional Fields
- **`description`**: Item description (max 2000 characters)
- **`discountPrice`**: Discounted price (must be less than original price)
- **`discountPercentage`**: Discount percentage (0-100)
- **`thumbnailImageKey`**: Filename of the image to use as thumbnail
- **`keyHighlights`**: Array of key-value pairs for item highlights
- **`variants`**: Array of size variants with color options

#### Variant Structure
- **`size`**: Size name (e.g., "S", "M", "L", "XL")
- **`colors`**: Array of color variants

#### Color Structure
- **`name`**: Color name (e.g., "Blue", "Red", "Black")
- **`hexCode`**: Color hex code (optional, format: #RRGGBB or #RGB)
- **`imageKeys`**: Array of image filenames for this color variant
- **`sku`**: Stock Keeping Unit (must be unique across all items)
- **`stock`**: Available stock quantity (default: 0)

## Image Handling

### Thumbnail Images
- Use `thumbnailImageKey` to specify which uploaded image should be the thumbnail
- The key corresponds to the filename of the uploaded image
- If `thumbnailImageKey` is not provided, you can use `thumbnailImage` with a direct URL

### Variant Images
- Use `imageKeys` array to specify which uploaded images belong to each color variant
- Maximum 5 images per color variant
- Images are automatically limited to 5 per color if more are specified

## Example Usage

### cURL Example

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "jsonFile=@items.json" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg" \
  http://localhost:3000/api/items/bulk-upload
```

### JavaScript Example

```javascript
const formData = new FormData();
formData.append('jsonFile', jsonFile);
formData.append('images', image1);
formData.append('images', image2);
formData.append('images', image3);

const response = await fetch('/api/items/bulk-upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
  },
  body: formData
});

const result = await response.json();
```

## Response Format

### Success Response (200)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Bulk upload completed",
  "data": {
    "totalProcessed": 2,
    "successful": [
      {
        "index": 0,
        "name": "Sample Item 1",
        "id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "message": "Item created successfully"
      }
    ],
    "failed": [
      {
        "index": 1,
        "name": "Sample Item 2",
        "error": "SKU ITEM2-OS-BLACK already exists"
      }
    ],
    "summary": {
      "successCount": 1,
      "failureCount": 1,
      "successRate": "50.00%"
    }
  }
}
```

### Error Responses

#### 400 Bad Request
- Missing JSON file
- Invalid JSON format
- Too many images (>25)
- Too many items (>100)
- Empty items array

#### 401 Unauthorized
- Missing or invalid authentication token
- Non-admin user

#### 500 Internal Server Error
- Image upload failures
- Database errors
- Other server errors

## Validation Rules

1. **File Limits**:
   - Maximum 25 images
   - Maximum 100 items per bulk upload
   - Maximum 10MB per file

2. **Required Fields**:
   - Item name and price are mandatory
   - Thumbnail image is required (either via index or direct URL)

3. **Data Validation**:
   - Price must be positive
   - Discount price must be less than original price
   - Discount percentage must be 0-100
   - SKUs must be unique across all items
   - Maximum 5 images per color variant
   - Key highlight key max 100 chars, value max 200 chars

4. **Image Validation**:
   - Only image files allowed for images field
   - Only JSON files allowed for jsonFile field
   - Image indices must be valid (0 to images.length-1)

## Best Practices

1. **Prepare Your Data**:
   - Use the template JSON file as a starting point
   - Ensure all SKUs are unique
   - Validate image indices match your uploaded images

2. **Image Organization**:
   - Upload images in the order you want to reference them
   - Use descriptive image names for easier management
   - Keep image sizes reasonable (under 10MB each)

3. **Error Handling**:
   - Check the response for failed items
   - Fix issues in your JSON file and retry
   - Use smaller batches if you encounter many errors

4. **Testing**:
   - Test with a small number of items first
   - Verify image references are correct
   - Check that SKUs don't conflict with existing items

## Template Files

Use the provided `demo/bulk-upload-template.json` as a reference for the correct JSON structure.

## Troubleshooting

### Common Issues

1. **"JSON file is required"**: Make sure you're sending the file with field name `jsonFile`
2. **"Invalid JSON file format"**: Check that your JSON is valid and properly formatted
3. **"SKU already exists"**: Ensure all SKUs in your JSON are unique across your database
4. **"Invalid thumbnail image index"**: Make sure the index corresponds to an uploaded image
5. **"Maximum 25 images allowed"**: Reduce the number of images or split into multiple requests

### Performance Tips

- Process items in batches of 50-100 for optimal performance
- Compress images before upload to reduce transfer time
- Use appropriate image formats (JPEG for photos, PNG for graphics with transparency)
