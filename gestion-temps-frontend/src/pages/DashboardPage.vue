<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md q-col-gutter-sm dash-head">
      <div class="text-h4 gt-page-title dash-title">Tableau de bord</div>
      <div v-if="isAdminLike" class="row q-gutter-xs dash-actions">
        <q-btn flat dense color="primary" to="/reports/missions" label="Rapport missions" />
        <q-btn flat dense color="primary" to="/reports/collaborateurs" label="Rapport collaborateurs" />
      </div>
    </div>

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

    <div v-if="isAdminLike && missionDeadlines.length" class="column q-gutter-sm q-mb-md">
      <q-banner
        v-for="row in missionDeadlines"
        :key="`${row.mission_id}-${row.level}`"
        rounded
        dense
        :class="row.bannerClass"
      >
        <template #avatar>
          <q-icon size="sm" :name="row.icon" :color="row.iconColor" />
        </template>
        <div class="row items-center justify-between mission-banner-head">
          <div class="text-weight-medium">{{ row.mission_name }}</div>
          <q-btn
            v-if="stats.role === 'admin' && Number(row.status) === 1"
            flat
            dense
            color="negative"
            label="Marquer finie"
            @click="finishMission(row.mission_id)"
          />
        </div>
        <div class="text-caption">
          Société : {{ row.company_name }} — Échéance : {{ formatDeadlineLabel(row.end_date) }}
          — {{ row.label }}
        </div>
      </q-banner>
    </div>

    <q-card class="q-mb-md gt-card gt-enter-up gt-delay-1">
      <q-card-section>
        <div class="text-subtitle1 q-mb-md">
          {{
            useTraceBarChart
              ? "Activités récentes (projet, durée, auteur)"
              : isAdminLike
                ? "Évolution des heures par mission"
                : "Évolution des heures"
          }}
        </div>
        <p v-if="!hasAnyChart" class="text-grey-7 text-body2">
          Aucune donnée pour ce profil.
        </p>
        <div v-else-if="useTraceBarChart" class="chart-wrap">
          <Bar :data="adminBarChartData" :options="adminBarChartOptions" />
        </div>
        <div v-else class="chart-wrap">
          <Line :data="lineChartData" :options="lineChartOptions" />
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="isAdminLike && stats.taskTraces?.length" class="q-mb-md gt-card gt-enter-up gt-delay-2">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Traces détaillées des tâches</div>
        <q-list separator>
          <q-item v-for="(trace, idx) in stats.taskTraces" :key="`trace-${idx}`" class="gt-list-item">
            <q-item-section>
              <q-item-label>
                {{ trace.user_name }} / {{ trace.user_role }} / {{ trace.user_email }} — {{ trace.task_name }}
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

    <q-card v-if="isAdminLike && stats.weeklyMissionSummaries?.length" class="q-mb-md gt-card">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Résumé missions hebdomadaire</div>
        <q-list separator>
          <q-item v-for="(item, idx) in stats.weeklyMissionSummaries.slice(0, 25)" :key="`wk-${idx}`">
            <q-item-section>
              <q-item-label>{{ item.mission_name }} — {{ item.company_name }}</q-item-label>
              <q-item-label caption>Semaine: {{ item.period_start }} | Participants: {{ item.participants_count }}</q-item-label>
            </q-item-section>
            <q-item-section side>{{ decimalHoursToHHMM(item.total_hours) }}</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-card v-if="isAdminLike && stats.monthlyMissionSummaries?.length" class="q-mb-md gt-card">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Résumé missions mensuel</div>
        <q-list separator>
          <q-item v-for="(item, idx) in stats.monthlyMissionSummaries.slice(0, 25)" :key="`mo-${idx}`">
            <q-item-section>
              <q-item-label>{{ item.mission_name }} — {{ item.company_name }}</q-item-label>
              <q-item-label caption>Mois: {{ item.period_start }} | Participants: {{ item.participants_count }}</q-item-label>
            </q-item-section>
            <q-item-section side>{{ decimalHoursToHHMM(item.total_hours) }}</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-card v-if="stats.role === 'collaborateur' && stats.collaboratorStats?.missionContributions?.length" class="q-mb-md gt-card">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Mes contributions par mission</div>
        <q-list separator>
          <q-item v-for="m in stats.collaboratorStats.missionContributions" :key="m.mission_id">
            <q-item-section>
              <q-item-label>{{ m.mission_name || 'Sans mission' }}</q-item-label>
              <q-item-label caption>{{ m.company_name }}</q-item-label>
            </q-item-section>
            <q-item-section side>{{ decimalHoursToHHMM(m.total_hours) }}</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-card v-if="isAdminLike && stats.topMissions?.length" class="q-mb-md gt-card gt-enter-up gt-delay-2">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Top missions</div>
        <q-markup-table flat bordered dense class="gt-table-aligned gt-table-mobile">
          <thead>
            <tr>
              <th>Mission</th>
              <th>Société</th>
              <th>Participants</th>
              <th>Total heures</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in stats.topMissions" :key="m.mission_id">
              <td>{{ m.mission_name }}</td>
              <td>{{ m.company_name }}</td>
              <td>{{ m.participants_count }}</td>
              <td>{{ decimalHoursToHHMM(m.total_hours) }}</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
    </q-card>

    <q-card v-if="isAdminLike && stats.topCollaborateurs?.length" class="q-mb-md gt-card gt-enter-up gt-delay-2">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Top collaborateurs</div>
        <q-markup-table flat bordered dense class="gt-table-aligned gt-table-mobile">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Total heures</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in stats.topCollaborateurs" :key="u.user_id">
              <td>{{ u.user_name }}</td>
              <td>{{ u.user_email }}</td>
              <td>{{ u.user_role }}</td>
              <td>{{ decimalHoursToHHMM(u.total_hours) }}</td>
            </tr>
          </tbody>
        </q-markup-table>
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
          <q-item v-for="task in stats.topTasks" :key="task.task_name || task.id" class="gt-list-item">
            <q-item-section>{{ task.name || task.task_name }}</q-item-section>
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
  topMissions: [],
  topCollaborateurs: [],
  weeklyMissionSummaries: [],
  monthlyMissionSummaries: [],
  collaboratorStats: null,
  missionDeadlines: [],
  printMode: { available: false, sections: [] },
});

const isAdminLike = computed(() =>
  ["admin", "expert_comptable"].includes(stats.value.role)
);

const DURATION_CARD_KEYS = new Set(["heures", "week", "total"]);

function formatCardValue(card) {
  if (DURATION_CARD_KEYS.has(card.key)) {
    return decimalHoursToHHMM(card.value);
  }
  return card.value;
}

function formatDeadlineLabel(iso) {
  if (!iso) return "—";
  const d = new Date(String(iso).includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("fr-FR");
}

/** Affichage court des dates type YYYY-MM-DD (graphique admin). */
function formatChartAxisDate(raw) {
  if (!raw) return "";
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return String(raw);
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

const adminBarTraces = computed(() => (stats.value.taskTraces || []).slice(0, 40));

const useTraceBarChart = computed(() => adminBarTraces.value.length > 0);

const hasLineChartData = computed(() => {
  if (useTraceBarChart.value) return false;
  if (isAdminLike.value && (stats.value.missionSeries || []).length > 0) {
    return true;
  }
  return (stats.value.hoursSeries || []).length > 0;
});

const hasAnyChart = computed(() => useTraceBarChart.value || hasLineChartData.value);

const missionDeadlines = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (stats.value.missionDeadlines || []).map((row) => {
    const end = new Date(String(row.end_date).includes("T") ? row.end_date : `${row.end_date}T12:00:00`);
    const dayMs = 24 * 60 * 60 * 1000;
    const delta = Number.isNaN(end.getTime()) ? null : Math.floor((end.getTime() - today.getTime()) / dayMs);
    const ended = Number(row.status) === 2 || (delta != null && delta < 0);
    const urgent = delta != null && delta <= 3;
    const warning = delta != null && delta <= 10;
    const level = ended ? "ended" : urgent ? "urgent" : warning ? "warning" : "ok";
    return {
      ...row,
      level,
      label:
        level === "ended"
          ? "Mission terminée ou dépassée"
          : delta == null
            ? "Date de fin invalide"
            : `Fin dans ${delta} jour${delta > 1 ? "s" : ""}`,
      bannerClass:
        level === "ended"
          ? "bg-red-1 text-red-10"
          : level === "urgent"
            ? "bg-red-1 text-red-10"
            : level === "warning"
              ? "bg-amber-1 text-amber-10"
              : "bg-green-1 text-green-10",
      icon: level === "ok" ? "event_available" : level === "warning" ? "schedule" : "event_busy",
      iconColor: level === "ok" ? "positive" : level === "warning" ? "warning" : "negative",
    };
  });
});

const adminBarChartData = computed(() => {
  const traces = adminBarTraces.value;
  return {
    labels: traces.map((t, i) => `${i + 1}. ${formatChartAxisDate(t.work_date)}`),
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
          return t ? `Point ${i + 1} — ${formatChartAxisDate(t.work_date)} OK` : "";
        },
        label: (ctx) => {
          const i = ctx.dataIndex;
          const t = adminBarTraces.value[i];
          if (!t) return [];
          return [
            `Projet (mission): ${t.mission_name}`,
            `Tâche: ${t.task_name}`,
            `Durée: ${decimalHoursToHHMM(t.duration_hours)}`,
            `Traité par: ${t.user_name} / ${t.user_role} / ${t.user_email}`,
            `Société: ${t.company_name}`,
          ];
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      title: { display: true, text: "Durée" },
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
  if (isAdminLike.value && (stats.value.missionSeries || []).length) {
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
    isAdminLike.value && (stats.value.missionSeries || []).length > 0;

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
            const trace = (stats.value.taskTraces || [])[ctx.dataIndex];
            if (trace) {
              return [
                `${trace.work_date} Durée : ${hhmm}`,
                `Mission : ${trace.mission_name}`,
                `Tâche : ${trace.task_name}`,
                `Chef de projet : ${trace.chef_name}`,
              ];
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

const finishMission = async (missionId) => {
  try {
    await api.put(`/cases/${missionId}/finish`);
    await loadDashboard();
  } catch (error) {
    console.error("Finish mission error:", error);
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

.gt-table-aligned :deep(th),
.gt-table-aligned :deep(td) {
  text-align: left;
  vertical-align: middle;
}

@media (max-width: 1023px) {
  .dash-head {
    align-items: flex-start;
  }

  .dash-title {
    font-size: 1.6rem;
  }

  .dash-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .mission-banner-head {
    flex-wrap: wrap;
    gap: 8px;
  }

  .chart-wrap {
    height: 300px;
  }
}

@media (max-width: 599px) {
  .dash-title {
    font-size: 1.35rem;
  }

  .chart-wrap {
    height: 260px;
  }

  .gt-table-mobile {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}

</style>
