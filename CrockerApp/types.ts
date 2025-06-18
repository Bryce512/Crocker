export type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  cars: number[];
};

export type vehicle = {
  id: string;
  name: string;
  image: string;
  lastSync: string;
  obd: string;
  status: "Active" | "Inactive" | "Maintenance";
  progress: number;
  alerts: number;
  mileage: number;
  lastService: string;
  nextService: string;
  make: string;
  model: string;
  year: number;
  color: string;
  vin: string;
};

export type Diagnostic = {
  code: string;
  description: string;
  severity: "High" | "Moderate" | "Low";
  details: string;
  dateDetected: string;
};

export type DiagnosticData = {
  user: User | null;
  vehicle: vehicle | null;
  diagnostic: Diagnostic | null;
};
