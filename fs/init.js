// mongoose-mlx90614
load('api_config.js');
load('api_esp8266.js');
// load('api_gpio.js');
load('api_i2c.js');
load('api_mqtt.js');
load('api_timer.js');

let last = {
  temp: '0',
  aux: '0'
};
let iter = 0;

// setup sensor
print('Init GY-906');
let gy906Addr = 0x5a;
// RAM
let MLX90614_RAWIR1 = 0x04;
let MLX90614_RAWIR2 = 0x05;
let MLX90614_TA = 0x06;
let MLX90614_TOBJ1 = 0x07;
let MLX90614_TOBJ2 = 0x08;
// EEPROM
let MLX90614_TOMAX = 0x20;
let MLX90614_TOMIN = 0x21;
let MLX90614_PWMCTRL = 0x22;
let MLX90614_TARANGE = 0x23;
let MLX90614_EMISS = 0x24;
let MLX90614_CONFIG = 0x25;
let MLX90614_ADDR = 0x2e;
let MLX90614_ID1 = 0x3c;
let MLX90614_ID2 = 0x3d;
let MLX90614_ID3 = 0x3e;
let MLX90614_ID4 = 0x3f;

let gy906 = I2C.get();
// 0x02 - Configuration register
// 0x00 - Automatic mode, Integration time = 800 ms, for low-light
// 0x40 - Manual mode
// I2C.writeRegB(gy906, gy906Addr, 0x02, 0x00);

function readTemp(reg, name) {
  // let temp = I2C.readRegW(gy906, gy906Addr, reg);
  let buf = I2C.readRegN(gy906, gy906Addr, reg, 8);
  // if (buf !== "") for (let i = 0; i < buf.length; i++) { print(buf.at(i)); }
  let temp = buf.at(1) << 8 | buf.at(2);
  // print(temp);
  temp = Math.round((temp * 0.02) - 273.15);
  // print(name + ':', temp);
  // temp = temp * 0.02 - 273.15;
  return temp;
}

function gy906_read() {
  let data = {temp: 0, aux: 0};
  data.temp = readTemp(MLX90614_TOBJ1);
  data.aux = readTemp(MLX90614_TA);
  // readTemp(MLX90614_TOBJ1, 'MLX90614_TOBJ1');
  // readTemp(MLX90614_TA, 'MLX90614_TA');
  // readTemp(MLX90614_RAWIR1, 'MLX90614_RAWIR1');
  // readTemp(MLX90614_TOMIN, 'MLX90614_TOMIN');
  // readTemp(MLX90614_TOMAX, 'MLX90614_TOMAX');
  // data.aux = (readTemp(MLX90614_TA) * 9) / 5 + 32;
  return data;

  // let data = I2C.readRegN(gy906, gy906Addr, 0x03);
  let data1 = I2C.readRegB(gy906, gy906Addr, 0x03);
  let data2 = I2C.readRegB(gy906, gy906Addr, 0x04);
  // print('data1: ', data1);
  // print('data2: ', data2);

  // Convert the data to lux
  let exponent = (data1 & 0xf0) >> 4;
  let mantissa = ((data1 & 0x0f) << 4) | (data2 & 0x0f);
  let luminance = Math.pow(2, exponent) * mantissa * 0.045;
  // print('exponent: ', exponent);
  // print('mantissa: ', mantissa);
  return luminance;
}

Timer.set(
  1000,
  true,
  function () {
    iter++;
    if (iter >= 60) iter = 0;

    let data = gy906_read();

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
