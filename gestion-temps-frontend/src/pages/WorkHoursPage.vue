<!-- http://localhost:9000/#/work-hours -->

<template>
    <q-page class="q-pa-md">
  
      <div class="text-h4 q-mb-md">Feuille de Temps</div>

      <q-banner
        v-if="!isOnlineState"
        class="bg-red text-white q-mb-md"
      >
        Mode hors ligne - les données seront synchronisées plus tard
      </q-banner>

      <q-banner
        v-else
        class="bg-green text-white q-mb-md"
      >
        En ligne
      </q-banner>
  
      <!-- FORMULAIRE -->
      <q-card class="q-mb-md">
        <q-card-section>
  
            <q-select
                v-model="form.task_id"
                :options="tasks"
                option-label="name"
                option-value="id"
                emit-value
                map-options
            />
  
          <q-input v-model="form.work_date" type="date" label="Date" class="q-mt-md" />
  
          <q-input v-model="form.start_time" type="time" label="Heure début" class="q-mt-md" />
  
          <q-input v-model="form.end_time" type="time" label="Heure fin" class="q-mt-md" />
  
        </q-card-section>
  
        <q-card-actions align="right">
          <q-btn label="Ajouter" color="primary" @click="addWorkHour" />
        </q-card-actions>
      </q-card>
  
      <!-- LISTE -->
      <q-card>
        <q-card-section>
          <div class="text-subtitle1">Historique</div>
  
          <q-list>
            <q-item v-for="item in workHours" :key="item.id">
              <q-item-section>
                {{ item.task_name }} ({{ item.work_date }})
              </q-item-section>
  
              <q-item-section side>
                <div v-if="item.offline">⏳ Sync...</div>
                <div v-else>{{ item.duration }} h</div>
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
  import {
    addWorkHourLocal,
    getWorkHoursLocal,
    clearWorkHoursLocal,
  } from "src/services/db";
  
  const tasks = ref([]);
  const workHours = ref([]);
  const isOnlineState = ref(navigator.onLine);
  
  const form = ref({
    task_id: null,
    work_date: "",
    start_time: "",
    end_time: "",
  });
  
  // charger tâches
  const loadTasks = async () => {
    const res = await api.get("/tasks");
    tasks.value = res.data;
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
      if (navigator.onLine) {
        await api.post("/work-hours", form.value);
      } else {
        const user = JSON.parse(localStorage.getItem("user"));

        if (!user) {
          console.error("Utilisateur non connecté !");
          return;
        }

        const cleanData = {
          user_id: user.id, // user_id requis pour la synchro locale/offline
          task_id: form.value.task_id,
          work_date: form.value.work_date,
          start_time: form.value.start_time,
          end_time: form.value.end_time,
        };

        console.log("DATA OFFLINE:", cleanData);
        await addWorkHourLocal(cleanData);
        console.log("Stocké en local (offline)");
        Notify.create({
          type: "warning",
          message: "Enregistré en mode offline",
        });
      }
  
      form.value = {
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
    loadWorkHours();
  });
  </script>