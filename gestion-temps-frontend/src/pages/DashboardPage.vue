<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md gt-page-title">Tableau de bord</div>

    <div class="row q-col-gutter-md q-mb-md">
      <q-card class="gt-card gt-enter-up col-12 col-sm-4">
        <q-card-section>
          <div class="text-subtitle2 text-grey-8">Missions</div>
          <div class="text-h5">{{ stats.counts?.missions ?? 0 }}</div>
        </q-card-section>
      </q-card>
      <q-card class="gt-card gt-enter-up gt-delay-1 col-12 col-sm-4">
        <q-card-section>
          <div class="text-subtitle2 text-grey-8">Employés</div>
          <div class="text-h5">{{ stats.counts?.employes ?? 0 }}</div>
        </q-card-section>
      </q-card>
      <q-card class="gt-card gt-enter-up gt-delay-2 col-12 col-sm-4">
        <q-card-section>
          <div class="text-subtitle2 text-grey-8">Sociétés</div>
          <div class="text-h5">{{ stats.counts?.societes ?? 0 }}</div>
        </q-card-section>
      </q-card>
    </div>

    <q-card class="q-mb-md gt-card gt-enter-up gt-delay-1">
      <q-card-section>
        <div class="text-subtitle1 q-mb-md">Heures par jour et par société</div>
        <p v-if="!hasChartData" class="text-grey-7 text-body2">
          Aucune donnée : enregistrez des heures liées à une mission (société)
          pour alimenter le graphique.
        </p>
        <div v-else class="chart-wrap">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </q-card-section>
    </q-card>

    <q-card class="q-mb-md gt-card gt-enter-up gt-delay-2">
      <q-card-section>
        <div class="text-subtitle1">Total Heures</div>
        <div class="text-h5">{{ stats.global?.total_hours || 0 }}</div>
      </q-card-section>
    </q-card>

    <q-card class="q-mb-md gt-card gt-enter-up gt-delay-2">
      <q-card-section>
        <div class="text-subtitle1">Par utilisateur</div>
        <q-list separator>
          <q-item v-for="user in stats.users" :key="user.id" class="gt-list-item">
            <q-item-section>{{ user.name }}</q-item-section>
            <q-item-section side>{{ user.total_hours }}</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-card class="gt-card gt-enter-up gt-delay-3">
      <q-card-section>
        <div class="text-subtitle1">Par tâche</div>
        <q-list separator>
          <q-item v-for="task in stats.tasks" :key="task.id" class="gt-list-item">
            <q-item-section>{{ task.name }}</q-item-section>
            <q-item-section side>{{ task.total_hours }}</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { api } from "src/boot/axios";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const stats = ref({
  global: {},
  users: [],
  tasks: [],
  counts: {},
  hoursByDayCompany: [],
});

const PALETTE = [
  "rgb(30, 41, 59)",
  "rgb(71, 85, 105)",
  "rgb(100, 116, 139)",
  "rgb(148, 163, 184)",
  "rgb(87, 83, 78)",
  "rgb(51, 65, 85)",
];

const hasChartData = computed(
  () => (stats.value.hoursByDayCompany || []).length > 0
);

const chartData = computed(() => {
  const rows = stats.value.hoursByDayCompany || [];
  const dates = [...new Set(rows.map((r) => r.work_date))].sort();
  const companies = [...new Set(rows.map((r) => r.company_name))];

  return {
    labels: dates,
    datasets: companies.map((name, i) => ({
      label: name,
      data: dates.map((d) => {
        const row = rows.find(
          (r) => r.work_date === d && r.company_name === name
        );
        return row ? Number(row.hours) : 0;
      }),
      borderColor: PALETTE[i % PALETTE.length],
      backgroundColor: "rgba(255,255,255,0.02)",
      tension: 0.25,
      fill: false,
    })),
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom" },
  },
  scales: {
    y: {
      beginAtZero: true,
      title: { display: true, text: "Heures" },
    },
  },
};

const loadDashboard = async () => {
  try {
    const response = await api.get("/dashboard");
    stats.value = response.data;
  } catch (error) {
    console.error("Dashboard error:", error);
  }
};

onMounted(() => {
  loadDashboard();
});
</script>

<style lang="scss" scoped>
.q-page {
  background: transparent;
}

.chart-wrap {
  height: 320px;
}
</style>
