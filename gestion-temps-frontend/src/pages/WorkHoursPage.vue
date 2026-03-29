<template>
    <q-page class="q-pa-md">
  
      <div class="text-h4 q-mb-md">Feuille de Temps</div>
  
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
                {{ item.duration }} h
              </q-item-section>
            </q-item>
          </q-list>
  
        </q-card-section>
      </q-card>
  
    </q-page>
  </template>
  
  <script setup>
  import { ref, onMounted } from "vue";
  import { api } from "src/boot/axios";
  
  const tasks = ref([]);
  const workHours = ref([]);
  
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
    const res = await api.get("/work-hours");
    workHours.value = res.data;
  };
  
  // ajouter
  const addWorkHour = async () => {
    try {
      await api.post("/work-hours", form.value);
  
      form.value = {
        task_id: null,
        work_date: "",
        start_time: "",
        end_time: "",
      };
  
      loadWorkHours();
    } catch (error) {
      console.error(error);
    }
  };
  
  onMounted(() => {
    loadTasks();
    loadWorkHours();
  });
  </script>