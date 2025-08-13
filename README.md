# Kartuno Backend

A Node.js backend application with Express.js and MongoDB.

## Features

- Express.js server
- MongoDB connection with Mongoose
- CORS enabled
- Environment variable configuration
- Error handling middleware
- Health check endpoint

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kartuno
```

3. Make sure MongoDB is running on your system

4. Start the development server:
```bash
npm run dev
```

5. Start the production server:
```bash
npm start
```

## API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check with database status

## Project Structure

```
kartuno/
├── config/
│   └── db.js          # MongoDB connection
├── controllers/        # Route controllers
├── middleware/         # Custom middleware
├── models/            # Mongoose models
├── routes/            # API routes
├── utils/             # Utility functions
├── index.js           # Main server file
└── package.json
```

## Environment Variables

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
