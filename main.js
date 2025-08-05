import App from './App';
import { createSSRApp } from 'vue';
import { setupPinia } from './sheep/store';

// 定义全局路由表和标签栏，解决路由未定义问题
if (typeof window !== 'undefined') {
  window.ROUTES_MAP = {
    "/pages/index/index": { path: "/pages/index/index", aliasPath: "/", meta: { auth: false, sync: true, title: "首页", group: "商城" } },
    "/pages/index/category": { path: "/pages/index/category", meta: { sync: true, title: "商品分类", group: "商城" } },
    "/pages/index/cart": { path: "/pages/index/cart", meta: { sync: true, title: "购物车", group: "商城" } },
    "/pages/index/user": { path: "/pages/index/user", meta: { sync: true, title: "个人中心", group: "商城" } },
    "/pages/index/video": { path: "/pages/index/video", meta: { sync: true, title: "视频教程", group: "商城" } },
    "/pages/index/video-detail": { path: "/pages/index/video-detail", meta: { sync: true, title: "视频详情", group: "商城" } },
    "/pages/index/inquiry": { path: "/pages/index/inquiry", meta: { sync: true, title: "期权询价", group: "金融" } },
    "/pages/public/error": { path: "/pages/public/error" }
  };
  window.TABBAR = ["/pages/index/index", "/pages/index/category", "/pages/index/inquiry", "/pages/index/cart", "/pages/index/user"];
  // 全局化
  window.ROUTES = Object.values(window.ROUTES_MAP);
}

export function createApp() {
  const app = createSSRApp(App);
  
  setupPinia(app);

  return {
    app,
  };
}
