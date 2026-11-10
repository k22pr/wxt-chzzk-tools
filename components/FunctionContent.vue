<script lang="ts" setup>
// 기능 탭 컴포넌트
import type { Options } from "@/constants";

const props = defineProps<{ options: Options }>();

const emit = defineEmits<{
  (e: "update:options", value: any): void;
}>();

// 끌어 움직이는 동안 계속 호출됨 (range 모드가 아니라 값은 항상 number)
const onNickWidth = (value: number | [number, number]) =>
  emit("update:options", { ...props.options, chatNickWidth: value as number });

// 사용불가 옵션(광고 차단·자동 화질변경·LIVE 재생바)은 ` 키를 누르고 있는 동안만 변경 가능
const unlocked = ref(false);
const onKey = (e: KeyboardEvent) => {
  if (e.code === "Backquote") unlocked.value = e.type === "keydown";
};
const lock = () => (unlocked.value = false); // 키를 뗀 걸 못 받는 경우(포커스 이탈) 대비

onMounted(() => {
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", lock);
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKey);
  window.removeEventListener("keyup", onKey);
  window.removeEventListener("blur", lock);
});
</script>

<template>
  <div w="full" grid gap="4">
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
    <div w="full" grid gap="2">
      <div w="full" flex items="top" justify="between">
        <div w="full">
          <div text="4">채팅창 정렬</div>
          <div text="3 gray-5">
            배지를 아이콘 한 칸에 모으고, 닉네임 칸을 아래 폭으로 맞추고 넘치는 글자는 자릅니다.
          </div>
        </div>
        <div>
          <a-switch
            :checked="options.useChatAlign"
            @update:checked="
              emit('update:options', { ...options, useChatAlign: $event })
            "
          />
        </div>
      </div>
      <!-- 옵션을 꺼도 값은 남도록 비활성화만 함. 움직일 때마다 저장되어 채팅창에 바로 반영됨 -->
      <div w="full" flex items="center" gap="3">
        <!-- 값은 오른쪽에 항상 보이므로 툴팁은 끔 -->
        <a-slider
          class="nick-slider"
          :min="0"
          :max="100"
          :tip-formatter="null"
          :disabled="!options.useChatAlign"
          :value="options.chatNickWidth"
          @change="onNickWidth"
        />
        <div text="3 gray-5 right" w="12" shrink="0">
          {{ options.chatNickWidth }}px
        </div>
      </div>
    </div>
    <div>
      <div w="full" grid gap="2" relative>
        <div
          v-if="!unlocked"
          absolute
          top="0"
          left="0"
          right="0"
          h="full"
          flex
          items="center"
          justify="center"
        >
          <div class="i-line-md-cancel" text="6"></div>
        </div>
        <div
          w="full"
          flex
          items="top"
          class="flex"
          :class="{ 'opacity-33': !unlocked }"
          justify="between"
        >
          <div w="full">
            <div text="4">광고 차단</div>
            <div text="3 gray-5">
              영상 광고를 차단하고, 광고 차단 안내 팝업과 홈 배너 광고를 숨깁니다.
            </div>
          </div>
          <div>
            <a-switch
              :disabled="!unlocked"
              :checked="options.useAdBlock"
              @update:checked="
                emit('update:options', { ...options, useAdBlock: $event })
              "
            />
          </div>
        </div>
      </div>
      <div w="full" grid gap="2" mt="2" relative>
        <div
          v-if="!unlocked"
          absolute
          top="0"
          left="0"
          right="0"
          h="full"
          flex
          items="center"
          justify="center"
        >
          <div class="i-line-md-cancel" text="6"></div>
        </div>
        <div
          w="full"
          flex
          items="top"
          class="flex"
          :class="{ 'opacity-33': !unlocked }"
          justify="between"
        >
          <div w="full">
            <div text="4">자동 화질변경</div>
            <div text="3 gray-5">
              광고 차단시 화질이 낮아지는 문제를 해결합니다.
            </div>
          </div>
          <div>
            <a-switch
              :disabled="!unlocked"
              :checked="options.useAutoQuality"
              @update:checked="
                emit('update:options', { ...options, useAutoQuality: $event })
              "
            />
          </div>
        </div>
      </div>
      <div w="full" grid gap="2" mt="2" relative>
        <div
          v-if="!unlocked"
          absolute
          top="0"
          left="0"
          right="0"
          h="full"
          flex
          items="center"
          justify="center"
        >
          <div class="i-line-md-cancel" text="6"></div>
        </div>
        <div
          w="full"
          flex
          items="top"
          class="flex"
          :class="{ 'opacity-33': !unlocked }"
          justify="between"
        >
          <div w="full">
            <div text="4">LIVE 재생바</div>
            <div text="3 gray-5">
              방송 접속시점부터 최대 1분30초간 재생바를 제공합니다.
            </div>
          </div>
          <div>
            <a-switch
              :disabled="!unlocked"
              :checked="options.useLiveBar"
              @update:checked="
                emit('update:options', { ...options, useLiveBar: $event })
              "
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nick-slider {
  flex: 1;
  min-width: 0;
}
</style>
