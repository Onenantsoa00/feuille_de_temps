<template>
  <q-page class="q-pa-md print-page">
    <div class="row items-center justify-between q-mb-md no-print">
      <div class="text-h4 gt-page-title">Rapport missions (impression)</div>
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
        <q-select
          v-model="selectedCompanyId"
          :options="companyOptions"
          emit-value
          map-options
          option-label="label"
          option-value="value"
          label="Filtre société"
          dense
          outlined
          clearable
          class="col-auto"
          style="min-width: 220px"
        />
        <q-btn color="primary" outline icon="print" label="Imprimer" @click="print" />
      </div>
    </div>

    <div class="text-h5 q-mb-sm print-only">Rapport missions — {{ monthLabel }}</div>

    <q-card class="q-mb-md gt-card">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Synthèse par semaine (dans le mois choisi)</div>
        <q-markup-table flat bordered wrap-cells class="report-table">
          <thead>
            <tr>
              <th>Semaine (début)</th>
              <th>Mission</th>
              <th>Société</th>
              <th @click="sortWeekly('participants_count')" class="sortable-header">
                Participants
                <q-icon :name="sortIcon(weeklySort, 'participants_count')" size="16px" />
              </th>
              <th @click="sortWeekly('total_hours')" class="sortable-header">
                Total heures
                <q-icon :name="sortIcon(weeklySort, 'total_hours')" size="16px" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in paginatedWeeklyRows" :key="`w-${i}`">
              <td>{{ row.period_start }}</td>
              <td>{{ row.mission_name }}</td>
              <td>{{ row.company_name }}</td>
              <td>{{ row.participants_count }}</td>
              <td>{{ decimalHoursToHHMM(row.total_hours) }}</td>
            </tr>
            <tr v-if="!paginatedWeeklyRows.length">
              <td colspan="5" class="text-grey-7">Aucune donnée pour ce mois.</td>
            </tr>
          </tbody>
        </q-markup-table>
        <div v-if="filteredWeeklyRows.length > 0" class="row justify-center q-mt-md">
          <q-pagination v-model="weeklyPage" :max="weeklyMaxPages" direction-links boundary-links />
        </div>
      </q-card-section>
    </q-card>

    <q-card class="gt-card">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Synthèse pour le mois (par mission)</div>
        <q-markup-table flat bordered wrap-cells class="report-table">
          <thead>
            <tr>
              <th>Mission</th>
              <th>Société</th>
              <th @click="sortMonthly('participants_count')" class="sortable-header">
                Participants
                <q-icon :name="sortIcon(monthlySort, 'participants_count')" size="16px" />
              </th>
              <th @click="sortMonthly('total_hours')" class="sortable-header">
                Total heures
                <q-icon :name="sortIcon(monthlySort, 'total_hours')" size="16px" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in paginatedMonthlyRows" :key="`m-${i}`">
              <td>{{ row.mission_name }}</td>
              <td>{{ row.company_name }}</td>
              <td>{{ row.participants_count }}</td>
              <td>{{ decimalHoursToHHMM(row.total_hours) }}</td>
            </tr>
            <tr v-if="!paginatedMonthlyRows.length">
              <td colspan="4" class="text-grey-7">Aucune donnée pour ce mois.</td>
            </tr>
          </tbody>
        </q-markup-table>
        <div v-if="filteredMonthlyRows.length > 0" class="row justify-center q-mt-md">
          <q-pagination
            v-model="monthlyPage"
            :max="monthlyMaxPages"
            direction-links
            boundary-links
          />
        </div>
      </q-card-section>
    </q-card>

    <q-card class="gt-card q-mt-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">
          Depuis le début de mission jusqu'à la fin (toutes missions)
        </div>
        <q-markup-table flat bordered wrap-cells class="report-table">
          <thead>
            <tr>
              <th>Mission</th>
              <th>Société</th>
              <th>Participants</th>
              <th>Total heures</th>
              <th>Date début</th>
              <th>Finie le</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in paginatedMissionRows" :key="`f-${i}`">
              <td>{{ row.mission_name }}</td>
              <td>{{ row.company_name }}</td>
              <td>{{ row.participants_count }}</td>
              <td>{{ decimalHoursToHHMM(row.total_hours) }}</td>
              <td>{{ row.start_date || '—' }}</td>
              <td>{{ row.end_date || '—' }}</td>
            </tr>
            <tr v-if="!paginatedMissionRows.length">
              <td colspan="6" class="text-grey-7">Aucune mission.</td>
            </tr>
          </tbody>
        </q-markup-table>
        <div v-if="filteredMissionRows.length > 0" class="row justify-center q-mt-md">
          <q-pagination
            v-model="missionPage"
            :max="missionMaxPages"
            direction-links
            boundary-links
          />
        </div>
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
const missionRows = ref([])
const selectedMissionId = ref(null)
const selectedCompanyId = ref(null)

const weeklyPage = ref(1)
const monthlyPage = ref(1)
const missionPage = ref(1)
const itemsPerPage = 10

function defaultMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const monthLabel = computed(() => month.value || '')

const missionOptions = computed(() => {
  const map = new Map()
  for (const row of monthlyRows.value) {
    const key = Number(row.mission_id || 0)
    if (!map.has(key)) {
      map.set(key, {
        label: row.mission_name,
        value: key,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'))
})

const companyOptions = computed(() => {
  const map = new Map()
  for (const row of monthlyRows.value) {
    const key = Number(row.company_id || 0)
    if (!map.has(key)) {
      map.set(key, {
        label: row.company_name,
        value: key,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'))
})

const filteredWeeklyRows = computed(() =>
  weeklyRows.value.filter((row) => {
    if (
      selectedMissionId.value != null &&
      Number(row.mission_id || 0) !== Number(selectedMissionId.value)
    )
      return false
    if (
      selectedCompanyId.value != null &&
      Number(row.company_id || 0) !== Number(selectedCompanyId.value)
    )
      return false
    return true
  }),
)

const filteredMonthlyRows = computed(() =>
  monthlyRows.value.filter((row) => {
    if (
      selectedMissionId.value != null &&
      Number(row.mission_id || 0) !== Number(selectedMissionId.value)
    )
      return false
    if (
      selectedCompanyId.value != null &&
      Number(row.company_id || 0) !== Number(selectedCompanyId.value)
    )
      return false
    return true
  }),
)

const filteredMissionRows = computed(() =>
  missionRows.value.filter((row) => {
    if (
      selectedMissionId.value != null &&
      Number(row.mission_id || 0) !== Number(selectedMissionId.value)
    )
      return false
    if (
      selectedCompanyId.value != null &&
      Number(row.company_id || 0) !== Number(selectedCompanyId.value)
    )
      return false
    return true
  }),
)

const weeklySort = ref({ field: 'period_start', direction: 'asc' })
const monthlySort = ref({ field: 'participants_count', direction: 'desc' })

const sortIcon = (sortState, field) => {
  if (sortState.field !== field) return 'arrow_drop_up'
  return sortState.direction === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down'
}

const sortRows = (rows, sortState) => {
  return [...rows].sort((a, b) => {
    const aValue = a[sortState.field]
    const bValue = b[sortState.field]

    if (['participants_count', 'total_hours'].includes(sortState.field)) {
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

const weeklyMaxPages = computed(() => Math.ceil(sortedWeeklyRows.value.length / itemsPerPage))
const monthlyMaxPages = computed(() => Math.ceil(sortedMonthlyRows.value.length / itemsPerPage))
const missionMaxPages = computed(() => Math.ceil(filteredMissionRows.value.length / itemsPerPage))

const paginatedWeeklyRows = computed(() => {
  const start = (weeklyPage.value - 1) * itemsPerPage
  return sortedWeeklyRows.value.slice(start, start + itemsPerPage)
})

const paginatedMonthlyRows = computed(() => {
  const start = (monthlyPage.value - 1) * itemsPerPage
  return sortedMonthlyRows.value.slice(start, start + itemsPerPage)
})

const paginatedMissionRows = computed(() => {
  const start = (missionPage.value - 1) * itemsPerPage
  return filteredMissionRows.value.slice(start, start + itemsPerPage)
})

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
  const res = await api.get('/dashboard/reports/missions', {
    params: { month: month.value },
  })
  weeklyRows.value = res.data.weekly || []
  monthlyRows.value = res.data.monthly || []
  missionRows.value = res.data.finished || []
  weeklyPage.value = 1
  monthlyPage.value = 1
  missionPage.value = 1
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
