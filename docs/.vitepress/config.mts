import { defineConfig } from "vitepress";

export default defineConfig({
  title: "VeloeraCE",
  description: "Community Edition LLM API Gateway",
  lang: "zh-CN",
  base: "/VeloeraCE/",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "文档", link: "/guide/" },
      { text: "API", link: "/api/" },
      { text: "GitHub", link: "https://github.com/moehans-official/VeloeraCE" }
    ],
    sidebar: {
      "/guide/": [
        {
          text: "指南",
          items: [
            { text: "文档总览", link: "/guide/" },
            { text: "快速开始", link: "/guide/getting-started" }
          ]
        }
      ],
      "/api/": [
        {
          text: "API",
          items: [
            { text: "接口预留", link: "/api/" }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/moehans-official/VeloeraCE" }
    ],
    footer: {
      message: "VeloeraCE Community Edition",
      copyright: `Copyright ${new Date().getFullYear()} VeloeraCE`
    }
  }
});
