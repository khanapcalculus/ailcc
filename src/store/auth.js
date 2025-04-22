import { auth, loginWithEmail, logout, registerWithEmail } from '@/services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { defineStore } from 'pinia';

// Development mock user
const DEV_MODE = process.env.NODE_ENV === 'development';
const MOCK_USER = DEV_MODE ? {
  uid: 'dev-user-123',
  email: 'dev@example.com',
  displayName: 'Development User',
  getIdToken: () => Promise.resolve('mock-token-for-dev')
} : null;

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: DEV_MODE ? MOCK_USER : null,
    loading: !DEV_MODE,
    error: null
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.user,
    userId: (state) => state.user?.uid,
    userEmail: (state) => state.user?.email,
    userDisplayName: (state) => state.user?.displayName,
    userPhotoURL: (state) => state.user?.photoURL,
  },
  
  actions: {
    async init() {
      // In development mode, use the mock user
      if (DEV_MODE) {
        this.user = MOCK_USER;
        this.loading = false;
        return MOCK_USER;
      }
      
      this.loading = true;
      
      return new Promise((resolve) => {
        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => {
          this.user = user;
          this.loading = false;
          resolve(user);
        });
      });
    },
    
    async login(email, password) {
      this.loading = true;
      this.error = null;
      
      try {
        const userCredential = await loginWithEmail(email, password);
        this.user = userCredential.user;
        return userCredential.user;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async register(email, password) {
      this.loading = true;
      this.error = null;
      
      try {
        const userCredential = await registerWithEmail(email, password);
        this.user = userCredential.user;
        return userCredential.user;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async logoutUser() {
      this.loading = true;
      this.error = null;
      
      try {
        await logout();
        this.user = null;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    clearError() {
      this.error = null;
    }
  }
}); 