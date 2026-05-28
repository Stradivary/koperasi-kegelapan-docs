// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Koperasi Kegelapan NFC Wallet",
  tagline: "Offline NFC wallet system — system design and technical specifications",
  favicon: "img/favicon.ico",

  // Set the production URL of your site here.
  // Update stradivary and koperasi-kegelapan-docs to match your GitHub organisation and repository.
  url: "https://docs.ahmadmuzaki.my.id/",
  baseUrl: "/",

  organizationName: "stradivary",
  projectName: "koperasi-kegelapan-docs",

  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: "./sidebars.js",
          // Remove or replace the editUrl with your own GitHub repo URL to enable
          // "Edit this page" links on every doc page.
          // editUrl: 'https://github.com/stradivary/koperasi-kegelapan-docs/tree/main/',
          routeBasePath: "/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "Koperasi Kegelapan NFC Wallet",
        items: [
          {
            type: "docSidebar",
            sidebarId: "userGuideSidebar",
            label: "📖 Panduan",
            position: "left",
          },
          {
            type: "dropdown",
            label: "Spec Layers",
            position: "left",
            items: [
              {
                type: "docSidebar",
                sidebarId: "productSpecSidebar",
                label: "1. Product Spec",
              },
              {
                type: "docSidebar",
                sidebarId: "systemDesignSidebar",
                label: "2. System Design",
              },
              {
                type: "docSidebar",
                sidebarId: "techSpecsSidebar",
                label: "3. Tech Specs",
              },
              {
                type: "docSidebar",
                sidebarId: "apiSpecSidebar",
                label: "4. API Spec",
              },
              {
                type: "docSidebar",
                sidebarId: "dataSpecSidebar",
                label: "5. Data Spec",
              },
              {
                type: "docSidebar",
                sidebarId: "securitySpecSidebar",
                label: "6. Security Spec",
              },
              {
                type: "docSidebar",
                sidebarId: "testSpecSidebar",
                label: "7. Test Spec",
              },
              {
                type: "docSidebar",
                sidebarId: "adrSidebar",
                label: "ADRs",
              },
            ],
          },
          // TODO: Add User guideline here
          {
            href: "https://github.com/stradivary/koperasi-kegelapan-docs",
            label: "GitHub",
            position: "right",
          },
          {
            href: "https://ahmadmuzaki.my.id",
            label: "Ahmad Muzaki",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        copyright: `Copyright © ${new Date().getFullYear()} Koperasi Kegelapan. By Stradivary.`,
      },
      prism: {
        theme: require("prism-react-renderer").themes.github,
        darkTheme: require("prism-react-renderer").themes.dracula,
        additionalLanguages: ["json"],
      },
    }),
};

module.exports = config;
