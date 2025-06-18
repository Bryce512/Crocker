"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, ChevronRight, Wrench, GraduationCap, UploadCloud, CreditCard, Settings } from "lucide-react"
import Link from "next/link"

export default function MechanicSignup() {
  const [step, setStep] = useState(1)
  const [progress, setProgress] = useState(20)

  const nextStep = () => {
    if (step < 5) {
      setStep(step + 1)
      setProgress((step + 1) * 20)
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
      setProgress((step - 1) * 20)
    }
  }

  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Mechanic Onboarding</h1>
          <p className="mt-2 text-muted-foreground">Join our network of trusted mechanics and grow your business</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 w-full">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="absolute h-full bg-primary transition-all" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <div className={step >= 1 ? "font-medium text-primary" : "text-muted-foreground"}>Business</div>
            <div className={step >= 2 ? "font-medium text-primary" : "text-muted-foreground"}>Qualifications</div>
            <div className={step >= 3 ? "font-medium text-primary" : "text-muted-foreground"}>Services</div>
            <div className={step >= 4 ? "font-medium text-primary" : "text-muted-foreground"}>Payment</div>
            <div className={step >= 5 ? "font-medium text-primary" : "text-muted-foreground"}>Complete</div>
          </div>
        </div>

        {/* Step 1: Business Information */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                Business Information
              </CardTitle>
              <CardDescription>Tell us about your automotive business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business-name">Business Name</Label>
                <Input id="business-name" placeholder="Enter your business name" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="owner-first-name">Owner First Name</Label>
                  <Input id="owner-first-name" placeholder="Enter first name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-last-name">Owner Last Name</Label>
                  <Input id="owner-last-name" placeholder="Enter last name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Business Email</Label>
                <Input id="email" type="email" placeholder="Enter your business email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Business Phone</Label>
                <Input id="phone" type="tel" placeholder="Enter your business phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <Input id="address" placeholder="Enter your business address" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="Enter city" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="al">Alabama</SelectItem>
                      <SelectItem value="ak">Alaska</SelectItem>
                      <SelectItem value="az">Arizona</SelectItem>
                      {/* Other states would be listed here */}
                      <SelectItem value="wy">Wyoming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">Zip Code</Label>
                  <Input id="zip" placeholder="Enter zip code" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Business Website (Optional)</Label>
                <Input id="website" placeholder="Enter your website URL" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your business, specialties, and what makes you unique"
                  className="h-20"
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Button variant="outline" className="w-full">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload Business Logo
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/">Cancel</Link>
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Qualifications & Experience */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Qualifications & Experience
              </CardTitle>
              <CardDescription>Tell us about your certifications and experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="years-experience">Years in Business</Label>
                <Select>
                  <SelectTrigger id="years-experience">
                    <SelectValue placeholder="Select years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<1">Less than 1 year</SelectItem>
                    <SelectItem value="1-3">1-3 years</SelectItem>
                    <SelectItem value="3-5">3-5 years</SelectItem>
                    <SelectItem value="5-10">5-10 years</SelectItem>
                    <SelectItem value="10+">10+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Certifications (Check all that apply)</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="cert-ase" />
                    <Label htmlFor="cert-ase" className="text-sm font-normal">
                      ASE Certified
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="cert-master" />
                    <Label htmlFor="cert-master" className="text-sm font-normal">
                      ASE Master Technician
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="cert-factory" />
                    <Label htmlFor="cert-factory" className="text-sm font-normal">
                      Factory Trained
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="cert-aaa" />
                    <Label htmlFor="cert-aaa" className="text-sm font-normal">
                      AAA Approved Auto Repair
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="cert-icar" />
                    <Label htmlFor="cert-icar" className="text-sm font-normal">
                      I-CAR Certified
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="cert-mobile" />
                    <Label htmlFor="cert-mobile" className="text-sm font-normal">
                      Mobile Mechanic Certification
                    </Label>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="other-certs">Other Certifications</Label>
                <Textarea
                  id="other-certs"
                  placeholder="List any other certifications or qualifications you have"
                  className="h-20"
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Specialties (Check all that apply)</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="spec-domestic" />
                    <Label htmlFor="spec-domestic" className="text-sm font-normal">
                      Domestic Vehicles
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="spec-import" />
                    <Label htmlFor="spec-import" className="text-sm font-normal">
                      Import Vehicles
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="spec-luxury" />
                    <Label htmlFor="spec-luxury" className="text-sm font-normal">
                      Luxury Vehicles
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="spec-diesel" />
                    <Label htmlFor="spec-diesel" className="text-sm font-normal">
                      Diesel Engines
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="spec-hybrid" />
                    <Label htmlFor="spec-hybrid" className="text-sm font-normal">
                      Hybrid/Electric Vehicles
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="spec-commercial" />
                    <Label htmlFor="spec-commercial" className="text-sm font-normal">
                      Commercial/Fleet Vehicles
                    </Label>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Button variant="outline" className="w-full">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload Certification Documents
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Services & Pricing */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Services & Pricing
              </CardTitle>
              <CardDescription>Tell us about the services you offer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Services Offered (Check all that apply)</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="service-oil" />
                    <Label htmlFor="service-oil" className="text-sm font-normal">
                      Oil Change
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="service-brakes" />
                    <Label htmlFor="service-brakes" className="text-sm font-normal">
                      Brake Service
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="service-engine" />
                    <Label htmlFor="service-engine" className="text-sm font-normal">
                      Engine Repair
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="service-transmission" />
                    <Label htmlFor="service-transmission" className="text-sm font-normal">
                      Transmission
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="service-diagnostics" />
                    <Label htmlFor="service-diagnostics" className="text-sm font-normal">
                      Diagnostics
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="service-electrical" />
                    <Label htmlFor="service-electrical" className="text-sm font-normal">
                      Electrical Systems
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="service-ac" />
                    <Label htmlFor="service-ac" className="text-sm font-normal">
                      AC Service
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="service-suspension" />
                    <Label htmlFor="service-suspension" className="text-sm font-normal">
                      Suspension & Steering
                    </Label>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="other-services">Other Services</Label>
                <Textarea id="other-services" placeholder="List any other services you provide" className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Parts Policy</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="parts-cheapest" />
                    <Label htmlFor="parts-cheapest" className="text-sm font-normal">
                      We use the most cost-effective parts
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="parts-customer" />
                    <Label htmlFor="parts-customer" className="text-sm font-normal">
                      We let customers choose their parts
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="parts-oem" />
                    <Label htmlFor="parts-oem" className="text-sm font-normal">
                      We use OEM parts
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="parts-aftermarket" />
                    <Label htmlFor="parts-aftermarket" className="text-sm font-normal">
                      We use high-quality aftermarket parts
                    </Label>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parts-policy">Additional Parts Policy Details</Label>
                <Textarea id="parts-policy" placeholder="Explain your parts policy in more detail" className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Business Hours</Label>
                <div className="space-y-3">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <div key={day} className="flex items-center justify-between">
                      <Label className="w-24">{day}:</Label>
                      <div className="flex items-center gap-2">
                        <Select>
                          <SelectTrigger className="w-28">
                            <SelectValue placeholder="Open" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="closed">Closed</SelectItem>
                            <SelectItem value="6:00">6:00 AM</SelectItem>
                            <SelectItem value="7:00">7:00 AM</SelectItem>
                            <SelectItem value="8:00">8:00 AM</SelectItem>
                            <SelectItem value="9:00">9:00 AM</SelectItem>
                            <SelectItem value="10:00">10:00 AM</SelectItem>
                          </SelectContent>
                        </Select>
                        <span>to</span>
                        <Select>
                          <SelectTrigger className="w-28">
                            <SelectValue placeholder="Close" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="closed">Closed</SelectItem>
                            <SelectItem value="17:00">5:00 PM</SelectItem>
                            <SelectItem value="18:00">6:00 PM</SelectItem>
                            <SelectItem value="19:00">7:00 PM</SelectItem>
                            <SelectItem value="20:00">8:00 PM</SelectItem>
                            <SelectItem value="21:00">9:00 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 4: Payment Information */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Information
              </CardTitle>
              <CardDescription>Set up your payment methods and account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="font-medium">How Mychanic Payments Work</h3>
                <p className="text-sm text-muted-foreground">
                  Mychanic processes customer payments and deposits funds directly to your account. We charge a 10%
                  service fee for each completed appointment.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-type">Account Type</Label>
                <Select>
                  <SelectTrigger id="account-type">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business Account</SelectItem>
                    <SelectItem value="personal">Personal Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-name">Account Holder Name</Label>
                <Input id="account-name" placeholder="Enter account holder name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="routing-number">Routing Number</Label>
                <Input id="routing-number" placeholder="Enter routing number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-number">Account Number</Label>
                <Input id="account-number" placeholder="Enter account number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-id">Tax ID (EIN or SSN)</Label>
                <Input id="tax-id" placeholder="Enter tax ID" />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="terms" />
                <Label htmlFor="terms" className="text-sm font-normal">
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button onClick={nextStep}>Complete Registration</Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 5: Complete */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-center">Registration Complete!</CardTitle>
              <CardDescription className="text-center">
                Your mechanic profile has been created successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Thank you for joining the Mychanic network of trusted mechanics. Our team will review your information
                and you'll be notified once your profile is approved.
              </p>
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-medium">Download our mechanic app</h3>
                <p className="text-sm text-muted-foreground">
                  Get the Mychanic Mechanic App to manage appointments, view customer vehicle data, and grow your
                  business.
                </p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" className="w-32">
                    App Store
                  </Button>
                  <Button variant="outline" className="w-32">
                    Google Play
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center gap-4">
              <Link href="/mechanic-dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Return to Home</Button>
              </Link>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}

