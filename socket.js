// 1 引入模块
const net = require('net');

const server = net.createServer();

var on_data = null, on_error = null;

// 3 绑定链接事件
server.on('connection', (person) => {

    person.setEncoding('utf8');
// 客户socket进程绑定事件
    person.on('data', (data) => {
        if (on_data != null) {
            person.close = person.destroy;
            on_data(data, person);
        }
        //person.destroy();

    });

});
server.on('error', (e) => {
    if (on_error != null) {
        on_error(e);
    }


});

function start(ip_port, on_data_function) {
    const info = ip_port.split(":");
    on_data = on_data_function;
    server.listen(info[1], info[0]);
}


module.exports = {
    start: start,
    onerror: f=> on_error = f
};
