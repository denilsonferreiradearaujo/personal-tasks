// import axios from 'axios';

// const api = axios.create({
//   baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// // Interceptor para injetar o JWT nas requisições
// api.interceptors.request.use((config) => {
//   if (typeof window !== 'undefined') {
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//   }
//   return config;
// });

// // Interceptor para tratar expiração de token ou erro 401
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response && error.response.status === 401) {
//       if (typeof window !== 'undefined') {
//         const isAuthRoute = window.location.pathname.includes('/login') || window.location.pathname.includes('/register');
//         if (!isAuthRoute && localStorage.getItem('token')) {
//           localStorage.removeItem('token');
//           localStorage.removeItem('user');
//           window.location.href = '/login';
//         }
//       }
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;



import axios from 'axios';

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001',

  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor para adicionar o JWT
 * automaticamente nas requisições.
 */
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token =
        localStorage.getItem('token');

      if (token) {
        config.headers.Authorization =
          `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor para tratar erros de autenticação.
 */
api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (
      error.response &&
      error.response.status === 401
    ) {
      if (typeof window !== 'undefined') {
        const pathname =
          window.location.pathname;

        const isAuthRoute =
          pathname.includes('/login') ||
          pathname.includes('/register');

        if (
          !isAuthRoute &&
          localStorage.getItem('token')
        ) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');

          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;