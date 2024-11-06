/** @type {import('next').NextConfig} */
const nextConfig = {
  redirects: async () => {
    return [
      {
        source: "/github",
        destination: "https://github.com/vercel-labs/shooketh",
        permanent: true,
      },
      {
        source: "/deploy",
        destination: "https://vercel.com/templates/next.js/chathn",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
