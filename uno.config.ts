import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
} from "unocss";

export default defineConfig({
  presets: [
    presetUno(), // 기본 유틸리티 프리셋 (필수)
    presetAttributify(), // 속성 모드 선택 사항
    presetIcons(), // 아이콘 선택 사항
  ],
  // 호스트 페이지 영향 최소화가 필요하면:
  // rules/prefix 또는 preflights 비활성화(필요 시) 등을 검토
});
