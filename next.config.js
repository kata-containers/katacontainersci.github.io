module.exports = {
  reactStrictMode: true,
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {

    config.module.rules.push({
      test: /\.yml$/,
      use: 'yaml-loader',
    });
    
    if (dev) {
      config.devtool = false;
    }
    return config;
  },
}
