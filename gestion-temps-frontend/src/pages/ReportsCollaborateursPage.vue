<template>
  <q-page class="q-pa-md print-page">
    <div class="row items-center justify-between q-mb-md no-print">
      <div class="text-h4 gt-page-title">Rapport collaborateurs (impression)</div>
      <div class="row q-gutter-sm items-center">
        <q-input
          v-model="month"
          type="month"
          label="Mois"
          dense
          outlined
          class="col-auto"
          style="min-width: 180px"
          @update:model-value="load"
        />
        <q-select
          v-model="selectedUserId"
          :options="collaboratorOptions"
          emit-value
          map-options
          option-label="label"
          option-value="value"
          label="Filtre utilisateur"
          dense
          outlined
          clearable
          class="col-auto"
          style="min-width: 220px"
        />
        <q-select
          v-model="selectedMissionId"
          :options="missionOptions"
          emit-value
          map-options
          option-label="label"
          option-value="value"
          label="Filtre mission"
          dense
          outlined
          clearable
          class="col-auto"
          style="min-width: 220px"
        />
        <q-btn color="primary" outline icon="print" label="Imprimer" @click="print" />
      </div>
    </div>

    <div class="text-h5 q-mb-sm print-only">Rapport collaborateurs — {{ monthLabel }}</div>

    <q-card class="q-mb-md gt-card">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Par semaine (dans le mois choisi)</div>
        <q-markup-table flat bordered wrap-cells class="report-table">
          <thead>
            <tr>
              <th>Semaine (début)</th>
              <th>Collaborateur</th>
              <th>Email</th>
              <th @click="sortWeekly('user_role')" class="sortable-header">
                Rôle
                <q-icon :name="sortIcon(weeklySort, 'user_role')" size="16px" />
              </th>
              <th @click="sortWeekly('task_name')" class="sortable-header">
                Tâche
                <q-icon :name="sortIcon(weeklySort, 'task_name')" size="16px" />
              </th>
              <th>Mission</th>
              <th>Société</th>
              <th @click="sortWeekly('entries_count')" class="sortable-header">
                Entrées
                <q-icon :name="sortIcon(weeklySort, 'entries_count')" size="16px" />
              </th>
              <th @click="sortWeekly('total_hours')" class="sortable-header">
                Total heures
                <q-icon :name="sortIcon(weeklySort, 'total_hours')" size="16px" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in sortedWeeklyRows" :key="`w-${i}`">
              <td>{{ row.period_start }}</td>
              <td>{{ row.user_name }}</td>
              <td>{{ row.user_email }}</td>
              <td>{{ row.user_role }}</td>
              <td>{{ row.task_name }}</td>
              <td>{{ row.mission_name }}</td>
              <td>{{ row.company_name }}</td>
              <td>{{ row.entries_count }}</td>
              <td>{{ decimalHoursToHHMM(row.total_hours) }}</td>
            </tr>
            <tr v-if="!sortedWeeklyRows.length">
              <td colspan="9" class="text-grey-7">Aucune donnée pour ce filtre.</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
    </q-card>

    <q-card class="gt-card">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Pour le mois entier (par collaborateur)</div>
        <q-markup-table flat bordered wrap-cells class="report-table">
          <thead>
            <tr>
              <th>Collaborateur</th>
              <th>Email</th>
              <th @click="sortMonthly('user_role')" class="sortable-header">
                Rôle
                <q-icon :name="sortIcon(monthlySort, 'user_role')" size="16px" />
              </th>
              <th @click="sortMonthly('task_name')" class="sortable-header">
                Tâche
                <q-icon :name="sortIcon(monthlySort, 'task_name')" size="16px" />
              </th>
              <th>Mission</th>
              <th>Société</th>
              <th @click="sortMonthly('entries_count')" class="sortable-header">
                Entrées
                <q-icon :name="sortIcon(monthlySort, 'entries_count')" size="16px" />
              </th>
              <th @click="sortMonthly('total_hours')" class="sortable-header">
                Total heures
                <q-icon :name="sortIcon(monthlySort, 'total_hours')" size="16px" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in sortedMonthlyRows" :key="`m-${i}`">
              <td>{{ row.user_name }}</td>
              <td>{{ row.user_email }}</td>
              <td>{{ row.user_role }}</td>
              <td>{{ row.task_name }}</td>
              <td>{{ row.mission_name }}</td>
              <td>{{ row.company_name }}</td>
              <td>{{ row.entries_count }}</td>
              <td>{{ decimalHoursToHHMM(row.total_hours) }}</td>
            </tr>
            <tr v-if="!sortedMonthlyRows.length">
              <td colspan="8" class="text-grey-7">Aucune donnée pour ce filtre.</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
    </q-card>

    <q-card class="gt-card q-mt-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Récapitulation du collaborateur durant le mois</div>
        <q-markup-table flat bordered wrap-cells class="report-table">
          <thead>
            <tr>
              <th>Collaborateur</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Total heures</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in recapRows" :key="`r-${i}`">
              <td>{{ row.user_name }}</td>
              <td>{{ row.user_email }}</td>
              <td>{{ row.user_role }}</td>
              <td>{{ decimalHoursToHHMM(row.total_hours) }}</td>
            </tr>
            <tr v-if="!recapRows.length">
              <td colspan="4" class="text-grey-7">Aucune récapitulation pour ce mois.</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from 'src/boot/axios'
import { decimalHoursToHHMM } from 'src/utils/formatDuration'

const month = ref(defaultMonth())
const weeklyRows = ref([])
const monthlyRows = ref([])
const recapRows = ref([])
const selectedUserId = ref(null)
const selectedMissionId = ref(null)

function defaultMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const monthLabel = computed(() => month.value || '')
const collaboratorOptions = computed(() => {
  const map = new Map()
  for (const row of monthlyRows.value) {
    const key = Number(row.user_id)
    if (!map.has(key)) {
      map.set(key, {
        label: `${row.user_name} (${row.user_email})`,
        value: key,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'))
})

const missionOptions = computed(() => {
  const map = new Map()
  for (const row of monthlyRows.value) {
    const key = Number(row.mission_id || 0)
    if (!map.has(key)) {
      map.set(key, {
        label: `${row.mission_name} — ${row.company_name}`,
        value: key,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'))
})

const filteredWeeklyRows = computed(() =>
  weeklyRows.value.filter((row) => {
    if (selectedUserId.value != null && Number(row.user_id) !== Number(selectedUserId.value))
      return false
    if (
      selectedMissionId.value != null &&
      Number(row.mission_id || 0) !== Number(selectedMissionId.value)
    )
      return false
    return true
  }),
)

const filteredMonthlyRows = computed(() =>
  monthlyRows.value.filter((row) => {
    if (selectedUserId.value != null && Number(row.user_id) !== Number(selectedUserId.value))
      return false
    if (
      selectedMissionId.value != null &&
      Number(row.mission_id || 0) !== Number(selectedMissionId.value)
    )
      return false
    return true
  }),
)

const weeklySort = ref({ field: 'period_start', direction: 'asc' })
const monthlySort = ref({ field: 'user_name', direction: 'asc' })

const sortIcon = (sortState, field) => {
  if (sortState.field !== field) return 'arrow_drop_up'
  return sortState.direction === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down'
}

const sortRows = (rows, sortState) => {
  return [...rows].sort((a, b) => {
    const aValue = a[sortState.field]
    const bValue = b[sortState.field]

    if (sortState.field === 'total_hours' || sortState.field === 'entries_count') {
      return sortState.direction === 'asc'
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue)
    }

    const aText = String(aValue || '').toLowerCase()
    const bText = String(bValue || '').toLowerCase()
    if (aText < bText) return sortState.direction === 'asc' ? -1 : 1
    if (aText > bText) return sortState.direction === 'asc' ? 1 : -1
    return 0
  })
}

const sortedWeeklyRows = computed(() => sortRows(filteredWeeklyRows.value, weeklySort.value))
const sortedMonthlyRows = computed(() => sortRows(filteredMonthlyRows.value, monthlySort.value))

const sortWeekly = (field) => {
  if (weeklySort.value.field === field) {
    weeklySort.value.direction = weeklySort.value.direction === 'asc' ? 'desc' : 'asc'
  } else {
    weeklySort.value.field = field
    weeklySort.value.direction = 'asc'
  }
}

const sortMonthly = (field) => {
  if (monthlySort.value.field === field) {
    monthlySort.value.direction = monthlySort.value.direction === 'asc' ? 'desc' : 'asc'
  } else {
    monthlySort.value.field = field
    monthlySort.value.direction = 'asc'
  }
}

async function load() {
  const res = await api.get('/dashboard/reports/collaborateurs', {
    params: { month: month.value },
  })
  weeklyRows.value = res.data.weekly || []
  monthlyRows.value = res.data.monthly || []
  recapRows.value = res.data.recap || []
}

function print() {
  window.print()
}

onMounted(load)
</script>

<style scoped>
.print-only {
  display: none;
}
.report-table :deep(th),
.report-table :deep(td) {
  text-align: left;
  vertical-align: middle;
}
@media print {
  .no-print {
    display: none !important;
  }
  .print-only {
    display: block !important;
  }
  .print-page {
    padding: 8px !important;
  }
}
</style>
