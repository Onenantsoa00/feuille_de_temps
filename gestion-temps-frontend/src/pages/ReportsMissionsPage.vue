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
              <th>Participants</th>
              <th>Total heures</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in weeklyRows" :key="`w-${i}`">
              <td>{{ row.period_start }}</td>
              <td>{{ row.mission_name }}</td>
              <td>{{ row.company_name }}</td>
              <td>{{ row.participants_count }}</td>
              <td>{{ decimalHoursToHHMM(row.total_hours) }}</td>
            </tr>
            <tr v-if="!weeklyRows.length">
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
              <th>Participants</th>
              <th>Total heures</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in monthlyRows" :key="`m-${i}`">
              <td>{{ row.mission_name }}</td>
              <td>{{ row.company_name }}</td>
              <td>{{ row.participants_count }}</td>
              <td>{{ decimalHoursToHHMM(row.total_hours) }}</td>
            </tr>
            <tr v-if="!monthlyRows.length">
              <td colspan="4" class="text-grey-7">Aucune donnée pour ce mois.</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { api } from "src/boot/axios";
import { decimalHoursToHHMM } from "src/utils/formatDuration";

const month = ref(defaultMonth());
const weeklyRows = ref([]);
const monthlyRows = ref([]);

function defaultMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const monthLabel = computed(() => month.value || "");

async function load() {
  const res = await api.get("/dashboard/reports/missions", {
    params: { month: month.value },
  });
  weeklyRows.value = res.data.weekly || [];
  monthlyRows.value = res.data.monthly || [];
}

function print() {
  window.print();
}

onMounted(load);
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
