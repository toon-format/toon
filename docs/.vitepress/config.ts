import type { DefaultTheme } from 'vitepress'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vitepress'
import llmstxt, { copyOrDownloadAsMarkdownButtons } from 'vitepress-plugin-llms'
import { description, github, name, ogImage, ogUrl, releases, twitterImage, version } from './meta'

export default defineConfig({
  title: name,
  description,
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'author', content: 'Johann Schopplich' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: ogUrl }],
    ['meta', { property: 'og:title', content: name }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { name: 'twitter:title', content: name }],
    ['meta', { name: 'twitter:description', content: description }],
    ['meta', { name: 'twitter:image', content: twitterImage }],
    ['meta', { name: 'twitter:site', content: '@jschopplich' }],
    ['meta', { name: 'twitter:creator', content: '@jschopplich' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],

  vite: {
    // @ts-expect-error – UnoCSS types are not compatible with Vite yet
    plugins: [UnoCSS(), llmstxt()],
  },

  themeConfig: {
    logo: '/favicon.svg',

    nav: [
      {
        text: 'Playground',
        link: '/playground',
      },
      {
        text: 'Guide',
        activeMatch: '^/guide/',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Format Overview', link: '/guide/format-overview' },
          { text: 'Using TOON with LLMs', link: '/guide/llm-prompts' },
          { text: 'Benchmarks', link: '/guide/benchmarks' },
        ],
      },
      {
        text: 'CLI',
        link: '/cli/',
      },
      {
        text: 'Reference',
        activeMatch: '^/reference/',
        items: [
          { text: 'API', link: '/reference/api' },
          { text: 'Syntax Cheatsheet', link: '/reference/syntax-cheatsheet' },
          { text: 'Specification', link: '/reference/spec' },
          { text: 'Efficiency Formalization', link: '/reference/efficiency-formalization' },
        ],
      },
      {
        text: 'Ecosystem',
        activeMatch: '^/ecosystem/',
        items: [
          { text: 'Tools & Playgrounds', link: '/ecosystem/tools-and-playgrounds' },
          { text: 'Implementations', link: '/ecosystem/implementations' },
        ],
      },
      {
        text: `v${version}`,
        items: [
          {
            text: 'Release Notes',
            link: releases,
          },
        ],
      },
    ],

    sidebar: {
      '/guide/': sidebarPrimary(),
      '/cli/': sidebarPrimary(),
      '/reference/': sidebarPrimary(),
      '/ecosystem/': sidebarPrimary(),
    },

    socialLinks: [
      { icon: 'github', link: github },
    ],

    footer: {
      message: 'Released under the <a href="https://opensource.org/licenses/MIT" target="_blank">MIT License</a>.',
      copyright: 'Copyright © 2025-PRESENT <a href="https://johannschopplich.com" target="_blank">Johann Schopplich</a>',
    },

    search: {
      provider: 'local',
    },
  },
  markdown: {
    config(md) {
      md.use(copyOrDownloadAsMarkdownButtons)
    },
    math: true,
  },
})

function sidebarPrimary(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Guide',
      items: [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Format Overview', link: '/guide/format-overview' },
        { text: 'Using TOON with LLMs', link: '/guide/llm-prompts' },
        { text: 'Benchmarks', link: '/guide/benchmarks' },
      ],
    },
    {
      text: 'Tooling',
      items: [
        { text: 'Playground', link: '/playground' },
        { text: 'CLI Reference', link: '/cli/' },
      ],
    },
    {
      text: 'Ecosystem',
      items: [
        { text: 'Tools & Playgrounds', link: '/ecosystem/tools-and-playgrounds' },
        { text: 'Implementations', link: '/ecosystem/implementations' },
      ],
    },
    {
      text: 'Reference',
      items: [
        { text: 'API (TypeScript)', link: '/reference/api' },
        { text: 'Syntax Cheatsheet', link: '/reference/syntax-cheatsheet' },
        { text: 'Specification', link: '/reference/spec' },
        { text: 'Efficiency Formalization', link: '/reference/efficiency-formalization' },
      ],
    },
  ]
}
