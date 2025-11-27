# JWT Frontend Authentication

This project implements JWT (JSON Web Token) authentication in a React application. It provides a complete setup for user registration, login, and protected routes, ensuring that only authenticated users can access certain parts of the application.

## Project Structure

```
jwt-frontend-auth
├── src
│   ├── index.tsx               # Entry point of the application
│   ├── App.tsx                 # Main application component with routing
│   ├── api
│   │   └── apiClient.ts        # Configured Axios instance for API requests
│   ├── auth
│   │   ├── authService.ts      # Functions for handling authentication
│   │   ├── useAuth.ts          # Custom hook for authentication state
│   │   └── AuthContext.tsx     # Context provider for authentication state
│   ├── components
│   │   ├── LoginForm.tsx       # Component for user login
│   │   ├── RegisterForm.tsx    # Component for user registration
│   │   └── ProtectedRoute.tsx   # Component for protecting routes
│   ├── pages
│   │   ├── Home.tsx            # Landing page component
│   │   ├── Dashboard.tsx       # Dashboard component for authenticated users
│   │   └── Profile.tsx         # User profile component
│   ├── hooks
│   │   └── useFetch.ts         # Custom hook for fetching data
│   ├── types
│   │   └── index.ts            # TypeScript types and interfaces
│   └── utils
│       └── token.ts            # Utility functions for managing JWT token
├── public
│   └── index.html              # Main HTML file for the application
├── package.json                # npm configuration file
├── tsconfig.json               # TypeScript configuration file
├── .env.example                 # Example environment variables
└── README.md                   # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd jwt-frontend-auth
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Configure environment variables:**
   Copy `.env.example` to `.env` and update the values as needed.

4. **Run the application:**
   ```
   npm start
   ```

## Usage

- Navigate to the home page to access the application.
- Use the registration form to create a new account.
- Log in using the login form to access protected routes like the dashboard and profile pages.

## Features

- User registration and login
- JWT token management
- Protected routes for authenticated users
- Custom hooks for authentication and data fetching

## License

This project is licensed under the MIT License.