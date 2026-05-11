<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md gt-page-title">Comptes utilisateurs</div>

    <q-card v-if="auth.canManageUsers" class="q-mb-md gt-card gt-enter-up">
      <q-card-section class="q-gutter-md">
        <div class="text-subtitle2">Nouveau compte</div>
        <div class="row q-col-gutter-sm">
          <q-input
            v-model="form.first_name"
            class="col-12 col-sm-6"
            label="Prénom"
            outlined
            dense
          />
          <q-input v-model="form.name" class="col-12 col-sm-6" label="Nom" outlined dense />
        </div>
        <q-input v-model="form.email" label="Email" outlined dense type="email" />
        <q-input
          v-model="form.password"
          label="Mot de passe"
          outlined
          dense
          :type="showPassword ? 'text' : 'password'"
        >
          <template #append>
            <q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>
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
          {{ auth.canManageUsers ? 'Liste' : 'Annuaire interne' }}
        </div>
        <q-list bordered separator>
          <q-item v-for="u in users" :key="u.id" class="gt-list-item">
            <q-item-section>
              <q-item-label>
                {{ [u.first_name, u.name].filter(Boolean).join(' ') || u.email }}
              </q-item-label>
              <q-item-label caption>{{ u.email }} — {{ roleLabel(u.role) }}</q-item-label>
            </q-item-section>
            <q-item-section side v-if="auth.canManageUsers">
              <q-btn flat round icon="more_vert">
                <q-menu>
                  <q-list style="min-width: 180px">
                    <q-item clickable v-close-popup @click="openConsultation(u)">
                      <q-item-section avatar><q-icon name="visibility" /></q-item-section>
                      <q-item-section>Consultation</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openEdit(u)">
                      <q-item-section avatar><q-icon name="edit" /></q-item-section>
                      <q-item-section>Modification</q-item-section>
                    </q-item>
                    <q-item
                      v-if="auth.isAdmin"
                      clickable
                      v-close-popup
                      @click="openPasswordChange(u)"
                    >
                      <q-item-section avatar><q-icon name="lock" /></q-item-section>
                      <q-item-section>Modifier mot de passe</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-card v-if="auth.isAdmin" class="gt-card gt-enter-up gt-delay-1 q-mt-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Employés en attente de validation</div>
        <q-list bordered separator>
          <q-item v-for="u in pendingEmployees" :key="`pending-user-${u.id}`" class="gt-list-item">
            <q-item-section>
              <q-item-label>
                {{ [u.first_name, u.name].filter(Boolean).join(' ') || u.email }}
              </q-item-label>
              <q-item-label caption>{{ u.email }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn color="primary" flat label="Valider" @click="approveEmployee(u.id)" />
            </q-item-section>
          </q-item>
          <q-item v-if="pendingEmployees.length === 0">
            <q-item-section>Aucun employé en attente.</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-dialog v-model="editOpen">
      <q-card style="min-width: 360px; max-width: 95vw">
        <q-card-section class="text-h6">Modification utilisateur</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="editForm.first_name" label="Prénom" outlined dense />
          <q-input v-model="editForm.name" label="Nom" outlined dense />
          <q-input v-model="editForm.email" label="Email" type="email" outlined dense />
          <q-select
            v-model="editForm.role"
            :options="roleOptions"
            emit-value
            map-options
            label="Rôle"
            outlined
            dense
          />
          <q-select
            v-model="editForm.company_id"
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
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" label="Enregistrer" @click="saveEdit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="consultOpen">
      <q-card style="min-width: 380px; max-width: 95vw">
        <q-card-section class="text-h6">Consultation utilisateur</q-card-section>
        <q-card-section>
          <div class="text-subtitle2">{{ consultUserLabel }}</div>
          <div class="text-caption q-mb-md">{{ consultUserEmail }}</div>
          <div class="text-subtitle2 q-mb-sm">Missions assignées</div>
          <q-list bordered separator>
            <q-item v-for="m in consultMissions" :key="`m-${m.id}`">
              <q-item-section>
                <q-item-label>{{ m.name }} — {{ m.company_name || '—' }}</q-item-label>
                <q-item-label caption>
                  {{ formatMissionDate(m.start_date) }} -> {{ formatMissionDate(m.end_date) }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="consultMissions.length === 0">
              <q-item-section>Aucune mission assignée.</q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Fermer" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="passwordChangeOpen">
      <q-card style="min-width: 360px; max-width: 95vw">
        <q-card-section class="text-h6">Modifier mot de passe utilisateur</q-card-section>
        <q-card-section class="q-gutter-md">
          <div class="text-subtitle2 q-mb-sm">{{ passwordChangeTitle }}</div>
          <q-input
            v-model="passwordChangeForm.newPassword"
            type="password"
            label="Nouveau mot de passe"
            outlined
            dense
          />
          <q-input
            v-model="passwordChangeForm.confirmPassword"
            type="password"
            label="Confirmer le mot de passe"
            outlined
            dense
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup @click="resetPasswordChangeForm" />
          <q-btn color="primary" label="Enregistrer" @click="savePasswordChange" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Notify } from 'quasar'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'src/stores/auth'
import { notifyApiError } from 'src/utils/apiError'

const auth = useAuthStore()

const allRoles = [
  { label: 'Administrateur', value: 'admin' },
  { label: 'Expert comptable', value: 'expert_comptable' },
  { label: 'Secrétaire', value: 'secretaire' },
  { label: 'Chef de mission', value: 'chef_de_mission' },
  { label: 'Collaborateur', value: 'collaborateur' },
]

const roleOptions = computed(() => {
  if (auth.isAdmin || auth.isExpertComptable) return allRoles
  if (auth.isSecretaire) {
    return allRoles.filter((r) => ['chef_de_mission', 'collaborateur'].includes(r.value))
  }
  return allRoles.filter((r) => r.value === 'collaborateur')
})

const roleLabel = (r) => {
  const normalized =
    r === 'chef' || r === 'chef_mission' ? 'chef_de_mission' : r === 'employe' ? 'collaborateur' : r
  return allRoles.find((x) => x.value === normalized)?.label ?? normalized
}

const users = ref([])
const companies = ref([])
const pendingEmployees = ref([])
const showPassword = ref(false)
const passwordChangeOpen = ref(false)
const passwordChangeTitle = ref('')
const passwordChangeForm = ref({
  user_id: null,
  newPassword: '',
  confirmPassword: '',
})
const editOpen = ref(false)
const consultOpen = ref(false)
const editForm = ref({
  id: null,
  first_name: '',
  name: '',
  email: '',
  role: 'collaborateur',
  company_id: null,
})
const consultMissions = ref([])
const consultUserLabel = ref('')
const consultUserEmail = ref('')
const form = ref({
  first_name: '',
  name: '',
  email: '',
  password: '',
  role: 'collaborateur',
  company_id: null,
})

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())

const load = async () => {
  try {
    const [u, c] = await Promise.all([api.get('/users'), api.get('/companies')])
    users.value = u.data
    companies.value = c.data
    if (auth.isAdmin) {
      const pending = await api.get('/users/pending-employee-validations')
      pendingEmployees.value = pending.data
    } else {
      pendingEmployees.value = []
    }
  } catch (e) {
    Notify.create({
      type: 'negative',
      message: e.response?.data?.message ?? 'Erreur chargement utilisateurs',
    })
  }
}

const create = async () => {
  if (!form.value.email?.trim()) {
    Notify.create({ type: 'warning', message: 'Email requis' })
    return
  }
  if (!isValidEmail(form.value.email)) {
    Notify.create({ type: 'warning', message: 'Email invalide' })
    return
  }
  if (!form.value.password?.trim()) {
    Notify.create({ type: 'warning', message: 'Mot de passe requis' })
    return
  }
  if (form.value.password.length < 6) {
    Notify.create({
      type: 'warning',
      message: 'Le mot de passe doit contenir au moins 6 caractères.',
    })
    return
  }

  try {
    const response = await api.post('/users', {
      first_name: form.value.first_name || null,
      name: form.value.name || null,
      email: form.value.email,
      password: form.value.password,
      role: form.value.role,
      company_id: form.value.company_id,
    })
    form.value = {
      first_name: '',
      name: '',
      email: '',
      password: '',
      role: 'collaborateur',
      company_id: null,
    }
    await load()
    Notify.create({
      type: response.data?.invitation_sent ? 'positive' : 'warning',
      message:
        response.data?.message ?? "Utilisateur créé (vérifiez l'état de l'envoi d'invitation)",
    })
  } catch (e) {
    notifyApiError(e, "Impossible de créer l'utilisateur.")
  }
}

const openEdit = (user) => {
  editForm.value = {
    id: user.id,
    first_name: user.first_name || '',
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'collaborateur',
    company_id: user.company_id ?? null,
  }
  editOpen.value = true
}

const openPasswordChange = (user) => {
  passwordChangeForm.value = {
    user_id: user.id,
    newPassword: '',
    confirmPassword: '',
  }
  passwordChangeTitle.value =
    [user.first_name, user.name].filter(Boolean).join(' ').trim() || 'Utilisateur'
  passwordChangeOpen.value = true
}

const resetPasswordChangeForm = () => {
  passwordChangeForm.value = {
    user_id: null,
    newPassword: '',
    confirmPassword: '',
  }
  passwordChangeTitle.value = ''
}

const savePasswordChange = async () => {
  if (!passwordChangeForm.value.newPassword || passwordChangeForm.value.newPassword.length < 6) {
    return Notify.create({
      type: 'negative',
      message: 'Le mot de passe doit contenir au moins 6 caractères.',
    })
  }
  if (passwordChangeForm.value.newPassword !== passwordChangeForm.value.confirmPassword) {
    return Notify.create({
      type: 'negative',
      message: 'Les mots de passe ne correspondent pas.',
    })
  }
  try {
    await api.put(`/users/${passwordChangeForm.value.user_id}/change-password`, {
      newPassword: passwordChangeForm.value.newPassword,
    })
    passwordChangeOpen.value = false
    resetPasswordChangeForm()
    Notify.create({ type: 'positive', message: 'Mot de passe modifié' })
  } catch (e) {
    notifyApiError(e, 'Impossible de modifier le mot de passe.')
  }
}

const saveEdit = async () => {
  if (!editForm.value.email?.trim()) {
    Notify.create({ type: 'warning', message: 'Email requis' })
    return
  }
  if (!isValidEmail(editForm.value.email)) {
    Notify.create({ type: 'warning', message: 'Email invalide' })
    return
  }

  try {
    await api.put(`/users/${editForm.value.id}`, {
      first_name: editForm.value.first_name || null,
      name: editForm.value.name || null,
      email: editForm.value.email,
      role: editForm.value.role,
      company_id: editForm.value.company_id,
    })
    editOpen.value = false
    await load()
    Notify.create({ type: 'positive', message: 'Utilisateur modifié' })
  } catch (e) {
    notifyApiError(e, 'Impossible de modifier cet utilisateur.')
  }
}

const formatMissionDate = (value) => {
  if (!value) return 'Indéfinie'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('fr-FR')
}

const openConsultation = async (user) => {
  consultUserLabel.value =
    [user.first_name, user.name].filter(Boolean).join(' ').trim() || 'Utilisateur'
  consultUserEmail.value = user.email || ''
  consultMissions.value = []
  consultOpen.value = true
  try {
    const res = await api.get(`/users/${user.id}/missions`)
    consultMissions.value = Array.isArray(res.data) ? res.data : []
  } catch (e) {
    Notify.create({
      type: 'negative',
      message: e.response?.data?.message ?? 'Erreur consultation missions',
    })
  }
}

const approveEmployee = async (id) => {
  try {
    await api.put(`/users/${id}/validate`)
    Notify.create({ type: 'positive', message: 'Collaborateur validé' })
    await load()
  } catch (e) {
    Notify.create({
      type: 'negative',
      message: e.response?.data?.message ?? 'Erreur validation employé',
    })
  }
}

onMounted(load)
</script>

<style scoped>
.action-btn {
  border-radius: 12px;
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
}
</style>
