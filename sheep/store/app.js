import DiyApi from '@/sheep/api/promotion/diy';
import { defineStore } from 'pinia';
import $platform from '@/sheep/platform';
import $router from '@/sheep/router';
import user from './user';
import sys from './sys';
import { baseUrl, h5Url } from '@/sheep/config';

const app = defineStore({
  id: 'app',
  state: () => ({
    info: {
      // 应用信息
      name: '', // 商城名称
      logo: '', // logo
      version: '', // 版本号
      copyright: '', // 版权信息 I
      copytime: '', // 版权信息 II

      cdnurl: '', // 云存储域名
      filesystem: '', // 云存储平台
    },
    platform: {
      share: {
        methods: [], // 支持的分享方式
        forwardInfo: {}, // 默认转发信息
        posterInfo: {}, // 海报信息
        linkAddress: '', // 复制链接地址
      },
      bind_mobile: 0, // 登陆后绑定手机号提醒 (弱提醒，可手动关闭)
    },
    template: {
      // 店铺装修模板
      basic: {}, // 基本信息
      home: {
        // 首页模板
        style: {},
        data: [],
      },
      user: {
        // 个人中心模板
        style: {},
        data: [],
      },
    },
    shareInfo: {}, // 全局分享信息
    has_wechat_trade_managed: 0, // 小程序发货信息管理  0 没有 || 1 有
  }),
  actions: {
    // 获取Shopro应用配置和模板
    async init(templateId = null) {
      // 检查网络
      const networkStatus = await $platform.checkNetwork();
      if (!networkStatus) {
        $router.error('NetworkError');
      }

      // 检查配置
      if (typeof baseUrl === 'undefined') {
        $router.error('EnvError');
      }

      // 加载装修配置
      await adaptTemplate(this.template, templateId);

      // TODO 芋艿：【初始化优化】未来支持管理后台可配；对应 https://api.shopro.sheepjs.com/shop/api/init
      if (true) {
        this.info = {
          name: '芋道商城',
          logo: 'https://static.iocoder.cn/ruoyi-vue-pro-logo.png',
          version: '2.6.0',
          copyright: '全部开源，个人与企业可 100% 免费使用',
          copytime: 'Copyright© 2018-2025',

          cdnurl: 'https://file.sheepjs.com', // 云存储域名
          filesystem: 'qcloud', // 云存储平台
        };
        this.platform = {
          share: {
            methods: ['forward', 'poster', 'link'],
            linkAddress: h5Url,
            posterInfo: {
              user_bg: '/static/img/shop/config/user-poster-bg.png',
              goods_bg: '/static/img/shop/config/goods-poster-bg.png',
              groupon_bg: '/static/img/shop/config/groupon-poster-bg.png',
            },
            forwardInfo: {
              title: '',
              image: '',
              desc: '',
            },
          },
          bind_mobile: 0,
        };
        this.has_wechat_trade_managed = 0;

        // 加载主题
        const sysStore = sys();
        sysStore.setTheme();

        // 模拟用户登录
        const userStore = user();
        if (userStore.isLogin) {
          userStore.loginAfter();
        }
        return Promise.resolve(true);
      } else {
        $router.error('InitError', res.msg || '加载失败');
      }
    },
    
    // 获取模板数据
    async getTemplate() {
      try {
        console.log('重新获取模板数据');
        // 重新加载装修配置
        await adaptTemplate(this.template);
        
        // 确保底部导航栏数据存在
        if (!this.template.basic.tabbar) {
          // 提供默认的底部导航栏数据
          this.template.basic.tabbar = {
            theme: 'default',
            mode: 1,
            style: {
              color: '#999999',
              activeColor: '#ff3000',
              bgType: 'color',
              bgColor: '#ffffff',
            },
            items: [
              { pagePath: '/pages/index/index', text: '首页', iconPath: '/static/internet-empty.png', selectedIconPath: '/static/internet-empty.png', url: '/pages/index/index', iconUrl: '/static/internet-empty.png', activeIconUrl: '/static/internet-empty.png' },
              { pagePath: '/pages/index/category', text: '分类', iconPath: '/static/internet-empty.png', selectedIconPath: '/static/internet-empty.png', url: '/pages/index/category', iconUrl: '/static/internet-empty.png', activeIconUrl: '/static/internet-empty.png' },
              { pagePath: '/pages/index/inquiry', text: '询价', iconPath: '/static/internet-empty.png', selectedIconPath: '/static/internet-empty.png', url: '/pages/index/inquiry', iconUrl: '/static/internet-empty.png', activeIconUrl: '/static/internet-empty.png' },
              { pagePath: '/pages/index/cart', text: '购物车', iconPath: '/static/cart-empty.png', selectedIconPath: '/static/cart-empty.png', url: '/pages/index/cart', iconUrl: '/static/cart-empty.png', activeIconUrl: '/static/cart-empty.png' },
              { pagePath: '/pages/index/user', text: '我的', iconPath: '/static/internet-empty.png', selectedIconPath: '/static/internet-empty.png', url: '/pages/index/user', iconUrl: '/static/internet-empty.png', activeIconUrl: '/static/internet-empty.png' }
            ]
          };
        }
        
        return Promise.resolve(this.template);
      } catch (error) {
        console.error('获取模板数据失败:', error);
        return Promise.reject(error);
      }
    },
  },
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'app-store',
      },
    ],
  },
});

const adaptTemplate = async (appTemplate, templateId) => {
  // 确保appTemplate.basic在使用前被初始化
  if (!appTemplate.basic) {
    appTemplate.basic = {};
  }

  const { data: diyTemplate } = templateId
    ? // 查询指定模板，一般是预览时使用
      await DiyApi.getDiyTemplate(templateId)
    : await DiyApi.getUsedDiyTemplate();
  // 模板不存在时提供默认模板数据
  if (!diyTemplate) {
    console.log('未找到DIY模板，使用默认模板数据');
    // 提供默认的模板数据
    const defaultTemplate = {
      property: {
        tabBar: {
          theme: 'default',
          mode: 1,
          style: {
            color: '#999999',
            activeColor: '#ff3000',
            bgType: 'color',
            bgColor: '#ffffff',
          },
          items: [
            { pagePath: '/pages/index/index', text: '首页', iconPath: '/static/internet-empty.png', selectedIconPath: '/static/internet-empty.png', url: '/pages/index/index', iconUrl: '/static/internet-empty.png', activeIconUrl: '/static/internet-empty.png' },
            { pagePath: '/pages/index/category', text: '分类', iconPath: '/static/internet-empty.png', selectedIconPath: '/static/internet-empty.png', url: '/pages/index/category', iconUrl: '/static/internet-empty.png', activeIconUrl: '/static/internet-empty.png' },
            { pagePath: '/pages/index/inquiry', text: '询价', iconPath: '/static/internet-empty.png', selectedIconPath: '/static/internet-empty.png', url: '/pages/index/inquiry', iconUrl: '/static/internet-empty.png', activeIconUrl: '/static/internet-empty.png' },
            { pagePath: '/pages/index/cart', text: '购物车', iconPath: '/static/cart-empty.png', selectedIconPath: '/static/cart-empty.png', url: '/pages/index/cart', iconUrl: '/static/cart-empty.png', activeIconUrl: '/static/cart-empty.png' },
            { pagePath: '/pages/index/user', text: '我的', iconPath: '/static/internet-empty.png', selectedIconPath: '/static/internet-empty.png', url: '/pages/index/user', iconUrl: '/static/internet-empty.png', activeIconUrl: '/static/internet-empty.png' }
          ]
        }
      },
      home: { style: {}, data: [] },
      user: { style: {}, data: [] }
    };
    
    // 使用默认模板数据
    const tabBar = defaultTemplate?.property?.tabBar;
    if (tabBar) {
      appTemplate.basic.tabbar = tabBar;
      if (tabBar?.theme) {
        appTemplate.basic.theme = tabBar?.theme;
      }
    }
    appTemplate.home = defaultTemplate?.home;
    appTemplate.user = defaultTemplate?.user;
    return;
  }

  const tabBar = diyTemplate?.property?.tabBar;
  if (tabBar) {
    appTemplate.basic.tabbar = tabBar;
    // TODO 商城装修没有对 tabBar 进行角标配置，测试角标需打开以下注释
    // appTemplate.basic.tabbar.items.forEach((tabBar) => {
    //   tabBar.dot = false
    //   tabBar.badge = 100
    // })
    // appTemplate.basic.tabbar.badgeStyle = {
    //   backgroundColor: '#882222',
    // }
    if (tabBar?.theme) {
      appTemplate.basic.theme = tabBar?.theme;
    }
  }
  appTemplate.home = diyTemplate?.home;
  appTemplate.user = diyTemplate?.user;
};

export default app;
