import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import HistoryView from '../views/HistoryView.vue'
import LoginView from '../views/LoginView.vue'
import { useGolfbotStore } from '../stores/golfbot'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryView
    }
  ],
})

router.beforeEach(async (to, from, next) => {
  const store = useGolfbotStore()
  
  // If user is logged in, validate/refresh token with sliding expiration
  if (to.name !== 'login' && store.isLoggedIn) {
    const isValid = await store.validateTokenOnServer()
    if (!isValid) {
      next({ name: 'login' })
      return
    }
  }

  if (to.name !== 'login' && !store.isLoggedIn) {
    next({ name: 'login' })
  } else if (to.name === 'login' && store.isLoggedIn) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
