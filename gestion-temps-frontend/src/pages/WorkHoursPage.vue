<!-- http://localhost:9000/#/work-hours -->

<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md gt-page-title">Feuille de Temps</div>

    <q-banner v-if="!isOnlineState" class="gt-banner-offline q-mb-md">
      Mode hors ligne — les données seront synchronisées plus tard
    </q-banner>

    <q-banner v-else class="gt-banner-online q-mb-md"> En ligne </q-banner>

    <!-- FORMULAIRE -->
    <q-card class="q-mb-md gt-card gt-enter-up">
      <q-card-section>
        <q-select
          v-model="form.case_id"
          :options="cases"
          option-label="caseLabel"
          option-value="id"
          emit-value
          map-options
          clearable
          label="Mission (recommandé)"
          :hint="cases.length ? 'Affiche les missions autorisées pour votre compte' : 'Aucune mission disponible pour votre compte'"
        />

        <q-input
          v-model="form.task_name"
          class="q-mt-md"
          label="Tâche (optionnel)"
          hint="Saisir le nom de la tâche"
          clearable
        />

        <q-input v-model="form.work_date" type="date" label="Date" class="q-mt-md" />

        <q-input v-model="form.start_time" type="time" label="Heure début" class="q-mt-md" />

        <q-input v-model="form.end_time" type="time" label="Heure fin" class="q-mt-md" />

        <div v-if="authStore.role === 'employe'" class="row q-gutter-sm q-mt-md">
          <q-btn
            label="Démarrer minuteur"
            color="secondary"
            unelevated
            :disable="timerRunning"
            @click="startTimer"
          />
          <q-btn
            label="Arrêter minuteur"
            color="deep-orange"
            unelevated
            :disable="!timerRunning"
            @click="stopTimer"
          />
          <div v-if="timerRunning" class="text-caption self-center">
            Minuteur en cours...
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn label="Ajouter" color="primary" unelevated class="action-btn" @click="addWorkHour" />
      </q-card-actions>
    </q-card>

    <!-- LISTE -->
    <q-card class="gt-card gt-enter-up gt-delay-1">
      <q-card-section>
        <div class="text-subtitle1">Historique</div>

        <q-list separator>
          <q-item v-for="item in workHours" :key="item.work_hour_id" class="gt-list-item">
            <q-item-section>
              {{ lineLabel(item) }}
            </q-item-section>

            <q-item-section side>
              <div v-if="item.offline">⏳ Sync...</div>
              <div v-else>{{ calculateDuration(item.start_time, item.end_time) }} h</div>
              <q-btn
                v-if="!item.offline"
                color="red"
                label="Supprimer"
                unelevated
                class="delete-btn"
                @click="deleteWorkHour(item.work_hour_id || item.id)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Notify } from 'quasar'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'src/stores/auth'
import { addWorkHourLocal, getWorkHoursLocal, clearWorkHoursLocal } from 'src/services/db'

const authStore = useAuthStore()

const tasks = ref([])
const cases = ref([])
const workHours = ref([])
const isOnlineState = ref(navigator.onLine)
const timerRunning = ref(false)

const form = ref({
  case_id: null,
  task_name: '',
  work_date: '',
  start_time: '',
  end_time: '',
})

const caseLabel = (c) => `${c.name}${c.company_name ? ` — ${c.company_name}` : ''}`

const lineLabel = (item) => {
  const mission = item.case_name
    ? `${item.case_name}${item.company_name ? ` (${item.company_name})` : ''}`
    : null
  const task = item.task_name || null
  const head = mission || task || '—'
  return `${head} — ${item.work_date}`
}

const calculateDuration = (start, end) => {
  const s = new Date(`1970-01-01T${start}`)
  const e = new Date(`1970-01-01T${end}`)
  return (e - s) / (1000 * 60 * 60)
}

const loadTasks = async () => {
  const res = await api.get('/tasks')
  tasks.value = res.data
}

const loadCases = async () => {
  const res = await api.get('/cases')
  cases.value = res.data.map((c) => ({ ...c, caseLabel: caseLabel(c) }))
}

// charger heures
const loadWorkHours = async () => {
  try {
    let serverData = []

    if (navigator.onLine) {
      const res = await api.get('/work-hours')
      serverData = res.data
    }

    const localData = await getWorkHoursLocal()

    const offlineFormatted = localData.map((item, index) => ({
      ...item,
      id: item.id ?? `offline-${index}-${item.work_date}-${item.start_time}`,
      task_name: '⏳ (offline)',
      duration: '?',
      offline: true,
    }))

    workHours.value = [...offlineFormatted, ...serverData]
  } catch (error) {
    console.error(error)
  }
}

// ajouter
const addWorkHour = async () => {
  try {
    if (!form.value.case_id && !form.value.task_name?.trim()) {
      Notify.create({
        type: 'warning',
        message: 'Choisissez une mission ou une tâche',
      })
      return
    }

    let taskId = null
    const taskName = form.value.task_name?.trim() || ''
    if (taskName) {
      const existing = tasks.value.find(
        (t) => String(t.name || '').trim().toLowerCase() === taskName.toLowerCase()
      )
      if (existing) {
        taskId = existing.id
      } else if (navigator.onLine) {
        const created = await api.post('/tasks', { name: taskName })
        taskId = created.data?.id ?? null
        if (created.data) {
          tasks.value.unshift(created.data)
        }
      } else {
        Notify.create({
          type: 'warning',
          message: 'Impossible de créer une nouvelle tâche hors ligne',
        })
        return
      }
    }

    const payload = {
      case_id: form.value.case_id,
      task_id: taskId,
      work_date: form.value.work_date,
      start_time: form.value.start_time,
      end_time: form.value.end_time,
    }

    if (navigator.onLine) {
      await api.post('/work-hours', payload)
    } else {
      const user = authStore.user

      if (!user) {
        console.error('Utilisateur non connecté !')
        return
      }

      const cleanData = {
        user_id: user.id,
        ...payload,
      }

      console.log('DATA OFFLINE:', cleanData)
      await addWorkHourLocal(cleanData)
      console.log('Stocké en local (offline)')
    }

    Notify.create({
      type: 'positive',
      message: 'Feuille ajoutée',
    })

    form.value = {
      case_id: null,
      task_name: '',
      work_date: '',
      start_time: '',
      end_time: '',
    }
    timerRunning.value = false

    loadWorkHours() // 🔥 IMPORTANT
  } catch (error) {
    console.error(error)
  }
}

const deleteWorkHour = async (id) => {
  console.log('ID =', id)

  if (!id) {
    console.error('ID undefined ❌')
    return
  }

  try {
    await api.delete(`/work-hours/${id}`)
    Notify.create({
      type: 'negative',
      message: 'Supprimé',
    })
    loadWorkHours()
  } catch (error) {
    console.error(error)
  }
}

const syncOfflineData = async () => {
  const localData = await getWorkHoursLocal()

  console.log('DATA A SYNC:', localData)

  if (localData.length === 0) return

  try {
    const res = await api.post('/sync/work-hours', {
      workHours: localData,
    })

    console.log('REPONSE BACKEND:', res.data)

    await clearWorkHoursLocal()

    console.log('SYNC OK')
    Notify.create({
      type: 'positive',
      message: 'Synchronisation réussie',
    })

    loadWorkHours() // 🔥 IMPORTANT
  } catch (error) {
    console.error('SYNC ERROR', error)
  }
}

const nowAsTime = () => {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const todayAsDate = () => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const startTimer = () => {
  if (!form.value.case_id) {
    Notify.create({
      type: 'warning',
      message: 'Sélectionnez une mission avant de démarrer le minuteur',
    })
    return
  }
  if (!form.value.work_date) {
    form.value.work_date = todayAsDate()
  }
  form.value.start_time = nowAsTime()
  form.value.end_time = ''
  timerRunning.value = true
}

const stopTimer = () => {
  form.value.end_time = nowAsTime()
  timerRunning.value = false
}

window.addEventListener('online', () => {
  isOnlineState.value = true
  console.log('Internet revenu !')
  syncOfflineData()
})

window.addEventListener('offline', () => {
  isOnlineState.value = false
})

onMounted(() => {
  loadTasks()
  loadCases()
  loadWorkHours()
})
</script>

<style scoped>
.action-btn,
.delete-btn {
  border-radius: 12px;
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s ease;
}

.action-btn:hover,
.delete-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
}
</style>
