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
          <div class="text-h5">{{ formatCardValue(card) }}</div>
        </q-card-section>
      </q-card>
    </div>

    <q-card class="q-mb-md gt-card gt-enter-up gt-delay-1">
      <q-card-section>
        <div class="text-subtitle1 q-mb-md">
          {{
            useAdminBarChart
              ? "Activités récentes (projet, durée, auteur)"
              : stats.role === "admin"
                ? "Évolution des heures par mission"
                : "Évolution des heures"
          }}
        </div>
        <p v-if="!hasAnyChart" class="text-grey-7 text-body2">
          Aucune donnée pour ce profil.
        </p>
        <div v-else-if="useAdminBarChart" class="chart-wrap">
          <Bar :data="adminBarChartData" :options="adminBarChartOptions" />
        </div>
        <div v-else class="chart-wrap">
          <Line :data="lineChartData" :options="lineChartOptions" />
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
            <q-item-section side>{{ decimalHoursToHHMM(trace.duration_hours) }}</q-item-section>
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
            <q-item-section side>{{ decimalHoursToHHMM(user.total_hours) }}</q-item-section>
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
            <q-item-section side>{{ decimalHoursToHHMM(task.total_hours) }}</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { api } from "src/boot/axios";
import { Line, Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { decimalHoursToHHMM } from "src/utils/formatDuration";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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

const DURATION_CARD_KEYS = new Set(["heures", "week", "total"]);

function formatCardValue(card) {
  if (DURATION_CARD_KEYS.has(card.key)) {
    return decimalHoursToHHMM(card.value);
  }
  return card.value;
}

const PALETTE = [
  "#2563eb",
  "#dc2626",
  "#ea580c",
  "#16a34a",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#db2777",
  "#4f46e5",
  "#0f766e",
];

function colorForMission(name) {
  const s = String(name || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}

const adminBarTraces = computed(() =>
  stats.value.role === "admin" ? (stats.value.taskTraces || []).slice(0, 40) : []
);

const useAdminBarChart = computed(
  () => stats.value.role === "admin" && adminBarTraces.value.length > 0
);

const hasLineChartData = computed(() => {
  if (useAdminBarChart.value) return false;
  if (stats.value.role === "admin" && (stats.value.missionSeries || []).length > 0) {
    return true;
  }
  return (stats.value.hoursSeries || []).length > 0;
});

const hasAnyChart = computed(() => useAdminBarChart.value || hasLineChartData.value);

const adminBarChartData = computed(() => {
  const traces = adminBarTraces.value;
  return {
    labels: traces.map((t, i) => `${i + 1}. ${t.work_date}`),
    datasets: [
      {
        label: "Durée",
        data: traces.map((t) => Number(t.duration_hours) || 0),
        backgroundColor: traces.map((t) => colorForMission(t.mission_name)),
        borderColor: traces.map((t) => colorForMission(t.mission_name)),
        borderWidth: 1,
      },
    ],
  };
});

const adminBarChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: "y",
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (items) => {
          const i = items[0]?.dataIndex;
          const t = adminBarTraces.value[i];
          return t ? `Point ${i + 1} — ${t.work_date}` : "";
        },
        label: (ctx) => {
          const i = ctx.dataIndex;
          const t = adminBarTraces.value[i];
          if (!t) return [];
          return [
            `Projet (mission): ${t.mission_name}`,
            `Tâche: ${t.task_name}`,
            `Durée: ${decimalHoursToHHMM(t.duration_hours)}`,
            `Traité par: ${t.user_name}`,
            `Société: ${t.company_name}`,
          ];
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      title: { display: true, text: "Durée (HH:MM sur l’axe via infobulle)" },
      ticks: {
        callback: (v) => decimalHoursToHHMM(v),
      },
    },
    y: {
      ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
    },
  },
}));

const lineChartData = computed(() => {
  if (stats.value.role === "admin" && (stats.value.missionSeries || []).length) {
    const rows = stats.value.missionSeries || [];
    const dates = [...new Set(rows.map((r) => r.work_date))].sort();
    const missionNames = [...new Set(rows.map((r) => r.mission_name))];
    return {
      labels: dates,
      datasets: missionNames.map((missionName, i) => ({
        label: missionName,
        data: dates.map((d) => {
          const row = rows.find((r) => r.work_date === d && r.mission_name === missionName);
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

const lineChartOptions = computed(() => {
  const isMissionLine =
    stats.value.role === "admin" && (stats.value.missionSeries || []).length > 0;

  return {
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
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = Number(ctx.parsed.y);
            const hhmm = decimalHoursToHHMM(v);
            if (isMissionLine) {
              return [`Mission: ${ctx.dataset.label}`, `Durée ce jour: ${hhmm}`];
            }
            return [`Durée: ${hhmm}`];
          },
          footer: () =>
            isMissionLine
              ? "Vue agrégée par mission et par jour (plusieurs contributeurs possibles)."
              : "",
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Durée" },
        ticks: {
          callback: (v) => decimalHoursToHHMM(v),
        },
      },
    },
  };
});

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
  height: 360px;
}
</style>
