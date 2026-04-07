<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md gt-page-title">Messagerie</div>

    <div class="row q-col-gutter-md" style="min-height: 420px">
      <q-card class="gt-card gt-enter-up col-12 col-md-4">
        <q-card-section class="text-subtitle2">Conversations</q-card-section>
        <q-list separator>
          <q-item
            v-for="c in conversations"
            :key="c.other_id"
            clickable
            :active="activeOther === c.other_id"
            @click="openThread(c.other_id)"
          >
            <q-item-section>
              <q-item-label>
                {{ [c.other_first_name, c.other_name].filter(Boolean).join(' ') || c.other_email }}
              </q-item-label>
              <q-item-label caption lines="2">{{ c.last_body }}</q-item-label>
            </q-item-section>
            <q-badge v-if="c.unread_count > 0" color="red" floating>
              {{ c.unread_count }}
            </q-badge>
          </q-item>
          <q-item v-if="!conversations.length">
            <q-item-section class="text-grey">Aucune conversation</q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <q-card class="gt-card gt-enter-up gt-delay-1 col-12 col-md-8 column">
        <q-card-section class="row items-center q-gutter-sm">
          <q-select
            v-model="newToId"
            class="col"
            :options="usersFiltered"
            :option-label="userLabel"
            option-value="id"
            emit-value
            map-options
            label="Nouveau message à"
            outlined
            dense
            clearable
          />
        </q-card-section>
        <q-card-section class="col scroll" style="max-height: 340px">
          <!-- 🔥 TYPING INDICATOR -->
          <div v-if="typingUsers.has(activeOther)" class="text-grey-6 q-pa-sm text-italic">
            {{ userLabel(users.find((u) => u.id === activeOther)) }} est en train d'écrire...
          </div>
          <div
            v-for="m in thread"
            :key="m.id"
            class="q-mb-sm"
            :class="m.from_user_id === meId ? 'text-right' : 'text-left'"
          >
            <q-chat-message
              :name="shortName(m)"
              :text="[m.body]"
              :sent="m.from_user_id === meId"
              :stamp="formatTime(m.created_at)"
            />
            <!-- 🔥 READ RECEIPT -->
            <div
              v-if="m.from_user_id === meId && readReceipts.get(m.id)"
              class="text-caption text-grey-6 q-mt-xs"
            >
              Vu
            </div>
          </div>
          <div v-if="activeOther && !thread.length" class="text-grey text-center q-pa-md">
            Écrivez un premier message
          </div>
        </q-card-section>
        <q-card-section class="row q-gutter-sm">
          <q-input
            v-model="draft"
            class="col"
            type="textarea"
            autogrow
            outlined
            dense
            placeholder="Votre message"
            :disable="!(activeOther || newToId)"
            @keydown.enter.exact.prevent="send"
            @input="handleTyping"
          />
          <q-btn
            color="primary"
            label="Envoyer"
            unelevated
            :disable="!(activeOther || newToId) || !draft.trim()"
            @click="send"
          />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { Notify } from 'quasar'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'src/stores/auth'
import { socket } from 'src/boot/socket'

const auth = useAuthStore()
const meId = computed(() => auth.user?.id)
const conversations = ref([])
const users = ref([])
const thread = ref([])
const activeOther = ref(null)
const newToId = ref(null)
const draft = ref('')
const isTyping = ref(false)
const typingUsers = ref(new Set())
const readReceipts = ref(new Map()) // messageId -> read status

const usersFiltered = computed(() => users.value.filter((u) => u.id !== meId.value))

const userLabel = (u) => [u.first_name, u.name].filter(Boolean).join(' ').trim() || u.email

// 🔥 TYPING INDICATOR
let typingTimeout = null
const handleTyping = () => {
  if (!activeOther.value) return

  if (!isTyping.value) {
    isTyping.value = true
    socket.emit('typing', { fromUserId: meId.value, toUserId: activeOther.value })
  }

  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    isTyping.value = false
    socket.emit('stopTyping', { fromUserId: meId.value, toUserId: activeOther.value })
  }, 1000)
}

// 🔥 AUTO SCROLL
const scrollToBottom = async () => {
  await nextTick()
  const scrollContainer = document.querySelector('.scroll')
  if (scrollContainer) {
    scrollContainer.scrollTop = scrollContainer.scrollHeight
  }
}

watch(newToId, async (val) => {
  if (val) {
    activeOther.value = val
    await openThread(val)
  }
})

const shortName = (m) => {
  if (m.from_user_id === meId.value) return 'Moi'
  return [m.from_first_name, m.from_name].filter(Boolean).join(' ') || '…'
}

const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return ''
  }
}

const loadConv = async () => {
  const res = await api.get('/messages/conversations')
  conversations.value = res.data
}

const loadUsers = async () => {
  const res = await api.get('/users')
  users.value = res.data
}

const openThread = async (otherId) => {
  activeOther.value = otherId
  newToId.value = null
  const res = await api.get(`/messages/thread/${otherId}`)
  thread.value = res.data
  await loadConv()

  // 🔥 AUTO SCROLL to bottom when opening thread
  await scrollToBottom()
}

const send = async () => {
  const to = activeOther.value || newToId.value
  if (!to || !draft.value.trim()) return

  try {
    await api.post('/messages/send', {
      to_user_id: to,
      body: draft.value.trim(),
    })

    // ✅ juste reset input
    draft.value = ''
    // 🔥 stop typing after send
    if (isTyping.value) {
      isTyping.value = false
      socket.emit('stopTyping', { fromUserId: meId.value, toUserId: to })
    }
  } catch (e) {
    Notify.create({
      type: 'negative',
      message: e.response?.data?.message ?? 'Erreur',
    })
  }
}

onMounted(async () => {
  socket.emit('joinUserRoom', auth.user.id)

  socket.on('newMessage', (msg) => {
    // 🔥 si message appartient à la conversation active
    if (msg.from_user_id === activeOther.value || msg.to_user_id === activeOther.value) {
      // éviter doublon message
      if (!thread.value.find((m) => m.id === msg.id)) {
        thread.value.push(msg)
        // 🔥 AUTO SCROLL when new message arrives
        scrollToBottom()
      }
    }

    // 🔥 refresh conversations
    loadConv()
  })

  // 🔥 TYPING INDICATOR
  socket.on('userTyping', (data) => {
    if (data.fromUserId === activeOther.value) {
      typingUsers.value.add(data.fromUserId)
    }
  })

  socket.on('userStopTyping', (data) => {
    typingUsers.value.delete(data.fromUserId)
  })

  // 🔥 READ RECEIPTS
  socket.on('messageRead', (data) => {
    if (data.readBy === activeOther.value) {
      data.messageIds.forEach((messageId) => {
        readReceipts.value.set(messageId, true)
      })
    }
  })

  await loadUsers()
  await loadConv()
})

onUnmounted(() => {
  // 🔥 cleanup typing timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }
})
</script>
