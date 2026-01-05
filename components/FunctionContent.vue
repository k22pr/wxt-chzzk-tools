<script lang="ts" setup>
// 기능 탭 컴포넌트

defineProps<{
  options: {
    useAutoQuality: boolean;
    useLiveBar: boolean;
    useVideoOverlay: boolean;
    useAutoRefresh: boolean;
    useVideoTime: boolean;
    useThumbnailRefresh: boolean;
  };
}>();

const emit = defineEmits<{
  (e: "update:options", value: any): void;
}>();
</script>

<template>
  <div w="full" grid gap="4">
    <div w="full" grid gap="2">
      <div w="full" flex items="top" class="flex" justify="between">
        <div w="full">
          <div text="4">자동 화질변경</div>
          <div text="3 gray-5">
            광고 차단시 화질이 낮아지는 문제를 해결합니다.
          </div>
        </div>
        <div>
          <a-switch
            :checked="options.useAutoQuality"
            @update:checked="
              emit('update:options', { ...options, useAutoQuality: $event })
            "
          />
        </div>
      </div>
    </div>
    <div w="full" grid gap="2">
      <div w="full" flex items="top" justify="between">
        <div w="full">
          <div text="4">LIVE 재생바</div>
          <div text="3 gray-5">
            방송 접속시점부터 최대 1분30초간 재생바를 제공합니다.
          </div>
        </div>
        <div>
          <a-switch
            :checked="options.useLiveBar"
            @update:checked="
              emit('update:options', { ...options, useLiveBar: $event })
            "
          />
        </div>
      </div>
    </div>
    <div w="full" grid gap="2">
      <div w="full" flex items="top" justify="between">
        <div w="full">
          <div text="4">음향 보정 (Compressor)</div>
          <div text="3 gray-5">
            볼륨/음질을 조절할 수 있는 오버레이를 표시합니다.
          </div>
        </div>
        <div>
          <a-switch
            :checked="options.useVideoOverlay"
            @update:checked="
              emit('update:options', { ...options, useVideoOverlay: $event })
            "
          />
        </div>
      </div>
    </div>
    <div w="full" grid gap="2">
      <div w="full" flex items="top" justify="between">
        <div w="full">
          <div text="4">팔로잉 자동 새로고침</div>
          <div text="3 gray-5">
            사이드바의 팔로잉 목록을 30초마다 새로고침합니다.
          </div>
        </div>
        <div>
          <a-switch
            :checked="options.useAutoRefresh"
            @update:checked="
              emit('update:options', { ...options, useAutoRefresh: $event })
            "
          />
        </div>
      </div>
    </div>
    <div w="full" grid gap="2">
      <div w="full" flex items="top" justify="between">
        <div w="full">
          <div text="4">VOD 실제 시간</div>
          <div text="3 gray-5">VOD 탐색 시 실제 방송 시간을 표시합니다.</div>
        </div>
        <div>
          <a-switch
            :checked="options.useVideoTime"
            @update:checked="
              emit('update:options', { ...options, useVideoTime: $event })
            "
          />
        </div>
      </div>
    </div>
    <div w="full" grid gap="2">
      <div w="full" flex items="top" justify="between">
        <div w="full">
          <div text="4">썸네일 자동 갱신</div>
          <div text="3 gray-5">
            라이브 썸네일을 30초마다 자동으로 갱신합니다.
          </div>
        </div>
        <div>
          <a-switch
            :checked="options.useThumbnailRefresh"
            @update:checked="
              emit('update:options', {
                ...options,
                useThumbnailRefresh: $event,
              })
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>
