#include "defines.h"
#include "config.h"
#include <WebSockets2_Generic.h>
#include <ArduinoJson.h>


using namespace websockets2_generic;

WebsocketsClient client;

const int program_led_pin = 12;
const int preview_led_pin = 11;
const int status_led_pin = 10;

int cameranum = 1;

enum Ledstate {
  program,
  preview,
  off,
  error
};

void onEventsCallback(WebsocketsEvent event, String data) 
{
	(void) data;
	
	if (event == WebsocketsEvent::ConnectionOpened) 
	{
		Serial.println("Connnection Opened");
		setLedState(off);
	} 
	else if (event == WebsocketsEvent::ConnectionClosed) 
	{
		Serial.println("Connnection Closed");
		setLedState(error);
	} 
	else if (event == WebsocketsEvent::GotPing) 
	{
		Serial.println("Got a Ping!");
	} 
	else if (event == WebsocketsEvent::GotPong) 
	{
		Serial.println("Got a Pong!");
	}
}

void onMessagesCallback(WebsocketsMessage message)
{
	String data = message.data();
	DynamicJsonDocument json(4096); // presumably messages will be less than 4096 bytes... truly dynamic isn't supported by this lib...
	auto deserializeError = deserializeJson(json, data);

	if ( deserializeError )
	{
		Serial.println("JSON parseObject() failed");
		return;
	}

	if (json["type"] == "config")
	{
		cameranum = json["config"]["deviceChannel"];
	}

	if (json["type"] == "tally")
	{
		int prognum = json["program"]["index"];
    int prevnum = json["preview"]["index"];
    if(prognum == cameranum) {
      setLedState(program);
    }else if(prevnum == cameranum) {
      setLedState(preview);  
    }else{
      setLedState(off);
    }
	}
}

void setup() 
{
	// set leds
  WiFi.setPins(8,7,4,2);
	pinMode(program_led_pin, OUTPUT);
	pinMode(preview_led_pin, OUTPUT);
	pinMode(status_led_pin, OUTPUT);

  setLedState(error);
	
	while (!Serial && millis() < 5000);
	Serial.begin(9600);


	Serial.println("Test");


	Serial.println("\nStarting SAMD_WiFi101-Client with WiFi101 on " + String(BOARD_NAME));
	Serial.println(WEBSOCKETS2_GENERIC_VERSION);
	
	// check for the WiFi module:
	if (WiFi.status() == WL_NO_SHIELD) 
	{
		Serial.println("Communication with WiFi module failed!");
		// don't continue
		return;
	}

	String fv = WiFi.firmwareVersion();
	Serial.print("Firmware version installed: ");
	Serial.println(fv);

	String latestFv;
	
	if (REV(GET_CHIPID()) >= REV_3A0) 
	{
		// model B
		latestFv = WIFI_FIRMWARE_LATEST_MODEL_B;
	} 
	else 
	{
		// model A
		latestFv = WIFI_FIRMWARE_LATEST_MODEL_A;
	}
	
	if (fv < latestFv) 
	{
		Serial.println("Please upgrade the firmware");
		// Print required firmware version
		Serial.print("Latest firmware version available : ");
		Serial.println(latestFv);
	}

	Serial.print("Attempting to connect to SSID: ");
	Serial.println(ssid);

	// Connect to wifi
	WiFi.begin(ssid, password);

	// Wait some time to connect to wifi
	for (int i = 0; i < 15 && WiFi.status() != WL_CONNECTED; i++)
	{
		Serial.print(".");
		delay(1000);
	}

	if (WiFi.status() == WL_CONNECTED)
	{
		Serial.print("Connected to Wifi, IP address: ");
		Serial.println(WiFi.localIP());
		Serial.print("Connecting to WebSockets Server @");
		Serial.println(websockets_url);
	}
	else
	{
		Serial.println("\nNo WiFi");
		return;
	}

	// run callback when messages are received
	client.onMessage([&](WebsocketsMessage message) 
	{
	  Serial.print("Got Message: ");
	  Serial.println(message.data());
	});

	// run callback when events are occuring
	client.onEvent(onEventsCallback);
  client.onMessage(onMessagesCallback);

	client.connect(websockets_url);
}

void loop() 
{
	// let the websockets client check for incoming messages
	if (client.available()) 
	{
		client.poll();
	}
}


void setLedState(Ledstate ls){
	if (ls == error){
		digitalWrite(status_led_pin, LOW);
	}else{
		digitalWrite(status_led_pin, HIGH);
	}


	if(ls == program) {
		digitalWrite(program_led_pin, HIGH);
		digitalWrite(preview_led_pin, LOW);
	}else if (ls == preview)
	{
		digitalWrite(program_led_pin, LOW);
		digitalWrite(preview_led_pin, HIGH);
	}else if (ls == off)
	{
		digitalWrite(program_led_pin, LOW);
		digitalWrite(preview_led_pin, LOW);
	}
}
