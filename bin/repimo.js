#!/usr/bin/env node

var request = require('request'),
    cheerio = require('cheerio'),
    path = require('path'),
    fs = require('fs'),
    Q = require('q'),
    Qd = Q.defer(),
    color = require('bash-color'),
    prompt = require('prompt'),
    urlRoot = 'http://www.imooc.com';

prompt.start();

function trim(s) {
    return s.replace(/(^\s*)|(\s*$)/g, "");
}
var schema = {
    properties: {
        url: {
            pattern: /^(http:\/\/www\.imooc\.com\/).*/,
            message: '请输入慕课网的课程地址！(如http://www.imooc.com/learn/488)\n',
            required: true
        }
    }
};
prompt.get(schema, function(err, result) {
    var downloadImg = function(uri, filename, i, dirnameNum) {
        request.head(uri, function(err, res, body) {
            if (err) {
                console.log('err: ' + err);
            }
            var _filename = filename.repeat(/\//, '-');
            if (!fs.existsSync(dirnameNum)) {
                fs.mkdirSync(dirnameNum);
                console.log('[' + color.green('SUCCEED') + '] ' + '创建目录 ' + color.yellow(dirnameNum));
            }
            request(uri).pipe(fs.createWriteStream(path.join(dirnameNum, (i + 1) + '-' + filename + '.mp4'))).on('close', () => {
                console.log('[' + color.green('SUCCEED') + '] ' + color.yellow((i + 1) + '-' + filename + '.mp4'));
            });
        });
    };
    var getList = (url) => {
        request(url, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                Qd.resolve(body);
            }
        })
        return Qd.promise;
    }

    getList(result.url)
        .then((value) => {
            var $ = cheerio.load(value);
            var itemArr = $('.J-media-item.studyvideo').toArray();
            var len = itemArr.length;
            var titile = $('title').text() + '';
            var dirnameNum = trim(titile.replace('_技术学习教程_慕课网', '(' + len + ')'));
            var dirname = color.cyan(trim(titile.replace('_技术学习教程_慕课网', '')));
            if (len < 0) {
                console.log(dirname + ' - 不包含视频文件，无法下载。')
                return false;
            } else {
                console.log('发现 ' + dirname + ' 附带' + len + '个视频文件。')
            }
            var listLinkArr = [];
            for (var i = 0; i < len; i++) {
                var itemLink = itemArr[i].attribs.href;
                ((item) => {
                    listLinkArr.push(urlRoot + itemLink)
                })(i)
            }
            console.log('正在为您下载' + dirname + '所有高清视频文件。')
            console.log('由于是流媒体文件，所以需要等待终端执行完成即为下载完成！')
            console.log(Array(30).join('-'));
            return {
                listLinkArr: listLinkArr,
                dirname: dirname,
                dirnameNum: dirnameNum
            };
        })
        .then((value) => {
            for (var i = 0; i < value.listLinkArr.length; i++) {
                ((i) => {
                    var urlSlice = value.listLinkArr[i].split('/');
                    var videoUrl = urlRoot + '/course/ajaxmediainfo/?mid=' + urlSlice[urlSlice.length - 1] + '&mode=flash';
                    request(videoUrl, function(error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var itemVideoUrl = JSON.parse(body).data.result.mpath[1];
                            var itemVideName = JSON.parse(body).data.result.name;
                            downloadImg(itemVideoUrl, itemVideName, i, value.dirnameNum)
                        }
                    })
                })(i)
            }
        })
});
