# HomePage API - Postman Collection

This Postman collection provides a complete set of API endpoints for managing your home page banners and content.

## 📥 Import Instructions

1. **Download the collection**: Save `homepage-postman.json` to your computer
2. **Open Postman**: Launch Postman application
3. **Import collection**: 
   - Click "Import" button
   - Select "File" tab
   - Choose the `homepage-postman.json` file
   - Click "Import"

## 🔧 Setup

### 1. Environment Variables
Set up environment variables in Postman:

- **baseUrl**: `http://localhost:5000` (or your server URL)
- **adminToken**: Your Firebase admin authentication token

### 2. Authentication
For admin endpoints, you need to set the `adminToken` environment variable with your Firebase token.

## 📋 API Endpoints

### Public Endpoints (No Authentication Required)

#### 1. Get Home Page Data
```
GET {{baseUrl}}/api/homepage
```
- **Description**: Get complete home page data with all banners
- **Response**: Returns all banner data organized by key

#### 2. Get Banners by Key
```
GET {{baseUrl}}/api/homepage/banners/{key}
```
- **Parameters**: 
  - `key`: Banner identifier (hero, mobile, desktop, category)
- **Response**: Returns images for specific banner key

#### 3. Get All Banner Keys
```
GET {{baseUrl}}/api/homepage/banner-keys
```
- **Description**: Get all available banner keys
- **Response**: Array of banner keys

### Admin Endpoints (Authentication Required)

#### 4. Update Banner with URLs
```
PUT {{baseUrl}}/api/homepage/banners/{key}
```
- **Headers**: `Content-Type: application/json`
- **Body**: 
```json
{
  "imageUrls": [
    "https://yoraaecommerce.s3.amazonaws.com/banners/hero1.jpg",
    "https://yoraaecommerce.s3.amazonaws.com/banners/hero2.jpg"
  ]
}
```

#### 5. Upload Banner Images
```
POST {{baseUrl}}/api/homepage/banners/{key}/upload
```
- **Body**: `multipart/form-data`
- **Field**: `images` (file upload, max 10 files, 10MB each)
- **Description**: Uploads images to S3 and updates banner

#### 6. Remove Banner
```
DELETE {{baseUrl}}/api/homepage/banners/{key}
```
- **Description**: Removes entire banner and deletes S3 images

#### 7. Delete Specific Banner Image
```
DELETE {{baseUrl}}/api/homepage/banners/{key}/images?imageUrl={imageUrl}
```
- **Parameters**:
  - `key`: Banner identifier (in URL path)
  - `imageUrl`: Image URL to delete (as query parameter)

#### 8. Reset Home Page
```
POST {{baseUrl}}/api/homepage/reset
```
- **Description**: Resets home page to default state

## 🎯 Example Banner Keys

The system supports these predefined banner keys:

- **hero**: Main hero banner images
- **mobile**: Mobile-specific banner images
- **desktop**: Desktop-specific banner images
- **category**: Category-specific banner images

## 📝 Usage Examples

### Setting Hero Banner
1. Use the "Hero Banner Example" request
2. Modify the `imageUrls` array with your image URLs
3. Send the request

### Uploading New Images
1. Use the "Upload Banner Images" request
2. Select image files in the form data
3. Set the banner key in the URL
4. Send the request

### Managing Multiple Banners
1. Set up different banner types using different keys
2. Each banner can have multiple images
3. Images are automatically organized by key

## 🔒 Authentication

For admin endpoints, ensure you have:
1. Valid Firebase admin token
2. Token set in environment variable `adminToken`
3. Collection-level authentication configured

## 🧪 Testing

The collection includes automated tests that:
- Validate response status codes
- Check response structure
- Log responses for debugging

## 📊 Response Format

All responses follow this structure:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

## 🚨 Error Handling

Common error scenarios:
- **400**: Invalid input (e.g., non-array imageUrls)
- **401**: Unauthorized (missing/invalid admin token)
- **404**: Resource not found
- **500**: Server error

## 🔄 Workflow Example

1. **Get current banners**: `GET /api/homepage`
2. **Update hero banner**: `PUT /api/homepage/banners/hero`
3. **Upload new images**: `POST /api/homepage/banners/mobile/upload`
4. **Verify changes**: `GET /api/homepage/banners/mobile`
5. **Delete specific image**: `DELETE /api/homepage/banners/hero/images?imageUrl=image_url_here`

## 📁 File Structure

```
cartunoBackend/
├── demo/
│   ├── homepage-postman.json          # Postman collection
│   └── homepage-postman-README.md     # This file
├── controllers/
│   └── homePageController.js          # API controller
├── routes/
│   └── homePageRoutes.js              # API routes
└── models/
    └── homePage.js                    # Data model
```

## 🆘 Troubleshooting

### Common Issues:
1. **Authentication errors**: Check admin token validity
2. **File upload failures**: Ensure files are images and under 10MB
3. **URL encoding**: Some endpoints require URL-encoded parameters
4. **CORS issues**: Ensure server is running and accessible

### Debug Tips:
1. Check Postman console for detailed logs
2. Verify environment variables are set correctly
3. Test with simple requests first
4. Check server logs for backend errors

## 📞 Support

For issues or questions:
1. Check server logs
2. Verify API endpoint availability
3. Test with Postman's built-in testing tools
4. Review the API documentation in the codebase
