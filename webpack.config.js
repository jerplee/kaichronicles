const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const TerserPlugin = require("terser-webpack-plugin");
const {InjectManifest} = require('workbox-webpack-plugin');

module.exports = {
  mode: process.env.WEBPACK_ENV ?? 'development',
  entry: './src/ts/index.ts',
  devtool: "source-map",
  performance: {
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  ignoreWarnings: [
    {
      message: /InjectManifest has been called multiple times/,
    }
  ],
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'www'),
      watch: {
        ignored: /projectAon/
      }
    },
    port: 3000,
    hot: false,
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      const baseDir = path.join(__dirname, 'www', 'data', 'projectAon');

      // API routes injected at the front of the middleware chain so they run before static file serving
      middlewares.unshift({
        name: 'api-routes',
        middleware: (req, res, next) => {
          if (req.url === '/api/ping') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ pong: true }));
            return;
          }

          if (req.url === '/api/book-status') {
            const books = [];
            for (let i = 1; i <= 29; i++) {
              const bookDir = path.join(baseDir, i.toString());
              let downloaded = false;
              try {
                downloaded = fs.existsSync(bookDir) && fs.readdirSync(bookDir).length > 0;
              } catch (e) { /* ignore */ }
              books.push({ bookNumber: i, downloaded });
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ books }));
            return;
          }

          if (req.url.startsWith('/api/download-book/')) {
            const parts = req.url.split('/');
            const bookNumber = parseInt(parts[parts.length - 1], 10);
            if (isNaN(bookNumber) || bookNumber < 1 || bookNumber > 29) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Invalid book number' }));
              return;
            }
            const child = spawn('npm', ['run', 'downloaddata', '--', bookNumber.toString()], {
              cwd: __dirname,
              shell: true,
              stdio: 'pipe'
            });
            let output = '';
            let error = '';
            child.stdout.on('data', (data) => { output += data.toString(); });
            child.stderr.on('data', (data) => { error += data.toString(); });
            child.on('close', (code) => {
              if (code === 0) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, bookNumber }));
              } else {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: error || output || 'Download failed' }));
              }
            });
            return;
          }

          if (req.url === '/api/download-all-books') {
            const child = spawn('npm', ['run', 'downloaddata'], {
              cwd: __dirname,
              shell: true,
              stdio: 'pipe'
            });
            let output = '';
            let error = '';
            child.stdout.on('data', (data) => { output += data.toString(); });
            child.stderr.on('data', (data) => { error += data.toString(); });
            child.on('close', (code) => {
              if (code === 0) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } else {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: error || output || 'Download failed' }));
              }
            });
            return;
          }

          next();
        }
      });

      return middlewares;
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: 'js/kai.js',
    path: path.resolve(__dirname, 'www'),
    library: 'kai'
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  plugins: [
    new InjectManifest({
      swSrc: '/src/ts/sw.ts',
      swDest: 'sw.js',
      include: [
        /kai\.js$/
      ]
    }),
  ],
};
