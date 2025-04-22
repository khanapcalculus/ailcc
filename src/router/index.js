import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/Home.vue')
  },
  {
    path: '/whiteboard/:id',
    name: 'Whiteboard',
    component: () => import('../pages/Whiteboard.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/Login.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../pages/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../pages/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards for authentication
router.beforeEach((to, from, next) => {
  // Check if route requires authentication
  // const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  // For development purposes, bypass authentication checks
  // In production, you would implement proper auth checks
  if (to.path === '/dashboard' && process.env.NODE_ENV === 'development') {
    console.log('Development mode: Bypassing authentication checks')
    next()
    return
  }
  
  // For now, we'll just continue without auth checks
  // Will be implemented with Firebase later
  next()
})

export default router 