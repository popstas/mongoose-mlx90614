// mongoose-mlx90614
load('api_config.js');
load('api_esp8266.js');
load('api_gpio.js');
load('api_i2c.js');
load('api_mqtt.js');
load('api_timer.js');

// globals
let last = {
  temp: '0',
  aux: '0'
};
let iter = 0;

// setup sensor
print('Init GY-906');
let MLX90614_ADDR = 0x5a;
let MLX90614_TA = 0x06;
let MLX90614_TOBJ1 = 0x07;

let gy906 = I2C.get();

function _readTemp(reg, name) {
  // let temp = I2C.readRegW(gy906, MLX90614_ADDR, reg);
  let buf = I2C.readRegN(gy906, MLX90614_ADDR, reg, 8);
  let temp = buf.at(1) << 8 | buf.at(2);
  temp = Math.round((temp * 0.02) - 273.15);
  return temp;
}

function readData() {
  let data = {};
  data.temp = _readTemp(MLX90614_TOBJ1);
  data.aux = _readTemp(MLX90614_TA);
  return data;
}

function start() {
  // setup led
  GPIO.setup_output(Cfg.get('board.led1.pin'), 1);
  GPIO.blink(Cfg.get('board.led1.pin'), 1000, 1000);

  MQTT.setEventHandler(function(conn, ev, edata) {
    if (ev === MQTT.EV_CONNACK) GPIO.blink(Cfg.get('board.led1.pin'), 0, 0);
    if (ev === MQTT.EV_CLOSE) GPIO.blink(Cfg.get('board.led1.pin'), 1000, 1000);
  }, null);

  Timer.set(
    1000,
    true,
    function () {
      iter++;
      if (iter >= 60) iter = 0;
  
      let data = readData();
  
      let current = {
        temp: JSON.stringify(Math.round(data.temp)),
        aux: JSON.stringify(Math.round(data.aux)),
      };
  
      // serial output
      print('temp: ', data.temp);
      print('aux: ', data.aux);
  
      let baseTopic = Cfg.get('app.mqtt_base');
  
      // publish to mqtt metrics if changed or per minute
      let names = ['temp', 'aux'];
      for (let i in names) {
        let m = names[i];
        if (current[m] !== last[m] || iter === 0) {
          // print('mqtt: ' + m + ': ' + current[m] + ', last: ' + last[m]);
          MQTT.pub(baseTopic + '/' + m, current[m]);
        }
        last[m] = current[m];
      }
    },
    null
  );
}

start();
