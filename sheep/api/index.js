// 目的：解决微信小程序的「代码质量」在「JS 文件」提示：主包内，不应该存在主包未使用的 JS 文件
const files = import.meta.glob('./*/*.js', { eager: true });
let api = {};
Object.keys(files).forEach((key) => {
  api = {
    ...api,
    [key.replace(/(.*\/)*([^.]+).*/gi, '$2')]: files[key].default,
  };
});

// 手动导入特定API，确保它们被正确加载
import video from './product/video.js';
import option from './product/option.js';

api.video = video;
api.option = option;

export default api;
