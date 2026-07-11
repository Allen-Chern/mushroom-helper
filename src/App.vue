<script setup>
// 背景飄浮孢子:手動調校的參數表(位置/大小/色系/節奏),
// 讓每一顆的軌跡與閃爍週期都錯開,比重複平鋪的 background-image 細緻得多
const spores = [
  { left: '6%', size: 7, color: 'var(--leaf)', duration: 26, delay: 0, sway: '34px', opacity: 0.5 },
  { left: '14%', size: 4, color: 'var(--sun)', duration: 34, delay: -9, sway: '-26px', opacity: 0.45 },
  { left: '22%', size: 6, color: 'var(--sky)', duration: 29, delay: -18, sway: '40px', opacity: 0.4 },
  { left: '31%', size: 3, color: 'var(--leaf)', duration: 38, delay: -4, sway: '-20px', opacity: 0.5 },
  { left: '39%', size: 8, color: 'var(--sun)', duration: 24, delay: -14, sway: '30px', opacity: 0.35 },
  { left: '47%', size: 4, color: 'var(--bloom)', duration: 36, delay: -23, sway: '-38px', opacity: 0.4 },
  { left: '55%', size: 5, color: 'var(--leaf)', duration: 28, delay: -7, sway: '24px', opacity: 0.5 },
  { left: '63%', size: 3, color: 'var(--sky)', duration: 40, delay: -28, sway: '-30px', opacity: 0.45 },
  { left: '71%', size: 7, color: 'var(--sun)', duration: 25, delay: -12, sway: '36px', opacity: 0.4 },
  { left: '79%', size: 4, color: 'var(--leaf)', duration: 33, delay: -20, sway: '-24px', opacity: 0.5 },
  { left: '86%', size: 6, color: 'var(--bloom)', duration: 30, delay: -2, sway: '28px', opacity: 0.35 },
  { left: '93%', size: 4, color: 'var(--sky)', duration: 37, delay: -16, sway: '-34px', opacity: 0.45 },
]
</script>

<template>
  <div class="garden-backdrop" aria-hidden="true">
    <span class="cloud cloud-a"></span>
    <span class="cloud cloud-b"></span>
    <span class="hill hill-back"></span>
    <span class="hill hill-mid"></span>
    <span class="hill hill-front"></span>
    <span class="ground-sprout sprout-left">🍄</span>
    <span class="ground-sprout sprout-right">🌼</span>
    <span
      v-for="(spore, index) in spores"
      :key="index"
      class="spore"
      :style="{
        left: spore.left,
        '--spore-size': `${spore.size}px`,
        '--spore-color': spore.color,
        '--spore-duration': `${spore.duration}s`,
        '--spore-delay': `${spore.delay}s`,
        '--spore-sway': spore.sway,
        '--spore-opacity': spore.opacity,
      }"
    ></span>
  </div>
  <router-view />
</template>

<style scoped>
.garden-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

/* ---- 天上的雲:大面積柔焦色塊,極慢速左右漂 ---- */
.cloud {
  position: absolute;
  border-radius: 50%;
  background: color-mix(in srgb, #ffffff 80%, transparent);
  filter: blur(28px);
  opacity: 0.55;
}

.cloud-a {
  top: 6%;
  left: -6%;
  width: 42vw;
  height: 11vh;
  animation: cloudDrift 95s ease-in-out infinite alternate;
}

.cloud-b {
  top: 15%;
  right: -10%;
  width: 34vw;
  height: 9vh;
  opacity: 0.4;
  animation: cloudDrift 130s ease-in-out -40s infinite alternate-reverse;
}

@keyframes cloudDrift {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(14vw);
  }
}

/* ---- 地平線上的丘陵:三層靜態剪影,把畫面下緣收成一座花園 ---- */
.hill {
  position: absolute;
  border-radius: 50%;
}

.hill-back {
  left: -28vw;
  bottom: -26vh;
  width: 95vw;
  height: 38vh;
  background: color-mix(in srgb, var(--leaf) 14%, var(--bg));
  opacity: 0.75;
}

.hill-mid {
  right: -30vw;
  bottom: -28vh;
  width: 100vw;
  height: 38vh;
  background: color-mix(in srgb, var(--leaf) 22%, var(--bg));
  opacity: 0.7;
}

.hill-front {
  left: -12vw;
  bottom: -32vh;
  width: 130vw;
  height: 40vh;
  background: color-mix(in srgb, var(--leaf) 30%, var(--bg));
  opacity: 0.6;
}

/* 丘陵上的小蘑菇與小花:低調的角色感點綴 */
.ground-sprout {
  position: absolute;
  font-size: 1.35rem;
  opacity: 0.55;
  filter: saturate(0.9);
  transform-origin: bottom center;
  animation: sproutSway 5.5s ease-in-out infinite;
}

.sprout-left {
  left: 6%;
  bottom: 3.5vh;
}

.sprout-right {
  right: 7%;
  bottom: 5vh;
  font-size: 1.1rem;
  animation-delay: -2.6s;
}

@keyframes sproutSway {
  0%,
  100% {
    transform: rotate(-4deg);
  }
  50% {
    transform: rotate(4deg);
  }
}

/* ---- 飄浮孢子:由下往上緩慢飄升,途中左右擺盪並輕微縮放 ---- */
.spore {
  position: absolute;
  top: 0;
  width: var(--spore-size);
  height: var(--spore-size);
  border-radius: 50%;
  background: radial-gradient(circle at 32% 32%, rgba(255, 255, 255, 0.9), var(--spore-color) 65%);
  box-shadow: 0 0 8px 1px color-mix(in srgb, var(--spore-color) 55%, transparent);
  opacity: 0;
  animation: sporeFloat var(--spore-duration) linear var(--spore-delay) infinite;
}

@keyframes sporeFloat {
  0% {
    transform: translate3d(0, 104vh, 0) scale(0.75);
    opacity: 0;
  }
  8% {
    opacity: var(--spore-opacity);
  }
  25% {
    transform: translate3d(var(--spore-sway), 76vh, 0) scale(1);
  }
  50% {
    transform: translate3d(calc(var(--spore-sway) * -0.55), 50vh, 0) scale(0.9);
  }
  75% {
    transform: translate3d(var(--spore-sway), 24vh, 0) scale(1.05);
  }
  90% {
    opacity: var(--spore-opacity);
  }
  100% {
    transform: translate3d(calc(var(--spore-sway) * -0.3), -6vh, 0) scale(0.8);
    opacity: 0;
  }
}

:root[data-theme='dark'] .cloud {
  background: color-mix(in srgb, #cfe4ff 40%, transparent);
  opacity: 0.1;
}

:root[data-theme='dark'] .cloud-b {
  opacity: 0.07;
}

/* 深色模式下孢子亮度提高、光暈加強,讀起來像螢火蟲 */
:root[data-theme='dark'] .spore {
  box-shadow: 0 0 12px 2px color-mix(in srgb, var(--spore-color) 70%, transparent);
}

:root[data-theme='dark'] .ground-sprout {
  opacity: 0.4;
}

@media (prefers-reduced-motion: reduce) {
  .cloud,
  .spore,
  .ground-sprout {
    animation: none;
  }

  .spore {
    display: none;
  }
}
</style>
