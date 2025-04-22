<template>
  <div class="auth-container">
    <div class="auth-card">
      <h2 class="auth-title">{{ isLogin ? 'Sign In' : 'Create Account' }}</h2>
      
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group" v-if="!isLogin">
          <label for="name">Full Name</label>
          <input 
            type="text" 
            id="name" 
            v-model="name" 
            placeholder="Enter your full name"
            autocomplete="name"
          />
        </div>
        
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            placeholder="Enter your email"
            required
            autocomplete="email"
          />
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="Enter your password"
            required
            autocomplete="current-password"
          />
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        
        <button 
          type="submit" 
          class="btn btn-primary" 
          :disabled="loading"
        >
          <span v-if="loading">
            <i class="fas fa-spinner fa-spin"></i> Processing...
          </span>
          <span v-else>{{ isLogin ? 'Sign In' : 'Create Account' }}</span>
        </button>
      </form>
      
      <div class="auth-toggle">
        <p v-if="isLogin">
          Don't have an account? 
          <a href="#" @click.prevent="isLogin = false">Sign Up</a>
        </p>
        <p v-else>
          Already have an account? 
          <a href="#" @click.prevent="isLogin = true">Sign In</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { updateProfile } from 'firebase/auth'

export default {
  name: 'LoginPage',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    
    const isLogin = ref(true)
    const email = ref('')
    const password = ref('')
    const name = ref('')
    const errorMessage = ref('')
    
    const loading = computed(() => authStore.loading)
    
    const handleSubmit = async () => {
      errorMessage.value = '';
      
      try {
        if (isLogin.value) {
          // Login flow
          await authStore.login(email.value, password.value)
        } else {
          // Registration flow
          const userCredential = await authStore.register(email.value, password.value)
          
          // Update user profile with name
          if (name.value) {
            await updateProfile(userCredential, {
              displayName: name.value
            });
          }
        }
        
        // Redirect to dashboard on success
        router.push('/dashboard')
      } catch (error) {
        console.error('Authentication error:', error);
        
        // Handle specific auth errors with user-friendly messages
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            errorMessage.value = 'Invalid email or password';
            break;
          case 'auth/email-already-in-use':
            errorMessage.value = 'Email is already in use';
            break;
          case 'auth/weak-password':
            errorMessage.value = 'Password is too weak';
            break;
          case 'auth/invalid-email':
            errorMessage.value = 'Invalid email format';
            break;
          default:
            errorMessage.value = 'Authentication failed. Please try again.';
        }
      }
    }
    
    return {
      isLogin,
      email,
      password,
      name,
      errorMessage,
      loading,
      handleSubmit
    }
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px);
  padding: 2rem;
}

.auth-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  width: 100%;
  max-width: 400px;
}

.auth-title {
  margin-bottom: 2rem;
  text-align: center;
  color: var(--primary-color);
  font-size: 1.75rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: var(--dark-color);
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: var(--border-radius);
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.2);
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
  margin-top: 1rem;
  font-size: 1rem;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--secondary-color);
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-toggle {
  margin-top: 2rem;
  text-align: center;
}

.auth-toggle a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.auth-toggle a:hover {
  text-decoration: underline;
}

.error-message {
  background-color: #ffebee;
  color: var(--danger-color);
  padding: 0.75rem;
  border-radius: var(--border-radius);
  margin-top: 0.5rem;
  font-size: 0.875rem;
}
</style> 