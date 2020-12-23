const path = require('path')
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = (env) => {
  const isProduction = env === 'production'
  return {
    entry: './src/index.js',
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules|server/,
          use: {
            loader: 'babel-loader',
          },
        },
        {
          enforce: 'pre',
          test: /\.js$/,
          loader: 'source-map-loader',
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    output: {
      filename: 'public/javascript/bundle.js',
      path: path.resolve(__dirname),
    },
    resolve: {
      modules: ['node_modules', 'src'],
    },
    optimization: {
      minimize: true,
      mergeDuplicateChunks: false,
    },
    // devtool: isProduction ? 'none' : 'inline-source-map',
    devtool: 'none',
    plugins: [
      // new BundleAnalyzerPlugin()
    ],
  }
}
