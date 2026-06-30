export const SERVICE_AREA_STATUS = {
  CORE: "core",
  EXTENDED: "extended",
  MANUAL_REVIEW: "manual_review",
  OUT_OF_RANGE: "out_of_range",
} as const;

export type ServiceAreaStatus =
  (typeof SERVICE_AREA_STATUS)[keyof typeof SERVICE_AREA_STATUS];

export interface ServiceAreaOption {
  value: string;
  label: string;
  province: string;
  status: ServiceAreaStatus;
}

export const SERVICE_AREA_OPTIONS = [
  {
    value: "General Santos",
    label: "General Santos",
    province: "South Cotabato / Soccsksargen",
    status: SERVICE_AREA_STATUS.CORE,
  },
  {
    value: "Koronadal",
    label: "Koronadal",
    province: "South Cotabato",
    status: SERVICE_AREA_STATUS.CORE,
  },
  {
    value: "Polomolok",
    label: "Polomolok",
    province: "South Cotabato",
    status: SERVICE_AREA_STATUS.CORE,
  },
  {
    value: "Tupi",
    label: "Tupi",
    province: "South Cotabato",
    status: SERVICE_AREA_STATUS.CORE,
  },
  {
    value: "Tampakan",
    label: "Tampakan",
    province: "South Cotabato",
    status: SERVICE_AREA_STATUS.CORE,
  },
  {
    value: "Surallah",
    label: "Surallah",
    province: "South Cotabato",
    status: SERVICE_AREA_STATUS.EXTENDED,
  },
  {
    value: "Banga",
    label: "Banga",
    province: "South Cotabato",
    status: SERVICE_AREA_STATUS.EXTENDED,
  },
  {
    value: "Tantangan",
    label: "Tantangan",
    province: "South Cotabato",
    status: SERVICE_AREA_STATUS.EXTENDED,
  },
  {
    value: "Norala",
    label: "Norala",
    province: "South Cotabato",
    status: SERVICE_AREA_STATUS.EXTENDED,
  },
  {
    value: "Sto. Nino",
    label: "Sto. Nino",
    province: "South Cotabato",
    status: SERVICE_AREA_STATUS.EXTENDED,
  },
  {
    value: "Lake Sebu",
    label: "Lake Sebu",
    province: "South Cotabato",
    status: SERVICE_AREA_STATUS.MANUAL_REVIEW,
  },
  {
    value: "T'boli",
    label: "T'boli",
    province: "South Cotabato",
    status: SERVICE_AREA_STATUS.MANUAL_REVIEW,
  },
  {
    value: "Glan",
    label: "Glan",
    province: "Sarangani",
    status: SERVICE_AREA_STATUS.MANUAL_REVIEW,
  },
] as const satisfies readonly ServiceAreaOption[];

export type ServiceAreaValue = (typeof SERVICE_AREA_OPTIONS)[number]["value"];

export const SERVICE_AREA_VALUES = SERVICE_AREA_OPTIONS.map(
  (area) => area.value,
) as [ServiceAreaValue, ...ServiceAreaValue[]];

const SERVICE_AREA_BY_VALUE = new Map<string, ServiceAreaOption>(
  SERVICE_AREA_OPTIONS.map((area) => [area.value, area]),
);

export function getServiceArea(value: string): ServiceAreaOption | undefined {
  return SERVICE_AREA_BY_VALUE.get(value);
}

export function getServiceAreaLabel(value: string): string {
  return getServiceArea(value)?.label ?? value;
}
