import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach((to) => {
    const publicPaths = ['/', '/login']

    if (!publicPaths.includes(to.path) && !localStorage.getItem('token')) {
      return '/login'
    }

    const raw = localStorage.getItem('user')
    let role = null
    if (raw) {
      try {
        role = JSON.parse(raw)?.role ?? null
      } catch {
        role = null
      }
    }
    const normalizedRole = role === 'chef_mission' ? 'chef' : role

    const restrictedPaths = {
      '/companies': ['employe'],
      '/users': ['chef', 'secretaire', 'employe'],
      '/cases': ['employe'],
    }

    const deniedRoles = restrictedPaths[to.path]
    if (deniedRoles?.includes(normalizedRole)) {
      return '/dashboard'
    }

    return true
  })

  return Router
})
