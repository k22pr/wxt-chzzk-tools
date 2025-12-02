<script lang="ts" setup>
const emit = defineEmits(["click"]);

console.log("hello");
</script>

<template>
  <span class="pzp-button__tooltip pzp-button__tooltip--top">Compressor</span>
  <button
    class="chzzk-tool-btn"
    @click.stop="emit('click')"
    title="Chzzk Tools"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 14 14"
    >
      <path
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M1 5.5v3M4 3v8M7 .5v13M10 3v8m3-5.5v3"
      />
    </svg>
  </button>
</template>

<style scoped>
.chzzk-tool-btn {
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: opacity 0.2s;
}
.chzzk-tool-btn:hover {
  background: hsla(0, 0%, 100%, 0.2);
}
</style>
