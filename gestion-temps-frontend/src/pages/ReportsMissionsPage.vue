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
            <tr v-for="(row, i) in sortedWeeklyRows" :key="`w-${i}`">
              <td>{{ row.period_start }}</td>
              <td>{{ row.mission_name }}</td>
              <td>{{ row.company_name }}</td>
              <td>{{ row.participants_count }}</td>
              <td>{{ decimalHoursToHHMM(row.total_hours) }}</td>
            </tr>
            <tr v-if="!sortedWeeklyRows.length">
              <td colspan="5" class="text-grey-7">Aucune donnée pour ce mois.</td>
            </tr>
          </tbody>
        </q-markup-table>
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
            <tr v-for="(row, i) in sortedMonthlyRows" :key="`m-${i}`">
              <td>{{ row.mission_name }}</td>
              <td>{{ row.company_name }}</td>
              <td>{{ row.participants_count }}</td>
              <td>{{ decimalHoursToHHMM(row.total_hours) }}</td>
            </tr>
            <tr v-if="!sortedMonthlyRows.length">
              <td colspan="4" class="text-grey-7">Aucune donnée pour ce mois.</td>
            </tr>
          </tbody>
        </q-markup-table>
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
            <tr v-for="(row, i) in missionRows" :key="`f-${i}`">
              <td>{{ row.mission_name }}</td>
              <td>{{ row.company_name }}</td>
              <td>{{ row.participants_count }}</td>
              <td>{{ decimalHoursToHHMM(row.total_hours) }}</td>
              <td>{{ row.start_date || '—' }}</td>
              <td>{{ row.end_date || '—' }}</td>
            </tr>
            <tr v-if="!missionRows.length">
              <td colspan="6" class="text-grey-7">Aucune mission.</td>
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
const missionRows = ref([])

function defaultMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const monthLabel = computed(() => month.value || '')
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

const sortedWeeklyRows = computed(() => sortRows(weeklyRows.value, weeklySort.value))
const sortedMonthlyRows = computed(() => sortRows(monthlyRows.value, monthlySort.value))

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
