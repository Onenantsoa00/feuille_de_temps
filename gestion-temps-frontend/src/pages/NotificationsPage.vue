<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h4 gt-page-title col">Notifications</div>
      <q-btn flat color="primary" label="Tout marquer lu" @click="markAll" />
    </div>

    <q-card class="gt-card gt-enter-up">
      <q-list separator bordered>
        <q-item
          v-for="n in items"
          :key="n.id"
          :class="{ 'bg-blue-1': !n.is_read }"
          clickable
          @click="markOne(n)"
        >
          <q-item-section>
            <q-item-label class="text-weight-medium">
              {{ n.content }}
            </q-item-label>
            <q-item-label caption>{{ formatRelative(n.sent_at) }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item v-if="!items.length">
          <q-item-section class="text-grey">Aucune notification</q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card v-if="auth.canSendAdminNotifications" class="gt-card gt-enter-up gt-delay-1 q-mt-md">
      <q-card-section class="text-subtitle1">Envoyer une notification</q-card-section>
      <q-card-section class="q-gutter-md">
        <q-select
          v-model="sendForm.user_id"
          :options="users"
          :option-label="userLabel"
          option-value="id"
          emit-value
          map-options
          label="Destinataire"
          outlined
          dense
        />
        <q-input v-model="sendForm.title" label="Titre" outlined dense />
        <q-input v-model="sendForm.body" label="Message" type="textarea" outlined dense />
        <q-btn color="primary" label="Envoyer" unelevated @click="sendNotif" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Notify } from 'quasar'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'src/stores/auth'
import { socket } from 'src/boot/socket'
import { dayjs } from 'src/boot/dayjs'

const auth = useAuthStore()
const items = ref([])
const users = ref([])
const sendForm = ref({ user_id: null, title: '', body: '' })

let timer = null

const userLabel = (u) => [u.first_name, u.name].filter(Boolean).join(' ').trim() || u.email

const formatRelative = (date) => {
  const now = dayjs()
  const d = dayjs(date)

  const diffSec = now.diff(d, 'second')

  if (diffSec < 10) return "à l'instant"
  if (diffSec < 60) return `${diffSec}s`

  const diffMin = now.diff(d, 'minute')
  if (diffMin < 60) return `${diffMin} min`

  const diffHour = now.diff(d, 'hour')
  if (diffHour < 24) return `${diffHour} h`

  const diffDay = now.diff(d, 'day')
  if (diffDay === 1) return 'hier'

  return `${diffDay} jours`
}

const load = async () => {
  const res = await api.get('/notifications')
  items.value = res.data
  items.value.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
}

const loadUsers = async () => {
  if (!auth.canSendAdminNotifications) return
  const res = await api.get('/users')
  users.value = res.data
}

const markOne = async (n) => {
  if (n.is_read) return

  try {
    await api.patch(`/notifications/${n.id}/read`)

    n.is_read = true // 🔥 update local instantané

    socket.emit('notificationRead', auth.user.id) // 🔥 dire au serveur
  } catch {
    /* ignore */
  }
}

const markAll = async () => {
  try {
    await api.post('/notifications/mark-all-read')

    items.value.forEach((n) => (n.is_read = true)) // 🔥 instant UI

    socket.emit('notificationRead', auth.user.id)

    Notify.create({ type: 'positive', message: 'OK' })
  } catch {
    Notify.create({ type: 'negative', message: 'Erreur' })
  }
}

const sendNotif = async () => {
  try {
    await api.post('/notifications', {
      user_id: sendForm.value.user_id,
      title: sendForm.value.title,
      body: sendForm.value.body,
    })
    sendForm.value = { user_id: null, title: '', body: '' }
    Notify.create({ type: 'positive', message: 'Notification envoyée' })
  } catch (e) {
    Notify.create({
      type: 'negative',
      message: e.response?.data?.message ?? 'Erreur',
    })
  }
}

onMounted(async () => {
  socket.emit('joinUserRoom', auth.user.id)

  socket.on('newNotification', (notif) => {
    items.value.unshift({
      ...notif,
      title: 'Nouvelle notification',
      body: notif.content,
      sent_at: new Date(),
      is_read: false,
    })
    items.value.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))

    // 🔥 SON
    const audio = new Audio('/notif.mp3')
    audio.play()

    Notify.create({
      type: 'info',
      message: notif.content,
    })
  })

  await load()
  await loadUsers()

  timer = setInterval(() => {
    items.value = [...items.value] // 🔥 force refresh UI
  }, 60000) // toutes les 1 min
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>
