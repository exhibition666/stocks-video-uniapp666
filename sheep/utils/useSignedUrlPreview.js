import { ref } from 'vue';
import FileApi from '@/sheep/api/infra/file';
import { ossConfigId, baseUrl, staticUrl } from '@/sheep/config';

/**
 * 签名URL预览工具
 * 用于获取OSS文件的签名访问URL
 */
export default function useSignedUrlPreview() {
  const signedUrl = ref('');
  const loading = ref(false);
  const error = ref('');

  /**
   * 获取签名URL
   * @param {string} filePath - 文件路径
   * @param {boolean} isVideo - 是否为视频文件
   * @param {number} configId - OSS配置ID，默认使用全局配置
   * @param {number} timeout - 签名URL有效期(秒)，默认30分钟，视频建议使用3600秒
   * @returns {Promise<string>} 签名后的URL
   */
  const fetchSignedUrl = async (filePath, isVideo = false, configId = null, timeout = 1800) => {
    // 如果是视频，使用更长的有效期
    if (isVideo && timeout < 3600) {
      timeout = 3600; // 视频使用1小时有效期
    }
    
    // 如果没有传入configId，则使用固定值32
    const finalConfigId = configId || 32;
    
    console.log('获取签名URL, 参数:', { filePath, configId: finalConfigId, timeout, isVideo });
    
    if (!filePath) {
      console.error('文件路径为空');
      error.value = '文件路径不能为空';
      signedUrl.value = '';
      return '';
    }

    // 如果已经是完整URL，直接返回
    if (typeof filePath === 'string' && filePath.startsWith('http')) {
      console.log('已经是完整URL，直接返回:', filePath);
      signedUrl.value = filePath;
      return filePath;
    }
    
    // 处理相对路径，确保路径格式正确
    let processedPath = filePath;
    if (typeof filePath === 'string') {
      // 移除开头的斜杠，确保路径格式一致
      if (filePath.startsWith('/')) {
        processedPath = filePath.substring(1);
      }
    }

    loading.value = true;
    error.value = '';
    
    try {
      console.log('正在调用API获取签名URL, configId:', finalConfigId, '处理后的路径:', processedPath);
      // 调用API获取签名URL
      const res = await FileApi.getAccessUrl(finalConfigId, processedPath, timeout);
      console.log('API返回结果:', res);
      
      // 检查返回结果格式并处理URL
      let finalUrl = '';
      if (res.code === 0 && res.data && res.data.accessUrl) {
        finalUrl = res.data.accessUrl;
        console.log('获取签名URL成功:', finalUrl);
      } else {
        console.error('获取签名URL失败:', res);
        error.value = '获取签名URL失败';
        signedUrl.value = '';
        return '';
      }
      
      signedUrl.value = finalUrl;
      return finalUrl;
    } catch (e) {
      console.error('获取签名URL异常:', e);
      error.value = e.message || '获取签名URL出错';
      signedUrl.value = '';
      return '';
    } finally {
      loading.value = false;
    }
  };

  return {
    signedUrl,
    loading,
    error,
    fetchSignedUrl
  };
} 