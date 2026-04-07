<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md gt-page-title">Missions</div>

    <q-card v-if="auth.canCreateMission" class="q-mb-md gt-card gt-enter-up">
      <q-card-section class="q-gutter-md">
        <q-input v-model="name" label="Nom mission" outlined dense />

        <q-select
          v-model="company_id"
          :options="companies"
          option-label="name"
          option-value="id"
          emit-value
          map-options
          label="Société"
          outlined
          dense
        />

        <q-select
          v-model="chef_id"
          :options="chefs"
          :option-label="userLabel"
          option-value="id"
          emit-value
          map-options
          label="Chef de mission"
          outlined
          dense
        />

        <q-input v-model="description" label="Description" type="textarea" outlined dense />

        <q-input v-model="start_date" label="Date début" type="date" outlined dense />

        <q-input v-model="end_date" label="Date fin" type="date" outlined dense />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn label="Ajouter" color="primary" unelevated class="action-btn" @click="addCase" />
      </q-card-actions>
    </q-card>

    <q-card class="gt-card gt-enter-up gt-delay-1">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Liste</div>
        <q-list bordered separator>
          <q-item v-for="c in cases" :key="c.id" class="gt-list-item">
            <q-item-section>
              <q-item-label>
                {{ c.name }} — {{ c.company_name ?? '—' }} —
                {{ chefDisplay(c) }}
              </q-item-label>
              <q-item-label caption>
                {{ c.description }} | {{ c.start_date }} → {{ c.end_date }}
              </q-item-label>
            </q-item-section>
            <q-item-section v-if="canAssignForCase(c)" side>
              <q-btn flat color="primary" label="Employés" @click="openAssign(c)" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-dialog v-model="assignOpen">
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">Employés sur la mission</q-card-section>
        <q-card-section>
          <q-select
            v-model="assignSelected"
            :options="employees"
            :option-label="userLabel"
            option-value="id"
            emit-value
            map-options
            multiple
            use-chips
            label="Employés assignés"
            outlined
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Fermer" v-close-popup />
          <q-btn color="primary" label="Enregistrer" @click="saveAssign" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Notify } from 'quasar'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'src/stores/auth'

const auth = useAuthStore()

const cases = ref([])
const companies = ref([])
const users = ref([])

const name = ref('')
const company_id = ref(null)
const chef_id = ref(null)
const description = ref('')
const start_date = ref('')
const end_date = ref('')

const assignOpen = ref(false)
const assignCase = ref(null)
const assignSelected = ref([])

const chefs = computed(() => users.value.filter((u) => u.role === 'chef'))

const employees = computed(() => users.value.filter((u) => u.role === 'employe'))

const userLabel = (u) => {
  const fullName = [u.first_name, u.name].filter(Boolean).join(' ').trim()
  return `${fullName} (${u.email})`
}

const chefDisplay = (c) => {
  const a = [c.chef_first_name, c.chef_name].filter(Boolean).join(' ').trim()
  return a || '—'
}

const canAssignForCase = (c) => {
  if (auth.isAdmin || auth.isSecretaire) return true
  if (auth.role === 'chef' && c.user_id === auth.user?.id) return true
  return false
}

const loadData = async () => {
  try {
    const [c, comp, u] = await Promise.all([
      api.get('/cases'),
      api.get('/companies'),
      api.get('/users'),
    ])

    cases.value = c.data
    companies.value = comp.data
    users.value = u.data
  } catch (e) {
    console.error(e)
    Notify.create({
      type: 'negative',
      message: 'Impossible de charger les missions',
    })
  }
}

const addCase = async () => {
  if (!name.value?.trim()) {
    Notify.create({ type: 'warning', message: 'Indiquez un nom de mission' })
    return
  }
  try {
    await api.post('/cases', {
      name: name.value.trim(),
      company_id: company_id.value,
      chef_id: chef_id.value,
      description: description.value,
      start_date: start_date.value,
      end_date: end_date.value,
    })
    name.value = ''
    company_id.value = null
    chef_id.value = null
    description.value = ''
    start_date.value = ''
    end_date.value = ''
    await loadData()
    Notify.create({ type: 'positive', message: 'Mission ajoutée' })
  } catch (e) {
    console.error(e)
    Notify.create({
      type: 'negative',
      message: e.response?.data?.message ?? 'Erreur à la création',
    })
  }
}

const openAssign = async (c) => {
  assignCase.value = c
  assignOpen.value = true
  try {
    const res = await api.get(`/cases/${c.id}/assignments`)
    assignSelected.value = [...(res.data.employee_ids || [])]
  } catch {
    assignSelected.value = []
  }
}

const saveAssign = async () => {
  try {
    await api.put(`/cases/${assignCase.value.id}/assignments`, {
      employee_ids: assignSelected.value,
    })
    assignOpen.value = false
    Notify.create({ type: 'positive', message: 'Assignation enregistrée' })
    await loadData()
  } catch (e) {
    Notify.create({
      type: 'negative',
      message: e.response?.data?.message ?? 'Erreur',
    })
  }
}

onMounted(loadData)
</script>

<style scoped>
.action-btn {
  border-radius: 12px;
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
}
</style>
