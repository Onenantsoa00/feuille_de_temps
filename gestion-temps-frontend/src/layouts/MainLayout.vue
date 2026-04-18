<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="glass-header">
      <q-toolbar class="q-px-md gt-toolbar text-white">
        <q-toolbar-title class="text-weight-bold gt-brand">Gestion Temps</q-toolbar-title>
        <div class="gt-toolbar-nav row items-center no-wrap q-gutter-xs">
          <q-btn flat dense no-caps label="Accueil" to="/dashboard" class="nav-btn" />
          <q-btn
            flat
            dense
            no-caps
            label="Sociétés"
            to="/companies"
            class="nav-btn"
            :disable="!canAccessCompanies"
          />
          <q-btn
            flat
            dense
            no-caps
            label="Comptes"
            to="/users"
            class="nav-btn"
            :disable="!canAccessUsers"
          />
          <q-btn
            flat
            dense
            no-caps
            label="Missions"
            to="/cases"
            class="nav-btn"
            :disable="!canAccessCases"
          />
          <q-btn flat dense no-caps label="Feuille de temps" to="/work-hours" class="nav-btn" />
          <q-btn
            flat
            dense
            no-caps
            round
            icon="notifications_none"
            to="/notifications"
            class="nav-btn"
          >
            <q-badge v-if="notifCount > 0" color="negative" floating>{{ notifCount }}</q-badge>
          </q-btn>
          <q-btn flat dense no-caps round icon="mail_outline" to="/messages" class="nav-btn" />
        </div>
        <q-space />
        <span
          v-if="auth.user"
          class="text-caption q-mr-sm gt-user-pill"
          :title="userPillTitle"
        >
          {{ userPill }}
        </span>
        <q-btn
          v-if="auth.token"
          flat
          dense
          no-caps
          label="Déconnexion"
          class="nav-btn"
          @click="logout"
        />
      </q-toolbar>
    </q-header>

    <q-page-container class="app-surface gt-page-shell">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import { api } from 'src/boot/axios'
import { socket } from 'src/boot/socket'

const auth = useAuthStore()
const router = useRouter()
const notifCount = ref(0)
let timer

/** Identité + rôle + email (utile pour les tests) */
const userPill = computed(() => {
  const u = auth.user
  if (!u) return ''
  const n = [u.first_name, u.name].filter(Boolean).join(' ').trim()
  const identity = n || u.email || '—'
  const role = u.role ?? '—'
  const email = u.email ?? '—'
  return `${identity} · ${role} · ${email}`
})

const userPillTitle = computed(() => userPill.value)

const canAccessCompanies = computed(() => auth.canManageCompanies)
const canAccessUsers = computed(() => auth.canManageUsers)
const canAccessCases = computed(() => auth.canAccessCases)

const refreshNotif = async () => {
  if (!auth.token) {
    notifCount.value = 0
    return
  }
  try {
    const res = await api.get('/notifications/unread-count')
    notifCount.value = res.data?.count ?? 0
  } catch {
    notifCount.value = 0
  }
}

const logout = () => {
  auth.logout()
  router.push('/login')
}

onMounted(() => {
  refreshNotif()
  timer = setInterval(refreshNotif, 45000)

  // 🔥 ÉCOUTER LES UPDATES SOCKET
  socket.on('notificationCount', (count) => {
    notifCount.value = count
  })
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  socket.off('notificationCount')
})
</script>

<style scoped>
.glass-header {
  backdrop-filter: blur(14px) saturate(1.2);
  background: linear-gradient(
    125deg,
    rgba(30, 41, 59, 0.92) 0%,
    rgba(51, 65, 85, 0.88) 48%,
    rgba(71, 85, 105, 0.9) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.12);
}

.gt-brand {
  letter-spacing: -0.03em;
}

.gt-toolbar {
  min-height: 56px;
}

.nav-btn {
  border-radius: 10px;
  margin-left: 2px;
  transition:
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}

.nav-btn:hover {
  transform: translateY(-2px);
  background-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.app-surface {
  min-height: 100vh;
}

.gt-page-shell {
  animation: shell-fade 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes shell-fade {
  from {
    opacity: 0.92;
  }
  to {
    opacity: 1;
  }
}

@keyframes pop {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

:deep(.q-badge) {
  animation: pop 0.3s ease;
}

.gt-user-pill {
  opacity: 0.92;
  max-width: min(92vw, 520px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

@media (max-width: 1023px) {
  .gt-toolbar-nav .q-btn :deep(.q-btn__content) span.block {
    display: none;
  }
}
</style>
