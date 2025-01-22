#include <Arduino.h>

// put function declarations here:
int Red = 2;
int Green = 3;
int Blue = 4;
int button = 5;
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
  }

  Serial.print("Loop Count: "); Serial.println(loopCount);
  if (loopCount == 1) {
    analogWrite(Red, 255);
  } else if (loopCount == 2 ) {
    analogWrite(Green, 255);
  } else if (loopCount == 3) {
    analogWrite(Blue, 255);
    loopCount = 0;
    Serial.print("Loop Count Reset");
  }
}
