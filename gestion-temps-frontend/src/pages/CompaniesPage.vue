<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md gt-page-title">Sociétés</div>

    <q-card v-if="auth.canManageCompanies" class="q-mb-md gt-card gt-enter-up">
      <q-card-section class="row q-col-gutter-md">
        <q-input
          v-model="newName"
          class="col-12 col-md-8"
          label="Nom"
          outlined
          dense
        />
        <div class="col-12 col-md-4 flex items-end">
          <q-btn
            color="primary"
            unelevated
            class="full-width action-btn"
            label="Ajouter"
            @click="addCompany"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-card class="gt-card gt-enter-up gt-delay-1">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Liste</div>
        <q-list bordered separator>
          <q-item v-for="c in companies" :key="c.id" class="gt-list-item">
            <q-item-section>
              <template v-if="editingId === c.id">
                <q-input v-model="editName" dense outlined />
              </template>
              <template v-else>
                {{ c.name }}
              </template>
            </q-item-section>
            <q-item-section v-if="auth.canManageCompanies" side>
              <template v-if="editingId === c.id">
                <q-btn flat color="primary" label="OK" @click="saveEdit(c.id)" />
                <q-btn flat label="Annuler" @click="cancelEdit" />
              </template>
              <template v-else>
                <q-btn flat color="primary" label="Modifier" @click="startEdit(c)" />
                <q-btn flat color="negative" label="Suppr." @click="remove(c.id)" />
              </template>
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

const auth = useAuthStore();
const companies = ref([]);
const newName = ref("");
const editingId = ref(null);
const editName = ref("");

const load = async () => {
  const res = await api.get("/companies");
  companies.value = res.data;
};

const addCompany = async () => {
  if (!newName.value?.trim()) {
    Notify.create({ type: "warning", message: "Nom requis" });
    return;
  }
  try {
    await api.post("/companies", { name: newName.value.trim() });
    newName.value = "";
    await load();
    Notify.create({ type: "positive", message: "Société ajoutée" });
  } catch (e) {
    Notify.create({
      type: "negative",
      message: e.response?.data?.message ?? "Erreur",
    });
  }
};

const startEdit = (c) => {
  editingId.value = c.id;
  editName.value = c.name;
};

const cancelEdit = () => {
  editingId.value = null;
};

const saveEdit = async (id) => {
  try {
    await api.put(`/companies/${id}`, { name: editName.value.trim() });
    editingId.value = null;
    await load();
    Notify.create({ type: "positive", message: "Mis à jour" });
  } catch {
    Notify.create({ type: "negative", message: "Erreur" });
  }
};

const remove = async (id) => {
  try {
    await api.delete(`/companies/${id}`);
    await load();
    Notify.create({ type: "positive", message: "Supprimé" });
  } catch {
    Notify.create({ type: "negative", message: "Erreur (liens existants ?)" });
  }
};

onMounted(load);
</script>

<style scoped>
.action-btn {
  border-radius: 12px;
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
}
</style>
