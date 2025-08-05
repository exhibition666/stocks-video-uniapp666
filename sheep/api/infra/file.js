import { baseUrl, apiPath, tenantId, staticUrl } from '@/sheep/config';
import request, { getAccessToken } from '@/sheep/request';

const FileApi = {
  // 上传文件
  uploadFile: (file, directory) => {
    uni.showLoading({
      title: '上传中',
    });
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: baseUrl + apiPath + '/infra/file/upload',
        filePath: file,
        name: 'file',
        header: {
          Accept: '*/*',
          'tenant-id': tenantId,
          Authorization: 'Bearer ' + getAccessToken(),
        },
        formData: {
          directory,
        },
        success: (uploadFileRes) => {
          let result = JSON.parse(uploadFileRes.data);
          if (result.error === 1) {
            uni.showToast({
              icon: 'none',
              title: result.msg,
            });
          } else {
            return resolve(result);
          }
        },
        fail: (error) => {
          console.log('上传失败：', error);
          return resolve(false);
        },
        complete: () => {
          uni.hideLoading();
        },
      });
    });
  },

  // 获取文件预签名地址
  getFilePresignedUrl: (name, directory) => {
    return request({
      url: '/infra/file/presigned-url',
      method: 'GET',
      params: {
        name,
        directory,
      },
    });
  },

  // 创建文件
  createFile: (data) => {
    return request({
      url: '/infra/file/create', // 请求的 URL
      method: 'POST', // 请求方法
      data: data, // 要发送的数据
    });
  },

  // 获取文件访问URL
  getAccessUrl: (configId, path, timeout = 1800) => {
    console.log('调用getAccessUrl API, 参数:', { configId, path, timeout });
    
    // 确保configId有效
    if (!configId) {
      console.error('configId不能为空，使用默认值32');
      configId = 32; // 使用默认值32
    }
    
    // 确保path有效
    if (!path) {
      console.error('文件路径不能为空');
      return Promise.resolve({ code: -1, msg: '文件路径不能为空' });
    }
    
    // 如果path已经是完整的URL，直接返回
    if (path && typeof path === 'string' && path.startsWith('http')) {
      console.log('path已经是完整URL，直接返回:', path);
      return Promise.resolve({ code: 0, data: { accessUrl: path } });
    }
    
    // 处理相对路径，确保格式正确
    let processedPath = path;
    if (path && typeof path === 'string') {
      // 移除开头的斜杠，确保路径格式一致
      if (path.startsWith('/')) {
        processedPath = path.substring(1);
      }
    }
    
    console.log('处理后的路径:', processedPath);
    
    return request({
      url: '/infra/file/access-url',
      method: 'GET',
      params: {
        configId,
        path: processedPath,
        timeout
      },
      custom: {
        showError: false,
        showLoading: false,
        retry: 1, // 请求失败时自动重试1次
      },
    }).then(res => {
      console.log('getAccessUrl API返回结果:', res);
      return res; // 直接返回API原始结果，不做修改
    }).catch(err => {
      console.error('getAccessUrl API错误:', err);
      return { code: -1, msg: err.message || '获取访问URL失败' };
    });
  },
};

export default FileApi;
