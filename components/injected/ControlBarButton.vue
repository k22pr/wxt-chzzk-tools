<!-- 컨트롤바 버튼(<button class="pzp-button">) 내부 내용. 클릭 처리는 video-overlay.content.ts -->
<template>
  <span class="pzp-button__tooltip pzp-button__tooltip--top">Compressor</span>
  <span class="chzzk-tool-btn" title="Pzzk Tools">
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
  </span>
</template>

<style scoped>
.chzzk-tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  cursor: pointer;
  color: #fff;
  transition: opacity 0.2s;
}
.chzzk-tool-btn:hover {
  background: hsla(0, 0%, 100%, 0.2);
}
</style>
