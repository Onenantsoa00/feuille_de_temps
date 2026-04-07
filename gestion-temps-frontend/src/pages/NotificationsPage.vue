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
          :class="{ 'gt-notif-unread': !n.read_at }"
          clickable
          @click="markOne(n)"
        >
          <q-item-section>
            <q-item-label class="text-weight-medium">
              {{ n.content }}
            </q-item-label>
            <q-item-label caption>{{ formatDate(n.created_at) }}</q-item-label>
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
import { ref, onMounted } from 'vue'
import { Notify } from 'quasar'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'src/stores/auth'
import { socket } from 'src/boot/socket'

const auth = useAuthStore()
const items = ref([])
const users = ref([])
const sendForm = ref({ user_id: null, title: '', body: '' })

const userLabel = (u) => [u.first_name, u.name].filter(Boolean).join(' ').trim() || u.email

const formatDate = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

const load = async () => {
  const res = await api.get('/notifications')
  items.value = res.data
}

const loadUsers = async () => {
  if (!auth.canSendAdminNotifications) return
  const res = await api.get('/users')
  users.value = res.data
}

const markOne = async (n) => {
  if (n.read_at) return

  try {
    await api.patch(`/notifications/${n.id}/read`)

    n.read_at = new Date() // 🔥 update local instantané

    socket.emit('notificationRead', auth.user.id) // 🔥 dire au serveur
  } catch {
    /* ignore */
  }
}

const markAll = async () => {
  try {
    await api.post('/notifications/mark-all-read')

    items.value.forEach((n) => (n.read_at = new Date())) // 🔥 instant UI

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
      created_at: new Date(),
    })

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
})
</script>
