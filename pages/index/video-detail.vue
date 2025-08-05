<template>
  <s-layout title="视频详情" navbar="inner" tabbar="/pages/index/video">
    <!-- 调试信息面板（完全隐藏） -->
    <!-- <view class="debug-panel" v-if="showDebugInfo">
      <view class="debug-title">🔍 权限调试信息</view>
      <view class="debug-section">
        <view class="debug-label">用户状态:</view>
        <view class="debug-item">登录状态: {{ debugInfo.isLogin ? '✅ 已登录' : '❌ 未登录' }}</view>
        <view class="debug-item">VIP状态: {{ debugInfo.isVipUser ? '✅ VIP用户' : '❌ 非VIP用户' }}</view>
        <view class="debug-item">VIP过期时间: {{ debugInfo.vipExpireTime || '无' }}</view>
        <view class="debug-item">当前时间: {{ debugInfo.currentTimestamp }}</view>
      </view>
      <view class="debug-section">
        <view class="debug-label">视频信息:</view>
        <view class="debug-item">视频ID: {{ videoId }}</view>
        <view class="debug-item">是否VIP专享: {{ debugInfo.isVipVideo ? '✅ 是' : '❌ 否' }}</view>
        <view class="debug-item">试看时长: {{ debugInfo.previewLimit }}秒</view>
        <view class="debug-item">当前播放时间: {{ debugInfo.currentPlayTime }}秒</view>
      </view>
      <view class="debug-section">
        <view class="debug-label">权限判断:</view>
        <view class="debug-item">需要试看限制: {{ debugInfo.needPreviewLimit ? '✅ 是' : '❌ 否' }}</view>
        <view class="debug-item">显示VIP蒙层: {{ debugInfo.showVipMask ? '✅ 是' : '❌ 否' }}</view>
        <view class="debug-item">剩余试看时间: {{ debugInfo.remainTime }}秒</view>
        <view class="debug-item">判断原因: {{ debugInfo.limitReason }}</view>
      </view>
      <view class="debug-actions">
        <button class="debug-btn" @click="toggleDebugInfo">隐藏调试</button>
        <button class="debug-btn" @click="refreshDebugInfo">刷新信息</button>
      </view>
    </view> -->

    <!-- 调试按钮（完全隐藏） -->
    <!-- <view class="debug-toggle" v-if="!showDebugInfo" @click="toggleDebugInfo">
      🔍 显示调试
    </view> -->

    <view class="video-container">
      <!-- 视频播放器 -->
      <view class="video-player">
        <video
          id="video-player"
          v-if="videoDetail && videoFileUrl"
          :src="videoFileUrl"
          :poster="videoPosterUrl"
          :controls="!showVipMask"
          :show-center-play-btn="!showVipMask"
          :enable-progress-gesture="!showVipMask"
          :show-fullscreen-btn="!showVipMask"
          :show-play-btn="!showVipMask"
          :show-progress="!showVipMask"
          :vslide-gesture="!showVipMask"
          :vslide-gesture-in-fullscreen="!showVipMask"
          object-fit="contain"
          @timeupdate="onTimeUpdate"
          @ended="onVideoEnded"
          class="video-player-content"
        ></video>
        
        <!-- 加载中 -->
        <view v-if="videoLoading" class="video-loading ss-flex ss-col-center ss-row-center">
          <view class="loading-icon"></view>
          <view class="loading-text">视频加载中...</view>
        </view>
        
        <!-- VIP限制蒙层 -->
        <view v-if="showVipMask" class="vip-mask ss-flex ss-col-center ss-row-center">
          <view class="vip-mask-content ss-flex ss-flex-col ss-col-center ss-row-center">
            <view class="vip-mask-title">VIP专享内容</view>
            <view class="vip-mask-desc">开通VIP会员，畅享更多优质内容</view>
            <button class="vip-btn" @click="goToVip">立即开通</button>
          </view>
        </view>
      </view>
      
      <!-- 视频信息 -->
      <view v-if="videoDetail" class="video-info ss-p-20">
        <view class="video-title">{{ videoDetail.title }}</view>
        <view class="video-meta ss-flex ss-col-center ss-m-t-10">
          <view class="video-views ss-flex ss-col-center">
            <uni-icons type="eye" size="14" color="#999"></uni-icons>
            <text class="ss-m-l-5">{{ videoDetail.view }} 次观看</text>
          </view>
          <view class="video-time ss-flex ss-col-center ss-m-l-20">
            <uni-icons type="calendar" size="14" color="#999"></uni-icons>
            <text class="ss-m-l-5">{{ formatDate(videoDetail.createTime) }}</text>
          </view>
          <view v-if="videoDetail.isVipOnly" class="vip-tag ss-m-l-auto">VIP专享</view>
        </view>
        
        <!-- 视频描述 -->
        <view class="video-desc ss-m-t-20">
          <view class="section-title">视频介绍</view>
          <view class="section-content">{{ videoDetail.description }}</view>
        </view>
      </view>
      
      <!-- 推荐视频 -->
      <view class="recommend-videos ss-p-20">
        <view class="section-title">相关推荐</view>
        <view class="recommend-list">
          <view 
            v-for="item in recommendVideos" 
            :key="item.id" 
            class="recommend-item ss-flex ss-m-t-20"
            @click="goToDetail(item.id)"
          >
            <view class="recommend-cover">
              <image class="recommend-img" :src="getRecommendImageUrl(item.id)" mode="aspectFill"></image>
              <view class="video-duration">{{ formatDuration(item.duration) }}</view>
              <view v-if="item.isVipOnly" class="mini-vip-tag">VIP</view>
            </view>
            <view class="recommend-info ss-flex-1 ss-p-l-20">
              <view class="recommend-title ss-line-2">{{ item.title }}</view>
              <view class="video-meta ss-flex ss-col-center ss-m-t-10">
                <view class="video-views ss-flex ss-col-center">
                  <uni-icons type="eye" size="12" color="#999"></uni-icons>
                  <text class="ss-m-l-5">{{ item.view }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 加载中 -->
    <uni-load-more v-if="loading" status="loading"></uni-load-more>
    
    <!-- 空状态 -->
    <s-empty v-if="!loading && !videoDetail" text="视频不存在或已下架"></s-empty>
  </s-layout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import sheep from '@/sheep';
import dayjs from 'dayjs';
import useSignedUrlPreview from '@/sheep/utils/useSignedUrlPreview';

// 页面参数
const videoId = ref(null);

// 视频详情
const videoDetail = ref(null);
const loading = ref(true);
const videoLoading = ref(true);
const currentTime = ref(0);
const videoFileUrl = ref('');
const videoPosterUrl = ref('');
const recommendImageUrlMap = ref({});

// 调试相关
const showDebugInfo = ref(false); // 隐藏调试信息

// 用户登录状态
const isLogin = computed(() => {
  const token = uni.getStorageSync('token');
  const storeLogin = sheep.$store('user').isLogin;
  // console.log('🔍 登录状态检查:', { token: !!token, storeLogin, result: !!token && storeLogin });
  return !!token && storeLogin;
});

// 用户VIP状态
const isVipUser = computed(() => {
  if (!isLogin.value) {
    // console.log('🔍 VIP状态检查: 用户未登录，返回false');
    return false;
  }

  const userInfo = sheep.$store('user').userInfo;
  if (!userInfo) {
    // console.log('🔍 VIP状态检查: 用户信息为空，返回false');
    return false;
  }

  const now = new Date().getTime();
  const vipExpireTime = userInfo.vipExpireTime ? parseInt(userInfo.vipExpireTime) : 0;
  const isVip = vipExpireTime && vipExpireTime > now;

  // console.log('🔍 VIP状态检查:', {
  //   vipExpireTime,
  //   now,
  //   isVip,
  //   userInfo: JSON.stringify(userInfo, null, 2)
  // });

  return isVip;
});

// 是否需要试看限制
const needPreviewLimit = computed(() => {
  if (!videoDetail.value) {
    // console.log('🔍 试看限制检查: 视频详情为空，返回false');
    return false;
  }

  // 修改逻辑：所有视频都需要试看限制，除非用户是VIP
  // 不再依赖 isVipOnly 字段，而是基于用户状态判断
  const needLimit = !isLogin.value || !isVipUser.value;

  // console.log('🔍 试看限制检查 (新逻辑):', {
  //   isLogin: isLogin.value,
  //   isVipUser: isVipUser.value,
  //   needLimit,
  //   reason: needLimit ? (
  //     !isLogin.value ? '用户未登录' : '用户非VIP'
  //   ) : '用户是VIP，无限制'
  // });

  return needLimit;
});

// 试看时长限制
const previewLimit = computed(() => {
  if (!needPreviewLimit.value) return 0;

  const limit = videoDetail.value.previewLimit || 30; // 默认30秒
  // console.log('🔍 试看时长:', limit);
  return limit;
});

// 是否显示VIP蒙层
const showVipMask = computed(() => {
  if (!needPreviewLimit.value) {
    // console.log('🔍 VIP蒙层显示: 不需要试看限制，返回false');
    return false;
  }

  const shouldShow = currentTime.value >= previewLimit.value;
  // console.log('🔍 VIP蒙层显示:', {
  //   currentTime: currentTime.value,
  //   previewLimit: previewLimit.value,
  //   shouldShow
  // });

  return shouldShow;
});

// 调试信息
const debugInfo = computed(() => {
  const userInfo = sheep.$store('user').userInfo || {};
  const now = new Date().getTime();

  return {
    // 用户状态
    isLogin: isLogin.value,
    isVipUser: isVipUser.value,
    vipExpireTime: userInfo.vipExpireTime ? new Date(parseInt(userInfo.vipExpireTime)).toLocaleString() : '无',
    currentTimestamp: new Date(now).toLocaleString(),

    // 视频信息
    isVipVideo: videoDetail.value?.isVipOnly || false,
    previewLimit: previewLimit.value,
    currentPlayTime: Math.floor(currentTime.value),

    // 权限判断
    needPreviewLimit: needPreviewLimit.value,
    showVipMask: showVipMask.value,
    remainTime: Math.max(0, Math.ceil(previewLimit.value - currentTime.value)),

    // 权限判断原因
    limitReason: needPreviewLimit.value ? (
      !isLogin.value ? '未登录用户需要试看限制' : '非VIP用户需要试看限制'
    ) : 'VIP用户无限制观看'
  };
});

// 推荐视频列表
const recommendVideos = ref([]);

// 获取推荐视频的图片URL
const getRecommendImageUrl = (videoId) => {
  const video = recommendVideos.value.find(v => v.id === videoId);
  if (video && video.picUrl) {
    return recommendImageUrlMap.value[videoId] || video.picUrl;
  }
  return '/static/data-empty.png';
};

// 获取视频详情
const getVideoDetail = async () => {
  loading.value = true;
  videoLoading.value = true;
  
  try {
    const { data } = await sheep.$api.video.getVideoDetail(videoId.value);
    videoDetail.value = data;
    
    // 获取视频和封面的签名URL
    await loadVideoUrls();
    
    // 获取推荐视频
    await getRecommendVideos();
  } catch (error) {
    console.error('获取视频详情失败', error);
  } finally {
    loading.value = false;
  }
};

// 加载视频和封面URL
const loadVideoUrls = async () => {
  if (!videoDetail.value) return;
  
  try {
    // 使用固定的OSS配置ID 32
    const configId = 32;
    
    // 获取视频文件的签名URL
    if (videoDetail.value.fileUrl) {
      const videoUrlPreview = useSignedUrlPreview();
      // 视频使用更长的有效期
      const signedVideoUrl = await videoUrlPreview.fetchSignedUrl(videoDetail.value.fileUrl, true, configId, 3600);
      
      if (signedVideoUrl) {
        videoFileUrl.value = signedVideoUrl;
      } else {
        videoFileUrl.value = videoDetail.value.fileUrl;
      }
    }
    
    // 获取视频封面的签名URL
    if (videoDetail.value.picUrl) {
      const posterUrlPreview = useSignedUrlPreview();
      const signedPosterUrl = await posterUrlPreview.fetchSignedUrl(videoDetail.value.picUrl, false, configId);
      
      if (signedPosterUrl) {
        videoPosterUrl.value = signedPosterUrl;
        
        // 预加载图片
        uni.getImageInfo({
          src: signedPosterUrl,
          success: () => {},
          fail: () => {
            videoPosterUrl.value = videoDetail.value.picUrl;
          }
        });
      } else {
        videoPosterUrl.value = videoDetail.value.picUrl;
      }
    }
  } catch (error) {
    console.error('加载视频URL失败', error);
  } finally {
    videoLoading.value = false;
  }
};

// 获取推荐视频
const getRecommendVideos = async () => {
  try {
    // 这里应该调用推荐视频API，这里简单模拟通过同类型视频作为推荐
    const params = {
      pageNo: 1,
      pageSize: 5,
      typeId: videoDetail.value?.typeId,
      status: 1
    };
    
    const { data } = await sheep.$api.video.getVideoList(params);
    // 过滤掉当前视频
    recommendVideos.value = data.list.filter(item => item.id !== videoDetail.value?.id);
    
    // 获取推荐视频的封面图片
    await loadRecommendImages();
  } catch (error) {
    console.error('获取推荐视频失败', error);
  }
};

// 加载推荐视频封面图片
const loadRecommendImages = async () => {
  const configId = 32; // 使用固定的OSS配置ID
  
  for (const video of recommendVideos.value) {
    if (video.picUrl) {
      try {
        const urlPreview = useSignedUrlPreview();
        const signedUrl = await urlPreview.fetchSignedUrl(video.picUrl, false, configId);
        
        if (signedUrl) {
          recommendImageUrlMap.value[video.id] = signedUrl;
        } else {
          recommendImageUrlMap.value[video.id] = video.picUrl;
        }
      } catch (error) {
        recommendImageUrlMap.value[video.id] = video.picUrl;
      }
    }
  }
};

// 视频播放进度更新
const onTimeUpdate = (e) => {
  currentTime.value = e.detail.currentTime;

  // 如果需要试看限制且超过试看时间，暂停视频
  if (needPreviewLimit.value && currentTime.value >= previewLimit.value) {
    // console.log('🔍 试看时间到，暂停视频');
    pauseVideo();
  }
};

// 视频播放结束
const onVideoEnded = () => {
  // console.log('🔍 视频播放结束');
};

// 暂停视频
const pauseVideo = () => {
  const videoContext = uni.createVideoContext('video-player');
  if (videoContext) {
    videoContext.pause();
    // console.log('🔍 视频已暂停');
  }
};

// 调试相关方法
const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value;
};

const refreshDebugInfo = () => {
  // console.log('🔍 刷新调试信息');
  // console.log('当前用户store状态:', sheep.$store('user'));
  // console.log('当前视频详情:', videoDetail.value);
  // console.log('当前播放时间:', currentTime.value);
};

// 跳转到VIP开通页面
const goToVip = () => {
  // 从环境变量获取VIP开通页面URL
  const vipUrl = import.meta.env.SHOPRO_stocks_video_ffront_url || 'http://127.0.0.1:8001';

  // console.log('🔍 打开VIP开通页面:', vipUrl);
  // console.log('🔍 所有环境变量:', import.meta.env);

  // 使用uni.navigateToMiniProgram在小程序中打开外部链接
  // 或者使用plus.runtime.openURL在App中打开浏览器
  // #ifdef APP-PLUS
  plus.runtime.openURL(vipUrl);
  // #endif

  // #ifdef H5
  window.open(vipUrl, '_blank');
  // #endif

  // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
  // 小程序环境下复制链接到剪贴板
  uni.setClipboardData({
    data: vipUrl,
    success: () => {
      uni.showToast({
        title: '链接已复制，请在浏览器中打开',
        icon: 'none',
        duration: 3000
      });
    }
  });
  // #endif
};

// 跳转到其他视频详情
const goToDetail = (id) => {
  sheep.$router.go('/pages/index/video-detail', { id });
};

// 格式化时间
const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// 格式化日期
const formatDate = (dateString) => {
  return dayjs(dateString).format('YYYY-MM-DD');
};

// 页面加载
onLoad((options) => {
  if (options.id) {
    videoId.value = options.id;
    getVideoDetail();
  }
});

// 页面卸载
onUnmounted(() => {
  // 清理资源
});
</script>

<style lang="scss" scoped>
// 调试面板样式
.debug-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.95);
  color: #fff;
  padding: 20rpx;
  z-index: 9999;
  max-height: 70vh;
  overflow-y: auto;
  font-size: 24rpx;
  line-height: 1.4;
}

.debug-title {
  font-size: 32rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20rpx;
  color: #00ff00;
}

.debug-section {
  margin-bottom: 20rpx;
  padding: 15rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8rpx;
}

.debug-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #ffff00;
  margin-bottom: 10rpx;
}

.debug-item {
  margin-bottom: 8rpx;
  padding-left: 10rpx;
  word-break: break-all;
}

.debug-actions {
  display: flex;
  justify-content: center;
  gap: 20rpx;
  margin-top: 20rpx;
}

.debug-btn {
  background: #007aff;
  color: #fff;
  border: none;
  padding: 10rpx 20rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
}

.debug-toggle {
  position: fixed;
  top: 100rpx;
  right: 20rpx;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 10rpx 15rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  z-index: 999;
}

.video-container {
  background-color: #f5f5f5;
}

.video-player {
  position: relative;
  width: 100%;
  height: 422rpx; // 16:9比例
  background-color: #000;
}

.video-player-content {
  width: 100%;
  height: 100%;
}

.video-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 5;
  flex-direction: column;
}

.loading-icon {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid #f3f3f3;
  border-top: 6rpx solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20rpx;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: #fff;
  font-size: 28rpx;
}

.vip-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 10;
}

.vip-mask-content {
  width: 80%;
  padding: 40rpx;
  border-radius: 12rpx;
  background-color: rgba(255, 255, 255, 0.9);
}

.vip-mask-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.vip-mask-desc {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 30rpx;
  text-align: center;
}

.vip-btn {
  background-color: #FFD700;
  color: #333;
  font-size: 28rpx;
  font-weight: bold;
  padding: 16rpx 40rpx;
  border-radius: 40rpx;
  border: none;
}

.video-info {
  background-color: #fff;
  border-radius: 12rpx;
  margin: 20rpx;
}

.video-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.section-content {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
}

.recommend-videos {
  background-color: #fff;
  border-radius: 12rpx;
  margin: 0 20rpx 20rpx;
}

.recommend-item {
  margin-bottom: 20rpx;
}

.recommend-cover {
  position: relative;
  width: 240rpx;
  height: 135rpx;
  border-radius: 8rpx;
  overflow: hidden;
}

.recommend-img {
  width: 100%;
  height: 100%;
}

.recommend-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.mini-vip-tag {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  background-color: #FFD700;
  color: #333;
  font-size: 18rpx;
  font-weight: bold;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
}

.vip-tag {
  background-color: #FFD700;
  color: #333;
  font-size: 22rpx;
  font-weight: bold;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}
</style> 