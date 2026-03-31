<!-- http://localhost:9000/#/work-hours -->

<template>
    <q-page class="q-pa-md">
  
      <div class="text-h4 q-mb-md gt-page-title">Feuille de Temps</div>

      <q-banner
        v-if="!isOnlineState"
        class="gt-banner-offline q-mb-md"
      >
        Mode hors ligne — les données seront synchronisées plus tard
      </q-banner>

      <q-banner
        v-else
        class="gt-banner-online q-mb-md"
      >
        En ligne
      </q-banner>
  
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
            />

            <q-select
                v-model="form.task_id"
                class="q-mt-md"
                :options="tasks"
                option-label="name"
                option-value="id"
                emit-value
                map-options
                clearable
                label="Tâche (optionnel / historique)"
            />
  
          <q-input v-model="form.work_date" type="date" label="Date" class="q-mt-md" />
  
          <q-input v-model="form.start_time" type="time" label="Heure début" class="q-mt-md" />
  
          <q-input v-model="form.end_time" type="time" label="Heure fin" class="q-mt-md" />
  
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
            <q-item v-for="item in workHours" :key="item.id" class="gt-list-item">
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
                  @click="deleteWorkHour(item.id)"
                />
              </q-item-section>
            </q-item>
          </q-list>
  
        </q-card-section>
      </q-card>
  
    </q-page>
  </template>
  
  <script setup>
  import { ref, onMounted } from "vue";
  import { Notify } from "quasar";
  import { api } from "src/boot/axios";
  import { useAuthStore } from "src/stores/auth";
  import {
    addWorkHourLocal,
    getWorkHoursLocal,
    clearWorkHoursLocal,
  } from "src/services/db";
  
  const authStore = useAuthStore();

  const tasks = ref([]);
  const cases = ref([]);
  const workHours = ref([]);
  const isOnlineState = ref(navigator.onLine);
  
  const form = ref({
    case_id: null,
    task_id: null,
    work_date: "",
    start_time: "",
    end_time: "",
  });

  const caseLabel = (c) =>
    `${c.name}${c.company_name ? ` — ${c.company_name}` : ""}`;

  const lineLabel = (item) => {
    const mission = item.case_name
      ? `${item.case_name}${item.company_name ? ` (${item.company_name})` : ""}`
      : null;
    const task = item.task_name || null;
    const head = mission || task || "—";
    return `${head} — ${item.work_date}`;
  };

  const calculateDuration = (start, end) => {
    const s = new Date(`1970-01-01T${start}`);
    const e = new Date(`1970-01-01T${end}`);
    return (e - s) / (1000 * 60 * 60);
  };
  
  const loadTasks = async () => {
    const res = await api.get("/tasks");
    tasks.value = res.data;
  };

  const loadCases = async () => {
    const res = await api.get("/cases");
    cases.value = res.data.map((c) => ({ ...c, caseLabel: caseLabel(c) }));
  };
  
  // charger heures
  const loadWorkHours = async () => {
    try {
      let serverData = [];

      if (navigator.onLine) {
        const res = await api.get("/work-hours");
        serverData = res.data;
      }

      const localData = await getWorkHoursLocal();

      const offlineFormatted = localData.map((item, index) => ({
        ...item,
        id: item.id ?? `offline-${index}-${item.work_date}-${item.start_time}`,
        task_name: "⏳ (offline)",
        duration: "?",
        offline: true,
      }));

      workHours.value = [...offlineFormatted, ...serverData];
    } catch (error) {
      console.error(error);
    }
  };
  
  // ajouter
  const addWorkHour = async () => {
    try {
      if (!form.value.case_id && !form.value.task_id) {
        Notify.create({
          type: "warning",
          message: "Choisissez une mission ou une tâche",
        });
        return;
      }
      if (navigator.onLine) {
        await api.post("/work-hours", form.value);
      } else {
        const user = authStore.user;

        if (!user) {
          console.error("Utilisateur non connecté !");
          return;
        }

        const cleanData = {
          user_id: user.id,
          case_id: form.value.case_id,
          task_id: form.value.task_id,
          work_date: form.value.work_date,
          start_time: form.value.start_time,
          end_time: form.value.end_time,
        };

        console.log("DATA OFFLINE:", cleanData);
        await addWorkHourLocal(cleanData);
        console.log("Stocké en local (offline)");
      }

      Notify.create({
        type: "positive",
        message: "Feuille ajoutée",
      });
  
      form.value = {
        case_id: null,
        task_id: null,
        work_date: "",
        start_time: "",
        end_time: "",
      };
  
      loadWorkHours(); // 🔥 IMPORTANT
    } catch (error) {
      console.error(error);
    }
  };

  const deleteWorkHour = async (id) => {
    try {
      await api.delete(`/work-hours/${id}`);
      Notify.create({
        type: "negative",
        message: "Supprimé",
      });
      loadWorkHours();
    } catch (error) {
      console.error(error);
    }
  };
  
  const syncOfflineData = async () => {
    const localData = await getWorkHoursLocal();

    console.log("DATA A SYNC:", localData);

    if (localData.length === 0) return;

    try {
      const res = await api.post("/sync/work-hours", {
        workHours: localData,
      });

      console.log("REPONSE BACKEND:", res.data);

      await clearWorkHoursLocal();

      console.log("SYNC OK");
      Notify.create({
        type: "positive",
        message: "Synchronisation réussie",
      });

      loadWorkHours(); // 🔥 IMPORTANT
    } catch (error) {
      console.error("SYNC ERROR", error);
    }
  };

  window.addEventListener("online", () => {
    isOnlineState.value = true;
    console.log("Internet revenu !");
    syncOfflineData();
  });

  window.addEventListener("offline", () => {
    isOnlineState.value = false;
  });

  onMounted(() => {
    loadTasks();
    loadCases();
    loadWorkHours();
  });
  </script>

<style scoped>
.action-btn,
.delete-btn {
  border-radius: 12px;
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease;
}

.action-btn:hover,
.delete-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
}
</style>