<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md gt-page-title">Messagerie</div>

    <div class="row q-col-gutter-md" style="min-height: 420px">
      <q-card class="gt-card gt-enter-up col-12 col-md-4">
        <q-card-section class="text-subtitle2">Conversations</q-card-section>
        <q-list separator>
          <q-item
            v-for="c in conversations"
            :key="c.other_id"
            clickable
            :active="activeOther === c.other_id"
            @click="openThread(c.other_id)"
          >
            <q-item-section>
              <q-item-label>
                {{ [c.other_first_name, c.other_name].filter(Boolean).join(" ") || c.other_email }}
              </q-item-label>
              <q-item-label caption lines="2">{{ c.last_body }}</q-item-label>
            </q-item-section>
            <q-badge v-if="c.unread_count > 0" color="red" floating>
              {{ c.unread_count }}
            </q-badge>
          </q-item>
          <q-item v-if="!conversations.length">
            <q-item-section class="text-grey">Aucune conversation</q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <q-card class="gt-card gt-enter-up gt-delay-1 col-12 col-md-8 column">
        <q-card-section class="row items-center q-gutter-sm">
          <q-select
            v-model="newToId"
            class="col"
            :options="usersFiltered"
            :option-label="userLabel"
            option-value="id"
            emit-value
            map-options
            label="Nouveau message à"
            outlined
            dense
            clearable
          />
        </q-card-section>
        <q-card-section class="col scroll" style="max-height: 340px">
          <div
            v-for="m in thread"
            :key="m.id"
            class="q-mb-sm"
            :class="m.from_user_id === meId ? 'text-right' : 'text-left'"
          >
            <q-chat-message
              :name="shortName(m)"
              :text="[m.body]"
              :sent="m.from_user_id === meId"
              :stamp="formatTime(m.created_at)"
            />
          </div>
          <div v-if="activeOther && !thread.length" class="text-grey text-center q-pa-md">
            Écrivez un premier message
          </div>
        </q-card-section>
        <q-card-section class="row q-gutter-sm">
          <q-input
            v-model="draft"
            class="col"
            type="textarea"
            autogrow
            outlined
            dense
            placeholder="Votre message"
            :disable="!activeOther"
            @keydown.enter.exact.prevent="send"
          />
          <q-btn
            color="primary"
            label="Envoyer"
            unelevated
            :disable="!activeOther || !draft.trim()"
            @click="send"
          />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Notify } from "quasar";
import { api } from "src/boot/axios";
import { useAuthStore } from "src/stores/auth";

const auth = useAuthStore();
const meId = computed(() => auth.user?.id);
const conversations = ref([]);
const users = ref([]);
const thread = ref([]);
const activeOther = ref(null);
const newToId = ref(null);
const draft = ref("");

const usersFiltered = computed(() =>
  users.value.filter((u) => u.id !== meId.value)
);

const userLabel = (u) =>
  [u.first_name, u.name].filter(Boolean).join(" ").trim() || u.email;

const shortName = (m) => {
  if (m.from_user_id === meId.value) return "Moi";
  return [m.from_first_name, m.from_name].filter(Boolean).join(" ") || "…";
};

const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
};

const loadConv = async () => {
  const res = await api.get("/messages/conversations");
  conversations.value = res.data;
};

const loadUsers = async () => {
  const res = await api.get("/users");
  users.value = res.data;
};

const openThread = async (otherId) => {
  activeOther.value = otherId;
  newToId.value = null;
  const res = await api.get(`/messages/thread/${otherId}`);
  thread.value = res.data;
  await loadConv();
};

const send = async () => {
  const to =
    newToId.value && !activeOther.value ? newToId.value : activeOther.value;
  if (!to || !draft.value.trim()) return;
  try {
    await api.post("/messages/send", {
      to_user_id: to,
      body: draft.value.trim(),
    });
    draft.value = "";
    activeOther.value = to;
    newToId.value = null;
    await openThread(to);
    Notify.create({ type: "positive", message: "Message envoyé" });
  } catch (e) {
    Notify.create({
      type: "negative",
      message: e.response?.data?.message ?? "Erreur",
    });
  }
};

onMounted(async () => {
  await loadUsers();
  await loadConv();
});
</script>
