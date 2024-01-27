module.exports = {
  entry: {
    index: "./out/index.js",
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ["source-map-loader"],
        enforce: "pre",
        exclude: /node_modules/,
      },
    ],
  },
  output: {
    path: __dirname,
    filename: "[name].js",
    libraryTarget: "umd",
  },
  mode: "production",
};
