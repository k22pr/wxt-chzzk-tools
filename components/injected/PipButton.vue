<script lang="ts" setup>
const emit = defineEmits(["click"]);
</script>

<template>
  <span class="pzp-button__tooltip pzp-button__tooltip--top">PIP + 채팅</span>
  <button class="chzzk-pip-btn" @click.stop="emit('click')" title="PIP + 채팅">
    <!-- PIP 아이콘 (채팅 포함 의미) -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- 외곽 프레임 -->
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <!-- PIP 창 (비디오) -->
      <rect x="4" y="7" width="8" height="6" rx="1" fill="currentColor" />
      <!-- 채팅 라인들 -->
      <line x1="14" y1="8" x2="18" y2="8" />
      <line x1="14" y1="11" x2="18" y2="11" />
      <line x1="14" y1="14" x2="18" y2="14" />
    </svg>
  </button>
</template>

<style scoped>
.chzzk-pip-btn {
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: opacity 0.2s;
}
.chzzk-pip-btn:hover {
  background: hsla(0, 0%, 100%, 0.2);
}
</style>
