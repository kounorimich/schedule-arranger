module.exports = {
    context: __dirname + '/app', // クライアントサイドのJSが含まれるディレクトリ、依存関係を読み解く最初の入り口となるJSファイルentry.jsを設定
    mode: 'none',
    entry: './entry',
    output: {
        path: __dirname + '/public/javascripts', // まとめられたJSの出力ディレクトリと、そのファイル名を設定
        filename: 'bundle.js'
    },

    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-env']
                }
            }

        }]
    }
};
