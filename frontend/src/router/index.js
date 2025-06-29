import { createRouter, createWebHistory } from 'vue-router';

import HomeView from '../views/HomeView.vue';
import DepositView from '../views/DepositView.vue';
import OpenCardView from '../views/OpenCardView.vue';
import CreditView from '../views/CreditView.vue';
import ProfileView from '../views/ProfileView.vue';
import AdminProfileView from '../views/AdminProfileView.vue';
import AdminCardApproval from '../views/AdminCardApproval.vue';
import {adminGuard, authGuard} from "../middleware/auth.js"
import AdminChatView from '../views/AdminChatView.vue';
import AdminCardRenewalView from "../views/AdminCardRenewalView.vue";
import AdminLoanApplicationsView from '../views/AdminLoanApplicationsView.vue';
import AdminDepositApprovalView from '../views/AdminDepositApprovalView.vue';

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/deposit', name: 'Deposit', component: DepositView },
  { path: '/open-card', name: 'OpenCard', component: OpenCardView, beforeEnter: authGuard},
  { path: '/credit', name: 'Credit', component: CreditView},
  { path: '/profile', name: 'Profile', component: ProfileView, beforeEnter: authGuard},
  { path: '/admin', name: 'AdminProfile', component: AdminProfileView, beforeEnter: adminGuard },
  { path: '/admin/cards', name: 'AdminCardApproval', component: AdminCardApproval, beforeEnter: adminGuard },
  { path: '/admin/chat', name: 'AdminChat', component: AdminChatView, beforeEnter: adminGuard },
  { path: '/admin/card-renewal-requests', name: 'AdminCardRenewalRequests', component: AdminCardRenewalView, beforeEnter: adminGuard},
  { path: '/admin/loan-applications', name: 'AdminLoanApplicationsView', component: AdminLoanApplicationsView, beforeEnter: adminGuard },
  { path: '/admin/deposit-applications', name: 'AdminDepositApprovalView', component: AdminDepositApprovalView, beforeEnter: adminGuard},
  { path: '/:pathMatch(.*)*', name: 'NotFound', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
