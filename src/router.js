import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import ObservationSet from './views/ObservationSet.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/set/:setId', name: 'observation-set', component: ObservationSet, props: true },
  ],
})
