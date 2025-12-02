<script lang="ts" setup>
import { ref } from "vue";

const show = ref(true);

const toggle = () => {
  show.value = !show.value;
};

// 외부에서 제어할 수 있도록 expose
defineExpose({ toggle });
</script>

<template>
  <div v-if="show" class="chzzk-overlay">
    <div class="content">
      <h3>Chzzk Tools Overlay</h3>
      <p>설정 및 기능을 여기에 추가하세요.</p>
      <button @click="show = false">닫기</button>
    </div>
  </div>
</template>

<style scoped>
.chzzk-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  background: rgba(25, 25, 28, 0.85);
  color: white;
  padding: 20px;
  border-radius: 8px;
  pointer-events: auto;
  min-width: 300px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}
.content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}
button {
  background: #00f889;
  color: #000;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 10px;
}
button:hover {
  opacity: 0.9;
}
</style>
