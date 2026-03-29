<template>
    <q-page class="q-pa-md">
      <div class="text-h4 q-mb-md">Dashboard</div>
  
      <!-- TOTAL HEURES -->
      <q-card class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle1">Total Heures</div>
          <div class="text-h5">{{ stats.global?.total_hours || 0 }}</div>
        </q-card-section>
      </q-card>
  
      <!-- USERS -->
      <q-card class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle1">Par utilisateur</div>
  
          <q-list>
            <q-item v-for="user in stats.users" :key="user.id">
              <q-item-section>
                {{ user.name }}
              </q-item-section>
              <q-item-section side>
                {{ user.total_hours }}
              </q-item-section>
            </q-item>
          </q-list>
  
        </q-card-section>
      </q-card>
  
      <!-- TASKS -->
      <q-card>
        <q-card-section>
          <div class="text-subtitle1">Par tâche</div>
  
          <q-list>
            <q-item v-for="task in stats.tasks" :key="task.id">
              <q-item-section>
                {{ task.name }}
              </q-item-section>
              <q-item-section side>
                {{ task.total_hours }}
              </q-item-section>
            </q-item>
          </q-list>
  
        </q-card-section>
      </q-card>
  
    </q-page>
  </template>
  
  <script setup>
  import { onMounted, ref } from "vue";
  import { api } from "src/boot/axios";
  
  const stats = ref({
    global: {},
    users: [],
    tasks: [],
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
@use "sass:color";

.q-page {
  background: linear-gradient(
    135deg,
    $primary 0%,
    color.adjust($primary, $lightness: 8%) 100%
  );
}
</style>