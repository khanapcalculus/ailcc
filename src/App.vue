<template>
  <div class="app-container">
    <header class="app-header" v-if="!isWhiteboardRoute">
      <div class="logo">
        <Logo />
      </div>
      <nav class="main-nav">
        <router-link to="/" class="nav-link">Home</router-link>
        <router-link v-if="isAuthenticated" to="/dashboard" class="nav-link">Dashboard</router-link>
        <router-link v-if="!isAuthenticated" to="/login" class="nav-link">Login</router-link>
        <a v-if="isAuthenticated" @click.prevent="handleLogout" href="#" class="nav-link">Logout</a>
      </nav>
    </header>

    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script>
import { useRoute } from 'vue-router'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import Logo from '@/components/Logo.vue'

export default {
  name: 'App',
  components: {
    Logo
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const authStore = useAuthStore()

    const isWhiteboardRoute = computed(() => route.name === 'Whiteboard')
    const isAuthenticated = computed(() => authStore.isAuthenticated)

    const handleLogout = async () => {
      try {
        await authStore.logoutUser()
        router.push('/')
      } catch (error) {
        console.error('Logout error:', error)
      }
    }

    // Initialize auth state
    onMounted(async () => {
      await authStore.init()
    })

    return {
      isWhiteboardRoute,
      isAuthenticated,
      handleLogout
    }
  }
}
</script>

<style>
:root {
  --primary-color: #4361ee;
  --secondary-color: #3a0ca3;
  --accent-color: #7209b7;
  --success-color: #4cc9f0;
  --warning-color: #f72585;
  --danger-color: #d00000;
  --light-color: #f8f9fa;
  --dark-color: #212529;
  --grey-color: #6c757d;
  --border-radius: 4px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Roboto', sans-serif;
  background-color: #f5f5f5;
  color: var(--dark-color);
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo {
  display: flex;
  align-items: center;
}

.main-nav {
  display: flex;
  gap: 1rem;
}

.nav-link {
  text-decoration: none;
  color: var(--grey-color);
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  transition: all 0.3s ease;
}

.nav-link:hover, .router-link-active {
  color: var(--primary-color);
  background-color: rgba(67, 97, 238, 0.1);
}

.main-content {
  flex: 1;
  padding: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* For whiteboard page - full screen */
.whiteboard-page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* Responsive styles */
@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .main-nav {
    width: 100%;
    justify-content: center;
  }
}
</style>
