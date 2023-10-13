// eslint-disable-next-line @typescript-eslint/no-var-requires
const DtsBundleWebpack = require("dts-bundle-webpack");

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
  plugins: [
    new DtsBundleWebpack({
      name: "xterm-pty",
      main: "out/index.d.ts",
      baseDir: "out",
      out: "../index.d.ts",
    }),
  ],
};
