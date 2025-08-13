const postmanCollection = {
    "info": {
      "_postman_id": "kartuno-api-collection",
      "name": "Kartuno API Collection",
      "description": "Postman collection for the Kartuno e-commerce backend API. Includes all endpoints from the provided code.\n\nVariables:\n- base_url: http://localhost:5000/api (or your server URL)\n- auth_token: Bearer token for authenticated requests (obtained from login/verify-otp)\n\nFolders organized by resource.\n\nNote: For file uploads, use form-data in body. For protected routes, add Authorization header with {{auth_token}}.",
      "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [
      {
        "name": "Users",
        "item": [
          {
            "name": "Request OTP",
            "request": {
              "method": "POST",
              "header": [
                {
                  "key": "Content-Type",
                  "value": "application/json"
                }
              ],
              "body": {
                "mode": "raw",
                "raw": "{\n  \"number\": \"+1234567890\"\n}"
              },
              "url": {
                "raw": "{{base_url}}/users/request-otp",
              "host": ["{{base_url}}"],
              "path": ["users", "request-otp"]
            }
          }
          },
          {
            "name": "Verify OTP",
            "request": {
              "method": "POST",
              "header": [
                {
                  "key": "Content-Type",
                  "value": "application/json"
                }
              ],
              "body": {
                "mode": "raw",
                "raw": "{\n  \"number\": \"+1234567890\",\n  \"otp\": \"123456\"\n}"
              },
              "url": {
                "raw": "{{base_url}}/users/verify-otp",
              "host": ["{{base_url}}"],
              "path": ["users", "verify-otp"]
            }
          }
        }
      ]
      }
    ],
    "variable": [
      {
        "key": "base_url",
        "value": "http://localhost:5000/api",
        "type": "string"
      },
      {
        "key": "auth_token",
        "value": "your-jwt-token-here",
        "type": "string"
      }
    ]
};

module.exports = postmanCollection;