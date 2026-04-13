<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md gt-page-title">Tableau de bord</div>

    <div class="row q-col-gutter-md q-mb-md">
      <q-card
        v-for="card in stats.cards"
        :key="card.key"
        class="gt-card gt-enter-up col-12 col-sm-6 col-md-3"
      >
        <q-card-section>
          <div class="text-subtitle2 text-grey-8">{{ card.label }}</div>
          <div class="text-h5">{{ card.value }}</div>
        </q-card-section>
      </q-card>
    </div>

    <q-card class="q-mb-md gt-card gt-enter-up gt-delay-1">
      <q-card-section>
        <div class="text-subtitle1 q-mb-md">
          {{ stats.role === "admin" ? "Évolution des heures par mission" : "Évolution des heures" }}
        </div>
        <p v-if="!hasChartData" class="text-grey-7 text-body2">
          Aucune donnée pour ce profil.
        </p>
        <div v-else class="chart-wrap">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="stats.role === 'admin' && stats.taskTraces?.length" class="q-mb-md gt-card gt-enter-up gt-delay-2">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Traces détaillées des tâches</div>
        <q-list separator>
          <q-item v-for="(trace, idx) in stats.taskTraces" :key="`trace-${idx}`" class="gt-list-item">
            <q-item-section>
              <q-item-label>
                {{ trace.user_name }} — {{ trace.task_name }}
              </q-item-label>
              <q-item-label caption>
                {{ trace.work_date }} | {{ trace.company_name }} | {{ trace.mission_name }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>{{ trace.duration_hours }} h</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-card v-if="stats.topUsers?.length" class="q-mb-md gt-card gt-enter-up gt-delay-2">
      <q-card-section>
        <div class="text-subtitle1">Top utilisateurs</div>
        <q-list separator>
          <q-item v-for="user in stats.topUsers" :key="user.id" class="gt-list-item">
            <q-item-section>{{ user.name }}</q-item-section>
            <q-item-section side>{{ user.total_hours }}</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-card v-if="stats.topTasks?.length" class="gt-card gt-enter-up gt-delay-3">
      <q-card-section>
        <div class="text-subtitle1">Top tâches</div>
        <q-list separator>
          <q-item v-for="task in stats.topTasks" :key="task.id" class="gt-list-item">
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
  role: null,
  cards: [],
  hoursSeries: [],
  missionSeries: [],
  taskTraces: [],
  topUsers: [],
  topTasks: [],
});

const PALETTE = [
  "#2563eb", // bleu
  "#dc2626", // rouge
  "#ea580c", // orange
  "#16a34a", // vert
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#ca8a04", // jaune fonce
  "#db2777", // rose
  "#4f46e5", // indigo
  "#0f766e", // teal
];

const hasChartData = computed(
  () => (stats.value.hoursSeries || []).length > 0
);

const chartData = computed(() => {
  if (stats.value.role === "admin" && (stats.value.missionSeries || []).length) {
    const rows = stats.value.missionSeries || [];
    const dates = [...new Set(rows.map((r) => r.work_date))].sort();
    const missionNames = [...new Set(rows.map((r) => r.mission_name))];
    return {
      labels: dates,
      datasets: missionNames.map((missionName, i) => ({
        label: missionName,
        data: dates.map((d) => {
          const row = rows.find(
            (r) => r.work_date === d && r.mission_name === missionName
          );
          return row ? Number(row.hours || 0) : 0;
        }),
        borderColor: PALETTE[i % PALETTE.length],
        backgroundColor: `${PALETTE[i % PALETTE.length]}22`,
        pointBackgroundColor: PALETTE[i % PALETTE.length],
        pointBorderColor: PALETTE[i % PALETTE.length],
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        tension: 0.25,
        fill: false,
      })),
    };
  }

  const rows = stats.value.hoursSeries || [];
  const dates = rows.map((r) => r.work_date);
  return {
    labels: dates,
    datasets: [
      {
        label: "Heures",
        data: rows.map((r) => Number(r.hours || 0)),
        borderColor: PALETTE[0],
        backgroundColor: `${PALETTE[0]}22`,
        pointBackgroundColor: PALETTE[0],
        pointBorderColor: PALETTE[0],
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        tension: 0.25,
        fill: false,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        usePointStyle: true,
        pointStyle: "circle",
        boxWidth: 10,
        padding: 16,
        font: {
          size: 12,
        },
      },
    },
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
