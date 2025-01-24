#include <Arduino.h>
#include "main.h"

// put function declarations here:
int Red = 25;
int Green = 26;
int Blue = 27;
int button = 19;
int loopCount = 0;

void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);

  pinMode(Red, OUTPUT);
  pinMode(Green, OUTPUT);
  pinMode(Blue, OUTPUT);
  pinMode(button, INPUT);
}

void loop() {
  // put your main code here, to run repeatedly:
  if (button == HIGH) {
    loopCount++;
    Serial.print("Button Pressed");
    changeLights();
  }
}

void changeLights() {
  Serial.print("Loop Count: "); Serial.println(loopCount);
  if (loopCount == 1) {
    analogWrite(Red, 0);
  } else if (loopCount == 2 ) {
    analogWrite(Green, 0);
  } else if (loopCount == 3) {
    analogWrite(Blue, 0);
  } else if (loopCount == 4) {
    gradualLights();
  } else if (loopCount == 5) {
    lightsOff();
    loopCount = 0;
    Serial.print("Loop Count Reset");
  }
}

void gradualLights() {
  for (int i = 255; i > 0; i--) {
    analogWrite(Red, i);
    delay(10);
  }
  for (int i = 255; i < 0; i--) {
    analogWrite(Green, i);
    delay(10);
  }
  for (int i = 255; i < 00; i--) {
    analogWrite(Blue, i);
    delay(10);
  }
}

void lightsOff(){
  analogWrite(Red, 255);
  analogWrite(Green, 255);
  analogWrite(Blue, 255);
}