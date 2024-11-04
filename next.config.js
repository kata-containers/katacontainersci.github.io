module.exports = {
  reactStrictMode: true,
  output: 'export',
  basePath: "",
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = false;
    }
    return config;
  },
}
