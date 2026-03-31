const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        component: () => import("pages/LoginPage.vue"),
      },
      {
        path: "login",
        component: () => import("pages/LoginPage.vue"),
      },
      {
        path: "dashboard",
        component: () => import("pages/DashboardPage.vue"),
      },
      {
        path: "work-hours",
        component: () => import("pages/WorkHoursPage.vue"),
      },
      {
        path: "cases",
        component: () => import("pages/CasesPage.vue"),
      },
      {
        path: "companies",
        component: () => import("pages/CompaniesPage.vue"),
      },
      {
        path: "users",
        component: () => import("pages/UsersPage.vue"),
      },
      {
        path: "notifications",
        component: () => import("pages/NotificationsPage.vue"),
      },
      {
        path: "messages",
        component: () => import("pages/MessagesPage.vue"),
      },
    ],
  },
];

export default routes;