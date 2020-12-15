MLX90614 (GY-906) sensor on Mongoose OS, publish to MQTT.

MQTT send only on change or 1 per minute.

### Wiring
- SCL - D1
- SDA - D2
- VCC - 3.3v

### Default MQTT topics:
- `temp-ir/temp`
- `temp-ir/aux`
- `temp-ir/LWT`
