const config = require(__dirname + "/config.json");

if (config.page_num == undefined) {
    config.page_num = 1;
}

const puppeteer = require('puppeteer');


(async () => {
    const browser = await puppeteer.launch(config.chrome_launch);
    var pages = [];


    async function newPages() {

        for (var i = 0; i < config.page_num; i++) {

            var page = null;
            if (i == 0) page = (await browser.pages())[0];
            else page = await browser.newPage();
            page.ws = {};
            page.ws.index = i;
            page.ws.enable = true;
            pages.push(page);

        }

    }

    await newPages();


    function getPage() {
        return new Promise(function (ok, error) {
            for (var i = 0; i < pages.length; i++) {

                if (pages[i].ws.enable) {
                    pages[i].ws.enable = false;
                    ok(pages[i]);
                    return;
                }
            }

            getPage.callbacks.push(ok);


        });

    }

    getPage.callbacks = [];
    const socket_sever = require("./socket");
    socket_sever.start("0.0.0.0:" + config.socket_port, function (data, client) {


        var is_exit = false;
        const exit = (code, msg,data) => {
            //console.log(msg);
            if (is_exit) return;
            is_exit = true;
            var out = {code: code + ""};
            out.msg = msg;
            out.data = data;

            client.write(JSON.stringify(out));
            client.close();
            //process.exit();
        };

        const info = JSON.parse(data);
        if (info.do === "pdf") {
            // exit(1, "先成功");
            (async () => {

                if (!info.pages) {
                    info.pages = [{url: info.url, options: info.options}];
                }

                if (info.pages.length == 0) {
                    exit(0, "无页面");
                }


                function do_one(url, options) {


                    return new Promise(function (ok, error) {
                        (async () => {




                            if (!options) {
                                //  exit(0, "无配置");
                                error(0);

                            }
                            if (!options.path) {
                                error(-1);
                            }

                            var page = await  getPage();
                            var can_next = true;

                            function return_exit(code) {
                                can_next = false;
                                ok(code);
                                page.ws.enable = true;

                                if (getPage.callbacks.length > 0)
                                    getPage.callbacks.shift()(page);
                            }

                             
                            await page.goto(url, {
                                timeout: 10000
                            }).catch(e=>{

                               // return_exit(-2);
                            });
                            //await page.waitFor(3000);

                            // await page.evaluate(()=>{
                            //     var style = document.createElement("style");
                            //
                            //     style.type = "text/css";
                            //
                            //     style.appendChild(document.createTextNode("div,p,h1,h2,h3,h4,h5,td,span{page-break-inside:avoid;}"));
                            //
                            //
                            //     var head = document.getElementsByTagName("head")[0];
                            //
                            //     head.appendChild(style);
                            // });
                            var create_type = options.hasOwnProperty("create_type")?options.create_type:"pdf";

                            if (create_type === "pdf")
                            {
                               // console.log(options);
                                await page.pdf(options).catch(e=>{
                                     console.log(e);   
                                    return_exit(-3);
                                });
                            }else if (create_type === "image")
                            {
                                await page.screenshot(options).catch(e=>{
                                   console.log(e);
                                    return_exit(-3);
                                });
                            }else{
                                return_exit(-4);
                            }


                            await  page.goto("about:blank");
                            return_exit(1);
                        })();

                    });


                }

                var promise_pages = [];

                info.pages.forEach((page_config) => {
                    promise_pages.push(do_one(page_config.url, page_config.options));
                });

                Promise.all(promise_pages).then((e)=>{
                    console.log(e);
                    exit(1, "成功",e);
                }).catch(()=>{
                    exit(0, "失败",null);
                });




            })();
        } else if (info.do === "exit") {
            process.exit();
        }
        // client.write(data);
    });
})();