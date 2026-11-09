export const STORAGE_KEY = "chzzk-tools:options";

// 팝업과 모든 content script가 공유하는 옵션 기본값 (저장값이 없거나 일부 키가 빠졌을 때 사용)
export const DEFAULT_OPTIONS = {
  useAutoQuality: false,
  useLiveBar: false,
  useVideoOverlay: true,
  useAutoRefresh: true,
  useVideoTime: true,
  useThumbnailRefresh: true,
  useVideoUI: false,
  useHideBanner: false,
  useHideRecommend: false,
  useHideRecommendContent: false,
  useThumbnailZoom: false,
};

export type Options = typeof DEFAULT_OPTIONS;

// 치지직 클래스명은 빌드마다 해시가 바뀌므로(_name_hash_line) 분석용 data-nlog-area 마커로 찾는다
export const SELECTOR = {
  topBanner: 'section:has([data-nlog-area="schedule_banner"])',
  recommendLive: 'section:has([data-nlog-area="chzzk_main_top_live"])',
  // 홈의 수동 추천 그룹 카드('치지직 추천 콘텐츠' 등)
  recommendContent: 'section[data-nlog-area="chzzk_card"][data-nlog-params*="GROUPED_M_RECOMMENDED"]',
};
