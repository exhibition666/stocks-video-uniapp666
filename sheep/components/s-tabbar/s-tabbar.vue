<template>
  <view class="u-page__item" v-if="tabbar?.items?.length > 0" :key="tabbarKey">
    <su-tabbar
      :value="path"
      :fixed="true"
      :placeholder="true"
      :safeAreaInsetBottom="true"
      :inactiveColor="tabbar.style.color"
      :activeColor="tabbar.style.activeColor"
      :midTabBar="tabbar.mode === 2"
      :customStyle="tabbarStyle"
    >
      <su-tabbar-item
        v-for="(item, index) in tabbar.items"
        :key="item.text"
        :text="item.text"
        :name="item.url"
        :badge="item.badge"
        :dot="item.dot"
        :badgeStyle="tabbar.badgeStyle"
        :isCenter="getTabbarCenter(index)"
        :centerImage="item.iconUrl"
        @tap="sheep.$router.go(item.url)"
      >
        <template v-slot:active-icon>
          <image class="u-page__item__slot-icon" :src="item.activeIconUrl"></image>
        </template>
        <template v-slot:inactive-icon>
          <image class="u-page__item__slot-icon" :src="item.iconUrl"></image>
        </template>
      </su-tabbar-item>
    </su-tabbar>
  </view>
</template>

<script setup>
  import { computed, unref, onMounted, onBeforeUnmount, ref, nextTick } from 'vue';
  import sheep from '@/sheep';
  import SuTabbar from '@/sheep/ui/su-tabbar/su-tabbar.vue';

  // 使用ref来强制组件重新渲染
  const tabbarKey = ref(0);

  const tabbar = computed(() => {
    return sheep.$store('app').template.basic?.tabbar;
  });

  const tabbarStyle = computed(() => {
    const backgroundStyle = tabbar.value?.style;
    if (!backgroundStyle) return {};
    
    if (backgroundStyle.bgType === 'color') {
      return { background: backgroundStyle.bgColor };
    }
    if (backgroundStyle.bgType === 'img')
      return {
        background: `url(${backgroundStyle.bgImg}) no-repeat top center / 100% auto`,
      };
    return {};
  });

  const getTabbarCenter = (index) => {
    if (!tabbar.value || unref(tabbar).mode !== 2) return false;
    return unref(tabbar).items % 2 > 0
      ? Math.ceil(unref(tabbar).items.length / 2) === index + 1
      : false;
  };

  const props = defineProps({
    path: String,
    default: '',
  });
  
  // 监听更新导航栏事件
  let updateTabbarListener = null;
  
  // 强制更新导航栏
  const forceUpdateTabbar = async () => {
    console.log('强制更新导航栏');
    
    // 确保导航栏数据已加载
    if (!tabbar.value) {
      try {
        await sheep.$store('app').getTemplate();
        console.log('导航栏数据加载成功');
      } catch (error) {
        console.error('导航栏数据加载失败:', error);
      }
    }
    
    // 强制组件重新渲染
    tabbarKey.value += 1;
    
    // 使用nextTick确保DOM已更新
    nextTick(() => {
      console.log('导航栏更新完成');
    });
  };
  
  onMounted(() => {
    // 添加导航栏更新事件监听
    updateTabbarListener = () => {
      console.log('监听到更新导航栏事件');
      forceUpdateTabbar();
    };
    
    uni.$on('updateTabbar', updateTabbarListener);
    
    // 初始化时也强制更新一次
    forceUpdateTabbar();
  });
  
  onBeforeUnmount(() => {
    // 移除事件监听
    if (updateTabbarListener) {
      uni.$off('updateTabbar', updateTabbarListener);
    }
  });
</script>

<style lang="scss">
  .u-page {
    padding: 0;

    &__item {
      &__title {
        color: var(--textSize);
        background-color: #fff;
        padding: 15px;
        font-size: 15px;

        &__slot-title {
          color: var(--textSize);
          font-size: 14px;
        }
      }

      &__slot-icon {
        width: 25px;
        height: 25px;
      }
    }
  }
</style>
