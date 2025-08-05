<!-- 股票期权小程序首页 -->
<template>
  <!-- 使用模板装修系统 -->
  <view v-if="template && template.components && template.components.length > 0">
    <s-layout
      title="股票期权系统"
      navbar="custom"
      tabbar="/pages/index/index"
      :bgStyle="template.page"
      :navbarStyle="template.navigationBar"
      onShareAppMessage
    >
      <s-block
        v-for="(item, index) in template.components"
        :key="index"
        :styles="item.property.style"
      >
        <s-block-item :type="item.id" :data="item.property" :styles="item.property.style" />
      </s-block>
    </s-layout>
  </view>

  <!-- 默认股票期权首页内容 -->
  <view v-else>
    <s-layout
      title="股票期权系统"
      navbar="normal"
      tabbar="/pages/index/index"
      :bgStyle="{ color: '#f5f7fa' }"
    >
      <!-- 调试信息 -->
      <view class="debug-info" v-if="showDebug">
        <view class="debug-title">调试信息</view>
        <view class="debug-item">Template存在: {{ !!template }}</view>
        <view class="debug-item">Components存在: {{ !!(template && template.components) }}</view>
        <view class="debug-item">Components长度: {{ template && template.components ? template.components.length : 0 }}</view>
        <view class="debug-item">当前时间: {{ new Date().toLocaleTimeString() }}</view>
        <view class="debug-item">页面状态: 正常加载</view>
        <button class="debug-btn" @click="showDebug = false">隐藏调试信息</button>
      </view>
      <!-- 顶部横幅 -->
      <view class="hero-section">
        <view class="hero-content">
          <view class="hero-title">专业期权交易平台</view>
          <view class="hero-subtitle">实时行情 · 智能分析 · 专业服务</view>
          <view class="hero-features">
            <view class="feature-item">
              <text class="feature-icon">📊</text>
              <text class="feature-text">实时行情</text>
            </view>
            <view class="feature-item">
              <text class="feature-icon">🔍</text>
              <text class="feature-text">期权询价</text>
            </view>
            <view class="feature-item">
              <text class="feature-icon">📈</text>
              <text class="feature-text">风险分析</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 快捷功能导航 -->
      <view class="quick-nav-section">
        <view class="section-title">快捷功能</view>
        <view class="nav-grid">
          <view class="nav-item" @click="goToInquiry">
            <view class="nav-icon inquiry-icon">
              <text class="icon-text">询</text>
            </view>
            <view class="nav-label">期权询价</view>
            <view class="nav-desc">专业期权定价</view>
          </view>

          <view class="nav-item" @click="goToVideo">
            <view class="nav-icon video-icon">
              <text class="icon-text">学</text>
            </view>
            <view class="nav-label">视频教程</view>
            <view class="nav-desc">期权知识学习</view>
          </view>
        </view>
      </view>

      <!-- 市场概览 -->
      <view class="market-overview-section">
        <view class="section-title">市场概览</view>
        <view class="market-stats">
          <view class="stat-item">
            <view class="stat-value">{{ marketData.totalStocks }}</view>
            <view class="stat-label">可交易股票</view>
          </view>
          <view class="stat-item">
            <view class="stat-value">{{ marketData.totalOptions }}</view>
            <view class="stat-label">期权合约</view>
          </view>
          <view class="stat-item">
            <view class="stat-value">{{ marketData.activeUsers }}</view>
            <view class="stat-label">活跃用户</view>
          </view>
        </view>
      </view>

      <!-- 热门股票部分已移除 -->

      <!-- 功能介绍 -->
      <view class="features-section">
        <view class="section-title">平台优势</view>
        <view class="features-list">
          <view class="feature-card">
            <view class="feature-icon-large">⚡</view>
            <view class="feature-title">实时计算</view>
          </view>

          <view class="feature-card">
            <view class="feature-icon-large">🛡️</view>
            <view class="feature-title">风险管控</view>
          </view>

          <view class="feature-card">
            <view class="feature-icon-large">📱</view>
            <view class="feature-title">移动便捷</view>
          </view>
        </view>
      </view>
    </s-layout>
  </view>
</template>

<script setup>
  import { computed, ref, reactive, onMounted } from 'vue';
  import { onLoad, onPageScroll, onPullDownRefresh } from '@dcloudio/uni-app';
  import sheep from '@/sheep';
  import $share from '@/sheep/platform/share';

  // 隐藏原生tabBar
  uni.hideTabBar({
    fail: () => {},
  });

  const template = computed(() => sheep.$store('app').template?.home);

  // 调试模式
  const showDebug = ref(false);

  // 市场数据
  const marketData = reactive({
    totalStocks: '2,500+',
    totalOptions: '15,000+',
    activeUsers: '50,000+'
  });

  // 热门股票数据已移除

  // 页面跳转方法
  const goToInquiry = () => {
    sheep.$router.go('/pages/index/inquiry');
  };

  const goToVideo = () => {
    sheep.$router.go('/pages/index/video');
  };

  // 初始化首页模板
  const initHomeTemplate = () => {
    console.log('开始初始化首页模板...');

    // 强制初始化应用store
    if (!sheep.$store('app').template) {
      sheep.$store('app').template = {};
      console.log('初始化应用模板store');
    }

    // 强制设置默认模板，确保页面能够显示
    const defaultTemplate = {
      page: {
        color: '#f5f7fa',
        src: ''
      },
      navigationBar: {
        background: '#667eea',
        color: '#ffffff'
      },
      components: [] // 空数组，这样会显示默认内容
    };

    // 设置默认模板到store
    sheep.$store('app').template.home = defaultTemplate;
    console.log('设置默认模板完成:', defaultTemplate);
  };

  onLoad(async (options) => {
    console.log('首页加载开始...');

    // 先初始化模板，确保页面能显示
    initHomeTemplate();
    console.log('模板初始化完成, template:', template.value);

    // 尝试初始化应用（如果失败也不影响页面显示）
    try {
      if (sheep.$store('app').init) {
        await sheep.$store('app').init();
        console.log('应用初始化完成');
      }
    } catch (error) {
      console.error('应用初始化失败，使用默认模板:', error);
    }

    // #ifdef MP
    // 小程序识别二维码
    if (options && options.scene) {
      try {
        const sceneParams = decodeURIComponent(options.scene).split('=');
        console.log('sceneParams=>', sceneParams);
        options[sceneParams[0]] = sceneParams[1];
      } catch (error) {
        console.error('解析scene参数失败:', error);
      }
    }
    // #endif

    // 预览模板
    if (options && options.templateId) {
      try {
        await sheep.$store('app').init(options.templateId);
      } catch (error) {
        console.error('预览模板加载失败:', error);
      }
    }

    // 解析分享信息
    if (options && options.spm) {
      try {
        $share.decryptSpm(options.spm);
      } catch (error) {
        console.error('解析分享信息失败:', error);
      }
    }

    // 进入指定页面(完整页面路径)
    if (options && options.page) {
      try {
        sheep.$router.go(decodeURIComponent(options.page));
      } catch (error) {
        console.error('页面跳转失败:', error);
      }
    }

    console.log('首页加载完成');
  });

  // 下拉刷新
  onPullDownRefresh(() => {
    // 刷新市场数据
    loadMarketData();
    sheep.$store('app').init();
    setTimeout(function () {
      uni.stopPullDownRefresh();
    }, 800);
  });

  // 加载市场数据
  const loadMarketData = () => {
    // 模拟数据更新
    marketData.totalStocks = (Math.floor(Math.random() * 500) + 2500) + '+';
    marketData.totalOptions = (Math.floor(Math.random() * 5000) + 15000) + '+';
    marketData.activeUsers = (Math.floor(Math.random() * 10000) + 50000) + '+';
  };

  onMounted(() => {
    loadMarketData();
  });

  onPageScroll(() => {});
</script>

<style lang="scss" scoped>
/* 调试信息样式 */
.debug-info {
  background: #fff;
  margin: 20rpx;
  padding: 20rpx;
  border-radius: 8rpx;
  border: 2rpx solid #ff0000;
}

.debug-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #ff0000;
  margin-bottom: 15rpx;
}

.debug-item {
  font-size: 24rpx;
  color: #333;
  margin-bottom: 8rpx;
  word-break: break-all;
}

.debug-btn {
  margin-top: 15rpx;
  padding: 10rpx 20rpx;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 4rpx;
  font-size: 22rpx;
}

/* 顶部横幅区域 */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60rpx 30rpx 40rpx;
  color: #fff;
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

.hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
}

.hero-title {
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 15rpx;
  text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.3);
}

.hero-subtitle {
  font-size: 28rpx;
  opacity: 0.9;
  margin-bottom: 40rpx;
}

.hero-features {
  display: flex;
  justify-content: center;
  gap: 40rpx;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.feature-icon {
  font-size: 32rpx;
}

.feature-text {
  font-size: 22rpx;
  opacity: 0.8;
}

/* 快捷功能导航 */
.quick-nav-section {
  padding: 40rpx 30rpx;
  background: #fff;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
  position: relative;
  padding-left: 20rpx;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 32rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 3rpx;
}

.nav-grid {
  display: flex;
  gap: 20rpx;
  justify-content: center;
}

.nav-grid .nav-item {
  flex: 1;
  max-width: 300rpx;
}

.nav-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx 20rpx;
  text-align: center;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.08);
  border: 1px solid #f0f0f0;
  transition: all 0.3s ease;
}

.nav-item:active {
  transform: translateY(2rpx);
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.12);
}

.nav-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 15rpx;
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}

.inquiry-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.market-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.analysis-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.video-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.icon-text {
  font-size: 32rpx;
  font-weight: bold;
}

.nav-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.nav-desc {
  font-size: 22rpx;
  color: #666;
}

/* 市场概览 */
.market-overview-section {
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.market-stats {
  display: flex;
  justify-content: space-around;
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx 20rpx;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.08);
}

.stat-item {
  text-align: center;
  flex: 1;
}

.stat-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 22rpx;
  color: #666;
}

/* 热门股票样式已移除 */

/* 功能介绍 */
.features-section {
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.feature-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.08);
}

.feature-icon-large {
  font-size: 48rpx;
  margin-right: 25rpx;
  width: 80rpx;
  text-align: center;
}

.feature-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}
</style>
