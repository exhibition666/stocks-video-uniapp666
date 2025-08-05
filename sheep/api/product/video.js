import request from '@/sheep/request';

const VideoApi = {
  // 获取视频列表
  getVideoList: (params) => {
    return request({
      url: '/stocks-front/video/page',
      method: 'GET',
      params,
      custom: {
        showError: true,
        showLoading: true,
      },
    });
  },
  
  // 获取视频详情
  getVideoDetail: (id) => {
    return request({
      url: '/stocks-front/video/get',
      method: 'GET',
      params: { id },
      custom: {
        showError: true,
        showLoading: true,
      },
    });
  },
  
  // 获取视频分类
  getVideoTypes: (params) => {
    return request({
      url: '/stocks-front/video-type/page',
      method: 'GET',
      params,
      custom: {
        showError: true,
        showLoading: true,
      },
    });
  },
};

export default VideoApi; 