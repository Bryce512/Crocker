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

  Serial.print("Setup complete");
  // Serial.print(button);
}

void loop() {
  // put your main code here, to run repeatedly:
  if (digitalRead(button) == HIGH) {
    loopCount++;
    Serial.println("Button Pressed");
    changeLights();
    delay(500);
  }
}

void changeLights() {
  Serial.print("Loop Count: "); Serial.println(loopCount);
  if (loopCount == 1) {
    analogWrite(Red, 0);
    analogWrite(Blue,255);
    analogWrite(Green, 255);
  } else if (loopCount == 2 ) {
    analogWrite(Red,255);
    analogWrite(Blue,255);
    analogWrite(Green, 0);
  } else if (loopCount == 3) {
    analogWrite(Blue, 0);
        analogWrite(Red,255);
    analogWrite(Blue,0);
    analogWrite(Green, 255);
  } else if (loopCount == 4) {
    gradualLights();
  } else if (loopCount == 5) {
    lightsOff();
    loopCount = 0;
    Serial.println("Loop Count Reset");
  }
}

void gradualLights() {
    analogWrite(Red, 0);
    analogWrite(Blue, 255);
    analogWrite(Green, 255);
    for (int i = 255; i >= 0; i--) { // Bring Green Up Mixing Red and Green
      analogWrite(Green, i);
      delay(10);
    }
    for(int i = 0; i <= 255; i++) { //Bring Red Down leaving just Green
      analogWrite(Red, i);
      delay(10);
    }
    for (int i = 255; i >= 0; i--) { //Bring Blue up leaving Blue/Green
      analogWrite(Blue, i);
      delay(10);
    }
    for (int i = 0; i <= 255; i++) { //Bring Green Down leaving Blue
      analogWrite(Green, i);
      delay(10);
    }
    for (int i = 255; i >= 0; i--) { //Bring Red up leaving Blue/Red
      analogWrite(Red, i);
      delay(10);
    }
    for (int i = 0; i <= 255; i++) { //Bring Blue Down leaving Red
      analogWrite(Blue, i);
      delay(10);
    }
}

void lightsOff(){
  analogWrite(Red, 255);
  analogWrite(Green, 255);
  analogWrite(Blue, 255);
}