<script lang="ts" setup>
const emit = defineEmits(["click"]);

console.log("hello");
</script>

<template>
  <button class="chzzk-tool-btn" @click="emit('click')" title="Chzzk Tools">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="26"
      height="26"
      viewBox="0 0 24 24"
    >
      <!-- Icon from Meteor Icons by zkreations - https://github.com/zkreations/icons/blob/main/LICENSE -->
      <g
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="2" />
        <path
          d="M5 4.9a10 10 0 0 0 0 14.2M7.8 7.7a6 6 0 0 0 0 8.6m8.4 0a6 6 0 0 0 0-8.6M19 19.1a10 10 0 0 0 0-14.2"
        />
      </g>
    </svg>
  </button>
</template>

<style scoped>
.chzzk-tool-btn {
  display: contents;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  cursor: pointer;
  color: #fff;
  transition: opacity 0.2s;
  margin-left: 8px;
  border-radius: 50%;
}
.chzzk-tool-btn:hover {
  background: hsla(0, 0%, 100%, 0.2);
}
</style>
