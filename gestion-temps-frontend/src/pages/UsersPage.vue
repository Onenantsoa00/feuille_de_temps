<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md gt-page-title">Comptes utilisateurs</div>

    <q-card v-if="auth.canManageUsers" class="q-mb-md gt-card gt-enter-up">
      <q-card-section class="q-gutter-md">
        <div class="text-subtitle2">Nouveau compte</div>
        <div class="row q-col-gutter-sm">
          <q-input v-model="form.first_name" class="col-12 col-sm-6" label="Prénom" outlined dense />
          <q-input v-model="form.name" class="col-12 col-sm-6" label="Nom" outlined dense />
        </div>
        <q-input v-model="form.email" label="Email" outlined dense type="email" />
        <q-input v-model="form.password" label="Mot de passe" outlined dense type="password" />
        <q-select
          v-model="form.role"
          :options="roleOptions"
          emit-value
          map-options
          label="Rôle"
          outlined
          dense
        />
        <q-select
          v-model="form.company_id"
          :options="companies"
          option-label="name"
          option-value="id"
          emit-value
          map-options
          clearable
          label="Société (optionnel)"
          outlined
          dense
        />
        <q-card-actions align="right">
          <q-btn color="primary" unelevated class="action-btn" label="Créer" @click="create" />
        </q-card-actions>
      </q-card-section>
    </q-card>

    <q-card class="gt-card gt-enter-up gt-delay-1">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">
          {{ auth.canManageUsers ? "Liste" : "Annuaire interne" }}
        </div>
        <q-list bordered separator>
          <q-item v-for="u in users" :key="u.id" class="gt-list-item">
            <q-item-section>
              <q-item-label>
                {{ [u.first_name, u.name].filter(Boolean).join(" ") || u.email }}
              </q-item-label>
              <q-item-label caption>{{ u.email }} — {{ roleLabel(u.role) }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Notify } from "quasar";
import { api } from "src/boot/axios";
import { useAuthStore } from "src/stores/auth";

const auth = useAuthStore();

const allRoles = [
  { label: "Administrateur", value: "admin" },
  { label: "Secrétaire", value: "secretaire" },
  { label: "Chef de mission", value: "chef_mission" },
  { label: "Employé", value: "employe" },
];

const roleOptions = computed(() => {
  if (auth.isAdmin) return allRoles;
  return allRoles.filter((r) => ["chef_mission", "employe"].includes(r.value));
});

const roleLabel = (r) => allRoles.find((x) => x.value === r)?.label ?? r;

const users = ref([]);
const companies = ref([]);
const form = ref({
  first_name: "",
  name: "",
  email: "",
  password: "",
  role: "employe",
  company_id: null,
});

const load = async () => {
  const [u, c] = await Promise.all([api.get("/users"), api.get("/companies")]);
  users.value = u.data;
  companies.value = c.data;
};

const create = async () => {
  try {
    await api.post("/users", {
      first_name: form.value.first_name || null,
      name: form.value.name || null,
      email: form.value.email,
      password: form.value.password,
      role: form.value.role,
      company_id: form.value.company_id,
    });
    form.value = {
      first_name: "",
      name: "",
      email: "",
      password: "",
      role: auth.isSecretaire ? "employe" : "employe",
      company_id: null,
    };
    await load();
    Notify.create({ type: "positive", message: "Utilisateur créé" });
  } catch (e) {
    Notify.create({
      type: "negative",
      message: e.response?.data?.message ?? "Erreur",
    });
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
