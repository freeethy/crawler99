var express = require('express');
var path = require('path');
var _ = require('underscore');
var iconv = require('iconv-lite');
var superagent = require('superagent');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy');
var originRequest = require('request')
var async = require('async');
var bodyParser = require('body-parser');
var url = require('url');
var port = process.env.PORT || 3000;
var app = express();

app.set('views', './views/pages');
app.set('view engine', 'jade');
app.use(bodyParser.urlencoded({
    extended: true
})); // for parsing application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, 'public')));
app.listen(port);

console.log('libpcap started on port ' + port);

var iconv = require('iconv-lite');
var headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
}

function request(url, callback) {
    var options = {
        url: url,
        encoding: null,
        headers: headers
    }
    originRequest(options, callback);
}

var baseUrl = 'http://www.txt99.com/';
app.get('/', function(req, res, next) {
            var books = [];
            request(baseUrl, function(err, rres, body) {
                    var html = iconv.decode(body, 'gb2312');
                    var $ = cheerio.load(html, {
                        decodeEntities: false
                    });
                    $('#main .tab .newDate').each(function(ind, ele) {
                        var $ele = $(ele);
                        books.push({
                            title: $ele.parent().find('a').html().trim(),
                            href: $ele.parent().find('a').attr('href').trim()
                        });
                    });

                    // 命令 ep 重复监听 topicUrls.length 次（在这里也就是 40 次） `topic_html` 事件再行动
                    var ep = new eventproxy();
                    ep.after('book_url', books.length, function(bookContent) {
                        // topics 是个数组，包含了 40 次 ep.emit('topic_html', pair) 中的那 40 个 pair
                        // 开始行动
                        bookContent = bookContent.map(function(bookPair) {
                            // 接下来都是 jquery 的用法了
                            var book = bookPair[0];
                            var bookHtml = bookPair[1];
                            var $ = cheerio.load(bookHtml, {
                                decodeEntities: false
                            });

                            return ({
                                content: $('#mainSoftIntro').html(),
                                readUrl: $('#mainstory .yuedu a').attr('href'),
                                title: book.title
                            });
                        });
                        res.render('index', {
                            books: books,
                            bookContent: bookContent
                        });
                    });
                    
                    books.forEach(function(book) {
                            request('http://www.txt99.com' + book.href, function(err, res, body) {
                                    var html = iconv.decode(body, 'gb2312');
                                    ep.emit('book_url', [book, html]);
                                })
                            });
                    });
            });
