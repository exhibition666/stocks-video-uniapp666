<template>
  <s-layout title="视频教程" navbar="inner" tabbar="/pages/index/video">
    <!-- 搜索框 -->
    <view class="search-container ss-flex ss-col-center ss-p-x-20 ss-p-y-20">
      <view class="search-box ss-flex ss-col-center ss-flex-1">
        <uni-icons type="search" size="18" color="#999"></uni-icons>
        <input 
          class="search-input ss-flex-1" 
          placeholder="搜索视频" 
          v-model="searchParams.title"
          confirm-type="search"
          @confirm="handleSearch"
        />
        <uni-icons v-if="searchParams.title" type="clear" size="18" color="#999" @click="clearSearch"></uni-icons>
      </view>
      <view class="search-btn ss-m-l-20" @click="handleSearch">搜索</view>
    </view>

    <!-- 分类选择 -->
    <view class="category-container ss-flex ss-p-x-20 ss-p-y-10">
      <view 
        class="category-item" 
        :class="{ active: searchParams.typeId === null }"
        @click="changeCategory(null)"
      >全部</view>
      <view 
        v-for="item in categories" 
        :key="item.id" 
        class="category-item" 
        :class="{ active: searchParams.typeId === item.id }"
        @click="changeCategory(item.id)"
      >{{ item.name }}</view>
    </view>

    <!-- 视频列表 -->
    <view class="video-list ss-p-20">
      <view 
        v-for="item in videoList" 
        :key="item.id" 
        class="video-item ss-m-b-20"
        @click="goToDetail(item.id)"
      >
        <view class="video-cover">
          <image class="cover-img" :src="getVideoImageUrl(item.id)" mode="aspectFill"></image>
          <view class="video-duration">{{ formatDuration(item.duration) }}</view>
          <view v-if="item.isVipOnly" class="vip-tag">VIP</view>
        </view>
        <view class="video-info ss-p-10">
          <view class="video-title ss-line-1">{{ item.title }}</view>
          <view class="video-desc ss-line-2 ss-m-t-10">{{ item.description }}</view>
          <view class="video-meta ss-flex ss-col-center ss-m-t-10">
            <view class="video-views ss-flex ss-col-center">
              <uni-icons type="eye" size="14" color="#999"></uni-icons>
              <text class="ss-m-l-5">{{ item.view }}</text>
            </view>
            <view class="video-time ss-flex ss-col-center ss-m-l-20">
              <uni-icons type="calendar" size="14" color="#999"></uni-icons>
              <text class="ss-m-l-5">{{ formatDate(item.createTime) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <s-empty v-if="videoList.length === 0" text="暂无视频"></s-empty>

    <!-- 加载更多 -->
    <uni-load-more :status="loadMoreStatus"></uni-load-more>
  </s-layout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import sheep from '@/sheep';
import dayjs from 'dayjs';
import useSignedUrlPreview from '@/sheep/utils/useSignedUrlPreview';

// 视频分类数据
const categories = ref([]);

// 搜索参数
const searchParams = reactive({
  pageNo: 1,
  pageSize: 10,
  title: '',
  typeId: null,
  status: 1, // 默认只显示上架的视频
});

// 视频列表数据
const videoList = ref([]);
const total = ref(0);
const loadMoreStatus = ref('more');

// 存储视频图片的签名URL映射
const videoImageUrlMap = ref({});

// 获取视频图片的签名URL
const getVideoImageUrl = (videoId) => {
  const video = videoList.value.find(v => v.id === videoId);
  if (video && video.picUrl) {
    // 优先使用已获取的签名URL，如果没有则使用原始URL
    const url = videoImageUrlMap.value[videoId] || video.picUrl;
    return url;
  }
  // 返回默认图片
  return '/static/data-empty.png';
};

// 获取视频分类
const getVideoTypes = async () => {
  try {
    const params = {
      pageNo: 1,
      pageSize: 20, // 获取更多分类
      status: 1 // 只获取已上架的分类
    };
    
    const { data } = await sheep.$api.video.getVideoTypes(params);
    categories.value = data.list || [];
  } catch (error) {
    console.error('获取视频分类失败', error);
  }
};

// 获取视频列表
const getVideoList = async (isLoadMore = false) => {
  if (!isLoadMore) {
    loadMoreStatus.value = 'loading';
  }
  
  try {
    const params = { ...searchParams };
    // 如果typeId为null，则不传递该参数
    if (params.typeId === null) {
      delete params.typeId;
    }
    
    const { data } = await sheep.$api.video.getVideoList(params);
    
    if (isLoadMore) {
      videoList.value = [...videoList.value, ...data.list];
    } else {
      videoList.value = data.list;
    }
    
    total.value = data.total;
    
    // 更新加载状态
    if (videoList.value.length >= total.value) {
      loadMoreStatus.value = 'noMore';
    } else {
      loadMoreStatus.value = 'more';
    }
    
    // 获取视频封面图片的签名URL
    await loadVideoImages();
  } catch (error) {
    console.error('获取视频列表失败', error);
    loadMoreStatus.value = 'more';
  }
};

// 加载视频封面图片
const loadVideoImages = async () => {
  // 检查是否有视频
  if (videoList.value.length === 0) {
    return;
  }
  
  // 使用固定的OSS配置ID 32
  const configId = 32;
  
  for (const video of videoList.value) {
    if (video.picUrl) {
      try {
        const urlPreview = useSignedUrlPreview();
        // 使用固定的OSS配置ID
        const signedUrl = await urlPreview.fetchSignedUrl(video.picUrl, false, configId);
        
        if (signedUrl) {
          videoImageUrlMap.value[video.id] = signedUrl;
          
          // 预加载图片
          uni.getImageInfo({
            src: signedUrl,
            success: () => {},
            fail: () => {
              // 如果预加载失败，使用原始URL
              videoImageUrlMap.value[video.id] = video.picUrl;
            }
          });
        } else {
          // 如果获取签名URL失败，使用原始URL
          videoImageUrlMap.value[video.id] = video.picUrl;
        }
      } catch (error) {
        // 使用原始URL
        videoImageUrlMap.value[video.id] = video.picUrl;
      }
    }
  }
};

// 搜索
const handleSearch = () => {
  searchParams.pageNo = 1;
  getVideoList();
};

// 清空搜索
const clearSearch = () => {
  searchParams.title = '';
  handleSearch();
};

// 切换分类
const changeCategory = (typeId) => {
  searchParams.typeId = typeId;
  searchParams.pageNo = 1;
  getVideoList();
};

// 跳转到详情页
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

// 监听页面滚动到底部，加载更多
const onReachBottom = () => {
  if (loadMoreStatus.value === 'more') {
    searchParams.pageNo += 1;
    getVideoList(true);
  }
};

// 页面加载
onMounted(() => {
  getVideoTypes();
  getVideoList();
});

// 导出页面事件处理函数
defineExpose({
  onReachBottom
});
</script>

<style lang="scss" scoped>
.search-container {
  background-color: #fff;
}

.search-box {
  height: 70rpx;
  background-color: #f5f5f5;
  border-radius: 35rpx;
  padding: 0 20rpx;
}

.search-input {
  height: 70rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.search-btn {
  font-size: 28rpx;
  color: var(--ui-BG-Main);
}

.category-container {
  background-color: #fff;
  overflow-x: auto;
  white-space: nowrap;
}

.category-item {
  padding: 10rpx 30rpx;
  font-size: 28rpx;
  color: #666;
  display: inline-block;
  position: relative;
  
  &.active {
    color: var(--ui-BG-Main);
    font-weight: bold;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 40rpx;
      height: 4rpx;
      background-color: var(--ui-BG-Main);
      border-radius: 2rpx;
    }
  }
}

.video-list {
  background-color: #f5f5f5;
}

.video-item {
  background-color: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.video-cover {
  position: relative;
  width: 100%;
  height: 360rpx;
  background-color: #f0f0f0;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-duration {
  position: absolute;
  bottom: 10rpx;
  right: 10rpx;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 22rpx;
  padding: 4rpx 10rpx;
  border-radius: 4rpx;
}

.vip-tag {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  background-color: #FFD700;
  color: #333;
  font-size: 22rpx;
  font-weight: bold;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}

.video-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.video-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
}

.video-meta {
  font-size: 24rpx;
  color: #999;
}
</style>
